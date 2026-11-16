# Network Simulator (Education Network Simulator)

## Version 1.3 — fenêtres adaptatives, groupes lisibles

- Toutes les fenêtres s'adaptent automatiquement à leur contenu et restent centrées/visibles.
- Les cadres de groupe englobent les objets avec leur étiquette ; le nom du groupe est détaché au-dessus du cadre.

## Version 1.2 — imprimante réseau, borne Wi-Fi, objets modernisés

- **Imprimante réseau** (menu ☰ → *Bibliothèque d'objets*) : service d'impression RAW/JetDirect sur le port TCP 9100, file d'attente,
  papier (250 feuilles) et toner qui se consomment page après page, compteur de pages, mise hors ligne, page d'administration
  HTTP (ouvrir `IP/status.html` dans le navigateur d'un ordinateur), client DHCP/DNS et réponse au ping. Les ordinateurs ont une
  entrée *Imprimer un document* (choix de l'imprimante, nom du document, nombre de pages). La vitesse d'impression suit les
  contrôles d'animation.
- **Borne Wi-Fi** : pont de niveau 2 avec 1 port LAN et 8 emplacements radio. Réglages : SSID, sécurité (ouverte, WPA2, WPA3),
  mot de passe (8 à 63 caractères), bande 2,4 / 5 GHz, canal ; alerte en cas d'interférence de canal entre bornes proches.
  Pour joindre le réseau, un ordinateur ou une imprimante doit avoir un profil *Connexion Wi-Fi* identique (SSID + mot de passe),
  puis on crée un lien vers un emplacement *Wi-Fi n* de la borne (lien en pointillés). Si les paramètres changent ou si le
  Wi-Fi est coupé, les stations non conformes sont dissociées.
- Libellés agrandis et en gras, nouveau jeu d'icônes SVG (`img/v3i/`), apparition des objets à gauche des contrôles d'animation.
- Mises à jour : dépôt https://github.com/agentia-GIT/RZ-Simulator renseigné ; voir `CHANGELOG.md` (version incrémentée à chaque modification).


## Version 1.1 — nouveau visuel et menu à sous-menus

- **Design inspiré de v3i.fr** : palette bleu `#00507c` / bleu foncé `#003C5D` / gris `#E6E6E6` / accent `#00a2fc` relevée sur le site, titres en *Manrope*, texte en *Open Sans* (polices embarquées dans `fonts/`, licences incluses, aucun appel externe), angles droits, bandeau d'en-tête, fond quadrillé, liens bleus. Tout le thème est dans `css/theme.css`.
- **Menu burger à sous-menus** (un seul sous-menu ouvert à la fois) :
  - *Gestion* : sauvegarder / restaurer le réseau
  - *Bibliothèque d'objets* : ordinateur, serveurs DHCP / DNS / web, switch, routeur
  - *Langues* : choix direct de la langue (la langue active est cochée)
  - *À propos* : version (1.1.0), licence et bouton **Vérifier les mises à jour**
- **Vérification des mises à jour** : renseigner plus tard le lien GitHub dans `js/Globals.js` (`NetworkSimulator.repositoryUrl = "https://github.com/UTILISATEUR/DEPOT"`) puis relancer `npx grunt`. Tant que le lien est vide, le bouton l'indique sans faire de requête réseau ; une fois renseigné, il interroge la dernière *release* GitHub et compare avec la version installée.
- Nouvelles chaînes traduites en français, espagnol et basque. Version portée à 1.1.0 (`package.json`, `NetworkSimulator.version`).
- Les équipements ajoutés apparaissent sous le bandeau (y = 80).


Simulateur de réseau pédagogique en JavaScript / canvas HTML5 (équipements, liens, DHCP, DNS, HTTP,
ping/traceroute, routage, NAT). Licence GPLv3 — © 2015 Jorge García Ochoa de Aspuru.

## Utilisation

Ouvrir `simulator.html` dans un navigateur (testé pour Firefox ; fonctionne aussi avec Chrome/Edge).
Aucun serveur n'est nécessaire. Un exemple de réseau est fourni : `examples/data01.json`
(menu ☰ → *Charger*).

Langues : English, Español, Euskara et **Français** (menu ☰ → *Choisir la langue*).
La langue du navigateur est détectée au démarrage et le choix est mémorisé.

## Reconstruire le bundle (`dist/networksim.min.js`)

```
npm install
npx grunt
```

Le Gruntfile fixe maintenant l'ordre de concaténation (Globals, UITranslation, sources, langues, simulator).

## Principales corrections par rapport à la version d'origine

**Bugs de fonctionnement**
- `Connectable.isInMyNetworks` : boucle infinie (gel du navigateur) si la 1re interface n'avait pas d'IP.
- `Link.update` : une réponse envoyée sur le même lien pendant la réception d'un message était perdue
  (ex. réponse au ping entre deux machines reliées directement).
- `Network.deleteElement` : utilisait la sélection globale et un `indexOf` sur tableau creux
  (la suppression pouvait échouer) ; les éléments sont maintenant indexés par identifiant (objet).
- `UIManager.reset` : ne vidait pas la liste des zones cliquables (zones fantômes après un chargement) ;
  `removeClickable` supprimait le dernier élément quand la cible était absente ; la poignée de menu d'un
  lien n'était jamais retirée ; les observateurs s'accumulaient à chaque sélection (et plantaient quand un lien
  était sélectionné).
- Recherche ARP (`findMACforIP`) : récursion infinie (dépassement de pile) dans un réseau avec boucle.
- `UIWindow` : identifiants HTML dupliqués (`undefined_contents`), hauteur `NaN`, écouteurs jamais retirés
  (mauvais drapeau `capture`).
- `UIMenu.dispose` appelait une méthode inexistante (`deleteObserver`).
- `HTTPClient` : `domaine/dossier/page.html` était tronqué ; `HTTPServer.deleteFile` référençait une variable
  inexistante ; `DNSServer` transmettait une réponse « introuvable » comme valide ; `DHCPServer` ignorait la fin
  de la plage d'adresses et mélangeait chaînes/nombres ; libellé « DNS Server » dans la description DHCP.
- `Host.getStrInfo/getVerboseStr` : variable globale `result` écrasée entre appels ; `var window` masquait `window`.
- `Connectable.removeConnector` utilisait `slice` au lieu de `splice`.
- `IPInfo.isValidIPv4` : test `!== NaN` toujours vrai, acceptait `1.2.3.4abc` ; saisie invalide maintenant signalée.
- Ports dynamiques : dépassaient 65535 ; ils bouclent maintenant entre 1025 et 65535.
- Nombreuses variables globales implicites supprimées (`c`, `s`, `r`, `result`, `port`, `domain`, `locale`…).

**Sécurité**
- `eval()` sur le contenu d'un fichier chargé (exécution de code arbitraire) remplacé par une liste blanche.
- Échappement HTML des noms, valeurs de champs, journal de diagnostic ; assainissement des pages web simulées
  (scripts, `on*=`, `javascript:`).
- Validation du fichier chargé (version, structure) avec message d'erreur au lieu d'un plantage.

**Firefox / navigateurs**
- `document.body.scrollTop/Left` (toujours 0 en mode standard sous Firefox) → `pageXOffset/pageYOffset`.
- Boucle d'animation `requestAnimationFrame` à pas fixe (au lieu de `setInterval`) : vitesse identique sur tout
  écran, pause automatique onglet masqué.
- Contexte canvas `{alpha:false}` (l'option `antialias` n'existe pas en 2D) ; polices canvas valides
  (`'8pt'` seul était ignoré).
- Enregistrement via `Blob` + `URL.createObjectURL` (l'ancien `data:` URI avec `charset:` était invalide).
- `href="#"` des menus ne fait plus défiler la page ; `<canvas>` correctement fermé, `display:block` ;
  `ImageLoader` n'est plus bloqué par une image manquante ; tolérance de sélection des liens 2 px → 6 px.

**Langue**
- Ajout du **français** (`js/i18n/fr_FR.js`), détection de la langue du navigateur, mémorisation du choix,
  liste triée. Chaînes jusque-là non traduisibles (alertes, confirmations, diagnostic, contrôles d'animation) ajoutées.

## Notes

- `examples/data01.json` est maintenant du JSON valide (c'était `var exampledata = {...}`) ; l'ancien format
  reste accepté au chargement.
- Le fichier `LICENSE` (GPLv3) cité dans les en-têtes n'était pas présent dans le dossier d'origine.
- `NetworkSimulator/` (dossier d'origine) est conservé intact.
