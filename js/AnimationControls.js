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

var AnimationControls =
{
    MSG_ADVANCE_PRE: 0,
    MSG_ADVANCE: 2,
    controlsWindow: null,
    setSpeed: function(multiplier)
    {
        this.MSG_ADVANCE *= multiplier;
        if (this.MSG_ADVANCE > 16)
        {
            this.MSG_ADVANCE = 16;
        }
        else if (this.MSG_ADVANCE < 0.125)
        {
            this.MSG_ADVANCE = 0.125;
        }
    },
    playPause: function()
    {
        var tmp = this.MSG_ADVANCE;
        this.MSG_ADVANCE = this.MSG_ADVANCE_PRE;
        this.MSG_ADVANCE_PRE = tmp;
    }
};

// Niveaux de zoom proposés par les boutons + / -
var ZOOM_LEVELS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

var ZoomControls =
{
    zoomWindow: null,
    zoomIn: function()
    {
        var z = network.getZoom();
        for (var i = 0; i < ZOOM_LEVELS.length; i++)
        {
            if (ZOOM_LEVELS[i] > z + 0.001)
            {
                network.setZoom(ZOOM_LEVELS[i]);
                return;
            }
        }
    },
    zoomOut: function()
    {
        var z = network.getZoom();
        for (var i = ZOOM_LEVELS.length - 1; i >= 0; i--)
        {
            if (ZOOM_LEVELS[i] < z - 0.001)
            {
                network.setZoom(ZOOM_LEVELS[i]);
                return;
            }
        }
    },
    zoomReset: function()
    {
        network.setZoom(1);
    },
    refresh: function()
    {
        var el = document.getElementById("zoomvalue");
        if ((el !== null) && (typeof network !== "undefined") && (network !== null))
        {
            el.textContent = Math.round(network.getZoom() * 100) + " %";
        }
    }
};

// Les deux fenêtres de contrôle sont compactes, fixes à l'écran, de même hauteur, côte à côte
// et centrées en haut (sauf si l'utilisateur en a déplacé une).
var controlsLayoutBusy = false;
function positionControlWindows()
{
    var a = AnimationControls.controlsWindow;
    var z = ZoomControls.zoomWindow;
    if ((a === null) || (z === null) || controlsLayoutBusy || a.wasMoved() || z.wasMoved())
    {
        return;
    }
    controlsLayoutBusy = true;
    try
    {
        var GAP = 10;
        var sa = a.getSize();
        var sz = z.getSize();
        var total = sa.w + GAP + sz.w;
        var left = Math.max(4, Math.round((window.innerWidth - total) / 2));
        var top = 64;
        a.setPos(left, top);
        z.setPos(left + sa.w + GAP, top);
    }
    finally
    {
        controlsLayoutBusy = false;
    }
}

function createControlsWindow()
{
    var a = new UIWindow("controlswindow", "Animation", 200, 50, false, 1.0);
    AnimationControls.controlsWindow = a;
    a.setFixed(true);
    a.setCompact(true);
    a.setMinWidth(0);

    var controls = '<img src="img/v3i/minus.svg" alt="'+_("Slow")+'" title="'+_("Slow")+'" onclick="AnimationControls.setSpeed(0.5);" />';
    controls += '<img src="img/v3i/playpause.svg" alt="'+_("Play/Pause")+'" title="'+_("Play/Pause")+'" onclick="AnimationControls.playPause();" />';
    controls += '<img src="img/v3i/plus.svg" alt="'+_("Fast")+'" title="'+_("Fast")+'" onclick="AnimationControls.setSpeed(2);" />';
    a.setControls(controls);

    var z = new UIWindow("zoomwindow", "Zoom", 120, 50, false, 1.0);
    ZoomControls.zoomWindow = z;
    z.setFixed(true);
    z.setCompact(true);
    z.setMinWidth(0);
    var zc = '<img src="img/v3i/minus.svg" alt="'+_("Zoom out")+'" title="'+_("Zoom out")+'" onclick="ZoomControls.zoomOut();" />';
    zc += '<span id="zoomvalue" class="ns-zoomval" title="'+_("Reset zoom")+'" onclick="ZoomControls.zoomReset();" style="cursor:pointer;">100 %</span>';
    zc += '<img src="img/v3i/plus.svg" alt="'+_("Zoom in")+'" title="'+_("Zoom in")+'" onclick="ZoomControls.zoomIn();" />';
    z.setControls(zc);

    a.setLayoutHook(positionControlWindows);
    z.setLayoutHook(positionControlWindows);
    a.render();
    z.render();
    ZoomControls.refresh();
    positionControlWindows();
    window.addEventListener("resize", positionControlWindows);
}
