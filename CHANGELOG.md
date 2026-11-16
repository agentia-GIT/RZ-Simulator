# Journal des modifications

La version (`NetworkSimulator.version` dans `js/Globals.js` et `package.json`) est incrémentée à chaque
modification ; le bouton **À propos → Vérifier les mises à jour** la compare à la dernière *release* du dépôt
https://github.com/agentia-GIT/RZ-Simulator.

## 1.2.0
- Nouveau jeu d'icônes SVG aux couleurs de v3i.fr (équipements, enveloppes, actions) : `img/v3i/`.
- Libellés plus lisibles : noms, adresses IP et valeurs en gras et plus grands, sur fond blanc ; texte des messages plus grand.
- Les nouveaux objets apparaissent juste à gauche de la fenêtre des contrôles d'animation (décalage automatique si la place est prise).
- Nouvel équipement **imprimante réseau** : impression RAW/JetDirect (TCP 9100), file d'attente, consommables (papier, toner), compteurs, hors ligne, page d'administration HTTP, ping/DHCP/DNS ; menu « Imprimer un document » sur les ordinateurs.
- Nouvel équipement **borne Wi-Fi** : pont de niveau 2 (port LAN + 8 emplacements radio), SSID, sécurité (ouverte / WPA2 / WPA3), mot de passe, bande 2,4 / 5 GHz, canal, détection des interférences de canal, liste des stations ; profil Wi-Fi sur les ordinateurs et imprimantes ; liens radio en pointillés.
- Lien GitHub renseigné pour la vérification des mises à jour.

## 1.1.0
- Nouveau visuel inspiré de v3i.fr, menu burger à sous-menus (Gestion, Bibliothèque d'objets, Langues, À propos).

## 1.0.0
- Corrections de bugs, durcissement de sécurité, langue française, optimisation Firefox.
