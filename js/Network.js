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

function deleteSelected() 
{
    if ((network.getSelected() !== null) && (network.getSelected() instanceof Host)) 
    {
        if (confirm(_("Do you really want to delete the selected element?"))) 
        {
            network.deleteSelectedElement();
            uimanager.selectedElementDeleted();
        }
    } 
    else if ((network.getSelected() !== null) && (network.getSelected() instanceof Link)) 
    {
        if (confirm(_("Do you really want to delete the selected link?"))) 
        {
            network.deleteSelectedLink();
            uimanager.selectedLineDeleted();
        }
    }
}

var Network = function(imgs, context, w, h) 
{
    var elements = {};
    var links = [];
    var images = imgs;
    var ctx = context;
    var _self = this;
    var W = w;
    var H = h;
    var zoom = 1;
    var worldW = 0;   // taille de la zone de travail (unités du canvas, avant zoom)
    var worldH = 0;
    var MAX_CANVAS = 16000;
    var selected = null;
    
    var lastFrameTime = null;
    var accumulator = 0;

    // Boucle d'animation : la simulation avance par pas fixes de REFRESH_INTERVAL
    // (vitesse identique quelle que soit la fréquence de l'écran) et le dessin est
    // synchronisé sur l'écran via requestAnimationFrame (mis en pause quand l'onglet
    // est masqué, ce qui évite de consommer du CPU inutilement dans Firefox).
    function frame(timestamp) 
    {
        if (lastFrameTime === null) 
        {
            lastFrameTime = timestamp;
        }
        accumulator += Math.min(timestamp - lastFrameTime, 250);
        lastFrameTime = timestamp;
        
        while (accumulator >= REFRESH_INTERVAL) 
        {
            updateSimulation();
            accumulator -= REFRESH_INTERVAL;
        }
        
        updateCanvasSize();
        render();
        window.requestAnimationFrame(frame);
    }

    // ---- Zone de travail et zoom ------------------------------------------------
    // La zone de travail s'agrandit quand on éloigne un objet du bord et se réduit quand il revient :
    // elle couvre au minimum la fenêtre, et au maximum les objets + une marge.
    function computeWorldSize()
    {
        var dpr = window.devicePixelRatio || 1;
        var vw = document.documentElement.clientWidth || window.innerWidth;
        var vh = document.documentElement.clientHeight || window.innerHeight;
        var needW = 0;
        var needH = 0;
        var keys = Object.keys(elements);
        for (var i = 0; i < keys.length; i++)
        {
            var r = elements[keys[i]].getDrawable().getRect();
            // + largeur / hauteur approximatives du libellé sous l'objet, + marge
            needW = Math.max(needW, r.x + r.width + 260);
            needH = Math.max(needH, r.y + r.height + 200);
        }
        needW = Math.ceil(needW / 200) * 200;
        needH = Math.ceil(needH / 200) * 200;
        var limit = Math.floor(MAX_CANVAS / zoom);
        return {
            w: Math.min(limit, Math.max(Math.ceil(vw * dpr / zoom), needW)),
            h: Math.min(limit, Math.max(Math.ceil(vh * dpr / zoom), needH))
        };
    }

    function updateCanvasSize(force)
    {
        var size = computeWorldSize();
        if ((force !== true) && (size.w === worldW) && (size.h === worldH))
        {
            return;
        }
        worldW = size.w;
        worldH = size.h;
        var dpr = window.devicePixelRatio || 1;
        var canvas = ctx.canvas;
        canvas.width = Math.ceil(worldW * zoom);
        canvas.height = Math.ceil(worldH * zoom);
        canvas.style.width = (canvas.width / dpr) + "px";
        canvas.style.height = (canvas.height / dpr) + "px";
        W = canvas.width;
        H = canvas.height;
    }

    this.getZoom = function()
    {
        return zoom;
    };

    this.getWorldSize = function()
    {
        return {w: worldW, h: worldH};
    };

    // Change le zoom en gardant le même point au centre de la fenêtre
    this.setZoom = function(z)
    {
        z = Math.max(0.25, Math.min(4, z));
        if (Math.abs(z - zoom) < 0.0001)
        {
            return;
        }
        var dpr = window.devicePixelRatio || 1;
        var vw = document.documentElement.clientWidth;
        var vh = document.documentElement.clientHeight;
        var cx = (getPageScrollX() + vw / 2) * dpr / zoom;
        var cy = (getPageScrollY() + vh / 2) * dpr / zoom;
        uimanager.hideMenus();
        zoom = z;
        updateCanvasSize(true);
        window.scrollTo(cx * zoom / dpr - vw / 2, cy * zoom / dpr - vh / 2);
        ZoomControls.refresh();
        try { window.localStorage.setItem("networksimulator.zoom", String(zoom)); } catch (e) {}
        // Les menus contextuels sont repositionnés pour le nouveau zoom
        if ((selected !== null) && (selected instanceof Host))
        {
            selected.drawableChanged();
        }
    };

    this.init = function() 
    {
        window.requestAnimationFrame(frame);
    };
    
    this.getImages = function() 
    {
        return images;
    };
    
    this.createComputer = function(x, y) 
    {
        var c = new Host("computer", 1);
        c.getDrawable().setPosition(x, y);
        c.getDrawable().setImage(images[IMAGE_COMPUTER]);
        
        var dhcpClient = new DHCPClient(0);
        c.addApp(dhcpClient, -1, false);
        
        var dnsClient = new DNSClient(0);
        c.addApp(dnsClient, -1, false);
        
        var httpClient = new HTTPClient(0);
        c.addApp(httpClient, -1, false);
        
        c.addApp(new PrintClient(0), -1, false);
        
        elements[c.id] = c;
        
        return c.id;
    };
    
    this.createDHCPServer = function(x, y) 
    {
        var c = new Host("dhcpserver", 1);
        c.getDrawable().setPosition(x, y);
        c.getDrawable().setImage(images[IMAGE_SERVERDHCP]);
        var dhcpServer = new DHCPServer(0);
        c.addApp(dhcpServer, 67, true);
        elements[c.id] = c;
        
        return c.id;
    };
    
    this.createDNSServer = function(x, y) 
    {
        var c = new Host("dnsserver", 1);
        c.getDrawable().setPosition(x, y);
        c.getDrawable().setImage(images[IMAGE_SERVERDNS]);
        var dnsServer = new DNSServer(0);
        c.addApp(dnsServer, 53, true);
        elements[c.id] = c;
        
        return c.id;
    };
    
    this.createHTTPServer = function(x, y) 
    {
        var c = new Host("httpserver", 1);
        c.getDrawable().setPosition(x, y);
        c.getDrawable().setImage(images[IMAGE_SERVERWEB]);
        var httpServer = new HTTPServer(0);
        c.addApp(httpServer, 80, true);
        elements[c.id] = c;
        
        return c.id;
    };
    
    this.createSwitch = function(x, y, ports) 
    {
        var s = new Host("switch", ports);
        s.getDrawable().setPosition(x, y);
        s.getDrawable().setImage(images[IMAGE_SWITCH]);
        elements[s.id] = s;
        
        return s.id;
    };
    
    this.createRouter = function(x, y) 
    {
        var r = new Host("router", 2);
        r.getDrawable().setPosition(x, y);
        r.getDrawable().setImage(images[IMAGE_ROUTER]);
        elements[r.id] = r;
        
        return r.id;
    };
    
    this.createPrinter = function(x, y) 
    {
        var c = new Host("printer", 1);
        c.getDrawable().setPosition(x, y);
        c.getDrawable().setImage(images[IMAGE_PRINTER]);
        
        c.addApp(new DHCPClient(0), -1, false);
        c.addApp(new DNSClient(0), -1, false);
        // Service d'impression : port RAW/JetDirect 9100 ; page d'administration : HTTP 80
        c.addApp(new PrinterService(0), 9100, true);
        c.addApp(new PrinterWeb(0), 80, true);
        
        elements[c.id] = c;
        
        return c.id;
    };
    
    this.createAccessPoint = function(x, y) 
    {
        // 1 port filaire (LAN) + 8 emplacements radio (stations Wi-Fi)
        var a = new Host("accesspoint", 9);
        a.getDrawable().setPosition(x, y);
        a.getDrawable().setImage(images[IMAGE_ACCESSPOINT]);
        elements[a.id] = a;
        
        return a.id;
    };
    
    this.getElements = function() 
    {
        var result = [];
        var keys = Object.keys(elements);
        for (var i = 0; i < keys.length; i++) 
        {
            result.push(elements[keys[i]]);
        }
        return result;
    };
    
    // Contrôle de l'association Wi-Fi entre deux connecteurs : retourne null si elle est
    // possible (ou si aucun des deux n'est un port radio), sinon le message d'erreur.
    function checkWirelessCompat(conn1, conn2) 
    {
        var h1 = conn1.getConnectable().getOwner();
        var h2 = conn2.getConnectable().getOwner();
        var w1 = h1.isWirelessPort(conn1.getConnectable().getConnectorPos(conn1));
        var w2 = h2.isWirelessPort(conn2.getConnectable().getConnectorPos(conn2));
        
        if (!w1 && !w2) 
        {
            return null;
        }
        if (w1 && w2) 
        {
            return _("Two Wi-Fi ports cannot be linked together.");
        }
        var ap = w1 ? h1 : h2;
        var station = w1 ? h2 : h1;
        var apwifi = ap.getWifi();
        var stwifi = station.getWifi();
        
        if ((station.getType() !== "computer") && (station.getType() !== "printer")) 
        {
            return _("Only computers and printers can join a Wi-Fi network.");
        }
        if (!apwifi.enabled) 
        {
            return _("Wi-Fi is turned off on the access point:") + " " + ap.getName();
        }
        if (stwifi.ssid !== apwifi.ssid) 
        {
            return _("Wi-Fi network (SSID) mismatch. Configure the Wi-Fi connection of:") + " " + station.getName();
        }
        if ((apwifi.security !== "open") && (stwifi.key !== apwifi.key)) 
        {
            return _("Wrong Wi-Fi password. Configure the Wi-Fi connection of:") + " " + station.getName();
        }
        return null;
    }
    
    var lastLinkError = null;
    
    this.getLastLinkError = function() 
    {
        return lastLinkError;
    };
    
    // Dissocie les stations dont les paramètres ne correspondent plus à ceux de la borne.
    // Retourne la liste des noms d'équipements déconnectés.
    this.checkWirelessLinks = function() 
    {
        var dropped = [];
        var current = links.slice();
        for (var i = 0; i < current.length; i++) 
        {
            if (checkWirelessCompat(current[i].getConnector1(), current[i].getConnector2()) !== null) 
            {
                var c1 = current[i].getConnector1().getConnectable().getOwner();
                var c2 = current[i].getConnector2().getConnectable().getOwner();
                dropped.push(c1.getName() + " \u2194 " + c2.getName());
                if ((selected === current[i]) && (selected !== null)) 
                {
                    selected = null;
                }
                deleteLink(current[i]);
            }
        }
        return dropped;
    };
    
    // Bornes proches utilisant un canal qui se recouvre (même bande de fréquence)
    this.getChannelConflicts = function(ap) 
    {
        var result = [];
        var w = ap.getWifi();
        var keys = Object.keys(elements);
        for (var i = 0; i < keys.length; i++) 
        {
            var other = elements[keys[i]];
            if ((other === ap) || (other.getType() !== "accesspoint") || !other.getWifi().enabled) 
            {
                continue;
            }
            var ow = other.getWifi();
            var dx = other.getDrawable().getX() - ap.getDrawable().getX();
            var dy = other.getDrawable().getY() - ap.getDrawable().getY();
            var near = Math.sqrt(dx * dx + dy * dy) < 500;
            // 2,4 GHz : les canaux se recouvrent s'ils sont distants de moins de 5 ; 5 GHz : même canal
            var overlap = (ow.band === w.band) && ((w.band === "5") ? (ow.channel === w.channel) : (Math.abs(ow.channel - w.channel) < 5));
            if (near && overlap) 
            {
                result.push(other);
            }
        }
        return result;
    };
    
    this.createLink = function(e1, c1, e2, c2) 
    {
        lastLinkError = null;
        var element1 = elements[e1];
        var element2 = elements[e2];
        var success = false;
        
        // Correction : un équipement ne peut pas être relié à lui-même par le même port,
        // et un connecteur déjà relié ne peut pas recevoir un second lien.
        if (!element1 || !element2) 
        {
            return success;
        }
        
        var connector1 = element1.getConnectable().getConnector(c1);
        var connector2 = element2.getConnectable().getConnector(c2);
        
        if ((connector1 !== undefined) && (connector2 !== undefined) && (connector1 !== null) && (connector2 !== null)
            && (connector1 !== connector2) && !connector1.isConnected() && !connector2.isConnected()) 
        {
            lastLinkError = checkWirelessCompat(connector1, connector2);
            if (lastLinkError !== null) 
            {
                return false;
            }
            var link = new Link(connector1, connector2);
            links.push(link);
            success = links.length;
        }
        
        return success;
    };
    
    this.getElement = function(id) 
    {
        var result = null;
        
        result = elements[id];
        
        return result;
    };
    
    this.getLink = function(pos) 
    {
        var result = null;
        
        if (pos < links.length) 
        {
            result = links[pos];
        }
        
        return result;
    };
    
    // Recherche du connecteur de sortie sur le plus court chemin vers la destination
    // (parcours en largeur). Remplace l'ancienne recherche en profondeur à liste
    // « visited » partagée, qui ne garantissait pas le plus court chemin.
    this.findNextConnectorInPath = function(currentConnectable, dstIP, dstMAC) 
    {
        var result = null;
        var visited = [currentConnectable];
        var queue = [];
        
        for (var i = 0; i < currentConnectable.getConnectorNumber(); i++) 
        {
            var first = currentConnectable.getConnector(i);
            if (first.isConnected()) 
            {
                queue.push({connectable: first.getConnectedConnector().getConnectable(), first: first});
            }
        }
        
        while ((result === null) && (queue.length > 0)) 
        {
            var item = queue.shift();
            var c = item.connectable;
            if (visited.indexOf(c) === -1) 
            {
                visited.push(c);
                if (c.compatibleIP(dstIP, false) || c.compatibleMAC(dstMAC, false)) 
                {
                    result = item.first;
                } 
                else 
                {
                    for (var j = 0; j < c.getConnectorNumber(); j++) 
                    {
                        var conn = c.getConnector(j);
                        if (conn.isConnected()) 
                        {
                            queue.push({connectable: conn.getConnectedConnector().getConnectable(), first: item.first});
                        }
                    }
                }
            }
        }
        
        return result;
    };
    
    this.getElementInCoords = function(x, y) 
    {
        var result = null;
        var i = 0;
        var keys = Object.keys(elements);
        while ((result === null) && (i < keys.length)) 
        {
            if (elements[keys[i]].getDrawable().hasCoords(x, y)) 
            {
                result = elements[keys[i]];
            } 
            else 
            {
                i++;
            }
        }
        
        return result;
    };
    
    this.getMessageInCoords = function(x, y) 
    {
        var result = null;
        var i = 0;
        
        while ((result === null) && (i < links.length)) 
        {
            var messagecount = links[i].getMessageCount();
            var j = 0;
            while ((result === null) && (j < messagecount)) 
            {
                if (links[i].messageHasCoords(j, x, y)) 
                {
                    result = links[i].getMessage(j);
                } 
                else 
                {
                    j++;
                }
            }
            if (result === null) 
            {
                i++;
            }
        }
        
        return result;
    };
    
    this.getPosForElement = function(elem) 
    {
        var result = -1;
        var keys = Object.keys(elements);
        for (var i = 0; i < keys.length; i++) 
        {
            if (elements[keys[i]] === elem) 
            {
                result = keys[i];
            }
        }
        return result;
    };
    
    this.getLinkInCoords = function(x, y) 
    {
        var result = null;
        var i = 0;
        
        while ((result === null) && (i < links.length)) 
        {
            if (links[i].hasCoords(x, y)) 
            {
                result = links[i];
            } 
            else 
            {
                i++;
            }
        }
        
        return result;
    };
    
    this.setSelected = function(s) 
    {
        selected = s;
    };
    
    this.getSelected = function() 
    {
        return selected;
    };
    
    function deleteLink(link) 
    {
        link.getConnector1().setLink(null);
        link.getConnector2().setLink(null);
        var pos = links.indexOf(link);
        if (pos >= 0) 
        {
            links.splice(pos, 1);
        }
        link.dispose();
    }
    
    function deleteElement(element) 
    {
        // Correction : on utilise le paramètre « element » (et non la variable
        // « selected ») et on supprime l'entrée par son identifiant, car
        // elements.indexOf() ne retrouvait pas l'élément dans le tableau creux.
        var num = element.getConnectable().getConnectorNumber();
        for (var i = 0; i < num; i++) 
        {
            var connector = element.getConnectable().getConnector(i);
            if (connector.getLink() !== null) 
            {
                deleteLink(connector.getLink());
            }
        }
        delete elements[element.id];
    }
    
    this.deleteSelectedLink = function() 
    {
        if (selected !== null) 
        {
            deleteLink(selected);
            selected = null;
        }
    };
    
    this.deleteSelectedElement = function() 
    {
        if (selected !== null) 
        {
            deleteElement(selected);
            selected.dispose();
            selected = null;
        }
    };
    
    function renderGroups(ctx) 
    {
        var groups = {};
        var keys = Object.keys(elements);
        for (var i = 0; i < keys.length; i++) 
        {
            var host = elements[keys[i]];
            if (host.getGroup() !== null) 
            {
                if (!(host.getGroup() in groups)) 
                {
                    var data = {};
                    data.minx = 1000000;
                    data.miny = 1000000;
                    data.maxx = 0;
                    data.maxy = 0;
                    
                    groups[host.getGroup()] = data;
                }
                var data = groups[host.getGroup()];
                var rect = host.getDrawable().getBounds(ctx);
                if (data.minx > rect.x) 
                {
                    data.minx = rect.x;
                }
                if (data.miny > rect.y) 
                {
                    data.miny = rect.y;
                }
                if (data.maxx < rect.x + rect.width) 
                {
                    data.maxx = rect.x + rect.width;
                }
                if (data.maxy < rect.y + rect.height) 
                {
                    data.maxy = rect.y + rect.height;
                }
            }
        }
        
        keys = Object.keys(groups);
        var PAD = 14;      // marge entre les objets (et leur libellé) et le cadre
        var GAP = 8;       // espace entre le cadre et le nom du groupe
        for (var i = 0; i < keys.length; i++) 
        {
            var data = groups[keys[i]];
            var fx = data.minx - PAD;
            var fy = data.miny - PAD;
            var fw = data.maxx - data.minx + 2 * PAD;
            var fh = data.maxy - data.miny + 2 * PAD;
            ctx.save();
            ctx.strokeStyle = "rgba(0,80,124,0.7)";
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.strokeRect(fx, fy, fw, fh);
            ctx.setLineDash([]);
            // Nom du groupe : légèrement détaché, au-dessus du coin haut-gauche du cadre
            ctx.font = "800 17px Manrope, 'Open Sans', sans-serif";
            ctx.textBaseline = "bottom";
            var tw = ctx.measureText(keys[i]).width;
            var ty = Math.max(fy - GAP, 22);
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.fillRect(fx - 2, ty - 22, tw + 14, 26);
            ctx.fillStyle = "#00507c";
            ctx.fillRect(fx - 2, ty - 22, 3, 26);
            ctx.fillStyle = "#003c5d";
            ctx.fillText(keys[i], fx + 7, ty);
            ctx.restore();
        }
    }
    
    // Avance la simulation d'un pas (déplacement des messages sur les liens)
    function updateSimulation() 
    {
        // On travaille sur une copie : la livraison d'un message peut créer/supprimer des liens
        var current = links.slice();
        for (var i = 0; i < current.length; i++) 
        {
            current[i].update();
        }
        // Équipements ayant une activité propre (ex. imprimante)
        var keys = Object.keys(elements);
        for (var j = 0; j < keys.length; j++) 
        {
            if (elements[keys[j]]) 
            {
                elements[keys[j]].update();
            }
        }
    }
    
    var gridPattern = null;

    function createGridPattern()
    {
        var tile = document.createElement("canvas");
        tile.width = 40;
        tile.height = 40;
        var c = tile.getContext("2d");
        if (c === null)
        {
            return null;
        }
        c.fillStyle = "rgba(0,80,124,0.18)";
        c.fillRect(0, 0, 2, 2);
        return ctx.createPattern(tile, "repeat");
    }

    function render() 
    {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#E6E6E6";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.scale(zoom, zoom);
        // Quadrillage discret (motif créé une seule fois)
        if (gridPattern === null)
        {
            gridPattern = createGridPattern();
        }
        if (gridPattern !== null)
        {
            ctx.fillStyle = gridPattern;
            ctx.fillRect(0, 0, worldW, worldH);
        }
        
        for (var i = 0; i < links.length; i++) 
        {
            links[i].draw(ctx, selected === links[i]);
        }
        
        var keys = Object.keys(elements);
        for (var i = 0; i < keys.length; i++) 
        {
            elements[keys[i]].getDrawable().draw(ctx);
        }
        
        renderGroups(ctx);
        
        uimanager.render(ctx);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        uimanager.updateHeader();
        
        if (DEBUG)
        {
            ctx.fillStyle = "#000000";
            var coords = uimanager.getMousePos();
            ctx.fillText("Mouse coords - X: " + coords.X + " - Y: " + coords.Y, 10, 100);
        }
    }
    
    this.save = function() 
    {
        var result = {};
        result.version = 1;
        result.lastusedid = lastusedid;
        result.elements = [];
        result.links = [];
        
        var keys = Object.keys(elements);
        for (var i = 0; i < keys.length; i++) 
        {
            result.elements.push(elements[keys[i]].save());
        }
        
        for (var i = 0; i < links.length; i++) 
        {
            result.links.push(links[i].save());
        }
        
        return JSON.stringify(result);
    };
    
    this.load = function(data) 
    {
        // Validation minimale du fichier avant de toucher à l'état courant
        if ((data === null) || (typeof data !== "object") || (data.version !== 1)
            || !Array.isArray(data.elements) || !Array.isArray(data.links)) 
        {
            throw new Error("Invalid network file");
        }
        
        // On libère proprement les éléments et liens existants
        var oldkeys = Object.keys(elements);
        for (var k = 0; k < oldkeys.length; k++) 
        {
            elements[oldkeys[k]].dispose();
        }
        for (var l = 0; l < links.length; l++) 
        {
            links[l].dispose();
        }
        selected = null;
        
        uimanager.reset();
        loadv1(data);
    };
    
    function loadv1(data) 
    {
        links = [];
        elements = {};
        
        for (var i = 0; i < data.elements.length; i++) 
        {
            var element = null;
            var ports = 1;
            if (data.elements[i].ports) 
            {
                ports = data.elements[i].ports;
            } 
            else if (data.elements[i].type === "router") 
            {
                ports = 2;
            }
            element = new Host(data.elements[i].type, ports);
            element.load(data.elements[i]);
            elements[element.id] = element;
        }
        
        for (var i = 0; i < data.links.length; i++) 
        {
            var c1 = _self.findConnector(data.links[i].connector1);
            var c2 = _self.findConnector(data.links[i].connector2);
            if ((c1 === null) || (c2 === null)) 
            {
                continue; // lien orphelin dans le fichier : on l'ignore
            }
            var link = new Link(c1, c2);
            link.load(data.links[i]);
            links.push(link);
        }
        
        if (typeof data.lastusedid === "number") 
        {
            lastusedid = Math.max(lastusedid, data.lastusedid);
        }
    }
    
    this.findConnector = function(id) 
    {
        var keys = Object.keys(elements);
        var result = null;
        var i = 0;
        while ((result === null) && (i < keys.length)) 
        {
            result = elements[keys[i]].getConnectable().findConnector(id);
            i++;
        }
        
        return result;
    };
};
