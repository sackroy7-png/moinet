# Maison Moinet — consignes du projet

Refonte du site confiserie-moinet.fr (WordPress + WooCommerce). Ce dossier est une maquette
statique fonctionnelle, à intégrer ensuite comme thème WordPress.

## Construire

```bash
python3 _src/build.py       # _src/pages/*.html -> *.html (en-tête, pied de page, metas communs)
python3 _src/single.py      # tout le site dans site-complet.html (à lancer après build.py)
python3 -m http.server 8765 # puis http://127.0.0.1:8765/ (fetch du catalogue impossible en file://)
```

On édite toujours `_src/pages/*.html`, `_src/build.py`, `assets/css/main.css`, `assets/js/*.js`.
Les `*.html` à la racine et `site-complet.html` sont générés.
`_src/images.py` régénère les photos depuis les originaux du site (inutile en temps normal : les
WebP sont versionnés).

## Direction artistique « La boîte en fer »

- Rouge Moinet `#d71535` (relevé sur le logo), crème `#faf5ec`, encre `#221c19`, bleu carreaux Vichy `#2a4a96`.
- Bodoni Moda (titres) + Jost (texte), auto-hébergées dans `assets/fonts` (licence OFL).
- Signature : l'octogone, forme du logo et de la pastille. Coins coupés des cadres (`.cut`), pastille
  en volume, fonds et pages qui s'ouvrent en octogone ; les carreaux Vichy (`.vichy`) avec parcimonie.
- Couleurs des parfums (menthe, citron, anis, orange, sans sucre) : contraste ≥ 4,5:1 avec leur texte.

## Skills de design intégrés

1. **tasteskill 2.5** (`.claude/skills/design-taste-frontend/SKILL.md`). Type de page : **place**
   (une confiserie qui ouvre ses portes et vend en ligne). Règles appliquées : aucune légende
   sous les images, une section par écran sur l'accueil et les pages récit, héros seul au premier
   écran avec entrée unique (`data-enter`), bords égaux, pas de carrousel, d'inclinaison ni de
   fondu au défilement, un moment typographique (`data-moment="word-highlight"`), survols
   discrets (carte +2 px, photo ≤ 1,03), barre d'actions mobile, h1 qui nomme la catégorie et le
   lieu, boutons verbe + objet.
   Écart volontaire : la règle 9 (pas de numéro de rue, de code postal ni de téléphone réel) n'est
   pas appliquée, car il s'agit des vraies coordonnées du client, utiles à la visite.
   Le kit (scripts `gate.mjs`, `copy-lint.mjs`, `assets/`, `references/`) n'est pas fourni : les
   contrôles sont faits avec Playwright et axe-core.
2. **UI UX Pro Max** (`.claude/skills/ui-ux-pro-max/`, installé depuis github.com/nextlevelbuilder/ui-ux-pro-max-skill v2.15, avec ses skills compagnons `design`, `design-system`, `ui-styling`, `brand`, `banner-design`, `slides`). Checklist §1–§3 (accessibilité,
   interaction, performance) appliquée ; recommandation produit « heritage / storytelling +
   hero-centric », adresses et horaires bien visibles.

3. **Révision frontend-design + ux-copy (nov. 2026)**. Retrait des tics de gabarit : plus de
   capitales espacées (navigation, boutons, étiquettes), plus de surtitre à filet au-dessus de chaque
   titre, plus de mot en italique rouge dans les titres, plus de flèche dans les boutons, plus de
   « · » dans les textes. Le bandeau de chiffres du héros (1852 / 7 / 3 / 6) et le sceau « 1852 »
   sont remplacés par l'adresse et les horaires de la boutique historique. Cibles tactiles de 44 px.
   Toutes ces règles sont en fin de `assets/css/main.css` (« Révision skills »).

