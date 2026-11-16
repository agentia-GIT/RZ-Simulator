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

function selectLinkConnectors(id1, id2) 
{
    createBkDiv();
    createLinkConnectorsDiv(id1, id2);
}

function getElementConnectorsSelectables(host) 
{
    var result = "";
    for (var i = 0; i < host.getConnectable().getConnectorNumber(); i++) 
    {
        var connector = host.getConnectable().getConnector(i);
        var disabledTxt = connector.isConnected() ? " disabled='disabled' " : "";
        result += "<input type='radio' name='link_host_" + host.id + "' value='" + i + "' id='link_host_" + host.id + "_" + i + "' " + disabledTxt + "/>";
        result += " " + host.getConnectorDesc(i);
        result += "<br/>";
    }
    return result;
}

function createLinkConnectorsDiv(id1, id2) 
{
    var host1 = network.getElement(id1);
    var host2 = network.getElement(id2);
    /*var div = document.createElement("div");
    var l = window.innerWidth / 2 - 200;
    var t = window.innerHeight / 2 - 200;
    
    div.setAttribute('style', 'position:absolute;top:' + t + 'px;left:' + l + 'px;z-index:110;background-color:white;width:400px;height:400px;border-radius:10px;border:1px solid;padding:10px;text-align:center;');
    div.setAttribute('id', 'divlinkconnectors');*/
    var html = '<table style="font-size:0.8em;">';
    html += '<tr><th>'+escapeHTML(host1.getName())+'</th><th>'+escapeHTML(host2.getName())+'</th></tr>';
    html += '<tr>';
    html += '<td>';
    html += getElementConnectorsSelectables(host1);
    html += '</td>';
    html += '<td>';
    html += getElementConnectorsSelectables(host2);
    html += '</td>';
    html += '</tr>';
    html += '</table>';
    var controls = '<p>\
  <input type="button" id="upload" value="'+_("Save")+'" onclick="saveLinkConnectors(' + id1 + ',' + id2 + ');" />\
  <input type="button" id="cancel" value="'+_("Cancel")+'" onclick="cancelLinkConnectors();" />\
  </p>';
    /*div.innerHTML = html;
    document.body.appendChild(div);*/
    var w = new UIWindow('divlinkconnectors', 'Create Link', 400, 400, false, 1.0);
    w.setContent(html);
    w.setControls(controls);
    w.render();
}

function saveLinkConnectors(id1, id2) 
{
    var selected1 = document.querySelector('input[name="link_host_' + id1 + '"]:checked');
    var selected2 = document.querySelector('input[name="link_host_' + id2 + '"]:checked');
    if ((selected1 !== null) && (selected2 !== null)) 
    {
        var c1 = parseInt(selected1.value, 10);
        var c2 = parseInt(selected2.value, 10);
        if (!isNaN(c1) && !isNaN(c2)) 
        {
            var created = network.createLink(id1, c1, id2, c2);
            uimanager.getWindow("divlinkconnectors").dispose();
            removeBodyDiv('divbk');
            if ((created === false) && (network.getLastLinkError() !== null))
            {
                // Ex. association Wi-Fi refusée : SSID ou mot de passe différent
                alert(network.getLastLinkError());
            }
        }
    }
}

function cancelLinkConnectors() 
{
    uimanager.getWindow("divlinkconnectors").dispose();
    removeBodyDiv('divbk');
}

/*
- El link tiene un UILine asociado
- Cada vez que se mueve uno de los drawables se actualiza el UILine
- Dispose: borra el UILine
*/

