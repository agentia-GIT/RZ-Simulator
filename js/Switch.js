/*
 * This file is part of the Education Network Simulator project and covered 
 * by GPLv3 license. See full terms in the LICENSE file at the root folder
 * or at http://www.gnu.org/licenses/gpl-3.0.html.
 *
 * Commutateurs (switch) 8 / 16 / 24 / 48 ports : état des ports, arrêt/mise en service
 * d'un port (« shutdown »), table d'adresses MAC apprises.
 */

var SWITCH_SIZES = [8, 16, 24, 48];
var switchRefreshTimer = null;

function stopSwitchRefresh()
{
    if (switchRefreshTimer !== null)
    {
        window.clearInterval(switchRefreshTimer);
        switchRefreshTimer = null;
    }
}

// Nom de l'équipement qui possède cette adresse MAC (ou chaîne vide)
function findNameForMAC(mac)
{
    var elems = network.getElements();
    for (var i = 0; i < elems.length; i++)
    {
        var ci = elems[i].getConnectable();
        for (var p = 0; p < ci.getConnectorNumber(); p++)
        {
            if (ci.getMAC(p) === mac)
            {
                return elems[i].getName();
            }
        }
    }
    return "";
}

function getSwitchHtml(id)
{
    var host = network.getElement(id);
    var ci = host.getConnectable();
    var n = ci.getConnectorNumber();
    var up = 0;
    var ports = "";
    for (var i = 0; i < n; i++)
    {
        var c = ci.getConnector(i);
        var cls = "ns-port";
        var peer = "";
        if (c.isDisabled())
        {
            cls += " ns-port-off";
            peer = _("Port shut down");
        }
        else if (c.isConnected())
        {
            cls += " ns-port-up";
            up++;
            var other = c.getConnectedConnector();
            peer = other.getConnectable().getOwner().getName();
        }
        ports += "<a class='" + cls + "' href='#' title='" + escapeHTML(peer) + "' onclick='switchTogglePort(" + id + "," + i + "); return false;'>" + (i + 1) + "</a>";
    }
    var html = "<div style='text-align:left;'>";
    html += "<p><b>" + n + " " + escapeHTML(_("ports")) + "</b> &middot; " + up + " " + escapeHTML(_("active")) + "</p>";
    html += "<div class='ns-ports'>" + ports + "</div>";
    html += "<p class='ns-hint'>" + escapeHTML(_("Click a port to shut it down or bring it back up.")) + "</p>";
    html += "<table><tr><th>" + escapeHTML(_("Port")) + "</th><th>" + escapeHTML(_("Status")) + "</th><th>" + escapeHTML(_("Connected to")) + "</th></tr>";
    var shown = 0;
    for (var j = 0; j < n; j++)
    {
        var cj = ci.getConnector(j);
        if (!cj.isConnected() && !cj.isDisabled())
        {
            continue;
        }
        shown++;
        var state = cj.isDisabled() ? _("Shut down") : _("Up");
        var to = cj.isConnected() ? cj.getConnectedConnector().getConnectable().getOwner().getName() : "-";
        html += "<tr><td><b>" + (j + 1) + "</b></td><td>" + escapeHTML(state) + "</td><td>" + escapeHTML(to) + "</td></tr>";
    }
    if (shown === 0)
    {
        html += "<tr><td colspan='3'>" + escapeHTML(_("No cable connected.")) + "</td></tr>";
    }
    html += "</table>";
    var macs = ci.getLearnedMACs();
    macs.sort(function(a, b) { return a.port - b.port; });
    html += "<table><tr><th colspan='3'>" + escapeHTML(_("MAC address table")) + " (" + macs.length + ")</th></tr>";
    html += "<tr><th>MAC</th><th>" + escapeHTML(_("Port")) + "</th><th>" + escapeHTML(_("Device")) + "</th></tr>";
    for (var k = 0; k < macs.length; k++)
    {
        html += "<tr><td>" + escapeHTML(macs[k].mac) + "</td><td><b>" + (macs[k].port + 1) + "</b></td><td>" + escapeHTML(findNameForMAC(macs[k].mac) || "-") + "</td></tr>";
    }
    if (macs.length === 0)
    {
        html += "<tr><td colspan='3'>" + escapeHTML(_("No address learned yet.")) + "</td></tr>";
    }
    html += "</table></div>";
    return html;
}

function refreshSwitchWindow(id)
{
    var el = document.getElementById("switch_live");
    if ((el === null) || (network.getElement(id) === null))
    {
        stopSwitchRefresh();
        return;
    }
    var html = getSwitchHtml(id);
    if (el.getAttribute("data-html") !== html)
    {
        el.innerHTML = html;
        el.setAttribute("data-html", html);
    }
}

function showSwitchTable(id)
{
    stopSwitchRefresh();
    var host = network.getElement(id);
    var controls = '<input type="button" value="' + escapeHTML(_("Clear MAC table")) + '" onclick="switchClearMACs(' + id + ');" />'
        + '<input type="button" value="' + escapeHTML(_("Close")) + '" onclick="closeSwitchWindow();" />';
    var w = new UIWindow('divswitch', host.getName() + " - " + _("Ports and MAC table"), 560, 500, false, 1.0);
    w.setContent("<div id='switch_live'></div>");
    w.setControls(controls);
    w.setMinWidth(560);
    w.render();
    refreshSwitchWindow(id);
    switchRefreshTimer = window.setInterval(function() { refreshSwitchWindow(id); }, 500);
}

function switchTogglePort(id, port)
{
    var c = network.getElement(id).getConnectable().getConnector(port);
    c.setDisabled(!c.isDisabled());
    refreshSwitchWindow(id);
}

function switchClearMACs(id)
{
    network.getElement(id).getConnectable().clearLearnedMACs();
    refreshSwitchWindow(id);
}

function closeSwitchWindow()
{
    stopSwitchRefresh();
    var w = uimanager.getWindow("divswitch");
    if (w)
    {
        w.dispose();
    }
}
