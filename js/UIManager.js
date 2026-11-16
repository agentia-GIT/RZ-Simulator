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

function createLinkAction()
{
    uimanager.createLinkAction();
}

function createBkDiv()
{
    var div = document.createElement("div");
    var w = document.body.scrollWidth;
    var h = document.body.scrollHeight;
    div.setAttribute('style', 'position:absolute;top:0;left:0;z-index:100;background-color:#000001;width:' + w + 'px;height:' + h + 'px;opacity:0.4;');
    div.setAttribute('id', 'divbk');
    document.body.appendChild(div);
}

// Destination choisie avec « Parcourir » (API File System Access : Chrome, Edge...)
var saveFileHandle = null;

function canBrowseFolders()
{
    return (typeof window.showSaveFilePicker === "function");
}

function browseSaveLocation()
{
    if (!canBrowseFolders())
    {
        alert(_("Your browser cannot choose a folder from here: the file goes to your downloads folder. In Firefox, enable \u00ab Always ask you where to save files \u00bb in Settings > General > Downloads."));
        return;
    }
    var input = document.getElementById('filename');
    var wanted = (input && input.value.trim() !== "") ? input.value.trim() : "network.json";

    function chosen(handle)
    {
        saveFileHandle = handle;
        if (input)
        {
            input.value = handle.name;
        }
        var info = document.getElementById('savedest');
        if (info)
        {
            info.textContent = _("Destination chosen:") + " " + handle.name;
        }
    }

    function failed(e)
    {
        // Annulation par l'utilisateur : rien à signaler
        if (e && (e.name === "AbortError"))
        {
            return;
        }
        alert(_("The folder chooser could not be opened:") + " " + (e && e.name ? e.name : "?") + (e && e.message ? " - " + e.message : "")
            + "\n" + _("The file will be saved in your downloads folder instead."));
    }

    var picker;
    try
    {
        picker = window.showSaveFilePicker({
            suggestedName: wanted,
            types: [{description: "JSON", accept: {"application/json": [".json"]}}]
        });
    }
    catch (e)
    {
        failed(e);
        return;
    }
    picker.then(chosen).catch(function(e)
    {
        if (e && (e.name === "AbortError"))
        {
            return;
        }
        // Certains navigateurs refusent le filtre de types : seconde tentative sans filtre
        // (l'activation utilisateur peut être perdue : dans ce cas l'erreur est affichée)
        try
        {
            window.showSaveFilePicker({suggestedName: wanted}).then(chosen).catch(failed);
        }
        catch (e2)
        {
            failed(e2);
        }
    });
}

function downloadViaLink(filename, text)
{
    var blob = new Blob([text], {type: "application/json;charset=utf-8"});
    var url = URL.createObjectURL(blob);
    var download = document.createElement("a");
    download.setAttribute('href', url);
    download.setAttribute('download', filename);
    // Firefox exige que le lien soit dans le document pour déclencher le téléchargement
    document.body.appendChild(download);
    download.click();
    document.body.removeChild(download);
    // Libération différée de l'URL (Firefox démarre le téléchargement de façon asynchrone)
    setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
}

function saveNetwork()
{
    var filename = document.getElementById('filename').value.trim();
    if (filename === "")
    {
        filename = "network.json";
    }
    var text = network.save();
    if ((saveFileHandle !== null) && (saveFileHandle.name === filename))
    {
        var handle = saveFileHandle;
        handle.createWritable().then(function(stream)
        {
            return stream.write(text).then(function() { return stream.close(); });
        }).catch(function(e)
        {
            // Écriture impossible (permission refusée...) : on le dit, puis téléchargement classique
            alert(_("Could not write the chosen file:") + " " + (e && e.name ? e.name : "?") + "\n" + _("The file will be saved in your downloads folder instead."));
            downloadViaLink(filename, text);
        });
    }
    else
    {
        downloadViaLink(filename, text);
    }
    cancelDownload();
}

function removeBodyDiv(name)
{
    var div = document.getElementById(name);
    if (div !== null)
    {
        div.parentNode.removeChild(div);
    }
}

function cancelUpload()
{
    uimanager.getWindow("divupload").dispose();
    removeBodyDiv('divbk');
}

function cancelDownload()
{
    saveFileHandle = null;
    uimanager.getWindow("divdownload").dispose();
    removeBodyDiv('divbk');
}

