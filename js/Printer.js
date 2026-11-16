/*
 * This file is part of the Education Network Simulator project and covered 
 * by GPLv3 license. See full terms in the LICENSE file at the root folder
 * or at http://www.gnu.org/licenses/gpl-3.0.html.
 *
 * Imprimante réseau :
 *  - PrinterService : file d'impression RAW / JetDirect (TCP 9100), consommables, compteurs
 *  - PrinterWeb     : page d'administration HTTP (TCP 80), lisible depuis le navigateur d'un ordinateur
 *  - PrintClient    : application « Imprimer un document » des ordinateurs
 */

var PRINTER_PAPER_MAX = 250;        // capacité du bac (feuilles)
var PRINTER_QUEUE_MAX = 20;         // travaux en attente
var PRINTER_PAGE_COST = 120;        // « effort » d'une page (1 s à vitesse normale)
var PRINTER_TONER_PER_PAGE = 0.5;   // % de toner consommé par page
var PRINTER_TONER_LOW = 10;         // seuil d'alerte toner faible (%)

// ---------------------------------------------------------------------------
// Service d'impression
// ---------------------------------------------------------------------------

var PrinterService = function(ifacepos)
{
    var owner = null;
    var ifacepos = ifacepos;
    var paper = PRINTER_PAPER_MAX;
    var toner = 100;
    var totalPages = 0;
    var paused = false;       // « hors ligne »
    var queue = [];
    var current = null;
    var history = [];
    var nextJob = 1;
    var _self = this;

    this.save = function()
    {
        var result = {};
        result.version = 1;
        result.id = this.getId();
        result.ifacepos = ifacepos;
        result.paper = paper;
        result.toner = toner;
        result.totalPages = totalPages;
        result.paused = paused;
        result.nextJob = nextJob;
        result.history = history;
        // Les travaux en cours / en attente sont conservés (reprise après chargement)
        result.queue = (current !== null ? [current] : []).concat(queue).map(function(j)
        {
            return {id: j.id, doc: j.doc, pages: j.pages, from: j.from, printed: 0};
        });
        return result;
    };

    function num(v, min, max, def)
    {
        var n = Number(v);
        return (isNaN(n) || !isFinite(n)) ? def : Math.min(max, Math.max(min, n));
    }

    this.load = function(data)
    {
        paper = Math.round(num(data.paper, 0, PRINTER_PAPER_MAX, PRINTER_PAPER_MAX));
        toner = num(data.toner, 0, 100, 100);
        totalPages = Math.round(num(data.totalPages, 0, 100000000, 0));
        paused = (data.paused === true);
        nextJob = Math.round(num(data.nextJob, 1, 100000000, 1));
        history = [];
        queue = [];
        current = null;
        var i;
        if (Array.isArray(data.history))
        {
            for (i = 0; (i < data.history.length) && (i < 20); i++)
            {
                var h = data.history[i];
                history.push({id: Math.round(num(h.id, 0, 1e9, 0)), doc: String(h.doc).substring(0, 40), pages: Math.round(num(h.pages, 1, 500, 1)), from: String(h.from).substring(0, 40), state: (h.state === "cancelled") ? "cancelled" : "done"});
            }
        }
        if (Array.isArray(data.queue))
        {
            for (i = 0; (i < data.queue.length) && (i < PRINTER_QUEUE_MAX); i++)
            {
                var q = data.queue[i];
                queue.push({id: Math.round(num(q.id, 0, 1e9, 0)), doc: String(q.doc).substring(0, 40), pages: Math.round(num(q.pages, 1, 500, 1)), from: String(q.from).substring(0, 40), printed: 0, progress: 0});
            }
        }
    };

    this.setOwner = function(c_owner) { owner = c_owner; };
    this.getOwner = function() { return owner; };
    this.getIfacepos = function() { return ifacepos; };
    this.getId = function() { return "PrinterService"; };
    this.getAppDescription = function() { return "Printer (RAW 9100)"; };

    this.getMenuEntries = function()
    {
        return [{img: 'img/v3i/printer.svg', text: 'Printer status and queue', js: 'viewPrinterStatus(' + owner.id + ');'}];
    };

    // --- état -------------------------------------------------------------

    // « offline » | « no_toner » | « no_paper » | « printing » | « ready »
    this.getState = function()
    {
        if (paused) { return "offline"; }
        if (toner <= 0) { return "no_toner"; }
        if ((paper <= 0) && ((current !== null) || (queue.length > 0))) { return "no_paper"; }
        if (current !== null) { return "printing"; }
        return "ready";
    };

    this.getStateText = function()
    {
        switch (this.getState())
        {
            case "offline": return _("Offline");
            case "no_toner": return _("Toner empty");
            case "no_paper": return _("Out of paper");
            case "printing": return _("Printing") + " " + current.printed + "/" + current.pages;
            default: return _("Ready");
        }
    };

    // Ligne affichée sous l'icône
    this.getStatusLine = function()
    {
        var dot = (this.getState() === "ready" || this.getState() === "printing") ? "● " : "○ ";
        return dot + this.getStateText() + " · " + Math.round(toner) + " %";
    };

    this.getPaper = function() { return paper; };
    this.getToner = function() { return toner; };
    this.getTotalPages = function() { return totalPages; };
    this.isPaused = function() { return paused; };
    this.getQueue = function() { return (current !== null ? [current] : []).concat(queue); };
    this.getHistory = function() { return history; };

    // --- actions de l'utilisateur (panneau de l'imprimante) ----------------

    this.addPaper = function() { paper = PRINTER_PAPER_MAX; };
    this.replaceToner = function() { toner = 100; };
    this.togglePause = function() { paused = !paused; };

    this.clearQueue = function()
    {
        var all = this.getQueue();
        for (var i = 0; i < all.length; i++)
        {
            addHistory(all[i], "cancelled");
        }
        queue = [];
        current = null;
    };

    function addHistory(job, state)
    {
        history.unshift({id: job.id, doc: job.doc, pages: job.pages, from: job.from, state: state});
        if (history.length > 20)
        {
            history.pop();
        }
    }

    // --- activité : appelée à chaque pas de simulation ----------------------

    this.update = function()
    {
        if (paused || (toner <= 0))
        {
            return;
        }
        if ((current === null) && (queue.length > 0))
        {
            current = queue.shift();
            current.printed = 0;
            current.progress = 0;
        }
        if ((current === null) || (paper <= 0))
        {
            return;
        }
        // La vitesse suit les contrôles d'animation (pause, plus lent, plus rapide)
        current.progress += AnimationControls.MSG_ADVANCE;
        if (current.progress >= PRINTER_PAGE_COST)
        {
            current.progress -= PRINTER_PAGE_COST;
            current.printed++;
            paper--;
            totalPages++;
            toner = Math.max(0, toner - PRINTER_TONER_PER_PAGE);
            if (current.printed >= current.pages)
            {
                addHistory(current, "done");
                current = null;
            }
        }
    };

    // --- réception d'un travail (TCP 9100) ----------------------------------

    function reply(message, code, text, jobid)
    {
        var data = {code: code, description: code + " " + text, jobId: jobid};
        var response = new Message(
            "tcp",
            owner.getConnectable().getIPInfo(ifacepos).getIPv4(),
            message.getOriginIP(),
            owner.getConnectable().getMAC(ifacepos),
            owner.getConnectable().getDstMAC(message.getOriginIP()),
            9100,
            message.getOrigPort(),
            data,
            images[IMAGE_ENVELOPEPRINT]
        );
        owner.getConnectable().getConnector(ifacepos).send(response);
    }

    this.receiveMessage = function(message)
    {
        var data = message.getData();
        if ((data === null) || (typeof data !== "object") || (data.command !== "print"))
        {
            return;
        }
        if (paused)
        {
            reply(message, 503, "Printer offline", 0);
            return;
        }
        if (this.getQueue().length >= PRINTER_QUEUE_MAX)
        {
            reply(message, 503, "Queue full", 0);
            return;
        }
        var job = {
            id: nextJob++,
            doc: String(data.doc === undefined ? "document" : data.doc).substring(0, 40),
            pages: Math.round(num(data.pages, 1, 500, 1)),
            from: String(message.getOriginIP()),
            printed: 0,
            progress: 0
        };
        queue.push(job);
        reply(message, 202, "Job #" + job.id + " queued", job.id);
    };
};

