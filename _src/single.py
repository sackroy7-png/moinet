#!/usr/bin/env python3
"""Assemble tout le site en UN fichier autonome : site-complet.html
Les 6 pages deviennent des vues (#/maison, #/boutique?cat=pastilles…), CSS, JS, polices,
images et catalogue sont intégrés ; chaque image n'est stockée qu'une fois.
Usage : python3 _src/build.py && python3 _src/single.py"""
import base64, collections, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ['index', 'maison', 'savoir-faire', 'boutique', 'magasins', 'contact']
ROUTE = {'index': 'accueil', 'maison': 'maison', 'savoir-faire': 'savoir-faire',
         'boutique': 'boutique', 'magasins': 'magasins', 'contact': 'contact'}
NAVKEY = {'accueil': '', 'maison': 'maison', 'savoir-faire': 'savoir-faire', 'boutique': 'boutique',
          'magasins': 'magasins', 'contact': 'contact'}
MIME = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'}


def b64(rel):
    f = ROOT / rel
    return f'data:{MIME[f.suffix]};base64,' + base64.b64encode(f.read_bytes()).decode()


def links(html):
    def repl(m):
        page, rest = m.group(1), m.group(2) or ''
        r = '#/' + ROUTE[page]
        if rest.startswith('#'):
            r += '/' + rest[1:]
        elif rest.startswith('?'):
            r += rest
        return f'href="{r}"'
    return re.sub(r'href="(index|maison|savoir-faire|boutique|magasins|contact)\.html([?#][^"]*)?"', repl, html)


docs = {p: (ROOT / f'{p}.html').read_text(encoding='utf-8') for p in PAGES}
first = docs['index']
head_end = first.index('<main id="contenu">')
shell_top = first[first.index('<body>') + 6:head_end]
shell_bottom = first[first.index('</main>') + 7:first.index('<script src=')]

mains, titles = {}, {}
for p in PAGES:
    d = docs[p]
    titles[ROUTE[p]] = re.search(r'<title>(.*?)</title>', d).group(1)
    mains[p] = d[d.index('<main id="contenu">') + 19:d.index('</main>')]

# identifiants présents sur plusieurs pages : préfixés par la page
count = collections.Counter(i for p in PAGES for i in set(re.findall(r'\sid="([^"]+)"', mains[p])))
dups = {i for i, n in count.items() if n > 1}
for p in PAGES:
    m = mains[p]
    for i in dups:
        n = f'{ROUTE[p]}-{i}'
        m = re.sub(rf'(\s(?:id|for|aria-labelledby|aria-controls)=")({re.escape(i)})"', rf'\g<1>{n}"', m)
    mains[p] = m

body = shell_top + '<main id="contenu">\n' + '\n'.join(
    f'<div class="view" data-view="{ROUTE[p]}"{"" if p == "index" else " hidden"}>{mains[p]}</div>' for p in PAGES
) + '\n</main>' + shell_bottom
body = links(body)
body = re.sub(r' srcset="[^"]*"| sizes="[^"]*"', '', body)

# images : une seule copie de chaque, posée au chargement
imgs = set(re.findall(r'src="(assets/img/[^"]+)"', body))
body = re.sub(r'src="(assets/img/[^"]+)"', r'data-img="\1" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="', body)
cat = json.loads((ROOT / 'assets/data/catalogue.json').read_text(encoding='utf-8'))
imgs |= {x['img'] for x in cat['products'] if x['img']}
IMG = {k: b64(k) for k in sorted(imgs)}

css = (ROOT / 'assets/css/main.css').read_text(encoding='utf-8')
css = re.sub(r'url\("\.\./(fonts/[^"]+)"\)', lambda m: f'url("{b64("assets/" + m.group(1))}")', css)
main_js = (ROOT / 'assets/js/main.js').read_text(encoding='utf-8')
cat_js = (ROOT / 'assets/js/catalogue.js').read_text(encoding='utf-8')

router = '''
(() => {
  const TITLES = %s, NAV = %s;
  const views = document.querySelectorAll('.view');
  const parse = () => {
    const h = location.hash;
    if (!h.startsWith('#/')) return null;
    const [path, query = ''] = h.slice(2).split('?');
    const [route, anchor] = path.split('/');
    return { route: TITLES[route] ? route : 'accueil', anchor, query };
  };
  const show = () => {
    const r = parse() || (location.hash ? null : { route: 'accueil' });
    if (!r) return;
    views.forEach((v) => { v.hidden = v.dataset.view !== r.route; });
    document.title = TITLES[r.route];
    document.querySelectorAll('.main-nav a, .mobile-nav li a').forEach((a) => {
      const on = a.getAttribute('href') === '#/' + r.route;
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
    const menu = document.getElementById('mobile-nav');
    if (menu && !menu.hidden) menu.querySelector('.nav-close').click();
    if (r.route === 'boutique') {
      if (window.moinetShopSet) window.moinetShopSet(r.query); else window.MOINET_PENDING = r.query;
    }
    const target = r.anchor && (document.getElementById(r.route + '-' + r.anchor) || document.getElementById(r.anchor));
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  };
  window.MOINET_QUERY = () => (parse() || {}).query || '';
  window.addEventListener('hashchange', show);
  show();
})();
''' % (json.dumps(titles, ensure_ascii=False), json.dumps(NAVKEY))

head = first[:first.index('<body>')]
head = re.sub(r'<link rel="(?:preload|icon)"[^>]*>\n?', '', head)
head = head.replace('<link rel="stylesheet" href="assets/css/main.css">', f'<style>{css}</style>')
head = re.sub(r'<link rel="canonical"[^>]*>\n?', '', head)
head = head.replace('</head>', f'<link rel="icon" href="{b64("assets/img/favicon.png")}">\n</head>')

out = (head + '<body>' + body
       + '<script>window.MOINET_SINGLE=true;window.MOINET_IMG=' + json.dumps(IMG) + ';'
       + 'document.querySelectorAll("img[data-img]").forEach(i=>{i.src=MOINET_IMG[i.dataset.img];});</script>\n'
       + '<script>window.MOINET_CATALOGUE=' + json.dumps(cat, ensure_ascii=False) + ';</script>\n'
       + f'<script>{router}</script>\n<script>{main_js}</script>\n<script>{cat_js}</script>\n</body>\n</html>\n')
(ROOT / 'site-complet.html').write_text(out, encoding='utf-8')
print('site-complet.html', round(len(out) / 1e6, 1), 'Mo,', len(IMG), 'images,', len(dups), 'id préfixés')
