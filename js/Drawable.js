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

var Drawable = function(c_owner) 
{
    this.id = getNextID();
    var X = 0;
    var Y = 0;
    var image = null;
    var owner = c_owner;
    var rect = new UIRectangle(null, null, this, 0, 0, 0, 0, 0, false);
    uimanager.addClickable(rect);
    var observers = [];
    
    this.save = function() 
    {
        var result = {};
        result.version = 1;
        result.id = this.id;
        result.X = X;
        result.Y = Y;
        
        return result;
    };
    
    this.load = function(data) 
    {
        X = data.X;
        Y = data.Y;
        this.id = data.id;
        notifyObservers();
    };
    
    this.setPosition = function(x, y) 
    {
        X = x;
        Y = y;
        if (image !== null) 
        {
            rect.setCoords(X, Y, image.width, image.height, 0);
        }
        notifyObservers();
    };
    
    this.getX = function() 
    {
        return X;
    };
    
    this.getY = function() 
    {
        return Y;
    };
    
    this.getCenterX = function() 
    {
        return X + (image !== null ? image.width / 2 : 0);
    };
    
    this.getCenterY = function() 
    {
        return Y + (image !== null ? image.height / 2 : 0);
    };
    
    this.setImage = function(img) 
    {
        image = img;
        if (image !== null) 
        {
            rect.setCoords(X, Y, image.width, image.height, 0);
        }
        notifyObservers();
    };
    
    // Libellé sous l'équipement : nom en gras (plus grand), puis adresses et valeurs en gras,
    // sur un fond blanc translucide pour une lecture facile.
    function drawInfo(ctx)
    {
        var parts = owner.getStrInfo().split("\n");
        if (DEBUG)
        {
            parts.push("X: " + X + " - Y: " + Y);
        }
        var NAME_FONT = "800 15px Manrope, 'Open Sans', Arial, sans-serif";
        var LINE_FONT = "700 13px 'Open Sans', Arial, sans-serif";
        var LINE_H = 18;
        var cx = image.width / 2;
        var top = image.height + 4;

        ctx.textBaseline = "top";
        ctx.textAlign = "center";
        var width = 0;
        for (var i = 0; i < parts.length; i++)
        {
            ctx.font = (i === 0) ? NAME_FONT : LINE_FONT;
            width = Math.max(width, ctx.measureText(parts[i]).width);
        }
        var boxW = width + 14;
        var boxH = parts.length * LINE_H + 6;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillRect(cx - boxW / 2, top - 2, boxW, boxH);
        ctx.fillStyle = "#00507c";
        ctx.fillRect(cx - boxW / 2, top - 2, 3, boxH);
        for (var j = 0; j < parts.length; j++)
        {
            ctx.font = (j === 0) ? NAME_FONT : LINE_FONT;
            ctx.fillStyle = (j === 0) ? "#003c5d" : "#000001";
            ctx.fillText(parts[j], cx + 1, top + 2 + j * LINE_H);
        }
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
    }
    
    this.draw = function(ctx) 
    {
        if (image === null)
        {
            return;
        }
        ctx.save();
        ctx.translate(X, Y);
        ctx.drawImage(image, 0, 0);
        drawInfo(ctx);
        ctx.restore();
    };
    
    this.getOwner = function() 
    {
        return owner;
    };
    
    this.hasCoords = function(x, y) 
    {
        var r = this.getRect();
        return (r.x <= x) && (x <= r.x + r.width) && (r.y <= y) && (y <= r.y + r.height);
    };
    
    this.getRect = function() 
    {
        var data = {};
        data.x = X;
        data.y = Y;
        data.width = image.width;
        data.height = image.height;
        
        return data;
    };
    
    this.addObserver = function(obs) 
    {
        observers.push(obs);
    };
    
    this.deleteObserver = function(obs) 
    {
        var pos = observers.indexOf(obs);
        if (pos >= 0)
        {
            observers.splice(pos, 1);
        }
    };
    
    function notifyObservers() 
    {
        if (image !== null) 
        {
            for (var i = 0; i < observers.length; i++) 
            {
                observers[i].drawableChanged();
            }
        }
    }

    this.dispose = function()
    {
        uimanager.removeClickable(rect);
    };
};
