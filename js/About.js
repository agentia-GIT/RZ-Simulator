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
    var url = "https://api.github.com/repos/" + repo.owner + "/" + repo.name + "/releases/latest";
    fetch(url, {headers: {"Accept": "application/vnd.github+json"}})
        .then(function(response)
        {
            if (!response.ok)
            {
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        })
        .then(function(release)
        {
            var tag = String(release.tag_name || "");
            if (compareVersions(tag, NetworkSimulator.version) > 0)
            {
                var link = String(release.html_url || "");
                var msg = escapeHTML(_("New version available:") + " " + tag);
                if (link.indexOf("https://github.com/") === 0)
                {
                    msg += " &mdash; <a href='" + escapeHTML(link) + "' target='_blank' rel='noopener noreferrer'>" + escapeHTML(_("Download")) + "</a>";
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
