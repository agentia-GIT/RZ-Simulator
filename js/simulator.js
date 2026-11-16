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

// Point d'apparition des nouveaux équipements : juste à gauche de la fenêtre des
// contrôles d'animation (coordonnées du canvas). Si la place est occupée, on continue
// vers la gauche, puis on passe à la ligne suivante.
// ---------------------------------------------------------------------------
// Sauvegarde automatique : le réseau est conservé dans le navigateur (localStorage)
// et rechargé au démarrage, pour ne plus rien perdre en rafraîchissant la page.
// ---------------------------------------------------------------------------
var AUTOSAVE_KEY = "networksimulator.autosave";
var lastAutosave = null;

function restoreAutosave()
{
    var raw = null;
    try
    {
        raw = window.localStorage.getItem(AUTOSAVE_KEY);
    }
    catch (e)
    {
        return;
    }
    if (raw === null)
    {
        lastAutosave = network.save();
        return;
    }
    try
    {
        network.load(JSON.parse(raw));
        lastAutosave = network.save();
    }
    catch (e)
    {
        // Données illisibles : on les écarte plutôt que de bloquer l'application
        try { window.localStorage.removeItem(AUTOSAVE_KEY); } catch (e2) {}
        network.load({version: 1, elements: [], links: []});
        lastAutosave = network.save();
    }
}

function autosaveNow()
{
    if (typeof network === "undefined" || network === null)
    {
        return;
    }
    var data = network.save();
    if (data === lastAutosave)
    {
        return;
    }
    try
    {
        window.localStorage.setItem(AUTOSAVE_KEY, data);
        lastAutosave = data;
    }
    catch (e)
    {
        // stockage plein ou interdit (navigation privée) : on réessaiera plus tard
    }
}

function startAutosave()
{
    window.setInterval(autosaveNow, 1500);
    window.addEventListener("pagehide", autosaveNow);
    window.addEventListener("beforeunload", autosaveNow);
    document.addEventListener("visibilitychange", function()
    {
        if (document.visibilityState === "hidden")
        {
            autosaveNow();
        }
    });
}

// Efface le réseau courant (et la sauvegarde automatique) après confirmation
function newNetwork()
{
    if (!window.confirm(_("Delete the current network and start a new one?")))
    {
        return;
    }
    network.load({version: 1, elements: [], links: []});
    autosaveNow();
}

function getSpawnPoint()
{
    var canvas = document.getElementById("simcanvas");
    var bbox = canvas.getBoundingClientRect();
    // pixels de l'écran -> coordonnées de la zone de travail (densité d'écran et zoom)
    var scale = (canvas.width / bbox.width) / network.getZoom();
    var win = AnimationControls.controlsWindow;
    var startX = 380;
    var startY = 70;
    if (win !== null)
    {
        // La fenêtre d'animation est fixe à l'écran : on la convertit en position dans la zone visible
        var pos = win.getPos();
        startX = (pos.x - (bbox.left + getPageScrollX())) * scale - 90;
        startY = (pos.y - (bbox.top + getPageScrollY())) * scale;
    }
    startX = Math.max(10, startX);
    var STEP = 140;
    var x = startX;
    var y = startY;
    var others = network.getElements();
    for (var guard = 0; guard < 400; guard++)
    {
        var busy = false;
        for (var i = 0; (i < others.length) && !busy; i++)
        {
            var d = others[i].getDrawable();
            busy = (Math.abs(d.getX() - x) < STEP - 4) && (Math.abs(d.getY() - y) < 130);
        }
        if (!busy)
        {
            break;
        }
        x -= STEP;
        if (x < 10)
        {
            x = startX;
            y += 140;
        }
    }
    return {x: x, y: y};
}

function newElement(type) 
{
    var p = getSpawnPoint();
    switch (type) 
    {
        case "host":
            network.createComputer(p.x, p.y);
            break;
        case "dns":
            network.createDNSServer(p.x, p.y);
            break;
        case "dhcp":
            network.createDHCPServer(p.x, p.y);
            break;
        case "web":
            network.createHTTPServer(p.x, p.y);
            break;
        case "switch":
        case "switch8":
            network.createSwitch(p.x, p.y, 8);
            break;
        case "switch16":
            network.createSwitch(p.x, p.y, 16);
            break;
        case "switch24":
            network.createSwitch(p.x, p.y, 24);
            break;
        case "switch48":
            network.createSwitch(p.x, p.y, 48);
            break;
        case "router":
            network.createRouter(p.x, p.y);
            break;
        case "printer":
            network.createPrinter(p.x, p.y);
            break;
        case "accesspoint":
            network.createAccessPoint(p.x, p.y);
            break;
    }
}

function simulator(imgs) 
{
    images = imgs;
    var container = document.getElementById("simcontainer");
    var canvas = document.getElementById("simcanvas");
    
    // Taille initiale : la fenêtre ; ensuite le réseau ajuste la zone de travail selon les objets et le zoom
    var W = Math.max(1, Math.round(document.documentElement.clientWidth * window.devicePixelRatio));
    var H = Math.max(1, Math.round(document.documentElement.clientHeight * window.devicePixelRatio));
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = (W / window.devicePixelRatio) + "px";
    canvas.style.height = (H / window.devicePixelRatio) + "px";
    // « alpha: false » : le fond est entièrement repeint à chaque image, ce qui permet à
    // Firefox d'optimiser la composition. (L'option « antialias » n'existe pas pour un
    // contexte 2D ; elle était ignorée.)
    var ctx = canvas.getContext("2d", {alpha: false});
    
    // Langue : choix mémorisé ou langue du navigateur (toutes les langues sont déjà enregistrées)
    uitranslation.detectInitialLocale();
    document.documentElement.setAttribute("lang", uitranslation.getCurrent().split("_")[0]);

    // Précharge les polices du thème (le titre dessiné dans le canvas les utilise)
    if (document.fonts && document.fonts.load)
    {
        document.fonts.load("700 22px Manrope");
        document.fonts.load("italic 400 12px 'Open Sans'");
    }

    uimanager = new UIManager();

    network = new Network(images, ctx, W, H);
    network.init();
    
    if (NetworkSimulator.initialdata !== null)
    {
      network.load(NetworkSimulator.initialdata);
    }
    else
    {
      restoreAutosave();
    }
    startAutosave();

    // Zoom mémorisé et zoom à la molette (Ctrl + molette)
    try
    {
        var savedZoom = parseFloat(window.localStorage.getItem("networksimulator.zoom"));
        if (isFinite(savedZoom) && (savedZoom >= 0.25) && (savedZoom <= 4))
        {
            network.setZoom(savedZoom);
        }
    }
    catch (e) {}
    canvas.addEventListener("wheel", function(e)
    {
        if (e.ctrlKey)
        {
            e.preventDefault();
            if (e.deltaY < 0) { ZoomControls.zoomIn(); } else { ZoomControls.zoomOut(); }
        }
    }, {passive: false});

    createControlsWindow();
}

