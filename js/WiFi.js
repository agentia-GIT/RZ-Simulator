/*
 * This file is part of the Education Network Simulator project and covered 
 * by GPLv3 license. See full terms in the LICENSE file at the root folder
 * or at http://www.gnu.org/licenses/gpl-3.0.html.
 *
 * Wi-Fi : paramètres de la borne, liste des stations, profil de connexion des clients.
 * La borne se comporte comme un pont de niveau 2 (comme un switch) : le port 0 est la
 * liaison filaire vers le réseau, les ports suivants sont des emplacements radio.
 * Une station (ordinateur, imprimante) ne s'associe que si le SSID et, pour un réseau
 * protégé, le mot de passe correspondent à ceux de la borne.
 */

var WIFI_CHANNELS = {"2.4": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], "5": [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140]};

function wifiChannelOptions(band, selected)
{
    var list = WIFI_CHANNELS[band === "5" ? "5" : "2.4"];
    var html = "";
    for (var i = 0; i < list.length; i++)
    {
        html += "<option value='" + list[i] + "'" + (list[i] === selected ? " selected='selected'" : "") + ">" + list[i] + "</option>";
    }
    return html;
}

function wifiBandChanged()
{
    var band = document.getElementById("wifi_band").value;
    var channel = document.getElementById("wifi_channel");
    channel.innerHTML = wifiChannelOptions(band, band === "5" ? 36 : 6);
}

function wifiSecurityChanged()
{
    var open = (document.getElementById("wifi_security").value === "open");
    document.getElementById("wifi_key").disabled = open;
}

// ---------------------------------------------------------------------------
// Borne : paramètres
// ---------------------------------------------------------------------------

function editWifiSettings(id)
{
    var host = network.getElement(id);
    var w = host.getWifi();
    var html = "<div style='text-align:left;'>";
    html += "<p><label><input type='checkbox' id='wifi_enabled'" + (w.enabled ? " checked='checked'" : "") + " /> <b>" + escapeHTML(_("Wi-Fi enabled")) + "</b></label></p>";
    html += "<p><label for='wifi_ssid'>" + escapeHTML(_("Network name (SSID):")) + "</label><br/><input type='text' id='wifi_ssid' maxlength='32' style='width:95%;' value='" + escapeHTML(w.ssid) + "' /></p>";
    html += "<p><label for='wifi_security'>" + escapeHTML(_("Security:")) + "</label><br/><select id='wifi_security' onchange='wifiSecurityChanged();'>";
    html += "<option value='open'" + (w.security === "open" ? " selected='selected'" : "") + ">" + escapeHTML(_("Open (no password)")) + "</option>";
    html += "<option value='wpa2'" + (w.security === "wpa2" ? " selected='selected'" : "") + ">WPA2-Personal</option>";
    html += "<option value='wpa3'" + (w.security === "wpa3" ? " selected='selected'" : "") + ">WPA3-Personal</option></select></p>";
    html += "<p><label for='wifi_key'>" + escapeHTML(_("Password (8 to 63 characters):")) + "</label><br/><input type='text' id='wifi_key' maxlength='63' style='width:95%;' value='" + escapeHTML(w.key) + "'" + (w.security === "open" ? " disabled='disabled'" : "") + " /></p>";
    html += "<p><label for='wifi_band'>" + escapeHTML(_("Band:")) + "</label> <select id='wifi_band' onchange='wifiBandChanged();'>";
    html += "<option value='2.4'" + (w.band === "2.4" ? " selected='selected'" : "") + ">2,4 GHz</option><option value='5'" + (w.band === "5" ? " selected='selected'" : "") + ">5 GHz</option></select> ";
    html += "<label for='wifi_channel'>" + escapeHTML(_("Channel")) + "</label> <select id='wifi_channel'>" + wifiChannelOptions(w.band, w.channel) + "</select></p>";
    html += "<p style='font-size:.85em;color:#495057;'>" + escapeHTML(_("The access point bridges its Wi-Fi stations to its wired LAN port. Up to 8 stations.")) + "</p>";
    html += "</div>";
    var controls = '<input type="button" value="' + escapeHTML(_("Save")) + '" onclick="saveWifiSettings(' + id + ');" />'
        + '<input type="button" value="' + escapeHTML(_("Cancel")) + '" onclick="closeWifiWindow(\'divwifiap\');" />';
    var win = new UIWindow('divwifiap', host.getName() + " - Wi-Fi", 420, 430, false, 1.0);
    win.setContent(html);
    win.setControls(controls);
    win.render();
}