// ---------------------------------------------------------------------------
// Administration web (HTTP 80)
// ---------------------------------------------------------------------------

var PrinterWeb = function(ifacepos)
{
    var owner = null;
    var ifacepos = ifacepos;

    this.save = function() { return {version: 1, id: this.getId(), ifacepos: ifacepos}; };
    this.load = function(data) {};
    this.setOwner = function(c_owner) { owner = c_owner; };
    this.getOwner = function() { return owner; };
    this.getIfacepos = function() { return ifacepos; };
    this.getId = function() { return "PrinterWeb"; };
    this.getMenuEntries = function() { return []; };
    this.getAppDescription = function() { return ""; };

    function statusPage()
    {
        var svc = owner.getApp("PrinterService");
        var ci = owner.getConnectable();
        var html = "<h3>" + escapeHTML(owner.getName()) + "</h3>";
        html += "<table style='width:100%'>";
        html += "<tr><th>" + escapeHTML(_("Status")) + "</th><td><b>" + escapeHTML(svc.getStateText()) + "</b></td></tr>";
        html += "<tr><th>IP</th><td><b>" + escapeHTML(ci.getIPInfo(ifacepos).getIPv4() || "-") + "</b></td></tr>";
        html += "<tr><th>MAC</th><td><b>" + escapeHTML(ci.getMAC(ifacepos) || "-") + "</b></td></tr>";
        html += "<tr><th>" + escapeHTML(_("Toner")) + "</th><td><b>" + Math.round(svc.getToner()) + " %</b></td></tr>";
        html += "<tr><th>" + escapeHTML(_("Paper")) + "</th><td><b>" + svc.getPaper() + " / " + PRINTER_PAPER_MAX + "</b></td></tr>";
        html += "<tr><th>" + escapeHTML(_("Pages printed")) + "</th><td><b>" + svc.getTotalPages() + "</b></td></tr>";
        html += "<tr><th>" + escapeHTML(_("Jobs in queue")) + "</th><td><b>" + svc.getQueue().length + "</b></td></tr>";
        html += "</table>";
        return html;
    }

    this.receiveMessage = function(message)
    {
        var data = message.getData();
        var filename = (data && data.filename) ? String(data.filename) : "";
        var responsedata = {code: 200, contents: statusPage(), description: "200-" + filename};
        var response = new Message(
            "tcp",
            owner.getConnectable().getIPInfo(ifacepos).getIPv4(),
            message.getOriginIP(),
            owner.getConnectable().getMAC(ifacepos),
            owner.getConnectable().getDstMAC(message.getOriginIP()),
            80,
            message.getOrigPort(),
            responsedata,
            images[IMAGE_ENVELOPEHTTP]
        );
        owner.getConnectable().getConnector(ifacepos).send(response);
    };
};

