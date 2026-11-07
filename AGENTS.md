# Maison Moinet — consignes du projet

Refonte du site confiserie-moinet.fr (WordPress + WooCommerce). Ce dossier est une maquette
statique fonctionnelle, à intégrer ensuite comme thème WordPress.

## Construire

```bash
python3 _src/build.py      # _src/pages/*.html -> *.html (en-tête, pied de page, metas communs)
python3 -m http.server 8765 # puis http://127.0.0.1:8765/ (fetch du catalogue impossible en file://)
```

On édite toujours `_src/pages/*.html`, `_src/build.py`, `assets/css/main.css`, `assets/js/*.js`.
Les `*.html` à la racine sont générés.

## Direction artistique « La boîte en fer »

- Rouge Moinet `#d71535` (relevé sur le logo), crème `#faf5ec`, encre `#221c19`, bleu carreaux Vichy `#2a4a96`.
- Bodoni Moda (titres) + Jost (texte), auto-hébergées dans `assets/fonts` (licence OFL).
- Signature : le coin coupé de l'octogone du logo (`.cut`), les carreaux Vichy (`.vichy`) avec parcimonie.
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
2. **UI UX Pro Max** (`docs/ui-ux-pro-max-CLAUDE.md`). Checklist §1–§3 (accessibilité,
   interaction, performance) appliquée ; recommandation produit « heritage / storytelling +
   hero-centric », adresses et horaires bien visibles.

3. **Révision frontend-design + ux-copy (nov. 2026)**. Retrait des tics de gabarit : plus de
   capitales espacées (navigation, boutons, étiquettes), plus de surtitre à filet au-dessus de chaque
   titre, plus de mot en italique rouge dans les titres, plus de flèche dans les boutons, plus de
   « · » dans les textes. Le bandeau de chiffres du héros (1852 / 7 / 3 / 6) et le sceau « 1852 »
   sont remplacés par l'adresse et les horaires de la boutique historique. Cibles tactiles de 44 px.
   Toutes ces règles sont en fin de `assets/css/main.css` (« Révision skills »).

4. **Animations signature (nov. 2026, demande du client)**, inspirées de 21st.dev, dans
   `assets/js/motion.js` et en fin de `main.css`. Titres révélés mot à mot au chargement, photo du
   héros qui s'ouvre, archive qui se « développe », libellé des boutons qui roule, reflet sur le
   bouton rouge, boutons magnétiques, halo qui suit le pointeur, aperçu des devantures au survol de
   la liste des boutiques, frise tracée au défilement, pastille de couleur qui glisse entre les
   parfums, défilement infini des boîtes en fer et des villes (pause au survol + bouton pause).
   Écart volontaire au tasteskill (pas de carrousel) : les deux défilements, demandés par le client.
   Survols seulement avec une souris ; sous `prefers-reduced-motion`, motion.js ne fait rien.

## À ne pas casser

- Panier, compte, commandes, CGV et mentions légales restent ceux de WooCommerce
  (liens absolus vers confiserie-moinet.fr). Ajout au panier : `/panier/?add-to-cart=<id>`.
- `assets/js/catalogue.js` lit l'API publique WooCommerce Store en direct quand la page est servie
  depuis confiserie-moinet.fr, sinon l'instantané `assets/data/catalogue.json` (7 nov. 2026).
- Aucun contenu inventé : textes, dates, chiffres, adresses et horaires viennent du site actuel.
- `prefers-reduced-motion` : tout reste visible et immobile.
