#!/usr/bin/env python3
"""Assemble les pages statiques : _src/pages/*.html -> ../*.html
Chaque page commence par un bloc de métadonnées :
<!--meta
title: ...
description: ...
nav: maison|savoir-faire|boutique|magasins|contact|
body_class: ...
-->
Puis le contenu de <main>. En-tête et pied de page sont communs."""
import pathlib, re, datetime

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parent
SITE = "https://confiserie-moinet.fr"
YEAR = datetime.date.today().year

NAV = [
    ("maison", "maison.html", "La Maison"),
    ("savoir-faire", "savoir-faire.html", "Savoir-faire"),
    ("boutique", "boutique.html", "Boutique en ligne"),
    ("magasins", "magasins.html", "Nos boutiques"),
    ("contact", "contact.html", "Contact"),
]

ICON = {
    "user": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/></svg>',
    "bag": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    "menu": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3.5 7h17M3.5 12h17M3.5 17h17"/></svg>',
    "close": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m5.5 5.5 13 13M18.5 5.5l-13 13"/></svg>',
    "fb": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3Z"/></svg>',
    "ig": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none"/></svg>',
}


def header(active):
    AC = ' aria-current="page"'
    links = "\n".join(
        f'        <li><a href="{href}"{AC if key == active else ""}>{label}</a></li>'
        for key, href, label in NAV
    )
    mlinks = "\n".join(
        f'      <li><a href="{href}"{AC if key == active else ""}>{label}</a></li>'
        for key, href, label in [("accueil", "index.html", "Accueil")] + NAV
    )
    return f'''<a class="skip-link" href="#contenu">Aller au contenu</a>
<aside class="topbar" aria-label="Informations pratiques"><span class="tb-long">Livraison à domicile en Colissimo Suivi · Paiement sécurisé · </span><a href="magasins.html">6 boutiques à Vichy, Clermont-Ferrand et Paris</a></aside>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="index.html" aria-label="Maison Moinet, confiseur à Vichy depuis 1852 — accueil">
      <img src="assets/img/logo-moinet.png" alt="" width="350" height="234">
      <span class="brand-tag">Confiseur à Vichy<br>depuis 1852</span>
    </a>
    <nav class="main-nav" aria-label="Navigation principale">
      <ul>
{links}
      </ul>
    </nav>
    <div class="header-actions">
      <a class="icon-btn" href="{SITE}/mon-compte/" aria-label="Mon compte">{ICON["user"]}</a>
      <a class="icon-btn" href="{SITE}/panier/" aria-label="Panier">{ICON["bag"]}</a>
      <a class="btn btn--sm header-shop" href="boutique.html">Commander</a>
      <button class="icon-btn nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Ouvrir le menu">{ICON["menu"]}</button>
    </div>
  </div>
</header>
<div class="mobile-nav" id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <div class="mobile-top">
    <a class="brand" href="index.html" aria-label="Accueil"><img src="assets/img/logo-moinet.png" alt="" width="350" height="234" style="width:76px"></a>
    <button class="icon-btn nav-close" type="button" aria-label="Fermer le menu">{ICON["close"]}</button>
  </div>
  <nav aria-label="Navigation mobile">
    <ul>
{mlinks}
    </ul>
  </nav>
  <div class="mobile-foot">
    <a class="btn" href="boutique.html">Commander en ligne</a>
    <a class="btn btn--ghost" href="{SITE}/mon-compte/">Mon compte</a>
  </div>
</div>'''


