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

var UIWindow = function(windowid, title, w, h, scrollable, opacity) 
{
    var STATE_MOUSE_DOWN = 0;
    var STATE_MOUSE_UP = 1;
    var state = STATE_MOUSE_UP;
    
    var ACTION_MOUSE_DOWN = 0;
    var ACTION_MOUSE_UP = 1;
    var ACTION_MOUSE_MOVE = 2;
    
    var title = title;
    var w = w;
    var h = h;
    var x = window.innerWidth / 2 - w / 2;
    var y = window.innerHeight / 2 - h / 2;
    var opacity = opacity;
    var scrollable = scrollable;
    var windowid = windowid;
    // Correction : ces identifiants valaient « undefined_contents » / « undefined_controls »
    // pour toutes les fenêtres (identifiants HTML dupliqués).
    var contentid = windowid + "_contents";
    var controlsid = windowid + "_controls";
    var outerdiv = null;
    var titlediv = null;
    var contentDiv = null;
    var controlsDiv = null;
    
    var click_offset_x = 0;
    var click_offset_y = 0;
    var move_X = 0;
    var move_Y = 0;

    var _self = this;
    
    function windowMouseDownEvent(e)
    {
        if (outerdiv === null)
        {
            return;
        }
        var bbox = titlediv.getBoundingClientRect();
        var evt_x = e.clientX;
        var evt_y = e.clientY;
        
        if ((bbox.left <= evt_x) && (evt_x <= (bbox.left + bbox.width))
            && (bbox.top <= evt_y) && (evt_y <= (bbox.top + bbox.height)))
        {
            dispatchEvent(evt_x, evt_y, ACTION_MOUSE_DOWN);            
        }
    }
    
    function windowMouseUpEvent(e) 
    {
        dispatchEvent(-1, -1, ACTION_MOUSE_UP);
    }
    
    function windowMouseMoveEvent(e)
    {
        var evt_x = e.clientX;
        var evt_y = e.clientY;
        
        dispatchEvent(evt_x, evt_y, ACTION_MOUSE_MOVE);
    }
    
    function dispatchEvent(evt_x, evt_y, action) 
    {
        switch (state)
        {
            case STATE_MOUSE_DOWN:
                switch (action) 
                {
                    case ACTION_MOUSE_UP:
                        state = STATE_MOUSE_UP;
                        break;
                    case ACTION_MOUSE_MOVE:
                        if (outerdiv === null)
                        {
                            break;
                        }
                        x = evt_x - click_offset_x + getPageScrollX();
                        y = evt_y - click_offset_y + getPageScrollY();
                        outerdiv.setAttribute('style', getOuterStyle());
                        break;
                }
                break;
            case STATE_MOUSE_UP:
                switch (action) 
                {
                    case ACTION_MOUSE_DOWN:
                        var bbox = titlediv.getBoundingClientRect();
                        click_offset_x = evt_x - bbox.left;
                        click_offset_y = evt_y - bbox.top;
                        state = STATE_MOUSE_DOWN;
                        break;
                }
                break;
        }
    }
    
    function getOuterStyle()
    {
        // L'apparence (couleurs, bordures, ombre) est dans css/theme.css (classe ns-window)
        return 'top:' + y + 'px;left:' + x + 'px;width:' + w + 'px;height:' + h + 'px;opacity:' + opacity + ';';
    }

    function init() 
    {
        outerdiv = document.createElement("div");
        outerdiv.setAttribute('id', windowid);
        outerdiv.setAttribute('class', 'ns-window');
        outerdiv.setAttribute('style', getOuterStyle());
        
        titlediv = document.createElement("div");
        titlediv.setAttribute('id', windowid + "_title");
        titlediv.setAttribute('class', 'ns-window-title');
        titlediv.textContent = _(title);
        
        contentDiv = document.createElement("div");
        contentDiv.setAttribute('id', contentid);
        // Correction : 'height:' + h - 80 donnait NaN (concaténation de chaînes avant la soustraction)
        contentDiv.setAttribute('style', 'width:100%; height:' + (h - 80) + 'px;');
        
        controlsDiv = document.createElement("div");
        controlsDiv.setAttribute('id', controlsid);
        controlsDiv.setAttribute('class', 'ns-window-controls');
        controlsDiv.setAttribute('style', 'width:100%; height:40px;');
        
        //var bkdiv = document.getElementById('divbk');
        window.addEventListener("mousedown", windowMouseDownEvent, true);
        window.addEventListener("mouseup", windowMouseUpEvent, true);
        window.addEventListener("mousemove", windowMouseMoveEvent, true);

        uimanager.addWindow(_self);
        uitranslation.addObserver(_self);
    }
    
    this.render = function() 
    {
        outerdiv.appendChild(titlediv);
        outerdiv.appendChild(contentDiv);
        outerdiv.appendChild(controlsDiv);
        
        document.body.appendChild(outerdiv);
    };
    
    this.setControls = function(controls) 
    {
        controlsDiv.innerHTML = controls;
    };
    
    this.setContent = function(content) 
    {
        contentDiv.innerHTML = content;
    };

    this.dispose = function()
    {
        if (outerdiv === null)
        {
            return; // déjà détruite
        }
        // Correction : le drapeau « capture » doit être identique à celui de addEventListener,
        // sinon l'écouteur n'est jamais retiré (fuite, et comportement strict sous Firefox).
        window.removeEventListener("mousedown", windowMouseDownEvent, true);
        window.removeEventListener("mouseup", windowMouseUpEvent, true);
        window.removeEventListener("mousemove", windowMouseMoveEvent, true);
        uimanager.removeWindow(this);
        removeBodyDiv(windowid);
        uitranslation.removeObserver(this);
        outerdiv = null;
    };

    this.getId = function()
    {
        return windowid;
    };

    this.getPos = function()
    {
        return {x: x, y: y};
    };

    this.setPos = function(nx, ny)
    {
        x = nx;
        y = ny;
        outerdiv.setAttribute('style', getOuterStyle());
    };

    this.localeChanged = function()
    {
        titlediv.textContent = _(title);
    };
    
    init();
};