// ---------------------------------------------------------------------------
// Client d'impression (ordinateurs)
// ---------------------------------------------------------------------------

var PrintClient = function(ifacepos)
{
    var owner = null;
    var ifacepos = ifacepos;
    var lastStatus = "";
    var lastKind = "";
    var _self = this;

    this.save = function() { return {version: 1, id: this.getId(), ifacepos: ifacepos}; };
    this.load = function(data) {};
    this.setOwner = function(c_owner) { owner = c_owner; };
    this.getOwner = function() { return owner; };
    this.getIfacepos = function() { return ifacepos; };
    this.getId = function() { return "PrintClient"; };
    this.getAppDescription = function() { return ""; };

    this.getMenuEntries = function()
    {
        return [{img: 'img/v3i/printer.svg', text: 'Print a document', js: 'viewPrintDialog(' + owner.id + ');'}];
    };

    this.getLastStatus = function() { return {text: lastStatus, kind: lastKind}; };

    function setStatus(kind, text)
    {
        lastKind = kind;
        lastStatus = text;
        var el = document.getElementById("printclient_status");
        if (el !== null)
        {
            el.className = "ns-status" + (kind ? " ns-" + kind : "");
            el.textContent = text;
        }
    }

    // « target » : adresse IPv4 ou nom résolu par le client DNS de l'ordinateur
    this.sendJob = function(target, doc, pages)
    {
        target = String(target).trim();
        var ci = owner.getConnectable();
        if (ci.getIPInfo(ifacepos).getIPv4() === null)
        {
            setStatus("warn", _("This computer has no IP address (configure it or request DHCP)."));
            return false;
        }
        var ip = null;
        if (isValidIPv4(target))
        {
            ip = target;
        }
        else
        {
            var dns = owner.getApp("DNSClient");
            ip = (dns !== null) ? dns.getIp(target) : null;
            if (ip === null)
            {
                setStatus("warn", _("Unknown printer. Enter an IP address or look the name up with DNS first."));
                return false;
            }
        }
        var pagesN = parseInt(pages, 10);
        if (isNaN(pagesN) || (pagesN < 1) || (pagesN > 500))
        {
            setStatus("warn", _("The number of pages must be between 1 and 500."));
            return false;
        }
        var mac = ci.getDstMAC(ip);
        if (mac === null)
        {
            setStatus("warn", _("Printer unreachable (no route to") + " " + ip + ").");
            return false;
        }
        var data = {command: "print", doc: String(doc).substring(0, 40), pages: pagesN, description: "PRINT: " + String(doc).substring(0, 20)};
        var message = new Message("tcp", ci.getIPInfo(ifacepos).getIPv4(), ip, ci.getMAC(ifacepos), mac, getDinamycPort(), 9100, data, images[IMAGE_ENVELOPEPRINT]);
        ci.getTrafficManager().registerApplication(_self, message.getOrigPort(), false);
        ci.getConnector(ifacepos).send(message);
        setStatus("", _("Job sent, waiting for the printer..."));
        return true;
    };

    this.receiveMessage = function(message)
    {
        var d = message.getData();
        if (d.code === 202)
        {
            setStatus("ok", _("Job accepted by the printer") + " (#" + d.jobId + ")");
        }
        else
        {
            setStatus("warn", _("Printer refused the job:") + " " + String(d.description));
        }
    };
};