function confirmUpload()
{
    var fileinput = document.getElementById('uploaddata');
    var file = fileinput.files[0];
    if (!file)
    {
        // Aucun fichier choisi : on laisse la fenêtre ouverte
        alert(_("Please choose a file first."));
        return;
    }
    var reader = new FileReader();
    reader.onload = function(filedata) {
        try
        {
            // L'exemple fourni (examples/data01.json) est de la forme « var exampledata = {...}; » :
            // on accepte aussi ce format en retirant l'affectation JavaScript autour du JSON.
            var text = String(filedata.target.result)
                .replace(/^\uFEFF/, "")
                .replace(/^\s*var\s+[A-Za-z_$][\w$]*\s*=\s*/, "")
                .replace(/;\s*$/, "");
            network.load(JSON.parse(text));
        }
        catch (e)
        {
            alert(_("The file could not be loaded: ") + e.message);
        }
    };
    reader.onerror = function() {
        alert(_("The file could not be loaded: ") + (reader.error ? reader.error.name : ""));
    };
    reader.readAsText(file);
    uimanager.getWindow("divupload").dispose();
    removeBodyDiv('divbk');
}

function createUploadDiv()
{
    var div = document.createElement("div");
    var innerHTML = '<p><input type="file" id="uploaddata" name="uploaddata" accept=".json,application/json" /></p>';
    var controls = '<p>\
  <input type="button" id="upload" value="'+_("Upload")+'" onclick="confirmUpload();" />\
  <input type="button" id="cancel" value="'+_("Cancel")+'" onclick="cancelUpload();" />\
  </p>';
    //document.body.appendChild(div);
    var w = new UIWindow('divupload', _('Upload file'), 400, 150, false, 1.0);
    w.setContent(innerHTML);
    w.setControls(controls);
    w.render();
}

function createDownloadDiv()
{
    var div = document.createElement("div");
    saveFileHandle = null;
    var innerHTML = '<p><label for="filename">'+_("File name:")+'</label> <input type="text" id="filename" name="filename" value="network.json" /></p>';
    innerHTML += '<p class="ns-hint" id="savedest">' + escapeHTML(canBrowseFolders() ? _("Use Browse to choose the folder.") : _("The file goes to your browser's downloads folder.")) + '</p>';
    var controls = '<p>\
  <input type="button" id="upload" value="'+_("Save to file")+'" onclick="saveNetwork();" />\
  <input type="button" id="browse" value="'+_("Browse...")+'" onclick="browseSaveLocation();" />\
  <input type="button" id="cancel" value="'+_("Cancel")+'" onclick="cancelDownload();" />\
  </p>';
    //document.body.appendChild(div);
    var w = new UIWindow('divdownload', _('Save file'), 400, 150, false, 1.0);
    w.setContent(innerHTML);
    w.setControls(controls);
    w.render();
}

function uploadClick()
{
    createBkDiv();
    createUploadDiv();
}

function downloadClick()
{
    createBkDiv();
    createDownloadDiv();
}

