# Refonte confiserie-moinet.fr — maquette fonctionnelle

Voir `AGENTS.md` pour la direction artistique, les skills intégrés et les règles du projet.

## Pages

| Page | Remplace | Contenu |
|---|---|---|
| `index.html` | `/` | Héros, boutiques, sélecteur de parfum de pastilles, spécialités, histoire, boîtes, savoir-faire, presse, recettes |
| `boutique.html` | `/boutique-en-ligne/` + catégories | 152 produits, filtres par catégorie, recherche, tri, ajout au panier WooCommerce |
| `maison.html` | `/maison-moinet/` + `/histoire-de-la-maison/` | Chiffres, sept générations, archives, griffe, production, points de vente |
| `savoir-faire.html` | `/notre-savoir-faire/` | Artisanat, pastilles, gamme |
| `magasins.html` | `/nos-magasins/` | 6 boutiques, horaires, itinéraire, appel, données structurées `Store` |
| `contact.html` | `/nous-contacter/` | E-mail, téléphones, formulaire (ouvre le client mail ; à rebrancher sur Contact Form 7) |

Non refaites, toujours liées au site WordPress : fiches produit, panier, commande, mon compte,
recettes, CGV, mentions légales.

## Intégration WordPress (étapes suivantes)

1. Créer un thème enfant reprenant `assets/` et découper `_src/build.py` (en-tête/pied) en `header.php` / `footer.php`.
2. Brancher le formulaire de contact sur Contact Form 7 (champs : e-mail, référence de commande, message).
3. Garder les slugs actuels (canonicals déjà alignés : `/maison-moinet/`, `/notre-savoir-faire/`, `/nos-magasins/`…).
4. Appliquer le style aux gabarits WooCommerce (fiche produit, panier, commande).
