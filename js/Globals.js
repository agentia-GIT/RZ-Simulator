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
var multiselect = null;

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

// Palette de dessin du canevas (clair par défaut, remplacée en mode sombre)
var NSTheme = {
  dark: false,
  bg: "#E6E6E6",
  grid: "rgba(0,80,124,0.18)",
  labelBg: "rgba(255,255,255,0.92)",
  labelBar: "#00507c",
  labelName: "#003c5d",
  labelText: "#000001",
  msgBg: "rgba(255,255,255,0.88)",
  frame: "rgba(0,80,124,0.7)",
  groupBg: "rgba(255,255,255,0.9)",
  groupText: "#003c5d",
  link: "#00507c",
  badgeBg: "#ffffff"
};

var NS_DARK_KEY = "networksimulator.dark";

function setDarkMode(on)
{
  on = (on === true);
  NSTheme.dark = on;
  NSTheme.bg = on ? "#14202b" : "#E6E6E6";
  NSTheme.grid = on ? "rgba(120,190,235,0.22)" : "rgba(0,80,124,0.18)";
  NSTheme.labelBg = on ? "rgba(16,30,42,0.92)" : "rgba(255,255,255,0.92)";
  NSTheme.labelBar = on ? "#00a2fc" : "#00507c";
  NSTheme.labelName = on ? "#9fd8ff" : "#003c5d";
  NSTheme.labelText = on ? "#f1f5f8" : "#000001";
  NSTheme.msgBg = on ? "rgba(16,30,42,0.88)" : "rgba(255,255,255,0.88)";
  NSTheme.frame = on ? "rgba(120,190,235,0.8)" : "rgba(0,80,124,0.7)";
  NSTheme.groupBg = on ? "rgba(16,30,42,0.9)" : "rgba(255,255,255,0.9)";
  NSTheme.groupText = on ? "#9fd8ff" : "#003c5d";
  NSTheme.link = on ? "#6cc4f5" : "#00507c";
  NSTheme.badgeBg = on ? "#14202b" : "#ffffff";
  if (document.body)
  {
    if (on) { document.body.classList.add("ns-dark"); } else { document.body.classList.remove("ns-dark"); }
  }
  try { window.localStorage.setItem(NS_DARK_KEY, on ? "1" : "0"); } catch (e) {}
  if (typeof network !== "undefined" && network !== null) { network.invalidateGrid(); }
  var box = document.getElementById("darkswitch");
  if (box !== null) { box.checked = on; }
}

var NetworkSimulator = {
  initialdata: null,
  verbose:false,
  version: "1.7.0",
  // Dépôt GitHub utilisé par « Vérifier les mises à jour » (menu À propos).
  // Format : "https://github.com/UTILISATEUR/DEPOT". Si la valeur est vide, le bouton
  // indique simplement que le lien n'est pas configuré (aucune requête réseau).
  repositoryUrl: "https://github.com/agentia-GIT/RZ-Simulator"
};