var UIManager = function()
{
    var STATE_NEUTRAL = 0; // Nada seleccionado, ningún menú visible
    var STATE_ELEMENT_SELECTED_MOUSE_DOWN = 1; //  Un elemento seleccionado, ningún menú visible, no hemos soltado el botón
    var STATE_ELEMENT_SELECTED_MOUSE_UP = 2; //  Un elemento seleccionado, ningún menú visible, hemos soltado el botón
    var STATE_LINE_SELECTED = 3; // Una línea seleccionada, ningún menú visible
    var STATE_DRAGGING = 4; // Un elemento seleccionado, arrastrándolo, ningún menú visible
    var STATE_CREATING_LINK = 5; // Un elemento seleccionado, moviendo, para hacer click en otro y crear un link, ningún menú visible
    var HEADER_HEIGHT = 56;
    var BURGER_X = 8;
    var BURGER_Y = 8;
    var BURGER_SIZE = 40;
    var STATE_MAIN_MENU_VISIBLE = 6; // Nada seleccionado, menú principal visible
    var STATE_ELEMENT_MENU_VISIBLE = 7; // Un elemento seleccionado, su menú visible
    var STATE_LINE_MENU_VISIBLE = 8; // Un enlace seleccionado, su menú visible

    var ACTION_MOUSE_DOWN = 0;
    var ACTION_MOUSE_UP = 1;
    var ACTION_MOUSE_MOVE = 2;
    var ACTION_MENU_OPTION_CLICKED = 3;
    var ACTION_SELECTED_ELEMENT_DELETED = 4;
    var ACTION_SELECTED_LINE_DELETED = 5;
    var ACTION_CREATE_LINK = 6;

    var menus = [];
    var clickables = [];
    var windows = [];
    var canvas = document.getElementById("simcanvas");
    var state = STATE_NEUTRAL;
    var mainmenu = null;
    var _self = this;
    var click_offset_x = 0;
    var click_offset_y = 0;
    var elemRect = null;
    var move_X = 0;
    var move_Y = 0;

    function switchMainMenu(params)
    {
        if (mainmenu.getVisible())
        {
            mainmenu.hide();
        }
        else
        {
            mainmenu.show();
        }
    }

    function init()
    {
        var canvas = document.getElementById("simcanvas");
        canvas.addEventListener("mousedown", mouseDownEvent, false);
        canvas.addEventListener("mouseup", mouseUpEvent, false);
        canvas.addEventListener("mousemove", mouseMoveEvent, false);
        var bbox = canvas.getBoundingClientRect();

        createHeader();
        mainmenu = new UIMenu("Menu", 8 + bbox.left, HEADER_HEIGHT, true);

        // Gestion : sauvegarde et restauration du réseau
        var manage = mainmenu.addSection("Management", "manage");
        manage.addEntry("img/v3i/save.svg", "Save network", 'downloadClick();');
        manage.addEntry("img/v3i/upload.svg", "Restore network", 'uploadClick();');
        manage.addEntry("img/v3i/delete.svg", "New network", 'newNetwork();');
        manage.addInfo([["Auto-save", "Enabled"]]);

        // Bibliothèque d'objets : équipements à ajouter au réseau
        var library = mainmenu.addSection("Object library", "library");
        library.addEntry("img/v3i/computer.svg", "Add Host", 'newElement("host");');
        library.addEntry("img/v3i/server_dhcp.svg", "Add DHCP server", 'newElement("dhcp");');
        library.addEntry("img/v3i/server_dns.svg", "Add DNS server", 'newElement("dns");');
        library.addEntry("img/v3i/server_web.svg", "Add web server", 'newElement("web");');
        library.addEntry("img/v3i/switch.svg", "Add 8-port switch", 'newElement("switch8");');
        library.addEntry("img/v3i/switch.svg", "Add 16-port switch", 'newElement("switch16");');
        library.addEntry("img/v3i/switch.svg", "Add 24-port switch", 'newElement("switch24");');
        library.addEntry("img/v3i/switch.svg", "Add 48-port switch", 'newElement("switch48");');
        library.addEntry("img/v3i/router2.svg", "Add router", 'newElement("router");');
        library.addEntry("img/v3i/printer.svg", "Add network printer", 'newElement("printer");');
        library.addEntry("img/v3i/accesspoint.svg", "Add Wi-Fi access point", 'newElement("accesspoint");');

        // Sélection des langues (la liste est construite à partir des langues enregistrées)
        var languages = mainmenu.addSection("Languages", "language");
        var codes = uitranslation.getLocales().sort();
        for (var i = 0; i < codes.length; i++)
        {
            languages.addEntry(null, uitranslation.getLocaleName(codes[i]), 'uitranslation.selectLocale("' + codes[i] + '");', codes[i] === uitranslation.getCurrent());
        }

        // À propos : version et recherche de mises à jour
        var about = mainmenu.addSection("About", "about");
        about.addInfo([["Network Simulator", "v" + NetworkSimulator.version], ["License:", "GPLv3"]]);
        about.addButton("Check for updates", 'checkForUpdates("ns_update_status");', "ns_update_status");
        _self.addMenu(mainmenu);

        var rect = new UIRectangle(switchMainMenu, null, mainmenu, BURGER_X, BURGER_Y, BURGER_SIZE, BURGER_SIZE, 10, true);
        _self.addClickable(rect);
    }

    this.addWindow = function(w)
    {
        windows[w.getId()] = w;
    };

    this.getWindow = function(id)
    {
        return windows[id];
    };

    this.removeWindow = function(w)
    {
        delete windows[w.getId()];
    };

    this.reset = function()
    {
        // Correction : on vide la vraie liste (variable locale) et pas une propriété
        // « this.clickables » sans effet, qui laissait des zones cliquables fantômes
        // après le chargement d'un fichier.
        hideAllMenus();
        clickables = [];
        elemRect = null;
        state = STATE_NEUTRAL;
        var rect = new UIRectangle(switchMainMenu, null, mainmenu, BURGER_X, BURGER_Y, BURGER_SIZE, BURGER_SIZE, 10, true);
        this.addClickable(rect);
    };

    function mouseDownEvent(event)
    {
        var canvas = document.getElementById("simcanvas");
        // THANK_YOU: http://www.informit.com/articles/article.aspx?p=1903884&seqNum=6
        var bbox = canvas.getBoundingClientRect();
        var z = network.getZoom();
        var canvas_x = (event.clientX - bbox.left) * (canvas.width / bbox.width) / z;
        var canvas_y = (event.clientY - bbox.top) * (canvas.height / bbox.height) / z;

        dispatchEvent(canvas_x, canvas_y, ACTION_MOUSE_DOWN);
    }

    function mouseUpEvent(event)
    {
        var canvas = document.getElementById("simcanvas");
        // THANK_YOU: http://www.informit.com/articles/article.aspx?p=1903884&seqNum=6
        var bbox = canvas.getBoundingClientRect();
        var z = network.getZoom();
        var canvas_x = (event.clientX - bbox.left) * (canvas.width / bbox.width) / z;
        var canvas_y = (event.clientY - bbox.top) * (canvas.height / bbox.height) / z;

        dispatchEvent(canvas_x, canvas_y, ACTION_MOUSE_UP);
    }

    function mouseMoveEvent(event)
    {
        var canvas = document.getElementById("simcanvas");
        // THANK_YOU: http://www.informit.com/articles/article.aspx?p=1903884&seqNum=6
        var bbox = canvas.getBoundingClientRect();
        var z = network.getZoom();
        var canvas_x = (event.clientX - bbox.left) * (canvas.width / bbox.width) / z;
        var canvas_y = (event.clientY - bbox.top) * (canvas.height / bbox.height) / z;
        move_X = canvas_x;
        move_Y = canvas_y;
        // Pendant le déplacement d'un objet, on fait défiler la page quand on approche du bord de la fenêtre
        if (state === STATE_ELEMENT_SELECTED_MOUSE_DOWN)
        {
            var EDGE = 40;
            var STEP = 24;
            var dx = 0;
            var dy = 0;
            if (event.clientX > window.innerWidth - EDGE) { dx = STEP; }
            else if (event.clientX < EDGE) { dx = -STEP; }
            if (event.clientY > window.innerHeight - EDGE) { dy = STEP; }
            else if (event.clientY < EDGE + HEADER_HEIGHT) { dy = -STEP; }
            if ((dx !== 0) || (dy !== 0))
            {
                window.scrollBy(dx, dy);
            }
        }

        dispatchEvent(canvas_x, canvas_y, ACTION_MOUSE_MOVE);
    }

    function hideAllMenus()
    {

        for (var id in menus)
        {
            if (menus[id].getVisible())
            {
                menus[id].hide();
            }
        }
    }

    function updateOffsets(drawable, X, Y)
    {
        var rect = drawable.getRect();
        click_offset_x = X - rect.x;
        click_offset_y = Y - rect.y;
    }

    function switchSelectedMenu(menu)
    {
        if (menu.getVisible())
        {
            menu.hide();
        }
        else
        {
            menu.show();
        }
    }

    // Retire le rectangle « poignée de menu » de la sélection précédente (s'il existe)
    function releaseElemRect()
    {
        if (elemRect !== null)
        {
            _self.removeClickable(elemRect);
            elemRect = null;
        }
    }

    function selectElement(e)
    {
        releaseElemRect();
        var previous = network.getSelected();
        if ((previous !== null) && (previous instanceof Host))
        {
            previous.getDrawable().deleteObserver(_self);
        }
        network.setSelected(e);
        e.getDrawable().addObserver(_self);
        // Crear el rectángulo de despliegue de menú
        var rect = e.getDrawable().getRect();
        elemRect = new UIRectangle(switchSelectedMenu, e.getMenu(), _self, rect.x + rect.width - 10, rect.y, 10, 10, 50);
        _self.addClickable(elemRect);
    }

    function selectLink(l)
    {
        releaseElemRect();
        var previous = network.getSelected();
        if ((previous !== null) && (previous instanceof Host))
        {
            previous.getDrawable().deleteObserver(_self);
        }
        network.setSelected(l);
        var vertices = l.getCenter();
        elemRect = new UIRectangle(switchSelectedMenu, l.getMenu(), _self, vertices.x - 5, vertices.y - 5, 10, 10, 50);
        l.getMenu().setPos(vertices.x + 5, vertices.y - 5);
        _self.addClickable(elemRect);
    }

    this.drawableChanged = function()
    {
        // Seul un équipement (Host) a un Drawable ; un lien sélectionné n'en a pas
        if ((network.getSelected() instanceof Host) && (elemRect !== null))
        {
            var rect = network.getSelected().getDrawable().getRect();

            elemRect.X = rect.x + rect.width - 10;
            elemRect.Y = rect.y;
        }
    };

    function unselectElement(e)
    {
        if (e !== null)
        {
            if (e.getMenu().getVisible())
            {
                e.getMenu().hide();
            }
            // Correction : l'observateur était retiré uniquement si le menu était visible,
            // ce qui accumulait des observateurs à chaque sélection.
            e.getDrawable().deleteObserver(_self);
        }
        releaseElemRect();
        network.setSelected(null);
    }

    function unselectLine(e)
    {
        // Correction : la poignée de menu du lien restait dans les zones cliquables
        releaseElemRect();
        network.setSelected(null);
    }

    // Annule la sélection courante (équipement ou lien) en libérant tout ce qui lui était associé
    function clearSelection()
    {
        var current = network.getSelected();
        if ((current !== null) && (current instanceof Host))
        {
            current.getDrawable().deleteObserver(_self);
        }
        releaseElemRect();
        network.setSelected(null);
    }

    function dispatchEvent(X, Y, action)
    {
        switch (state)
        {
            case STATE_NEUTRAL:
                switch (action)
                {
                    case ACTION_MOUSE_DOWN:
                        var clicked = detectClick(X, Y);
                        if (clicked !== null)
                        {
                            if (clicked.getObject() === mainmenu)
                            {
                                // Ocultar todos los demás menús
                                hideAllMenus();
                                // Main menu visible
                                clicked.performAction();
                                // Nuevo estado
                                state = STATE_MAIN_MENU_VISIBLE;
                            }
                            else if (clicked.getObject() instanceof Drawable)
                            {
                                // Actualizar los offsets para mover el objeto
                                updateOffsets(clicked.getObject(), X, Y);
                                // Ocultar todos los menús
                                hideAllMenus();
                                // Seleccionado el owner
                                selectElement(clicked.getObject().getOwner());
                                // Nuevo estado
                                state = STATE_ELEMENT_SELECTED_MOUSE_DOWN;
                            }
                            else if (clicked.getObject() instanceof Link)
                            {
                                // Ocultar los menus
                                hideAllMenus();
                                selectLink(clicked.getObject());
                                state = STATE_LINE_SELECTED;
                            }
                        }
                        break;
                }
                break;
            case STATE_MAIN_MENU_VISIBLE:
                switch (action)
                {
                    case ACTION_MOUSE_DOWN:
                        var clicked = detectClick(X, Y);
                        if (clicked !== null)
                        {
                            if (clicked.getObject() === mainmenu)
                            {
                                // Main menu oculto
                                clicked.performAction();
                                // Nuevo estado
                                state = STATE_NEUTRAL;
                            }
                            else if (clicked.getObject() instanceof Drawable)
                            {
                                // Actualizar los offsets para mover el objeto
                                updateOffsets(clicked.getObject(), X, Y);
                                // Ocultar el menú principal
                                mainmenu.hide();
                                // Seleccionado el owner
                                selectElement(clicked.getObject().getOwner());
                                // Nuevo estado
                                state = STATE_ELEMENT_SELECTED_MOUSE_DOWN;
                            }
                            else if (clicked.getObject() instanceof Link)
                            {
                                // Ocultar los menus
                                hideAllMenus();
                                selectLink(clicked.getObject());
                                state = STATE_LINE_SELECTED;
                            }
                        }
                        else
                        {
                            // Main menu oculto
                            mainmenu.hide();
                            // Nuevo estado
                            state = STATE_NEUTRAL;
                        }
                        break;
                    case ACTION_MENU_OPTION_CLICKED:
                        // Main menu oculto
                        mainmenu.hide();
                        // Nuevo estado
                        state = STATE_NEUTRAL;
                        break;
                }
                break;
            case STATE_ELEMENT_SELECTED_MOUSE_DOWN:
                switch (action)
                {
                    case ACTION_MOUSE_UP:
                        state = STATE_ELEMENT_SELECTED_MOUSE_UP;
                        break;
                    case ACTION_MOUSE_MOVE:
                        network.getSelected().getDrawable().setPosition(Math.max(0, X - click_offset_x), Math.max(0, Y - click_offset_y));
                        break;
                }
                break;
            case STATE_ELEMENT_SELECTED_MOUSE_UP:
                switch (action)
                {
                    case ACTION_MOUSE_DOWN:
                        var clicked = detectClick(X, Y);
                        if (clicked !== null)
                        {
                            if (clicked.getObject() === mainmenu)
                            {
                                // Ocultar todos los demás menús
                                hideAllMenus();
                                // Main menu visible
                                clicked.performAction();
                                // Nada seleccionado
                                clearSelection();
                                // Nuevo estado
                                state = STATE_MAIN_MENU_VISIBLE;
                            }
                            else if (clicked.getObject() instanceof Drawable)
                            {
                                // Ocultar todos los menús
                                hideAllMenus();
                                // Seleccionado el owner
                                unselectElement(network.getSelected());
                                selectElement(clicked.getObject().getOwner());
                                // Nuevo estado
                                state = STATE_ELEMENT_SELECTED_MOUSE_DOWN;
                            }
                            else if (clicked.getObject() instanceof UIManager)
                            {
                                clicked.performAction();
                                // Nuevo estado
                                state = STATE_ELEMENT_MENU_VISIBLE;
                            }
                            else if (clicked.getObject() instanceof Link)
                            {
                                // Ocultar los menus
                                hideAllMenus();
                                selectLink(clicked.getObject());
                                state = STATE_LINE_SELECTED;
                            }
                        }
                        else
                        {
                            // Nada seleccionado
                            clearSelection();
                            // Nuevo estado
                            state = STATE_NEUTRAL;
                        }
                        break;
                }
                break;
            case STATE_LINE_SELECTED:
                switch (action)
                {
                    case ACTION_MOUSE_DOWN:
                        var clicked = detectClick(X, Y);
                        if (clicked !== null)
                        {
                            if (clicked.getObject() === mainmenu)
                            {
                                // Ocultar todos los demás menús
                                hideAllMenus();
                                // Main menu visible
                                clicked.performAction();
                                // Nada seleccionado
                                clearSelection();
                                // Nuevo estado
                                state = STATE_MAIN_MENU_VISIBLE;
                            }
                            else if (clicked.getObject() instanceof Drawable)
                            {
                                // Ocultar todos los menús
                                hideAllMenus();
                                // Seleccionado el owner
                                unselectLine(network.getSelected());
                                selectElement(clicked.getObject().getOwner());
                                // Nuevo estado
                                state = STATE_ELEMENT_SELECTED_MOUSE_DOWN;
                            }
                            else if (clicked.getObject() instanceof UIManager)
                            {
                                clicked.performAction();
                                // Nuevo estado
                                state = STATE_LINE_MENU_VISIBLE;
                            }
                            else if (clicked.getObject() instanceof Link)
                            {
                                // Ocultar los menus
                                hideAllMenus();
                                selectLink(clicked.getObject());
                                state = STATE_LINE_SELECTED;
                            }
                        }
                        else
                        {
                            // Nada seleccionado
                            clearSelection();
                            // Nuevo estado
                            state = STATE_NEUTRAL;
                        }
                        break;
                }
                break;
            case STATE_LINE_MENU_VISIBLE:
                switch (action)
                {
                    case ACTION_MOUSE_DOWN:
                        var clicked = detectClick(X, Y);
                        if (clicked !== null)
                        {
                            if (clicked.getObject() === mainmenu)
                            {
                                // Ocultar todos los demás menús
                                hideAllMenus();
                                // Main menu visible
                                clicked.performAction();
                                // Nada seleccionado
                                clearSelection();
                                // Nuevo estado
                                state = STATE_MAIN_MENU_VISIBLE;
                            }
                            else if (clicked.getObject() instanceof Drawable)
                            {
                                // Ocultar todos los menús
                                hideAllMenus();
                                // Seleccionado el owner
                                unselectLine(network.getSelected());
                                selectElement(clicked.getObject().getOwner());
                                // Nuevo estado
                                state = STATE_ELEMENT_SELECTED_MOUSE_DOWN;
                            }
                            else if (clicked.getObject() instanceof UIManager)
                            {
                                clicked.performAction();
                                // Nuevo estado
                                state = STATE_LINE_SELECTED;
                            }
                            else if (clicked.getObject() instanceof Link)
                            {
                                // Ocultar los menus
                                hideAllMenus();
                                selectLink(clicked.getObject());
                                state = STATE_LINE_SELECTED;
                            }
                        }
                        else
                        {
                            hideAllMenus();
                            // Nada seleccionado
                            unselectLine(network.getSelected());
                            // Nuevo estado
                            state = STATE_NEUTRAL;
                        }
                        break;
                    case ACTION_SELECTED_LINE_DELETED:
                        // Menu oculto
                        hideAllMenus();
                        unselectLine(network.getSelected());
                        // Nuevo estado
                        state = STATE_NEUTRAL;
                        break;
                }
                break;
            case STATE_ELEMENT_MENU_VISIBLE:
                switch (action)
                {
                    case ACTION_MOUSE_DOWN:
                        var clicked = detectClick(X, Y);
                        if (clicked !== null)
                        {
                            if (clicked.getObject() === mainmenu)
                            {
                                // Ocultar todos los demás menús
                                hideAllMenus();
                                // Main menu visible
                                clicked.performAction();
                                // Nada seleccionado
                                clearSelection();
                                // Nuevo estado
                                state = STATE_MAIN_MENU_VISIBLE;
                            }
                            else if (clicked.getObject() instanceof Drawable)
                            {
                                // Ocultar todos los menús
                                hideAllMenus();
                                // Seleccionado el owner
                                unselectElement(network.getSelected());
                                selectElement(clicked.getObject().getOwner());
                                // Nuevo estado
                                state = STATE_ELEMENT_SELECTED_MOUSE_DOWN;
                            }
                            else if (clicked.getObject() instanceof UIManager)
                            {
                                clicked.performAction();
                                // Nuevo estado
                                state = STATE_ELEMENT_MENU_VISIBLE;
                            }
                            else if (clicked.getObject() instanceof Link)
                            {
                                // Ocultar los menus
                                hideAllMenus();
                                selectLink(clicked.getObject());
                                state = STATE_LINE_SELECTED;
                            }
                        }
                        else
                        {
                            unselectElement(network.getSelected());
                            // Main menu oculto
                            hideAllMenus();
                            // Nuevo estado
                            state = STATE_NEUTRAL;
                        }
                        break;
                    case ACTION_MENU_OPTION_CLICKED:
                        // Menu oculto
                        hideAllMenus();
                        // Nuevo estado
                        state = STATE_ELEMENT_SELECTED_MOUSE_UP;
                        break;
                    case ACTION_SELECTED_ELEMENT_DELETED:
                        // Menu oculto
                        hideAllMenus();
                        unselectElement(network.getSelected());
                        // Nuevo estado
                        state = STATE_NEUTRAL;
                        break;
                    case ACTION_CREATE_LINK:
                        hideAllMenus();
                        state = STATE_CREATING_LINK;
                        break;
                }
                break;
            case STATE_CREATING_LINK:
                switch (action)
                {
                    case ACTION_MOUSE_DOWN:
                        var clicked = detectClick(X, Y);
                        if (clicked !== null)
                        {
                            if (clicked.getObject() instanceof Drawable)
                            {
                                // Ocultar todos los menús
                                hideAllMenus();
                                // Crear el link
                                selectLinkConnectors(network.getSelected().id, clicked.getObject().getOwner().id);
                                state = STATE_ELEMENT_SELECTED_MOUSE_UP;
                            }
                        }
                        else
                        {
                            hideAllMenus();
                            // Nuevo estado
                            state = STATE_ELEMENT_SELECTED_MOUSE_UP;
                        }
                        break;
                }
                break;
        }
    }

    this.menuOptionClicked = function()
    {
        dispatchEvent(-1, -1, ACTION_MENU_OPTION_CLICKED);
    };

    this.selectedElementDeleted = function()
    {
        dispatchEvent(-1, -1, ACTION_SELECTED_ELEMENT_DELETED);
    };

    this.selectedLineDeleted = function()
    {
        dispatchEvent(-1, -1, ACTION_SELECTED_LINE_DELETED);
    };

    this.createLinkAction = function()
    {
        dispatchEvent(-1, -1, ACTION_CREATE_LINK);
    };

    function detectClick(X, Y)
    {
        var clicked = null;

        for (var i = 0; i < clickables.length; i++)
        {
            // La poignée de menu d'une sélection ne doit pas répondre s'il n'y a plus de sélection
            if ((clickables[i] === elemRect) && (network.getSelected() === null))
            {
                continue;
            }
            if (clickables[i].isInCoords(X, Y))
            {
                if ((clicked === null) || (clickables[i].Z > clicked.Z))
                {
                    clicked = clickables[i];
                }
            }
        }

        return clicked;
    }

    this.addMenu = function(menu)
    {
        menus[menu.getId()] = menu;
    };

    this.deleteMenu = function(menu)
    {
        menus[menu.getId()].dispose();
        delete menus[menu.getId()];
    };

    this.getMenu = function(id)
    {
        return menus[id];
    };

    this.addClickable = function(c)
    {
        clickables.push(c);
    };

    this.removeClickable = function(c)
    {
        // Correction : indexOf renvoie -1 si absent, et splice(-1, 1) supprimait
        // alors le dernier élément de la liste (une zone cliquable sans rapport).
        var index = clickables.indexOf(c);
        if (index >= 0)
        {
            clickables.splice(index, 1);
        }
    };

    // En-tête (style v3i : fond blanc, filet bleu) : élément HTML fixe, indépendant du zoom et du défilement
    var headerEl = null;
    var headerSubEl = null;
    var burgerEl = null;
    var lastSub = null;

    function createHeader()
    {
        if (document.getElementById("nsheader") !== null)
        {
            return;
        }
        headerEl = document.createElement("div");
        headerEl.setAttribute("id", "nsheader");
        burgerEl = document.createElement("button");
        burgerEl.setAttribute("id", "nsburger");
        burgerEl.setAttribute("type", "button");
        burgerEl.setAttribute("aria-label", "Menu");
        burgerEl.innerHTML = "<span></span><span></span><span></span>";
        burgerEl.addEventListener("click", function() { _self.burgerClicked(); });
        var box = document.createElement("div");
        box.setAttribute("class", "ns-hd-box");
        var title = document.createElement("div");
        title.setAttribute("class", "ns-hd-title");
        title.textContent = "Network Simulator";
        headerSubEl = document.createElement("div");
        headerSubEl.setAttribute("class", "ns-hd-sub");
        box.appendChild(title);
        box.appendChild(headerSubEl);
        headerEl.appendChild(burgerEl);
        headerEl.appendChild(box);
        document.body.appendChild(headerEl);
    }

    // Un clic sur le burger = appui + relâchement sur la zone du burger (même chemin que l'ancien clic canvas)
    this.burgerClicked = function()
    {
        var dpr = window.devicePixelRatio || 1;
        var cx = (BURGER_X + BURGER_SIZE / 2) * dpr + getPageScrollX() * dpr;
        var cy = (BURGER_Y + BURGER_SIZE / 2) * dpr + getPageScrollY() * dpr;
        dispatchEvent(cx, cy, ACTION_MOUSE_DOWN);
        dispatchEvent(cx, cy, ACTION_MOUSE_UP);
    };

    this.updateHeader = function()
    {
        if (headerSubEl === null)
        {
            return;
        }
        var sub = _("Educational network simulator") + "  \u2022  v" + NetworkSimulator.version;
        if (sub !== lastSub)
        {
            headerSubEl.textContent = sub;
            lastSub = sub;
        }
        var open = (mainmenu !== null) && mainmenu.getVisible();
        burgerEl.className = open ? "ns-open" : "";
    };

    this.hideMenus = function()
    {
        hideAllMenus();
    };

    function renderSelected(ctx)
    {
        if (((state === STATE_ELEMENT_SELECTED_MOUSE_DOWN) || (state === STATE_ELEMENT_SELECTED_MOUSE_UP) || (state === STATE_ELEMENT_MENU_VISIBLE) || (state === STATE_CREATING_LINK))
            && (network.getSelected() instanceof Host) && (elemRect !== null))
        {
            var rect = network.getSelected().getDrawable().getRect();
            ctx.strokeStyle = "rgba(100,100,100,0.75)";
            ctx.lineWidth = 5;
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.strokeStyle = "rgba(255,255,255,0.75)";
            ctx.fillRect(elemRect.X, elemRect.Y, elemRect.W, elemRect.H);
            ctx.lineWidth = 2;
            ctx.strokeRect(elemRect.X, elemRect.Y, elemRect.W, elemRect.H);
        }
        else if (((state === STATE_LINE_SELECTED) || (state === STATE_LINE_MENU_VISIBLE)) && (network.getSelected() instanceof Link))
        {
            var pos = network.getSelected().getCenter();
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.strokeStyle = "rgba(255,255,255,0.75)";
            ctx.fillRect(pos.x - 5, pos.y - 5, 10, 10);
            ctx.lineWidth = 2;
            ctx.strokeRect(pos.x - 5, pos.y - 5, 10, 10);
        }
    }

    function renderCreatingLink(ctx)
    {
        if ((state === STATE_CREATING_LINK) && (network.getSelected() instanceof Host))
        {
            var rect = network.getSelected().getDrawable().getRect();
            var x1 = rect.x + rect.width / 2;
            var y1 = rect.y + rect.height / 2;
            ctx.strokeStyle = "rgba(128,255,128,1.0)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(move_X, move_Y);
            ctx.stroke();

        }
    }

    this.render = function(ctx)
    {
        renderSelected(ctx);
        renderCreatingLink(ctx);
    };
    
    this.getMousePos = function()
    {
        return {X: move_X, Y: move_Y};
    };

    init();
};
