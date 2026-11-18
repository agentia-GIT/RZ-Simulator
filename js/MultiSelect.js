/*
 * Education Network Simulator - multi-sélection, copier/coller, glisser-déposer depuis le menu.
 * This file is covered by the GPLv3 license (see the LICENSE file).
 *
 * La multi-sélection est une couche placée devant la machine à états de UIManager : elle
 * intercepte uniquement les gestes qui la concernent (sélection au lasso, Ctrl/Maj + clic,
 * déplacement d'un ensemble, étiquette de groupe) et laisse passer tout le reste.
 */

var MultiSelect = function()
{
    var DRAG_MIN = 4;          // pixels d'écran avant de considérer un geste comme un glissement
    var PASTE_STEP = 30;       // décalage entre deux collages successifs

    var selection = [];
    var mode = null;           // null | "band" | "move"
    var band = null;           // {x0, y0, x1, y1} en coordonnées du monde
    var baseSelection = [];
    var startPt = null;
    var startClient = null;
    var starts = [];
    var moved = false;
    var clickHost = null;
    var fromLabel = false;
    var clipboard = null;
    var pasteCount = 0;
    var _self = this;

    function canvasEl()
    {
        return document.getElementById("simcanvas");
    }

    function toWorld(ev)
    {
        var canvas = canvasEl();
        var bbox = canvas.getBoundingClientRect();
        var z = network.getZoom();
        return {
            x: (ev.clientX - bbox.left) * (canvas.width / bbox.width) / z,
            y: (ev.clientY - bbox.top) * (canvas.height / bbox.height) / z
        };
    }

    function indexOf(h)
    {
        return selection.indexOf(h);
    }

    function setSelection(list)
    {
        selection = list.slice();
        if (selection.length > 0)
        {
            // La sélection simple (menu de l'équipement) est abandonnée au profit de la multiple
            uimanager.deselectAll();
        }
    }

    this.getSelection = function()
    {
        return selection.slice();
    };

    this.clear = function()
    {
        selection = [];
        mode = null;
        band = null;
    };

    function hostAt(hit)
    {
        if ((hit !== null) && (hit.getObject() instanceof Drawable))
        {
            return hit.getObject().getOwner();
        }
        return null;
    }

    function autoScroll(ev)
    {
        var EDGE = 40;
        var STEP = 24;
        var dx = 0;
        var dy = 0;
        if (ev.clientX > window.innerWidth - EDGE) { dx = STEP; }
        else if (ev.clientX < EDGE + nsLeftInset()) { dx = -STEP; }
        if (ev.clientY > window.innerHeight - EDGE) { dy = STEP; }
        else if (ev.clientY < EDGE + 56) { dy = -STEP; }
        if ((dx !== 0) || (dy !== 0))
        {
            window.scrollBy(dx, dy);
        }
    }

    function startMove(pt, ev, label)
    {
        fromLabel = (label === true);
        mode = "move";
        startPt = pt;
        startClient = {x: ev.clientX, y: ev.clientY};
        moved = false;
        starts = [];
        for (var i = 0; i < selection.length; i++)
        {
            var d = selection[i].getDrawable();
            starts.push({h: selection[i], x: d.getX(), y: d.getY()});
        }
    }

    function onDown(ev)
    {
        if ((ev.button !== 0) || (ev.isTrusted === false) || (ev.target !== canvasEl()))
        {
            return;
        }
        var pt = toWorld(ev);
        var additive = ev.ctrlKey || ev.shiftKey || ev.metaKey;
        var hit = uimanager.hitTest(pt.x, pt.y);
        var host = hostAt(hit);

        // Burger, poignée de menu : on ne touche à rien
        if ((hit !== null) && (host === null) && !(hit.getObject() instanceof Link))
        {
            return;
        }

        var label = (host === null) ? network.getGroupLabelAt(pt.x, pt.y) : null;
        if ((label !== null) && (hit === null))
        {
            // Clic sur l'étiquette d'un groupe : tout le groupe est sélectionné et déplacé
            var members = network.getGroupMembers(label);
            if (additive)
            {
                for (var m = 0; m < selection.length; m++)
                {
                    if (members.indexOf(selection[m]) < 0) { members.push(selection[m]); }
                }
            }
            setSelection(members);
            clickHost = null;
            startMove(pt, ev, true);
            ev.preventDefault();
            ev.stopPropagation();
            return;
        }

        if (host !== null)
        {
            if (additive)
            {
                var current = network.getSelected();
                if ((selection.length === 0) && (current instanceof Host) && (current !== host))
                {
                    selection = [current];
                }
                var pos = indexOf(host);
                var list = selection.slice();
                if (pos >= 0) { list.splice(pos, 1); } else { list.push(host); }
                setSelection(list);
                if (indexOf(host) >= 0)
                {
                    clickHost = null;
                    startMove(pt, ev);
                }
                ev.preventDefault();
                ev.stopPropagation();
                return;
            }
            if (indexOf(host) >= 0)
            {
                // Glisser un membre de la sélection : tout l'ensemble suit
                clickHost = host;
                startMove(pt, ev);
                ev.preventDefault();
                ev.stopPropagation();
                return;
            }
            selection = [];
            return; // équipement isolé : comportement habituel
        }

        if (hit !== null)
        {
            // Clic sur un lien
            selection = [];
            return;
        }

        // Espace vide : lasso (le clic continue vers la machine à états, qui désélectionne)
        if (!additive)
        {
            selection = [];
        }
        baseSelection = selection.slice();
        mode = "band";
        startClient = {x: ev.clientX, y: ev.clientY};
        band = {x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y, active: false};
    }

    function intersects(rect, b)
    {
        var x0 = Math.min(b.x0, b.x1);
        var x1 = Math.max(b.x0, b.x1);
        var y0 = Math.min(b.y0, b.y1);
        var y1 = Math.max(b.y0, b.y1);
        return !((rect.x > x1) || (rect.x + rect.width < x0) || (rect.y > y1) || (rect.y + rect.height < y0));
    }

    function onMove(ev)
    {
        if (mode === null)
        {
            return;
        }
        var pt = toWorld(ev);
        var dist = Math.abs(ev.clientX - startClient.x) + Math.abs(ev.clientY - startClient.y);
        if (mode === "move")
        {
            if (!moved && (dist < DRAG_MIN))
            {
                return;
            }
            moved = true;
            network.setDragging(selection);
            autoScroll(ev);
            var dx = pt.x - startPt.x;
            var dy = pt.y - startPt.y;
            var minX = 1e9;
            var minY = 1e9;
            for (var i = 0; i < starts.length; i++)
            {
                minX = Math.min(minX, starts[i].x);
                minY = Math.min(minY, starts[i].y);
            }
            dx = Math.max(dx, -minX);
            dy = Math.max(dy, -minY);
            for (var j = 0; j < starts.length; j++)
            {
                starts[j].h.getDrawable().setPosition(starts[j].x + dx, starts[j].y + dy);
            }
        }
        else if (mode === "band")
        {
            if (!band.active && (dist < DRAG_MIN))
            {
                return;
            }
            band.active = true;
            band.x1 = pt.x;
            band.y1 = pt.y;
            autoScroll(ev);
            var picked = baseSelection.slice();
            var all = network.getElements();
            for (var k = 0; k < all.length; k++)
            {
                if ((picked.indexOf(all[k]) < 0) && intersects(all[k].getDrawable().getRect(), band))
                {
                    picked.push(all[k]);
                }
            }
            if ((picked.length !== selection.length) || (picked.length > 0 && selection.length === 0))
            {
                setSelection(picked);
            }
        }
    }

    function onUp(ev)
    {
        if (mode === null)
        {
            return;
        }
        var wasMode = mode;
        mode = null;
        band = null;
        network.setDragging(null);
        // Objets lâchés dans le cadre d'un autre groupe : ils en prennent le nom (pas pour le déplacement
        // d'un groupe entier par son étiquette)
        if ((wasMode === "move") && moved && !fromLabel)
        {
            network.dropIntoGroups(selection.slice());
        }
        if ((wasMode === "move") && !moved && (clickHost !== null) && !(ev.ctrlKey || ev.shiftKey || ev.metaKey))
        {
            // Simple clic sur un membre : retour à la sélection habituelle de cet équipement
            selection = [];
            var pt = toWorld(ev);
            uimanager.click(pt.x, pt.y);
        }
        clickHost = null;
    }

    // ---- Presse-papiers ----------------------------------------------------------------
    function targets()
    {
        if (selection.length > 0)
        {
            return selection.slice();
        }
        var current = network.getSelected();
        return (current instanceof Host) ? [current] : [];
    }

    this.copy = function()
    {
        var list = targets();
        if (list.length === 0)
        {
            return false;
        }
        clipboard = network.copyElements(list);
        pasteCount = 0;
        return true;
    };

    this.paste = function()
    {
        if (clipboard === null)
        {
            return false;
        }
        pasteCount++;
        var d = PASTE_STEP * pasteCount;
        var created = network.pasteElements(clipboard, d, d);
        setSelection(created);
        return true;
    };

    this.cut = function()
    {
        var list = targets();
        if (!this.copy())
        {
            return false;
        }
        this.removeTargets(list);
        return true;
    };

    this.duplicate = function()
    {
        var list = targets();
        if (list.length === 0)
        {
            return false;
        }
        var saved = clipboard;
        var savedCount = pasteCount;
        clipboard = network.copyElements(list);
        pasteCount = 0;
        this.paste();
        // Le presse-papiers de l'utilisateur n'est pas modifié par un « dupliquer »
        clipboard = saved;
        pasteCount = savedCount;
        return true;
    };

    this.removeTargets = function(list)
    {
        selection = [];
        uimanager.deselectAll();
        network.removeElements(list);
    };

    this.selectAll = function()
    {
        setSelection(network.getElements());
    };

    this.deleteSelection = function()
    {
        if (selection.length > 0)
        {
            this.removeTargets(selection.slice());
            return true;
        }
        var current = network.getSelected();
        if (current instanceof Host)
        {
            this.removeTargets([current]);
            return true;
        }
        if (current !== null)
        {
            network.deleteSelectedLink();
            uimanager.deselectAll();
            return true;
        }
        return false;
    };

    function isTyping(el)
    {
        if (!el || !el.tagName)
        {
            return false;
        }
        var t = el.tagName.toLowerCase();
        return (t === "input") || (t === "textarea") || (t === "select") || el.isContentEditable;
    }

    function onKey(ev)
    {
        if (isTyping(ev.target) || ev.altKey)
        {
            return;
        }
        var ctrl = ev.ctrlKey || ev.metaKey;
        var key = (ev.key || "").toLowerCase();
        var done = false;
        if (ctrl && (key === "c")) { done = _self.copy(); }
        else if (ctrl && (key === "x")) { done = _self.cut(); }
        else if (ctrl && (key === "v")) { done = _self.paste(); }
        else if (ctrl && (key === "d")) { done = _self.duplicate(); }
        else if (ctrl && (key === "a")) { _self.selectAll(); done = true; }
        else if (!ctrl && ((key === "delete") || (key === "backspace"))) { done = _self.deleteSelection(); }
        else if (!ctrl && (key === "escape"))
        {
            if (selection.length > 0) { selection = []; done = true; }
            uimanager.deselectAll();
        }
        if (done)
        {
            ev.preventDefault();
        }
    }

    // ---- Dessin -----------------------------------------------------------------------
    this.render = function(ctx)
    {
        ctx.save();
        for (var i = 0; i < selection.length; i++)
        {
            var r = selection[i].getDrawable().getRect();
            ctx.fillStyle = "rgba(0,162,252,0.10)";
            ctx.fillRect(r.x - 4, r.y - 4, r.width + 8, r.height + 8);
            ctx.strokeStyle = "#00a2fc";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(r.x - 4, r.y - 4, r.width + 8, r.height + 8);
        }
        ctx.setLineDash([]);
        if ((band !== null) && band.active)
        {
            var x = Math.min(band.x0, band.x1);
            var y = Math.min(band.y0, band.y1);
            var w = Math.abs(band.x1 - band.x0);
            var h = Math.abs(band.y1 - band.y0);
            ctx.fillStyle = "rgba(0,162,252,0.14)";
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = "#00a2fc";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, w, h);
        }
        ctx.restore();
    };

    // Les équipements supprimés par ailleurs (menu, nouveau réseau…) quittent la sélection
    this.prune = function()
    {
        if (selection.length === 0)
        {
            return;
        }
        var alive = [];
        for (var i = 0; i < selection.length; i++)
        {
            if (network.getElement(selection[i].id) === selection[i])
            {
                alive.push(selection[i]);
            }
        }
        selection = alive;
    };

    this.init = function()
    {
        var container = document.getElementById("simcontainer");
        container.addEventListener("mousedown", onDown, true);
        window.addEventListener("mousemove", onMove, false);
        window.addEventListener("mouseup", onUp, false);
        document.addEventListener("keydown", onKey, false);
        MenuDrag.init();
    };
};