// ---------------------------------------------------------------------------
// Fenêtres
// ---------------------------------------------------------------------------

var printerRefreshTimer = null;

function stopPrinterRefresh()
{
    if (printerRefreshTimer !== null)
    {
        window.clearInterval(printerRefreshTimer);
        printerRefreshTimer = null;
    }
}

function getPrinterLiveHtml(id)
{
    var host = network.getElement(id);
    if (host === null)
    {
        return "";
    }
    var svc = host.getApp("PrinterService");
    var ci = host.getConnectable();
    var state = svc.getState();
    var chip = (state === "ready" || state === "printing") ? "#1e7e34" : "#b35c00";
    var tonerLow = svc.getToner() <= PRINTER_TONER_LOW;
    var html = "<div class='ns-printer'>";
    html += "<p class='ns-chip' style='background:" + chip + ";'>" + escapeHTML(svc.getStateText()) + "</p>";
    html += "<table><tr><th>IP</th><td>" + escapeHTML(ci.getIPInfo(0).getIPv4() || "-") + "</td><th>MAC</th><td>" + escapeHTML(ci.getMAC(0) || "-") + "</td></tr>";
    html += "<tr><th>" + escapeHTML(_("Port")) + "</th><td>RAW 9100</td><th>HTTP</th><td>80</td></tr></table>";
    html += "<p class='ns-meter-label'>" + escapeHTML(_("Toner")) + " <b>" + Math.round(svc.getToner()) + " %</b>" + (tonerLow ? " &#9888; " + escapeHTML(_("Low toner")) : "") + "</p>";
    html += "<div class='ns-meter'><div style='width:" + svc.getToner() + "%;background:" + (tonerLow ? "#b3261e" : "#00507c") + ";'></div></div>";
    html += "<p class='ns-meter-label'>" + escapeHTML(_("Paper")) + " <b>" + svc.getPaper() + " / " + PRINTER_PAPER_MAX + "</b></p>";
    html += "<div class='ns-meter'><div style='width:" + (svc.getPaper() * 100 / PRINTER_PAPER_MAX) + "%;background:" + (svc.getPaper() === 0 ? "#b3261e" : "#00a2fc") + ";'></div></div>";
    html += "<p class='ns-meter-label'>" + escapeHTML(_("Pages printed")) + " <b>" + svc.getTotalPages() + "</b></p>";
    html += "<table><tr><th colspan='4'>" + escapeHTML(_("Jobs in queue")) + " (" + svc.getQueue().length + ")</th></tr>";
    var q = svc.getQueue();
    for (var i = 0; i < q.length; i++)
    {
        html += "<tr><td>#" + q[i].id + "</td><td>" + escapeHTML(q[i].doc) + "</td><td>" + escapeHTML(q[i].from) + "</td><td>" + q[i].printed + "/" + q[i].pages + "</td></tr>";
    }
    if (q.length === 0)
    {
        html += "<tr><td colspan='4'>-</td></tr>";
    }
    html += "</table>";
    var h = svc.getHistory();
    html += "<table><tr><th colspan='4'>" + escapeHTML(_("History")) + "</th></tr>";
    for (var j = 0; (j < h.length) && (j < 6); j++)
    {
        html += "<tr><td>#" + h[j].id + "</td><td>" + escapeHTML(h[j].doc) + "</td><td>" + escapeHTML(h[j].from) + "</td><td>" + h[j].pages + " p. " + (h[j].state === "cancelled" ? "&#10007;" : "&#10003;") + "</td></tr>";
    }
    if (h.length === 0)
    {
        html += "<tr><td colspan='4'>-</td></tr>";
    }
    html += "</table></div>";
    return html;
}

