# Refonte confiserie-moinet.fr — maquette fonctionnelle

**Pour voir le site : ouvrez `site-complet.html`** (un seul fichier, les 6 pages, rien à installer).
Il se régénère avec `python3 _src/build.py && python3 _src/single.py`.

Voir `AGENTS.md` pour la direction artistique, les skills intégrés et les règles du projet.

## Pages

| Page | Remplace | Contenu |
|---|---|---|
| `index.html` | `/` | Héros photo, scène des parfums avec pastille 3D, manifeste, spécialités, atelier, histoire, boîtes en éventail, boutiques, presse, recettes |
| `boutique.html` | `/boutique-en-ligne/` + catégories | 62 fiches (152 produits regroupés), 10 rayons, filtres, recherche, tri, quantité |
| `maison.html` | `/maison-moinet/` + `/histoire-de-la-maison/` | Chiffres, sept générations (frise tracée), archives, griffe en éventail, production, points de vente |
| `savoir-faire.html` | `/notre-savoir-faire/` | Artisanat, pastilles, gamme |
| `produit.html` | fiches produit | Une fiche par produit avec ses déclinaisons (parfum, poids…), quantité, ajout au panier WooCommerce |
| `magasins.html` | `/nos-magasins/` | 6 boutiques, horaires, itinéraire, appel, données structurées `Store` |
| `contact.html` | `/nous-contacter/` | E-mail, téléphones, formulaire (ouvre le client mail ; à rebrancher sur Contact Form 7) |

Non refaites, toujours liées au site WordPress : fiches produit, panier, commande, mon compte,
recettes, CGV, mentions légales.

## Version immersive (nov. 2026)

La forme du logo et de la pastille, l'octogone, porte les animations : pastille en volume qui tourne,
couleur qui s'ouvre à chaque parfum, cadres aux coins coupés, transitions entre les pages.

| Fichier | Rôle |
|---|---|
| `assets/js/pastille.js` | La pastille en 3D (WebGL, sans bibliothèque) |
| `assets/js/immersif.js` | Scènes liées au défilement : parfums, atelier, éventail, devantures, frises |
| `assets/js/motion.js` | Micro-animations : titres, boutons, halo, bandeaux |
| `assets/img/pastille.webp` | Image fixe de la pastille, affichée sans WebGL ou sans animation |
| `_src/images.py` | Régénère les photos en grand format depuis les originaux du site |

Les animations se coupent d'elles-mêmes si l'appareil demande moins de mouvement ; la page reste
complète sans JavaScript. Détails et règles dans `AGENTS.md`.

## Thème WordPress (prêt à installer)

`wordpress/moinet.zip` est le thème complet. Il se régénère avec :

```bash
python3 _src/build.py && python3 _src/wordpress.py
```

Il remplace l'apparence du site actuel et garde tout le reste : WooCommerce, produits, prix,
stocks, panier, commande, comptes clients, extensions (Yoast…), pages existantes.

### Installer

1. **Sauvegarder** le site (fichiers + base), et installer d'abord sur une **copie de préproduction**.
2. **Apparence > Thèmes > Ajouter > Téléverser un thème** : `moinet.zip`, puis **Activer**.
3. Vérifier que ces pages existent avec ces adresses (c'est le cas sur le site actuel) :
   `/maison-moinet/`, `/notre-savoir-faire/`, `/nos-magasins/`, `/nous-contacter/`. Le thème leur
   applique automatiquement leur gabarit. La boutique est la page Boutique de WooCommerce
   (`/boutique-en-ligne/`), la page d'accueil est la page d'accueil du site.
4. **Apparence > Personnaliser > Mesure d'audience** : coller l'identifiant GA4 (`G-…`) de la Maison
   Moinet. Vide = ni Google Analytics ni bandeau de cookies.
5. Retirer l'ancien code Universal Analytics (`UA-124933013-1`) s'il est ajouté par une extension.

### Ce que fait le thème

| Fichier | Rôle |
|---|---|
| `front-page.php`, `page-maison-moinet.php`, `page-notre-savoir-faire.php`, `page-nos-magasins.php`, `page-nous-contacter.php` | Pages de la maquette, générées |
| `archive-product.php` | Boutique et pages de catégorie : rayons, filtres, recherche, 62 fiches |
| `single-product.php` | Fiche produit : déclinaisons, quantité, total, description WooCommerce |
| `page.php`, `index.php`, `404.php` | Panier, commande, compte, CGV, recettes et autres pages, avec l'en-tête et le pied du site |
| `functions.php` | Chargement des styles et scripts, réglage GA4, adresses du site |

Les produits sont lus en direct dans WooCommerce (API Store) : prix, stocks et photos sont toujours
à jour. Le regroupement en fiches vient de `assets/data/offre.json` (identifiants des produits du
site actuel). Un produit ajouté plus tard apparaît seul dans son rayon ; pour le rattacher à une
fiche, ajouter son identifiant dans `offre.json` puis régénérer le thème.

### Testé

Sur WordPress 6.9 + WooCommerce 11.3 (base SQLite), avec les 152 produits importés sous leurs
identifiants : six pages, boutique, catégories, fiche, ajout au panier avec quantité (3 × 68 € =
204 € au panier), aucune erreur JavaScript, aucun défaut d'accessibilité (axe-core) à 1440 et 390 px.
Non testé : l'hébergement réel, les extensions installées sur le site actuel, le paiement.

## Maquette : étapes suivantes


1. ~~Thème WordPress~~ : fait, voir ci-dessus.
2. Brancher le formulaire de contact sur Contact Form 7 (champs : e-mail, référence de commande, message).
3. Garder les slugs actuels (canonicals déjà alignés : `/maison-moinet/`, `/notre-savoir-faire/`, `/nos-magasins/`…).
4. Appliquer le style aux gabarits WooCommerce (fiche produit, panier, commande).
