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

## Intégration WordPress (étapes suivantes)

1. Créer un thème enfant reprenant `assets/` et découper `_src/build.py` (en-tête/pied) en `header.php` / `footer.php`.
   Reprendre aussi le petit script `INTRO` placé dans `<head>` ; charger `pastille.js` seulement sur
   l'accueil et la page Savoir-faire.
2. Brancher le formulaire de contact sur Contact Form 7 (champs : e-mail, référence de commande, message).
3. Garder les slugs actuels (canonicals déjà alignés : `/maison-moinet/`, `/notre-savoir-faire/`, `/nos-magasins/`…).
4. Appliquer le style aux gabarits WooCommerce (fiche produit, panier, commande).
