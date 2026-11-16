# Journal des modifications

La version (`NetworkSimulator.version` dans `js/Globals.js` et `package.json`) est incrémentée à chaque
modification ; le bouton **À propos → Vérifier les mises à jour** la compare à la dernière *release* du dépôt
https://github.com/agentia-GIT/RZ-Simulator.

## 1.5.0
- Fenêtre de sauvegarde : titre et bouton **Sauvegarder** (au lieu de « Télécharger ») et nouveau bouton **Parcourir…** pour choisir le dossier et le nom du fichier (Chrome, Edge ; sous Firefox, le fichier va dans le dossier de téléchargements, avec un message qui explique l'option « Toujours demander où enregistrer »).
- **Zone de travail dynamique** : elle s'agrandit quand on éloigne un objet du bord et se réduit quand il revient (plus de blocage horizontal ou vertical) ; la page défile automatiquement quand on approche le bord en déplaçant un objet.
- **Zoom** : boutons − / + (30 % à 300 %, clic sur le pourcentage = 100 %, Ctrl + molette), à droite des contrôles d'animation ; le zoom est mémorisé.
- Contrôles d'animation et de zoom **harmonisés** : fenêtres compactes de même hauteur (~66 px au lieu de ~120 px), côte à côte, fixes à l'écran.
- L'en-tête (menu burger, titre) est maintenant fixe à l'écran, indépendant du défilement et du zoom.

## 1.4.0
- **Sauvegarde automatique** : le réseau est conservé dans le navigateur et restauré au rechargement de la page (plus de perte du travail). Menu Gestion → « Nouveau réseau » pour repartir de zéro.
- **Vérifier les mises à jour** corrigé : à défaut de release GitHub, utilise la dernière étiquette (tag) puis la version du `package.json` de la branche `main`.
- **Switchs 8, 16, 24 et 48 ports** (remplace « Ajouter un switch ») : ports nommés « Port n », libellé « n ports · k actifs », fenêtre **Ports et table MAC** (état des ports, appareil connecté, adresses MAC apprises, vider la table), **arrêt / remise en service d'un port** (shutdown), liste des ports en colonnes dans la fenêtre de création de lien.

## 1.3.0
- Toutes les fenêtres se dimensionnent automatiquement selon leur contenu (plus de hauteur fixe : champs et boutons ne se chevauchent plus) et restent centrées et entièrement visibles, même si le contenu change (ex. fenêtre de l'imprimante) ou si le navigateur est redimensionné.
- Fenêtres plus lisibles : texte 15 px, libellés en gras alignés, champs plus grands, boutons plus larges, tableaux aérés.
- Groupes : le cadre en pointillés englobe désormais la totalité des objets **avec leur étiquette** (nom, adresses, état) ; le nom du groupe est légèrement détaché au-dessus du cadre, sur une étiquette.

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