var Link = function(c1, c2) 
{
    this.id = getNextID();
    var connector1 = c1;
    var connector2 = c2;
    var messages = [];
    var _self = this;
    var uiline = null;
    var menu = null;
    
    this.save = function() 
    {
        var result = {};
        result.version = 1;
        result.id = this.id;
        result.connector1 = connector1.id;
        result.connector2 = connector2.id;
        
        return result;
    };
    
    this.load = function(data) 
    {
        this.id = data.id;
    };
    
    function init() 
    {
        connector1.setLink(_self);
        connector2.setLink(_self);
        var vertices = getVertices();
        uiline = new UILine(null, null, _self, vertices.x1, vertices.y1, vertices.x2, vertices.y2, 0);
        uimanager.addClickable(uiline);
        connector1.getConnectable().getOwner().getDrawable().addObserver(_self);
        connector2.getConnectable().getOwner().getDrawable().addObserver(_self);
        menu = new UIMenu("Link", 0, 0, false);
        addStaticMenu();
        uimanager.addMenu(menu);
    }
    
    function addStaticMenu() 
    {
        menu.addEntry("img/v3i/delete.svg", "Delete element", "deleteSelected();");
    }
    
    this.drawableChanged = function() 
    {
        var vertices = getVertices();
        uiline.setCoords(vertices.x1, vertices.y1, vertices.x2, vertices.y2, 0);
    };
    
    this.dispose = function() 
    {
        uimanager.removeClickable(uiline);
        connector1.getConnectable().getOwner().getDrawable().deleteObserver(_self);
        connector2.getConnectable().getOwner().getDrawable().deleteObserver(_self);
        if (menu.getVisible()) 
        {
            menu.hide();
        }
        uimanager.deleteMenu(menu);
    };
    
    this.getConnector1 = function() 
    {
        return connector1;
    };
    
    this.getConnector2 = function() 
    {
        return connector2;
    };
    
    this.delete = function() 
    {
        connector1.setLink(null);
        connector2.setLink(null);
    };
    
    this.addMessage = function(orig, message) {
        var data = {};
        data.pos = 0;
        data.message = message;
        data.orig = orig;
        data.dst = (orig === connector1) ? connector2 : connector1;
        messages.push(data);
    };
    
    function getMessageCoords(pos) 
    {
        var origX = messages[pos].orig.getConnectable().getOwner().getDrawable().getCenterX();
        var origY = messages[pos].orig.getConnectable().getOwner().getDrawable().getCenterY();
        var dstX = messages[pos].dst.getConnectable().getOwner().getDrawable().getCenterX();
        var dstY = messages[pos].dst.getConnectable().getOwner().getDrawable().getCenterY();
        var X = origX + (dstX - origX) * messages[pos].pos / 100;
        var Y = origY + (dstY - origY) * messages[pos].pos / 100;
        
        return {x: X,y: Y};
    }

    function drawMessageInfo(ctx, message)
    {
        // Texte gras, plus grand, sur fond blanc translucide pour rester lisible sur le quadrillage
        var parts = message.getStrInfo().split("\n");
        var top = message.getImage().height + 3;
        ctx.font = "700 12px 'Open Sans', Arial, sans-serif";
        ctx.textBaseline = "top";
        var width = 0;
        for (var k = 0; k < parts.length; k++)
        {
            width = Math.max(width, ctx.measureText(parts[k]).width);
        }
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        ctx.fillRect(-2, top - 1, width + 6, parts.length * 15 + 3);
        ctx.fillStyle = "#000001";
        for (var i = 0; i < parts.length; i++)
        {
            ctx.fillText(parts[i], 1, top + i * 15);
        }
        ctx.textBaseline = "alphabetic";
    }
    
    function drawMessages(ctx) 
    {
        for (var i = 0; i < messages.length; i++) 
        {
            var coords = getMessageCoords(i);
            ctx.save();
            ctx.translate(coords.x, coords.y);
            ctx.drawImage(messages[i].message.getImage(), 0, 0);
            drawMessageInfo(ctx,messages[i].message);
            ctx.restore();
        }
    }
    
    function getVertices() 
    {
        return {
            x1: connector1.getConnectable().getOwner().getDrawable().getCenterX(),
            y1: connector1.getConnectable().getOwner().getDrawable().getCenterY(),
            x2: connector2.getConnectable().getOwner().getDrawable().getCenterX(),
            y2: connector2.getConnectable().getOwner().getDrawable().getCenterY()
        };
    }
    
    /*function drawConnectorDescription(ctx, connector, x1, y1, x2, y2) 
    {
        var mod = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        var X = x1 + (x2 - x1) * 32 / mod;
        var Y = y1 + (y2 - y1) * 32 / mod;
        ctx.font = '8pt';
        ctx.fillStyle = "black";
        ctx.fillText(connector.getDescription(), X, Y);
    }*/
    
    // Lien radio : l'une des extrémités est un emplacement Wi-Fi d'une borne
    function isWireless()
    {
        var a = connector1.getConnectable();
        var b = connector2.getConnectable();
        return a.getOwner().isWirelessPort(a.getConnectorPos(connector1)) || b.getOwner().isWirelessPort(b.getConnectorPos(connector2));
    }

    this.isWireless = isWireless;

    function drawWifiBadge(ctx, x, y)
    {
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#00507c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "#00a2fc";
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        for (var r = 3; r <= 9; r += 3)
        {
            ctx.beginPath();
            ctx.arc(x, y + 5, r + 1, Math.PI * 1.25, Math.PI * 1.75);
            ctx.stroke();
        }
        ctx.fillStyle = "#00a2fc";
        ctx.beginPath();
        ctx.arc(x, y + 5, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    this.draw = function(ctx, selected) 
    {
        var vertices = getVertices();
        var wireless = isWireless();
        ctx.lineWidth = selected ? 3 : 2;
        ctx.strokeStyle = selected ? "#00a2fc" : "#00507c";
        if (wireless)
        {
            ctx.setLineDash([7, 6]);
        }
        ctx.beginPath();
        ctx.moveTo(vertices.x1, vertices.y1);
        ctx.lineTo(vertices.x2, vertices.y2);
        ctx.stroke();
        if (wireless)
        {
            ctx.setLineDash([]);
            drawWifiBadge(ctx, (vertices.x1 + vertices.x2) / 2, (vertices.y1 + vertices.y2) / 2);
        }
        
        //drawConnectorDescription(ctx, connector1, vertices.x1, vertices.y1, vertices.x2, vertices.y2);
        //drawConnectorDescription(ctx, connector2, vertices.x2, vertices.y2, vertices.x1, vertices.y1);
        
        drawMessages(ctx);
    };
    
    this.update = function() 
    {
        var newmessages = [];
        var arrived = [];
        for (var i = 0; i < messages.length; i++) 
        {
            messages[i].pos += AnimationControls.MSG_ADVANCE;
            if (messages[i].pos < 100) 
            {
                newmessages.push(messages[i]);
            } 
            else 
            {
                arrived.push(messages[i]);
            }
        }
        
        // Correction : on remplace d'abord la liste, puis on livre les messages
        // arrivés. Avant, une réponse envoyée sur ce même lien pendant la
        // réception était ajoutée à l'ancienne liste puis perdue.
        messages = newmessages;
        for (var j = 0; j < arrived.length; j++)
        {
            arrived[j].dst.receive(arrived[j].message);
        }
    };
    
    this.messageHasCoords = function(pos, x, y) 
    {
        var coords = getMessageCoords(pos);
        
        return (coords.x <= x) && (x <= coords.x + messages[pos].message.getImage().width) && 
        (coords.y <= y) && (y <= coords.y + messages[pos].message.getImage().height);
    };
    
    this.getMessage = function(pos) 
    {
        return messages[pos].message;
    };
    
    this.getMessageCount = function() 
    {
        return messages.length;
    };
    
    this.hasCoords = function(x, y) 
    {
        var vertices = getVertices();
        
        return distToSegment({x: x,y: y}, {x: vertices.x1,y: vertices.y1}, {x: vertices.x2,y: vertices.y2}) < LINE_SELECT_TOLERANCE;
    };
    
    this.getCenter = function() 
    {
        var result = {};
        var vertices = getVertices();
        
        result.x = (vertices.x1 + vertices.x2) / 2.0;
        result.y = (vertices.y1 + vertices.y2) / 2.0;
        
        return result;
    };
    
    this.getMenu = function() 
    {
        return menu;
    };
    
    init();
};