// Glisser-déposer des objets de la bibliothèque (menu) vers la zone de travail
var MenuDrag =
{
    state: null,
    ghost: null,
    init: function()
    {
        document.addEventListener("mousedown", MenuDrag.down, true);
        // Un lien est glissable par défaut (glisser-déposer natif) : on l'empêche pour nos événements souris
        document.addEventListener("dragstart", function(ev)
        {
            if (ev.target && ev.target.closest && ev.target.closest("[data-ns-drop]"))
            {
                ev.preventDefault();
            }
        }, true);
    },
    down: function(ev)
    {
        if ((ev.button !== 0) || !ev.target || !ev.target.closest)
        {
            return;
        }
        var a = ev.target.closest("[data-ns-drop]");
        if (a === null)
        {
            return;
        }
        MenuDrag.state = {type: a.getAttribute("data-ns-drop"), x: ev.clientX, y: ev.clientY, active: false, src: a.querySelector("img")};
        window.addEventListener("mousemove", MenuDrag.move, false);
        window.addEventListener("mouseup", MenuDrag.up, false);
    },
    move: function(ev)
    {
        var s = MenuDrag.state;
        if (s === null)
        {
            return;
        }
        if (!s.active)
        {
            if (Math.abs(ev.clientX - s.x) + Math.abs(ev.clientY - s.y) < 6)
            {
                return;
            }
            s.active = true;
            var g = document.createElement("img");
            g.src = (s.src !== null) ? s.src.getAttribute("src") : "";
            g.className = "ns-dragghost";
            g.setAttribute("alt", "");
            g.setAttribute("draggable", "false");
            document.body.appendChild(g);
            MenuDrag.ghost = g;
            document.body.classList.add("ns-dragging");
        }
        MenuDrag.ghost.style.left = (ev.clientX - 28) + "px";
        MenuDrag.ghost.style.top = (ev.clientY - 28) + "px";
        ev.preventDefault();
    },
    up: function(ev)
    {
        window.removeEventListener("mousemove", MenuDrag.move, false);
        window.removeEventListener("mouseup", MenuDrag.up, false);
        var s = MenuDrag.state;
        MenuDrag.state = null;
        if ((s === null) || !s.active)
        {
            return;
        }
        if (MenuDrag.ghost !== null)
        {
            document.body.removeChild(MenuDrag.ghost);
            MenuDrag.ghost = null;
        }
        document.body.classList.remove("ns-dragging");
        // Le clic qui suit le relâchement ne doit pas ajouter un second objet
        var swallow = function(e) { e.stopPropagation(); e.preventDefault(); };
        document.addEventListener("click", swallow, true);
        window.setTimeout(function() { document.removeEventListener("click", swallow, true); }, 0);

        var canvas = document.getElementById("simcanvas");
        var el = document.elementFromPoint(ev.clientX, ev.clientY);
        if (el === canvas)
        {
            var bbox = canvas.getBoundingClientRect();
            var z = network.getZoom();
            var x = (ev.clientX - bbox.left) * (canvas.width / bbox.width) / z;
            var y = (ev.clientY - bbox.top) * (canvas.height / bbox.height) / z;
            newElement(s.type, {x: x, y: y});
            uimanager.menuOptionClicked();
        }
    }
};