function refreshPrinterWindow(id)
{
    var el = document.getElementById("printer_live");
    if (el === null)
    {
        stopPrinterRefresh();
        return;
    }
    el.innerHTML = getPrinterLiveHtml(id);
    var pb = document.getElementById("printer_pause");
    var host = network.getElement(id);
    if ((pb !== null) && (host !== null))
    {
        pb.value = host.getApp("PrinterService").isPaused() ? _("Go online") : _("Go offline");
    }
}

function viewPrinterStatus(id)
{
    stopPrinterRefresh();
    var host = network.getElement(id);
    var svc = host.getApp("PrinterService");
    var controls = '<input type="button" value="' + escapeHTML(_("Add paper")) + '" onclick="printerAction(' + id + ',\'paper\');" />'
        + '<input type="button" value="' + escapeHTML(_("Replace toner")) + '" onclick="printerAction(' + id + ',\'toner\');" />'
        + '<input type="button" id="printer_pause" value="' + escapeHTML(svc.isPaused() ? _("Go online") : _("Go offline")) + '" onclick="printerAction(' + id + ',\'pause\');" />'
        + '<input type="button" value="' + escapeHTML(_("Clear queue")) + '" onclick="printerAction(' + id + ',\'clear\');" />'
        + '<input type="button" value="' + escapeHTML(_("Close")) + '" onclick="closePrinterWindow();" />';
    var w = new UIWindow('divprinter', host.getName(), 580, 540, false, 1.0);
    w.setContent("<div id='printer_live' style='text-align:left;'>" + getPrinterLiveHtml(id) + "</div>");
    w.setControls(controls);
    w.setMinWidth(600);
    w.render();
    printerRefreshTimer = window.setInterval(function() { refreshPrinterWindow(id); }, 400);
}

