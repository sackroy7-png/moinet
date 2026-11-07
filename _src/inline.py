#!/usr/bin/env python3
"""Crée une version autonome (un seul fichier) d'une page : CSS, JS, polices, images et
catalogue intégrés. Usage : python3 _src/inline.py index apercu-accueil.html"""
import base64, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
MIME = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'}
def data_uri(rel):
    f = (ROOT / rel).resolve()
    return f'data:{MIME[f.suffix]};base64,' + base64.b64encode(f.read_bytes()).decode()
page, out = sys.argv[1], sys.argv[2]
html = (ROOT / f'{page}.html').read_text(encoding='utf-8')
css = (ROOT / 'assets/css/main.css').read_text(encoding='utf-8')
css = re.sub(r'url\("\.\./(fonts/[^"]+)"\)', lambda m: f'url("{data_uri("assets/" + m.group(1))}")', css)
html = html.replace('<link rel="stylesheet" href="assets/css/main.css">', f'<style>{css}</style>')
html = re.sub(r'<link rel="preload"[^>]*>\n?', '', html)
def script(m):
    src = m.group(1)
    return f'<script>{(ROOT / src).read_text(encoding="utf-8")}</script>'
html = re.sub(r'<script src="([^"]+)"[^>]*></script>', script, html)
# catalogue : images produits intégrées seulement pour les produits réellement utilisés
html = re.sub(r'(?<=["\(])assets/img/[^"\)\s,]+\.(?:webp|png|jpg)', lambda m: data_uri(m.group(0)), html)
html = re.sub(r' srcset="[^"]*"| sizes="[^"]*"', '', html)
(ROOT / out).write_text(html, encoding='utf-8')
print(out, round(len(html) / 1e6, 1), 'Mo')
