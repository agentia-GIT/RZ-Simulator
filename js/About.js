/*
 * This file is part of the Education Network Simulator project and covered 
 * by GPLv3 license. See full terms in the LICENSE file at the root folder
 * or at http://www.gnu.org/licenses/gpl-3.0.html.
 *
 * Menu « À propos » : recherche de mises à jour via l'API publique de GitHub.
 * L'adresse du dépôt se renseigne dans NetworkSimulator.repositoryUrl (Globals.js).
 */

// Compare deux versions « 1.2.3 » (un éventuel préfixe « v » est ignoré). Retourne -1, 0 ou 1.
function compareVersions(a, b)
{
    var pa = String(a).replace(/^v/i, "").split(".");
    var pb = String(b).replace(/^v/i, "").split(".");
    var n = Math.max(pa.length, pb.length);
    for (var i = 0; i < n; i++)
    {
        var x = parseInt(pa[i], 10) || 0;
        var y = parseInt(pb[i], 10) || 0;
        if (x !== y)
        {
            return (x < y) ? -1 : 1;
        }
    }
    return 0;
}

// Extrait « propriétaire/dépôt » d'une URL GitHub, ou null si elle n'est pas valide
function parseRepository(url)
{
    var m = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(String(url || "").trim());
    return (m === null) ? null : {owner: m[1], name: m[2]};
}

function setUpdateStatus(statusId, kind, html)
{
    var el = document.getElementById(statusId);
    if (el !== null)
    {
        el.className = "ns-status" + (kind ? " ns-" + kind : "");
        el.innerHTML = html;
    }
}

function checkForUpdates(statusId)
{
    var repo = parseRepository(NetworkSimulator.repositoryUrl);
    if (repo === null)
    {
        // Lien GitHub pas encore renseigné : aucune requête réseau n'est faite
        setUpdateStatus(statusId, "warn", escapeHTML(_("GitHub link not configured yet.")));
        return;
    }
    setUpdateStatus(statusId, "", escapeHTML(_("Checking...")));
    var base = "https://github.com/" + repo.owner + "/" + repo.name;
    var api = "https://api.github.com/repos/" + repo.owner + "/" + repo.name;
    var raw = "https://raw.githubusercontent.com/" + repo.owner + "/" + repo.name + "/main/package.json";

    function getJSON(url)
    {
        return fetch(url, {headers: {"Accept": "application/vnd.github+json"}}).then(function(response)
        {
            if (!response.ok)
            {
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        });
    }

    // 1) dernière release ; 2) à défaut, dernière étiquette (tag) ; 3) à défaut, version du package.json de la branche main
    var step = getJSON(api + "/releases/latest")
        .then(function(r) { return {version: String(r.tag_name || ""), link: String(r.html_url || base)}; })
        .catch(function()
        {
            return getJSON(api + "/tags?per_page=30").then(function(tags)
            {
                var best = null;
                for (var i = 0; i < tags.length; i++)
                {
                    if ((best === null) || (compareVersions(tags[i].name, best) > 0))
                    {
                        best = String(tags[i].name);
                    }
                }
                if (best === null)
                {
                    throw new Error("no tag");
                }
                return {version: best, link: base + "/releases"};
            });
        })
        .catch(function()
        {
            return getJSON(raw).then(function(pkg)
            {
                return {version: String(pkg.version || ""), link: base};
            });
        });

    step.then(function(latest)
        {
            if (!/^v?\d+(\.\d+)*$/.test(latest.version))
            {
                throw new Error("bad version");
            }
            if (compareVersions(latest.version, NetworkSimulator.version) > 0)
            {
                var msg = escapeHTML(_("New version available:") + " " + latest.version);
                if (latest.link.indexOf("https://github.com/") === 0)
                {
                    msg += " &mdash; <a href='" + escapeHTML(latest.link) + "' target='_blank' rel='noopener noreferrer'>" + escapeHTML(_("Download")) + "</a>";
                }
                setUpdateStatus(statusId, "warn", msg);
            }
            else
            {
                setUpdateStatus(statusId, "ok", escapeHTML(_("You are up to date.")));
            }
        })
        .catch(function()
        {
            setUpdateStatus(statusId, "warn", escapeHTML(_("Could not check for updates.")));
        });
}
