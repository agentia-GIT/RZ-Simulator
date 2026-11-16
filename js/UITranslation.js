function createLocaleDiv() 
{
    createBkDiv();
        
    var w = new UIWindow("localediv", "Select language", 300, 150, false, 1.0);
    var content = uitranslation.getControls()
    var controls = '<input type="button" value="' + _("Accept") + '" onclick="localeSelected();" />';
    controls += '<input type="button" value="' + _("Cancel") + '" onclick="localeCancelled();" />';
    w.setContent(content);
    w.setControls(controls);
    w.render();
}

function localeSelected() 
{
    var locale = document.getElementById("localeselector").value;
    removeBodyDiv('divbk');
    uimanager.getWindow("localediv").dispose();
    uitranslation.selectLocale(locale);
}

function localeCancelled() 
{
    removeBodyDiv('divbk');
    uimanager.getWindow("localediv").dispose();
}

function _(text) 
{
    return uitranslation._(text);
}

var UITranslation = function() {
    var DEFAULT_LOCALE = "en_GB";
    var STORAGE_KEY = "networksimulator.locale";
    var current = DEFAULT_LOCALE;
    var locales = {};
    var observers = [];
    
    // Mémorisation du choix de langue (le stockage peut être indisponible : on ignore les erreurs)
    function readStoredLocale()
    {
        try
        {
            return window.localStorage.getItem(STORAGE_KEY);
        }
        catch (e)
        {
            return null;
        }
    }
    
    function storeLocale(locale)
    {
        try
        {
            window.localStorage.setItem(STORAGE_KEY, locale);
        }
        catch (e)
        {
            // stockage désactivé : pas grave
        }
    }
    
    // Langue initiale : choix mémorisé, sinon langue du navigateur (ex. « fr » / « fr-FR » → fr_FR)
    this.detectInitialLocale = function()
    {
        var wanted = readStoredLocale();
        if ((wanted === null) || !(wanted in locales))
        {
            wanted = null;
            var browserlangs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || DEFAULT_LOCALE];
            for (var i = 0; (i < browserlangs.length) && (wanted === null); i++)
            {
                var code = String(browserlangs[i]).replace("-", "_");
                if (code in locales)
                {
                    wanted = code;
                }
                else
                {
                    var prefix = code.split("_")[0];
                    for (var key in locales)
                    {
                        if (key.split("_")[0] === prefix)
                        {
                            wanted = key;
                            break;
                        }
                    }
                }
            }
        }
        if ((wanted !== null) && (wanted in locales))
        {
            current = wanted;
        }
    };
    
    this.registerLocale = function(locale) 
    {
        locales[locale.locale] = locale;
    };
    
    this.getLocales = function() 
    {
        return Object.keys(locales);
    };
    
    this.addObserver = function(observer) 
    {
        observers.push(observer);
    };
    
    this.removeObserver = function(observer) 
    {
        var pos = observers.indexOf(observer);
        if (pos >= 0) 
        {
            observers.splice(pos, 1);
        }
    };
    
    this.selectLocale = function(locale) 
    {
        if (locale in locales)
        {
            current = locale;
            storeLocale(locale);
            document.documentElement.setAttribute("lang", locale.split("_")[0]);
            notifyObservers();
        }
    };
    
    this.getLocaleName = function(locale)
    {
        return (locale in locales) ? locales[locale].name : locale;
    };

    this.getCurrent = function()
    {
        return current;
    };
    
    function notifyObservers() 
    {
        // Copie : un observateur peut se retirer pendant la notification
        var copy = observers.slice();
        for (var i = 0; i < copy.length; i++) 
        {
            copy[i].localeChanged();
        }
    }
    
    this._ = function(text) 
    {
        var result = text;
        if ((current in locales) && (text in locales[current])) 
        {
            result = locales[current][text];
        }
        
        return result;
    };

    this.getControls = function()
    {
        var result = '<label for="localeselector">' +_("Language:")+ ' </label><select id="localeselector">';
        var keys = this.getLocales().sort();
        for (var i = 0; i < keys.length; i++)
        {
            var locale = keys[i];
            var selected = (locales[locale].locale === current)?'selected="selected"':'';
            result += '<option value="'+escapeHTML(locales[locale].locale)+'" '+selected+'>' + escapeHTML(locales[locale].name) + '</option>';
        }
        result += '</select>';

        return result;
    };
};

var uitranslation = new UITranslation();
