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

var MACMODE_SHARED = 0;
var MACMODE_UNIQUE = 1;

var IPMODE_SHARED = 0;
var IPMODE_UNIQUE = 1;
var IPMODE_NOIP = 2;

var IMAGE_SWITCH = 0;
var IMAGE_ROUTER = 1;
var IMAGE_COMPUTER = 2;
var IMAGE_SERVERWEB = 3;
var IMAGE_SERVERDNS = 4;
var IMAGE_SERVERDHCP = 5;
var IMAGE_ENVELOPEDHCP = 6;
var IMAGE_ENVELOPEDNS = 7;
var IMAGE_ENVELOPEHTTP = 8;
var IMAGE_ENVELOPEICMP = 9;
var IMAGE_PRINTER = 10;
var IMAGE_ACCESSPOINT = 11;
var IMAGE_ENVELOPEPRINT = 12;

var REFRESH_INTERVAL = 1000/60; // pas fixe de la simulation (ms)
var LINE_SELECT_TOLERANCE = 6;

var ROUTER_WAN = 0;
var ROUTER_LAN = 1;

var DEBUG = false;

var network = null;
var images = null;
var uimanager = null;

var lastuseddinamycport = 1024;
var lastusedid = 0;

// Ports dynamiques (éphémères) : on boucle entre 1025 et 65535 au lieu de
// dépasser indéfiniment la plage valide des ports TCP/UDP.
function getDinamycPort()
{
  lastuseddinamycport++;
  if (lastuseddinamycport > 65535)
  {
    lastuseddinamycport = 1025;
  }
  return lastuseddinamycport;
}

// Échappe une valeur avant de l'insérer dans du HTML / un attribut HTML
function escapeHTML(value)
{
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Décalage de défilement de la page (compatible Firefox : document.body.scrollTop
// vaut toujours 0 en mode standard, il faut utiliser pageXOffset/pageYOffset).
function getPageScrollX()
{
  return window.pageXOffset || document.documentElement.scrollLeft || 0;
}

function getPageScrollY()
{
  return window.pageYOffset || document.documentElement.scrollTop || 0;
}

function getNextID()
{
  return ++lastusedid;
}

var NetworkSimulator = {
  initialdata: null,
  verbose:false,
  version: "1.5.1",
  // Dépôt GitHub utilisé par « Vérifier les mises à jour » (menu À propos).
  // Format : "https://github.com/UTILISATEUR/DEPOT". Si la valeur est vide, le bouton
  // indique simplement que le lien n'est pas configuré (aucune requête réseau).
  repositoryUrl: "https://github.com/agentia-GIT/RZ-Simulator"
};