function saveWifiSettings(id)
{
    var host = network.getElement(id);
    var ssid = document.getElementById("wifi_ssid").value.trim();
    var security = document.getElementById("wifi_security").value;
    var key = document.getElementById("wifi_key").value;
    if (ssid === "")
    {
        alert(_("The network name (SSID) cannot be empty."));
        return;
    }
    if ((security !== "open") && ((key.length < 8) || (key.length > 63)))
    {
        alert(_("The password must contain 8 to 63 characters."));
        return;
    }
    host.setWifi({
        enabled: document.getElementById("wifi_enabled").checked,
        ssid: ssid,
        security: security,
        key: (security === "open") ? "" : key,
        band: document.getElementById("wifi_band").value,
        channel: document.getElementById("wifi_channel").value
    });
    closeWifiWindow('divwifiap');
    var dropped = network.checkWirelessLinks();
    if (dropped.length > 0)
    {
        alert(_("These stations were disconnected:") + "\n" + dropped.join("\n"));
    }
}

function closeWifiWindow(windowid)
{
    var w = uimanager.getWindow(windowid);
    if (w)
    {
        w.dispose();
    }
}

// ---------------------------------------------------------------------------
// Borne : stations associées et canaux
// ---------------------------------------------------------------------------

function showWifiStations(id)
{
    var host = network.getElement(id);
    var w = host.getWifi();
    var stations = host.getStations();
    var html = "<div style='text-align:left;'>";
    html += "<p><b>" + escapeHTML(w.enabled ? w.ssid : _("Wi-Fi off")) + "</b> &middot; " + escapeHTML(_("Channel") + " " + w.channel + " (" + (w.band === "5" ? "5" : "2,4") + " GHz)") + " &middot; " + escapeHTML(w.security === "open" ? _("Open") : w.security.toUpperCase()) + "</p>";
    html += "<table><tr><th>" + escapeHTML(_("Station")) + "</th><th>IP</th><th>MAC</th></tr>";
    for (var i = 0; i < stations.length; i++)
    {
        var ci = stations[i].getConnectable();
        html += "<tr><td>" + escapeHTML(stations[i].getName()) + "</td><td>" + escapeHTML(ci.getIPInfo(0).getIPv4() || "-") + "</td><td>" + escapeHTML(ci.getMAC(0) || "-") + "</td></tr>";
    }
    if (stations.length === 0)
    {
        html += "<tr><td colspan='3'>" + escapeHTML(_("No station connected.")) + "</td></tr>";
    }
    html += "</table>";
    var conflicts = network.getChannelConflicts(host);
    if (conflicts.length > 0)
    {
        html += "<p class='ns-status ns-warn'>&#9888; " + escapeHTML(_("Channel interference with:")) + " " + escapeHTML(conflicts.map(function(c) { return c.getName() + " (" + _("Channel") + " " + c.getWifi().channel + ")"; }).join(", ")) + "</p>";
    }
    html += "</div>";
    var controls = '<input type="button" value="' + escapeHTML(_("Close")) + '" onclick="closeWifiWindow(\'divwifistations\');" />';
    var win = new UIWindow('divwifistations', host.getName() + " - " + _("Connected stations"), 440, 340, false, 1.0);
    win.setContent(html);
    win.setControls(controls);
    win.render();
}

// ---------------------------------------------------------------------------
// Client : profil de connexion Wi-Fi
// ---------------------------------------------------------------------------

function editWifiClient(id)
{
    var host = network.getElement(id);
    var w = host.getWifi();
    var html = "<div style='text-align:left;'>";
    html += "<p><label for='wificl_ssid'>" + escapeHTML(_("Network name (SSID):")) + "</label><br/><input type='text' id='wificl_ssid' maxlength='32' style='width:95%;' value='" + escapeHTML(w.ssid) + "' /></p>";
    html += "<p><label for='wificl_key'>" + escapeHTML(_("Password:")) + "</label><br/><input type='text' id='wificl_key' maxlength='63' style='width:95%;' value='" + escapeHTML(w.key) + "' /></p>";
    html += "<p style='font-size:.85em;color:#495057;'>" + escapeHTML(_("Then create a link between this device and a Wi-Fi slot of an access point.")) + "</p>";
    html += "</div>";
    var controls = '<input type="button" value="' + escapeHTML(_("Save")) + '" onclick="saveWifiClient(' + id + ');" />'
        + '<input type="button" value="' + escapeHTML(_("Cancel")) + '" onclick="closeWifiWindow(\'divwificlient\');" />';
    var win = new UIWindow('divwificlient', host.getName() + " - " + _("Wi-Fi connection"), 400, 300, false, 1.0);
    win.setContent(html);
    win.setControls(controls);
    win.render();
}

function saveWifiClient(id)
{
    var host = network.getElement(id);
    host.setWifi({ssid: document.getElementById("wificl_ssid").value.trim(), key: document.getElementById("wificl_key").value});
    closeWifiWindow('divwificlient');
    var dropped = network.checkWirelessLinks();
    if (dropped.length > 0)
    {
        alert(_("These stations were disconnected:") + "\n" + dropped.join("\n"));
    }
}