function printerAction(id, action)
{
    var host = network.getElement(id);
    if (host === null)
    {
        return;
    }
    var svc = host.getApp("PrinterService");
    switch (action)
    {
        case "paper": svc.addPaper(); break;
        case "toner": svc.replaceToner(); break;
        case "pause": svc.togglePause(); break;
        case "clear": svc.clearQueue(); break;
    }
    refreshPrinterWindow(id);
}

function closePrinterWindow()
{
    stopPrinterRefresh();
    var w = uimanager.getWindow("divprinter");
    if (w)
    {
        w.dispose();
    }
}

function viewPrintDialog(id)
{
    var host = network.getElement(id);
    var client = host.getApp("PrintClient");
    var printers = network.getElements().filter(function(e) { return e.getType() === "printer"; });
    var html = "<div style='text-align:left;'>";
    html += "<p><label class='ns-stack' for='print_target'>" + escapeHTML(_("Printer:")) + "</label><br/>";
    html += "<select id='print_target' style='width:100%;' onchange='document.getElementById(\"print_manual\").value=this.value;'>";
    html += "<option value=''>" + escapeHTML(_("-- choose a printer --")) + "</option>";
    for (var i = 0; i < printers.length; i++)
    {
        var ip = printers[i].getConnectable().getIPInfo(0).getIPv4();
        if (ip !== null)
        {
            html += "<option value='" + escapeHTML(ip) + "'>" + escapeHTML(printers[i].getName() + " (" + ip + ")") + "</option>";
        }
    }
    html += "</select></p>";
    html += "<p><label class='ns-stack' for='print_manual'>" + escapeHTML(_("IP address or name:")) + "</label><input type='text' id='print_manual' style='width:100%;' /></p>";
    html += "<p><label class='ns-stack' for='print_doc'>" + escapeHTML(_("Document:")) + "</label><input type='text' id='print_doc' value='document.pdf' maxlength='40' style='width:100%;' /></p>";
    html += "<p><label class='ns-stack' for='print_pages'>" + escapeHTML(_("Pages:")) + "</label> <input type='text' id='print_pages' value='1' size='4' /></p>";
    html += "<div id='printclient_status' class='ns-status'></div></div>";
    var controls = '<input type="button" value="' + escapeHTML(_("Print")) + '" onclick="doPrint(' + id + ');" />'
        + '<input type="button" value="' + escapeHTML(_("Close")) + '" onclick="closePrintDialog();" />';
    var w = new UIWindow('divprint', _('Print a document') + " - " + host.getName(), 420, 400, false, 1.0);
    w.setContent(html);
    w.setControls(controls);
    w.render();
    var last = client.getLastStatus();
    var el = document.getElementById("printclient_status");
    if ((el !== null) && (last.text !== ""))
    {
        el.className = "ns-status" + (last.kind ? " ns-" + last.kind : "");
        el.textContent = last.text;
    }
}

function doPrint(id)
{
    var host = network.getElement(id);
    var client = host.getApp("PrintClient");
    client.sendJob(document.getElementById("print_manual").value, document.getElementById("print_doc").value, document.getElementById("print_pages").value);
}

function closePrintDialog()
{
    var w = uimanager.getWindow("divprint");
    if (w)
    {
        w.dispose();
    }
}
