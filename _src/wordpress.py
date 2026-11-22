#!/usr/bin/env python3
"""Génère le thème WordPress « Maison Moinet » depuis la maquette.

    python3 _src/build.py && python3 _src/wordpress.py

Sortie : wordpress/moinet/ (le thème) et wordpress/moinet.zip (à téléverser dans
Apparence > Thèmes > Ajouter > Téléverser). Les gabarits sont tirés des pages générées
(index.html, maison.html…) : on modifie la maquette, puis on relance ce script.
Fichiers écrits à la main : _src/wordpress/ (style.css, functions.php, page.php, index.php,
404.php, single-product.php)."""
import pathlib, re, shutil, zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
HAND = ROOT / "_src" / "wordpress"
OUT = ROOT / "wordpress" / "moinet"
ZIP = ROOT / "wordpress" / "moinet.zip"

PAGES = {  # page de la maquette -> gabarit WordPress (choisi par WordPress selon l'adresse de la page)
    "index": "front-page.php",
    "maison": "page-maison-moinet.php",
    "savoir-faire": "page-notre-savoir-faire.php",
    "magasins": "page-nos-magasins.php",
    "contact": "page-nous-contacter.php",
    "boutique": "archive-product.php",
}
KEYS = {"index": "accueil", "maison": "maison", "savoir-faire": "savoir-faire", "boutique": "boutique",
        "magasins": "magasins", "contact": "contact"}


def php_url(expr):
    return f'<?php echo esc_url( {expr} ); ?>'


def convert(html):
    # liens entre pages de la maquette -> adresses WordPress
    def page_link(m):
        key, rest = KEYS[m.group(1)], m.group(2) or ""
        return f'href="{php_url(f"moinet_url( {key!r}, {rest!r} )")}"'.replace("'", "'")
    html = re.sub(r'href="(index|maison|savoir-faire|boutique|magasins|contact)\.html([?#][^"]*)?"', page_link, html)
    # liens absolus vers le site de production -> ce site (préproduction comprise)
    html = re.sub(r'href="https://(?:www\.)?confiserie-moinet\.fr(/[^"]*)?"',
                  lambda m: f'href="{php_url(f"home_url( {(m.group(1) or "/")!r} )")}"', html)
    # fichiers du thème (src, srcset, href)
    html = re.sub(r'(?<=["\s,])assets/([^"\s,]+)', lambda m: php_url(f"moinet_asset( {m.group(1)!r} )"), html)
    return html


def part(doc, start, end):
    a = doc.index(start) + len(start)
    return doc[a:doc.index(end, a)]


def main():
    docs = {p: (ROOT / f"{p}.html").read_text(encoding="utf-8") for p in PAGES}
    index = docs["index"]

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    # en-tête : menu souligné selon la rubrique
    head = part(index, "<body>", '<main id="contenu">')
    head = re.sub(r'<li><a href="(index|maison|savoir-faire|boutique|magasins|contact)\.html">',
                  lambda m: f'<li><a href="{m.group(1)}.html"<?php moinet_current( {KEYS[m.group(1)]!r} ); ?>>', head)
    head = convert(head)
    (OUT / "header.php").write_text(
        "<?php defined( 'ABSPATH' ) || exit; ?><!doctype html>\n"
        '<html <?php language_attributes(); ?> data-type="place">\n<head>\n'
        '<meta charset="<?php bloginfo( \'charset\' ); ?>">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        "<?php wp_head(); ?>\n</head>\n<body <?php body_class(); ?>>\n<?php wp_body_open(); ?>\n"
        + head.strip() + '\n<main id="contenu">\n', encoding="utf-8")

    # pied de page
    foot = index[index.index("</main>") + len("</main>"):index.index('<script src="assets/js/main.js"')]
    foot = re.sub(r"© \d{4} ", "© <?php echo esc_html( wp_date( 'Y' ) ); ?> ", foot)
    (OUT / "footer.php").write_text("</main>\n" + convert(foot).strip() + "\n<?php wp_footer(); ?>\n</body>\n</html>\n",
                                    encoding="utf-8")

    # gabarits de page
    for page, template in PAGES.items():
        doc = docs[page]
        main_html = part(doc, '<main id="contenu">', "</main>")
        extra = ""
        if page == "magasins":   # données structurées des boutiques
            extra = "".join(re.findall(r'<script type="application/ld\+json">.*?</script>', part(doc, "<head>", "</head>"), re.S))
        if page == "boutique":
            main_html = main_html.replace(
                "<div data-shop>",
                "<div data-shop data-cat=\"<?php echo esc_attr( is_product_taxonomy() ? get_queried_object()->slug : '' ); ?>\">")
            # sans JavaScript (et pour les moteurs) : la liste des produits, que le catalogue remplace
            main_html = main_html.replace(
                '<div class="product-grid"><p class="empty">Chargement du catalogue…</p></div>',
                '<div class="product-grid"><?php if ( have_posts() ) : while ( have_posts() ) : the_post(); $p = wc_get_product( get_the_ID() ); ?>\n'
                '        <article class="product"><div class="product-img"><?php echo $p ? $p->get_image( \'woocommerce_thumbnail\' ) : \'\'; ?></div>'
                '<div class="product-body"><h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>'
                '<div class="product-foot"><span class="price"><?php echo $p ? wp_kses_post( $p->get_price_html() ) : \'\'; ?></span></div></div></article>\n'
                '      <?php endwhile; endif; ?></div>')
            main_html = main_html.replace(
                '<noscript><div class="wrap"><p>La boutique nécessite JavaScript. <a href="https://confiserie-moinet.fr/boutique-en-ligne/">Accéder à la boutique classique</a>.</p></div></noscript>', "")
        body = convert(main_html).strip()
        (OUT / template).write_text(
            f"<?php\n/* Généré par _src/wordpress.py depuis {page}.html : ne pas modifier ici. */\n"
            "defined( 'ABSPATH' ) || exit;\nget_header(); ?>\n" + extra + body + "\n<?php get_footer();\n",
            encoding="utf-8")

    # fichiers écrits à la main
    for f in HAND.iterdir():
        shutil.copy(f, OUT / f.name)

    # ressources : sans les images de produits ni l'instantané du catalogue (WordPress lit ses produits en direct)
    def keep(src, names):
        rel = pathlib.Path(src).relative_to(ROOT / "assets")
        skip = {"p"} if rel == pathlib.Path("img") else set()
        if rel == pathlib.Path("data"):
            skip = {n for n in names if n != "offre.js"}
        return skip
    shutil.copytree(ROOT / "assets", OUT / "assets", ignore=keep)

    shot = ROOT / "_src" / "wordpress-screenshot.png"
    if shot.exists():
        shutil.copy(shot, OUT / "screenshot.png")

    if ZIP.exists():
        ZIP.unlink()
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(OUT.rglob("*")):
            if f.is_file():
                z.write(f, pathlib.Path("moinet") / f.relative_to(OUT))
    n = sum(1 for f in OUT.rglob("*") if f.is_file())
    print(f"thème : {OUT.relative_to(ROOT)} ({n} fichiers), {ZIP.relative_to(ROOT)} {ZIP.stat().st_size / 1e6:.1f} Mo")


if __name__ == "__main__":
    main()