FOOTER = f'''<div class="vichy vichy--rouge" aria-hidden="true"></div>
<footer class="site-footer">
  <div class="wrap footer-top">
    <div class="footer-brand">
      <img src="assets/img/logo-moinet.png" alt="Moinet Confiseur" width="350" height="234" loading="lazy">
      <p>La plus ancienne confiserie de Vichy toujours en activité. Fabrique familiale, artisanale et indépendante depuis 1852.</p>
      <div class="socials">
        <a href="https://www.facebook.com/maisonmoinet/" aria-label="Maison Moinet sur Facebook" rel="noopener">{ICON["fb"]}</a>
        <a href="https://www.instagram.com/maisonmoinet/" aria-label="Maison Moinet sur Instagram" rel="noopener">{ICON["ig"]}</a>
      </div>
      <div class="footer-partner">
        <img src="assets/img/region-aura.png" alt="Partenaire : La Région Auvergne-Rhône-Alpes" width="300" height="150" loading="lazy">
      </div>
    </div>
    <div>
      <h2>La Maison</h2>
      <ul>
        <li><a href="maison.html">Présentation</a></li>
        <li><a href="maison.html#histoire">Histoire de la maison</a></li>
        <li><a href="savoir-faire.html">Notre savoir-faire</a></li>
        <li><a href="magasins.html">Nos boutiques</a></li>
        <li><a href="{SITE}/recettes/">Idées recettes</a></li>
      </ul>
    </div>
    <div>
      <h2>Boutique en ligne</h2>
      <ul>
        <li><a href="boutique.html?cat=pastilles">Pastilles du Bassin de Vichy</a></li>
        <li><a href="boutique.html?cat=bonbons-glaces">Bonbons glacés</a></li>
        <li><a href="boutique.html?cat=pate-de-fruits">Pâtes de fruits</a></li>
        <li><a href="boutique.html?cat=chocolats">Chocolats</a></li>
        <li><a href="boutique.html?cat=caramels-nougats">Caramels &amp; nougats</a></li>
        <li><a href="boutique.html?cat=sucres-cuits">Sucres d’orge</a></li>
        <li><a href="boutique.html?cat=pour-offrir">Idées cadeaux</a></li>
      </ul>
    </div>
    <div>
      <h2>Service client</h2>
      <ul>
        <li><a href="mailto:contact@confiserie-moinet.fr">contact@confiserie-moinet.fr</a></li>
        <li><a href="contact.html">Nous écrire</a></li>
        <li><a href="{SITE}/mon-compte/">Mon compte</a></li>
        <li><a href="{SITE}/mon-compte/orders/">Mes commandes</a></li>
        <li><a href="{SITE}/conditions-generales-de-ventes/">Conditions générales de vente</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <p>© {YEAR} Confiserie Moinet · Vichy</p>
    <ul>
      <li><a href="{SITE}/mentions-legales/">Mentions légales</a></li>
      <li><a href="{SITE}/conditions-generales-de-ventes/">CGV</a></li>
    </ul>
  </div>
</footer>
<nav class="action-bar" aria-label="Actions rapides">
  <a class="btn" href="boutique.html">Commander en ligne</a>
  <a class="btn btn--ghost" href="magasins.html">Voir les boutiques</a>
</nav>'''


def page(meta, main, slug):
    canonical = SITE + ("/" if slug == "index" else f"/{meta.get('canonical', slug)}/")
    og_img = meta.get("og_image", f"{SITE}/wp-content/uploads/header_accueil.jpg")
    extra_head = meta.get("head", "")
    scripts = '<script src="assets/js/main.js" defer></script>'
    if meta.get("catalogue") == "yes":
        scripts += '\n<script src="assets/data/catalogue.js" defer></script>\n<script src="assets/js/catalogue.js" data-catalogue="assets/data/catalogue.json" defer></script>'
    return f'''<!doctype html>
<html lang="fr" data-type="place">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{meta["title"]}</title>
<meta name="description" content="{meta["description"]}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#d71535">
<meta name="page-type" content="place">
<meta name="site-kind" content="other">
<meta name="page-kind" content="place">
<meta property="og:locale" content="fr_FR">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Confiserie Moinet">
<meta property="og:title" content="{meta["title"]}">
<meta property="og:description" content="{meta["description"]}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{og_img}">
<link rel="icon" href="assets/img/favicon.png" type="image/png">
<link rel="preload" href="assets/fonts/bodoni-moda-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/jost-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/main.css">
{extra_head}
</head>
<body>
{header(meta.get("nav", ""))}
<main id="contenu">
{main.strip()}
</main>
{FOOTER}
{scripts}
</body>
</html>
'''


def parse(text):
    m = re.match(r"\s*<!--meta\n(.*?)\n-->\n", text, re.S)
    meta = {}
    key = None
    for line in m.group(1).splitlines():
        if re.match(r"^[a-z_]+:", line):
            key, _, val = line.partition(":")
            meta[key] = val.strip()
        elif key:
            meta[key] += "\n" + line
    return meta, text[m.end():]


for src in sorted((ROOT / "pages").glob("*.html")):
    meta, main = parse(src.read_text(encoding="utf-8"))
    (OUT / src.name).write_text(page(meta, main, src.stem), encoding="utf-8")
    print("✓", src.name)
