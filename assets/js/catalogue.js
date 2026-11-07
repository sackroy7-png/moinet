/* Maison Moinet — catalogue (sélecteur de parfums + boutique en ligne)
   En production sur confiserie-moinet.fr, les produits sont lus en direct via
   l'API publique WooCommerce Store ; ailleurs, on utilise l'instantané local. */
(() => {
  const SHOP = 'https://confiserie-moinet.fr';
  const LIVE = /(^|\.)confiserie-moinet\.fr$/.test(location.hostname);

  const SHORT = {
    'pastilles': 'Pastilles', 'pastilles-sans-sucre': 'Pastilles sans sucre', 'bonbons-glaces': 'Bonbons glacés',
    'pate-de-fruits': 'Pâtes de fruits', 'chocolats': 'Chocolats', 'tablettes-de-chocolat': 'Tablettes',
    'caramels-nougats': 'Caramels & nougats', 'sucres-cuits': 'Sucres d’orge & sucres cuits', 'gommes': 'Gommes & guimauves',
    'gels-de-fruits': 'Gels de fruits', 'marrons-glaces': 'Marrons glacés', 'pralines': 'Pralines',
    'assortiments': 'Assortiments', 'pour-offrir': 'Idées cadeaux', 'carreaux-vichy': 'Carreaux Vichy',
    'accessoires-et-goodies': 'Accessoires', 'bicentenaire-de-la-pastille': 'Bicentenaire de la pastille',
    'paques': 'Pâques', 'promotions': 'Promotions'
  };
  /* ordre d'affichage des filtres ; les autres catégories suivent */
  const ORDER = ['pastilles', 'pastilles-sans-sucre', 'pour-offrir', 'bonbons-glaces', 'pate-de-fruits', 'chocolats',
    'tablettes-de-chocolat', 'caramels-nougats', 'sucres-cuits', 'gommes', 'gels-de-fruits', 'marrons-glaces',
    'pralines', 'assortiments', 'carreaux-vichy', 'bicentenaire-de-la-pastille', 'paques', 'accessoires-et-goodies', 'promotions'];

  const decode = (s) => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
  const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function loadLive() {
    const all = []; let page = 1; let pages = 1;
    do {
      const r = await fetch(`/wp-json/wc/store/v1/products?per_page=100&page=${page}`, { credentials: 'same-origin' });
      if (!r.ok) throw new Error('store api');
      pages = +r.headers.get('X-WP-TotalPages') || 1;
      all.push(...await r.json()); page++;
    } while (page <= pages);
    const cats = await (await fetch('/wp-json/wc/store/v1/products/categories?per_page=100')).json();
    return {
      categories: cats.map((c) => ({ slug: c.slug, name: decode(c.name), count: c.count })),
      products: all.map((x) => {
        const m = 10 ** x.prices.currency_minor_unit;
        return {
          id: x.id, name: decode(x.name), price: x.prices.price / m, regular: x.prices.regular_price / m,
          cats: x.categories.map((c) => c.slug), img: x.images[0]?.thumbnail || null, alt: x.images[0]?.alt || '',
          url: x.permalink, stock: x.is_in_stock, buy: x.is_purchasable && x.type === 'simple', weight: x.formatted_weight || ''
        };
      })
    };
  }
  let cache;
  function loadCatalogue() {
    if (!cache) {
      const base = document.querySelector('script[data-catalogue]')?.dataset.catalogue || 'assets/data/catalogue.json';
      cache = (LIVE ? loadLive().catch(() => fetch(base).then((r) => r.json())) : fetch(base).then((r) => r.json()));
    }
    return cache;
  }

  const ICON_CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M12 11.5v5M9.5 14h5"/></svg>';

  function card(p, primaryCat) {
    const cat = SHORT[primaryCat || p.cats.find((c) => c !== 'pour-offrir' && c !== 'promotions') || p.cats[0]] || '';
    const onSale = p.regular > p.price;
    const price = onSale
      ? `<del><span class="visually-hidden">Prix initial </span>${euro.format(p.regular)}</del><ins><span class="visually-hidden">Prix promotionnel </span>${euro.format(p.price)}</ins>`
      : euro.format(p.price);
    const img = p.img
      ? `<img src="${esc(p.img)}" alt="" loading="lazy" decoding="async" width="480" height="480">`
      : '';
    const cartBtn = p.buy && p.stock
      ? `<a class="add-cart" href="${SHOP}/panier/?add-to-cart=${p.id}" rel="nofollow" aria-label="Ajouter « ${esc(p.name)} » au panier">${ICON_CART}</a>`
      : '';
    const badge = !p.stock ? '<span class="badge badge--muted">Épuisé</span>' : (onSale ? '<span class="badge">Promotion</span>' : '');
    return `<article class="product">
      ${badge}
      <div class="product-img">${img}</div>
      <div class="product-body">
        <span class="product-cat">${esc(cat)}${p.weight ? ` · ${esc(p.weight)}` : ''}</span>
        <h3><a href="${esc(p.url)}">${esc(p.name)}</a></h3>
        <div class="product-foot"><span class="price">${price}</span>${cartBtn}</div>
      </div>
    </article>`;
  }

  /* ---------- Accueil : sélecteur de parfum ---------- */
  const picker = document.querySelector('[data-flavor-picker]');
  if (picker) {
    const rail = picker.querySelector('.flavor-grid');
    const status = picker.querySelector('.rail-status');
    const buttons = picker.querySelectorAll('.flavor');
    const shopLink = picker.querySelector('[data-flavor-link]');
    const MATCH = {
      menthe: (p) => /menthe/i.test(p.name),
      citron: (p) => /citron/i.test(p.name),
      anis: (p) => /anis/i.test(p.name),
      orange: (p) => /orange/i.test(p.name),
      'sans-sucre': (p) => p.cats.includes('pastilles-sans-sucre')
    };
    const isPastille = (p) => p.cats.includes('pastilles') || p.cats.includes('pastilles-sans-sucre');
    const render = async (flavor) => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.flavor === flavor)));
      try {
        const { products } = await loadCatalogue();
        const list = products.filter((p) => isPastille(p) && p.stock && MATCH[flavor](p))
          .sort((a, b) => a.price - b.price).slice(0, 6);
        rail.innerHTML = list.map((p) => card(p, 'pastilles')).join('');
        const label = picker.querySelector(`.flavor[data-flavor="${flavor}"]`).textContent.trim();
        status.textContent = `${list.length} présentation${list.length > 1 ? 's' : ''} au parfum ${label.toLowerCase()}, du sachet au coffret.`;
        if (shopLink) shopLink.href = `boutique.html?cat=${flavor === 'sans-sucre' ? 'pastilles-sans-sucre' : 'pastilles'}${flavor === 'sans-sucre' ? '' : `&q=${flavor}`}`;
      } catch (e) {
        status.textContent = 'Le catalogue est momentanément indisponible.';
      }
    };
    buttons.forEach((b) => b.addEventListener('click', () => render(b.dataset.flavor)));
    render('menthe');
  }

  /* ---------- Page boutique ---------- */
  const shop = document.querySelector('[data-shop]');
  if (shop) {
    const grid = shop.querySelector('.product-grid');
    const chips = shop.querySelector('.chips');
    const search = shop.querySelector('#shop-search');
    const sort = shop.querySelector('#shop-sort');
    const count = shop.querySelector('.result-count');
    const params = new URLSearchParams(location.search);
    const state = { cat: params.get('cat') || 'all', q: params.get('q') || '', sort: params.get('tri') || 'pertinence' };
    search.value = state.q; sort.value = state.sort;
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    loadCatalogue().then(({ categories, products }) => {
      const counts = {};
      products.forEach((p) => p.cats.forEach((c) => { counts[c] = (counts[c] || 0) + 1; }));
      const slugs = categories.map((c) => c.slug).filter((s) => counts[s])
        .sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
      if (!slugs.includes(state.cat)) state.cat = 'all';
      chips.innerHTML = [`<button type="button" class="chip" data-cat="all">Tout<span class="n">${products.length}</span></button>`]
        .concat(slugs.map((s) => `<button type="button" class="chip" data-cat="${s}">${esc(SHORT[s] || categories.find((c) => c.slug === s).name)}<span class="n">${counts[s]}</span></button>`))
        .join('');

      const apply = (push = true) => {
        chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === state.cat)));
        const q = norm(state.q.trim());
        let list = products.filter((p) => (state.cat === 'all' || p.cats.includes(state.cat)) && (!q || norm(p.name).includes(q)));
        if (state.sort === 'pertinence') {
          /* sélection de la maison : spécialités d'abord, accessoires et goodies en dernier */
          const rank = (p) => Math.min(...p.cats.map((c) => (c === 'pour-offrir' || c === 'promotions') ? 98 : (ORDER.indexOf(c) + 1 || 97)));
          list = [...list].map((p, i) => [p, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([p]) => p);
        }
        if (state.sort === 'prix-asc') list = [...list].sort((a, b) => a.price - b.price);
        if (state.sort === 'prix-desc') list = [...list].sort((a, b) => b.price - a.price);
        if (state.sort === 'nom') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        grid.innerHTML = list.length
          ? list.map((p) => card(p, state.cat !== 'all' && state.cat !== 'pour-offrir' ? state.cat : null)).join('')
          : '<p class="empty">Aucune douceur ne correspond à cette recherche. Essayez un autre mot ou une autre catégorie.</p>';
        count.textContent = `${list.length} produit${list.length > 1 ? 's' : ''}`;
        if (push) {
          const u = new URLSearchParams();
          if (state.cat !== 'all') u.set('cat', state.cat);
          if (state.q) u.set('q', state.q);
          if (state.sort !== 'pertinence') u.set('tri', state.sort);
          history.replaceState(null, '', `${location.pathname}${u.toString() ? `?${u}` : ''}`);
        }
      };
      chips.addEventListener('click', (e) => {
        const b = e.target.closest('.chip'); if (!b) return;
        state.cat = b.dataset.cat; apply();
      });
      let t; search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = search.value; apply(); }, 160); });
      sort.addEventListener('change', () => { state.sort = sort.value; apply(); });
      apply(false);
      chips.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }).catch(() => {
      grid.innerHTML = '<p class="empty">Le catalogue n’a pas pu être chargé. <a href="https://confiserie-moinet.fr/boutique-en-ligne/">Accéder à la boutique en ligne</a>.</p>';
    });
  }
})();
