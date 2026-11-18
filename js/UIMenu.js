/*
 * This file is part of the Education Network Simulator project and covered 
 * by GPLv3 license. See full terms in the LICENSE file at the root folder
 * or at http://www.gnu.org/licenses/gpl-3.0.html.
 * 
 * (c) 2015 Jorge García Ochoa de Aspuru
 * bardok@gmail.com
 * 
 * Images are copyrighted by their respective authors and have been 
 * downloaded from http://pixabay.com/
 * 
 */

// Icônes blanches des sections du menu (SVG intégrés, pas de fichier externe)
var NS_SECTION_ICONS = {
    manage: "<svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='square'><path d='M5 3h12l3 3v15H5z'/><path d='M8 3v6h8V3M8 21v-7h8v7'/></svg>",
    library: "<svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='#fff' stroke-width='2' stroke-linejoin='round'><path d='M12 2l9 5v10l-9 5-9-5V7z'/><path d='M3 7l9 5 9-5M12 12v10'/></svg>",
    language: "<svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='#fff' stroke-width='2'><circle cx='12' cy='12' r='9'/><path d='M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'/></svg>",
    about: "<b>i</b>"
};

// Bascule l'ouverture d'une section du menu burger (un seul sous-menu ouvert à la fois)
function nsToggleSection(button)
{
    var section = button.parentNode;
    var wasOpen = section.classList.contains("ns-open");
    var all = section.parentNode.querySelectorAll(".ns-section");
    for (var i = 0; i < all.length; i++)
    {
        all[i].classList.remove("ns-open");
        all[i].firstChild.setAttribute("aria-expanded", "false");
    }
    if (!wasOpen)
    {
        section.classList.add("ns-open");
        button.setAttribute("aria-expanded", "true");
    }
    return false;
}

var NS_PIN_ICON = "<svg viewBox='0 0 24 24' width='18' height='18' fill='currentColor'><path d='M14 2l8 8-2 1-3.5-.5L13 14l1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 3.5-3.5L13 4z'/></svg>";
var NS_PIN_KEY = "networksimulator.menupin";
var NS_PIN_WIDTH = 316;

// Décalage à gauche réservé par le menu épinglé (0 si le menu n'est pas épinglé)
function nsLeftInset()
{
    return (document.body && document.body.classList.contains("ns-pinned")) ? NS_PIN_WIDTH : 0;
}

// Bouton « épingle » du titre du menu
function nsTogglePin()
{
    var menu = uimanager.getMainMenu();
    menu.setPinned(!menu.isPinned());
    return false;
}