4. **Animations signature (nov. 2026, demande du client)**, inspirées de 21st.dev, dans
   `assets/js/motion.js`. Titres révélés mot à mot au chargement, libellé des boutons qui roule,
   reflet sur le bouton rouge, boutons magnétiques, halo qui suit le pointeur, frise tracée au
   défilement, défilement infini des spécialités et des villes (pause au survol + bouton pause).
   Survols seulement avec une souris ; sous `prefers-reduced-motion`, motion.js ne fait rien.

5. **Refonte immersive (nov. 2026, demande du client)**. Références données par le client :
   theobromachocolat.com, fixchocolatier.com, buckssauce.com (plus sourjacks.com et und-ny.com,
   vus en vidéo). Composants 21st.dev adaptés en JavaScript sans dépendance : « 3D Coverflow
   Carousel » (dg.singh252525) pour l'éventail, « Scroll media expansion hero » (arunachalam) pour
   la fenêtre de l'atelier. Tout est dans `assets/js/immersif.js`, `assets/js/pastille.js` et le
   bloc « Refonte immersive » en fin de `main.css`.
   - **Pastille 3D** (`pastille.js`, WebGL 1 écrit à la main, 14 Ko) : octogone chanfreiné, relief
     « BASSIN DE VICHY » dessiné en 2D puis converti en carte de normales. Proportions relevées sur
     la photo `savoir-2.webp`. Repli : l'image `assets/img/pastille.webp` (rendu de la même pastille).
   - **Accueil** : ouverture en octogone rouge (une fois par visite) ; héros photo plein cadre, carte
     « Nouveau », pastille qui dépasse du bord ; scène épinglée des parfums (la pastille se retourne,
     la couleur s'ouvre en octogone, trois vrais produits par parfum) ; manifeste qui s'allume mot à
     mot avec vignettes ; mosaïque à photos glissantes ; fenêtre de l'atelier ; frise de gravures ;
     éventail 3D des boîtes en vente (`#boites`, 9 boîtes : photo, contenu, prix « dès » et lien vers la
     fiche, mis à jour par `catalogue.js` via `data-box` ; demandé par le client en nov. 2026, les pièces
     d'archives restent dans l'éventail de « La Maison », avec un lien vers ces boîtes) ; boutiques sur bleu Vichy avec devanture qui change ; nom de la maison
     en grand dans le pied de page.
   - **Pages intérieures** : même cadre photo en tête de page, frise tracée (`data-trace`), pellicule
     d'archives (`data-drift`), éventail sur « La Maison », pastille 3D sur « Savoir-faire ».
   - **Transitions entre pages** en octogone : `@view-transition` (multi-pages) et
     `document.startViewTransition` (routeur de `site-complet.html`).
   - **Règles techniques** : aucune prise de contrôle de la molette ; les scènes épinglées sont en
     `position: sticky` (deux par page au plus : parfums et atelier) ; une seule boucle
     `requestAnimationFrame`, active seulement près de l'écran ; la classe `html.motion` est posée
     dans `<head>` (script `INTRO` de `build.py`).
   - **Écarts volontaires au tasteskill**, tous demandés par le client : scènes liées au défilement,
     éventail (carrousel), rendu WebGL d'un produit sur un site de type « place », autocollant
     incliné, plus de deux « moments » par page. Les noms sous l'éventail sont des boutons de
     sélection, pas des légendes.
   - **Contrôles** (Playwright + axe-core 4) : aucun défaut sur les six pages à 1440 px, 390 px et
     sous mouvement réduit ; parcours clavier vérifié (une seule tabulation par rangée de noms, puis
     flèches) ; aucun débordement horizontal de 320 à 1440 px ; CLS ≤ 0,03.

6. **Offre réorganisée (nov. 2026, demande du client)**. `assets/data/offre.json` est la source :
   10 rayons (les 5 filtres Pour offrir, Promotions, Carreaux Vichy, Bicentenaire, Pâques ont été retirés
   à la demande du client en nov. 2026 : leurs anciennes adresses mènent à toute la boutique),
   37 familles de déclinaisons (parfum, poids, décor, format…) et les produits masqués (doublon
   « Mendiants de Vichy » 1239). 152 produits WooCommerce donnent 62 fiches. Chaque variante reste
   un produit WooCommerce : le panier reçoit son id et la quantité (`?add-to-cart=<id>&quantity=<n>`).
   Fiche produit : `produit.html?f=<famille>&v=<id>` (sélecteurs de déclinaison, quantité, total).
   Une combinaison absente (ex. sans sucre anis 500 g) est barrée ; la choisir bascule sur la plus
   proche. `build.py` génère `assets/data/offre.js` (ouverture en file://). Les anciennes adresses
   `boutique.html?cat=<catégorie WooCommerce>` restent valides (filtre ou rayon correspondant).
   Pour WooCommerce, ces familles sont la base d'une conversion en produits variables.

7. **Mesure d'audience (nov. 2026)**. `assets/js/mesure.js` : Google Analytics 4 et bandeau de
   consentement conforme CNIL, inactifs tant que `GA4_ID` est vide (y coller l'identifiant `G-…`
   de la propriété GA4 de Moinet). Mode consentement Google v2 refusé par défaut ; balise chargée
   seulement après « Accepter » ; accord gardé 13 mois, refus 6 mois ; lien « Gestion des cookies »
   dans le pied de page. Événements e-commerce envoyés par `catalogue.js` (`window.moinetTrack`) :
   `view_item_list`, `view_item`, `add_to_cart`. L'achat (`purchase`) se mesure côté WooCommerce.
   Constat sur le site actuel (22 nov. 2026) : il utilise encore `UA-124933013-1` (Universal
   Analytics, arrêté par Google en juillet 2023) et n'a pas de bandeau de consentement.

8. **Thème WordPress (nov. 2026)**. `python3 _src/wordpress.py` (après `build.py`) génère
   `wordpress/moinet/` (ignoré par git) et `wordpress/moinet.zip` (versionné). Les gabarits sont
   tirés des pages générées : liens convertis (`moinet_url()`, `home_url()`), ressources servies par
   le thème (`moinet_asset()`). Fichiers écrits à la main : `_src/wordpress/`. Dans WordPress,
   `window.MOINET_WP` met `catalogue.js` en mode direct (API Store du site, panier local, fiche =
   page produit WooCommerce de la déclinaison). Identifiant GA4 : Personnaliser > Mesure d'audience.
   Test local : WordPress + WooCommerce + SQLite, voir README.

## À ne pas casser

- Panier, compte, commandes, CGV et mentions légales restent ceux de WooCommerce
  (liens absolus vers confiserie-moinet.fr). Ajout au panier : `/panier/?add-to-cart=<id>`.
- `assets/js/catalogue.js` lit l'API publique WooCommerce Store en direct quand la page est servie
  depuis confiserie-moinet.fr, sinon l'instantané `assets/data/catalogue.json` (7 nov. 2026).
- Aucun contenu inventé : textes, dates, chiffres, adresses et horaires viennent du site actuel.
- `prefers-reduced-motion` : tout reste visible et immobile (immersif.js ne garde que le changement
  de devanture). Sans JavaScript : la page reste complète, sans sélecteur de parfum.
- Chaque scène a un état fixe dans le HTML ; `immersif.js` l'active en ajoutant `.is-live`.
  Ne pas styler une scène sans vérifier les deux états.
- La scène des parfums pilote le catalogue par l'événement `moinet:flavor` (écouté dans
  `catalogue.js`) ; les pastilles sans sucre ne comptent pas dans les quatre parfums.
- Focus des boutons `.btn` : liseré intérieur (un contour extérieur serait rogné par `clip-path`).
- Après toute modification : `python3 _src/build.py && python3 _src/single.py && python3 _src/wordpress.py`.

## Serveur MCP 21st.dev

Déclaré dans `.mcp.json` (composants UI de 21st.dev). La clé n'est **jamais** dans le dépôt :
`x-api-key: proxy-injected` est une valeur factice, la vraie clé est un secret réseau de
l'environnement cloud « moinet » (hôte `21st.dev`, en-tête `x-api-key`), injecté par le proxy.