var UIMenu = function(description, X,Y, fixed)
{
    var X = X;
    var Y = Y;
    var entries = [];
    var sections = [];
    var id = "uimenu_" + getNextID();
    var description = description;
    var visible = false;
    var pinnable = false;
    var pinned = false;
    var fixed = fixed;
    var _self = this;

    function init()
    {
        uitranslation.addObserver(_self);
    }
    
    this.dispose = function()
    {
        uitranslation.removeObserver(this);
    };

    // Le menu est reconstruit à chaque affichage : les textes sont donc retraduits à ce moment-là
    this.localeChanged = function()
    {
    };

    this.getId = function()
    {
        return id;
    };

    this.getVisible = function()
    {
        return visible;
    };

    function newEntry(img, text, js, active, drop)
    {
        var data = {};
        data.type = "entry";
        data.id = "entry_" + getNextID();
        data.img = img;
        data.text = text;
        data.js = js;
        data.active = (active === true);
        data.drop = drop ? drop : null;
        return data;
    }

    this.addEntry = function(img, text, js)
    {
        entries.push(newEntry(img, text, js, false));
    };

    // Ajoute une section dépliable (sous-menu). Retourne l'objet section qui accepte
    // addEntry(img, text, js, active), addInfo(text) et addButton(text, js, statusId).
    this.addSection = function(text, icon)
    {
        var section = {id: "section_" + getNextID(), text: text, icon: icon, items: []};
        // drop : type d'objet à créer quand l'entrée est glissée sur la zone de travail
        section.addEntry = function(img, label, js, active, drop)
        {
            section.items.push(newEntry(img, label, js, active, drop));
        };
        // Ligne d'information : lines = tableau de [libellé, valeur] (le libellé est traduit)
        section.addInfo = function(lines)
        {
            section.items.push({type: "info", lines: lines});
        };
        // Bouton d'action : ne ferme pas le menu ; son résultat s'affiche dans la zone statusId
        section.addButton = function(label, js, statusId)
        {
            section.items.push({type: "button", id: "entry_" + getNextID(), text: label, js: js, statusId: statusId});
        };
        sections.push(section);
        return section;
    };

    // cX, cY : coordonnées de la zone de travail ; converties en pixels de la page (zoom et densité d'écran)
    this.setPos = function(cX, cY)
    {
        var k = 1;
        if ((typeof network !== "undefined") && (network !== null))
        {
            k = network.getZoom() / (window.devicePixelRatio || 1);
        }
        X = cX * k;
        Y = cY * k;
    };

    this.setDescription = function(desc)
    {
        description = desc;
    };

    this.purge = function()
    {
        entries = [];
        sections = [];
    };

    function entryHtml(e)
    {
        // « return false » : évite que le href='#' fasse défiler la page en haut (Firefox)
        var html = "<a class='ns-item" + (e.active ? " ns-active" : "") + "' href='#' onclick='" + e.js + "uimanager.menuOptionClicked();return false;'" + (e.drop ? " draggable='false' data-ns-drop='" + e.drop + "' title='" + escapeHTML(_("Click to add, or drag onto the work area")) + "'" : "") + ">";
        if (e.img)
        {
            html += "<img src='" + escapeHTML(e.img) + "' alt='' draggable='false' />";
        }
        html += "<span id='" + e.id + "'>" + escapeHTML(_(e.text)) + "</span></a>";
        return html;
    }

    function itemHtml(it)
    {
        var html = "";
        if (it.type === "entry")
        {
            html = entryHtml(it);
        }
        else if (it.type === "info")
        {
            html = "<div class='ns-info'>";
            for (var i = 0; i < it.lines.length; i++)
            {
                html += "<div><strong>" + escapeHTML(_(it.lines[i][0])) + "</strong> " + escapeHTML(it.lines[i][1]) + "</div>";
            }
            html += "</div>";
        }
        else if (it.type === "button")
        {
            html = "<div class='ns-actions'><button type='button' class='ns-btn' id='" + it.id + "' onclick='" + it.js + "return false;'>" + escapeHTML(_(it.text)) + "</button></div>";
            html += "<div class='ns-status' id='" + it.statusId + "' role='status' aria-live='polite'></div>";
        }
        return html;
    }

    function sectionHtml(sec)
    {
        var html = "<li class='ns-section' id='" + sec.id + "'>";
        html += "<button type='button' class='ns-section-head' aria-expanded='false' onclick='nsToggleSection(this);return false;'>";
        html += "<span class='ns-ico'>" + (NS_SECTION_ICONS[sec.icon] || NS_SECTION_ICONS.about) + "</span>";
        html += "<span>" + escapeHTML(_(sec.text)) + "</span><span class='ns-chev'></span></button>";
        html += "<div class='ns-sub'>";
        for (var i = 0; i < sec.items.length; i++)
        {
            html += itemHtml(sec.items[i]);
        }
        html += "</div></li>";
        return html;
    }

    this.show = function()
    {
        var div = document.createElement("div");
        div.setAttribute("id",id);
        div.setAttribute("class", "ns-menu" + (fixed ? " ns-fixed" : ""));
        div.setAttribute("style", "top:" + Y + "px;left:" + X + "px;");

        var innerHtml = "<p class='ns-menu-title'><span>" + escapeHTML(_(description)) + "</span>";
        if (pinnable)
        {
            innerHtml += "<button type='button' class='ns-pin" + (pinned ? " ns-on" : "") + "' id='" + id + "_pin' aria-pressed='" + (pinned ? "true" : "false") + "' title='" + escapeHTML(_(pinned ? "Unpin the menu" : "Pin the menu")) + "' onclick='return nsTogglePin();'>" + NS_PIN_ICON + "</button>";
        }
        innerHtml += "</p>";

        if (sections.length > 0)
        {
            innerHtml += "<ul class='ns-menu-list'>";
            for (var s = 0; s < sections.length; s++)
            {
                innerHtml += sectionHtml(sections[s]);
            }
            innerHtml += "</ul>";
        }

        for (var i = 0; i < entries.length; i++)
        {
            innerHtml += entryHtml(entries[i]);
        }

        div.innerHTML = innerHtml;

        document.body.appendChild(div);
        visible = true;
    };

    this.setPinnable = function(b)
    {
        pinnable = (b === true);
    };

    this.isPinned = function()
    {
        return pinned;
    };

    // Épingle / désépingle le menu : un menu épinglé reste ouvert et libère sa place à gauche du canevas
    this.setPinned = function(b)
    {
        pinned = (b === true) && pinnable;
        if (document.body)
        {
            if (pinned) { document.body.classList.add("ns-pinned"); } else { document.body.classList.remove("ns-pinned"); }
        }
        try { window.localStorage.setItem(NS_PIN_KEY, pinned ? "1" : "0"); } catch (e) {}
        var btn = document.getElementById(id + "_pin");
        if (btn !== null)
        {
            btn.className = "ns-pin" + (pinned ? " ns-on" : "");
            btn.setAttribute("aria-pressed", pinned ? "true" : "false");
            btn.title = _(pinned ? "Unpin the menu" : "Pin the menu");
        }
        if (typeof positionControlWindows === "function")
        {
            positionControlWindows(true);
        }
    };

    // Relit l'état mémorisé ; retourne true si le menu doit être rouvert
    this.loadPinned = function()
    {
        var on = false;
        try { on = (window.localStorage.getItem(NS_PIN_KEY) === "1"); } catch (e) {}
        if (on && pinnable)
        {
            this.setPinned(true);
            return true;
        }
        return false;
    };

    this.hide = function(force)
    {
        if (pinned && (force !== true))
        {
            return;
        }
        if (pinned)
        {
            this.setPinned(false);
        }
        var div = document.getElementById(id);
        if (div !== null)
        {
            document.body.removeChild(div);
        }
        visible = false;
    };

    init();
};
