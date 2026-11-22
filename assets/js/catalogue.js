/* Maison Moinet — catalogue : scène des parfums, boutique en ligne, fiche produit.
   En production sur confiserie-moinet.fr, les produits sont lus en direct via l'API publique
   WooCommerce Store ; ailleurs, on utilise l'instantané local. L'organisation de l'offre
   (rayons, filtres, familles de déclinaisons) vient de assets/data/offre.json : chaque variante
   d'une fiche est un produit WooCommerce existant, le panier reste celui du site. */
(() => {
  const SHOP = 'https://confiserie-moinet.fr';
  const LIVE = /(^|\.)confiserie-moinet\.fr$/.test(location.hostname);

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
      const local = () => (window.MOINET_CATALOGUE ? Promise.resolve(window.MOINET_CATALOGUE) : fetch(base).then((r) => r.json()));
      cache = LIVE ? loadLive().catch(local) : local();
    }
    return cache;
  }

  let offreCache;
  function loadOffre() {
    if (!offreCache) offreCache = window.MOINET_OFFRE ? Promise.resolve(window.MOINET_OFFRE) : fetch('assets/data/offre.json').then((r) => r.json());
    return offreCache;
  }

  /* ---------- Modèle : rayons et fiches (une fiche = une famille de déclinaisons) ---------- */
  let modelCache;
  function loadModel() {
    if (!modelCache) modelCache = Promise.all([loadCatalogue(), loadOffre()]).then(([cat, offre]) => build(cat, offre));
    return modelCache;
  }
  function build(cat, offre) {
    const byPid = new Map(cat.products.map((p) => [p.id, p]));
    const hidden = new Set(offre.masques || []);
    const rayons = offre.rayons.map((r, i) => ({ ...r, order: i }));
    const rayonOf = (p) => (offre.rayonParCategorie.find(([c]) => p.cats.includes(c)) || [0, offre.rayonParDefaut])[1];
    const families = [], ofPid = new Map(), slugs = new Set();
    const finish = (f) => {
      const ps = f.variants.map((v) => v.p);
      f.min = Math.min(...ps.map((p) => p.price)); f.max = Math.max(...ps.map((p) => p.price));
      f.sale = ps.some((p) => p.regular > p.price);
      f.stock = ps.some((p) => p.stock);
      f.filters = new Set(ps.flatMap((p) => p.cats));
      f.def = ps.filter((p) => p.stock).sort((a, b) => a.price - b.price)[0] || ps[0];
      f.order = families.length;
      f.variants.forEach((v) => ofPid.set(v.p.id, f));
      slugs.add(f.slug); families.push(f);
    };
    offre.familles.forEach((d) => {
      const variants = d.variantes.map(([id, ...opts]) => ({ p: byPid.get(id), opts })).filter((v) => v.p && !hidden.has(v.p.id));
      if (variants.length) finish({ slug: d.slug, name: d.name, rayon: d.rayon, axes: variants.length > 1 ? d.axes : [], variants: variants.length > 1 ? variants : [{ p: variants[0].p, opts: [] }] });
    });
    cat.products.forEach((p) => {
      if (ofPid.has(p.id) || hidden.has(p.id)) return;
      let slug = (p.url || '').replace(/\/+$/, '').split('/').pop() || `produit-${p.id}`;
      if (slugs.has(slug)) slug = `${slug}-${p.id}`;
      finish({ slug, name: p.name, rayon: rayonOf(p), axes: [], variants: [{ p, opts: [] }] });
    });
    const rank = (f) => (rayons.find((r) => r.slug === f.rayon) || { order: 99 }).order;
    families.sort((a, b) => rank(a) - rank(b) || a.order - b.order);
    return { offre, rayons, families, ofPid, bySlug: new Map(families.map((f) => [f.slug, f])) };
  }

  /* ---------- Liens, prix, panier ---------- */
  const SINGLE = !!window.MOINET_SINGLE;
  const link = (page, params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return SINGLE ? `#/${page}${q ? `?${q}` : ''}` : `${page}.html${q ? `?${q}` : ''}`;
  };
  const ficheLink = (f, p) => link('produit', { f: f.slug, v: p && f.variants.length > 1 ? p.id : '' });
  const cartUrl = (id, q = 1) => `${SHOP}/panier/?add-to-cart=${id}${q > 1 ? `&quantity=${q}` : ''}`;
  const priceHtml = (p) => (p.regular > p.price
    ? `<del><span class="visually-hidden">Prix initial </span>${euro.format(p.regular)}</del><ins><span class="visually-hidden">Prix promotionnel </span>${euro.format(p.price)}</ins>`
    : euro.format(p.price));
  const weight = (p) => (p.weight && p.weight !== 'ND' ? p.weight : '');
  const imgSrc = (p) => esc((window.MOINET_IMG && window.MOINET_IMG[p.img]) || p.img);
  const NOUNS = { Parfum: ['parfum', 'parfums'], Poids: ['poids', 'poids'], Décor: ['décor', 'décors'], Format: ['format', 'formats'],
    Recette: ['recette', 'recettes'], Goût: ['goût', 'goûts'], Saveur: ['saveur', 'saveurs'], Modèle: ['modèle', 'modèles'],
    Coloris: ['coloris', 'coloris'], Chocolat: ['chocolat', 'chocolats'], Composition: ['composition', 'compositions'] };
  const values = (f, i) => [...new Set(f.variants.map((v) => v.opts[i]))];
  const summary = (f) => (f.axes.length
    ? f.axes.map((a, i) => { const n = values(f, i).length, w = NOUNS[a] || ['choix', 'choix']; return `${n} ${w[n > 1 ? 1 : 0]}`; }).join(', ')
    : weight(f.variants[0].p));

  const ICON_CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M12 11.5v5M9.5 14h5"/></svg>';
  const qtyHtml = (label, small) => `<div class="qty${small ? ' qty--sm' : ''}" data-qty>
      <button type="button" class="qty-btn" data-step="-1" aria-label="Retirer un">−</button>
      <input class="qty-input" type="number" inputmode="numeric" min="1" max="99" value="1" aria-label="${esc(label)}">
      <button type="button" class="qty-btn" data-step="1" aria-label="Ajouter un">+</button>
    </div>`;

  /* Carte d'une fiche (boutique, suggestions) */
  function familyCard(f) {
    const p = f.def, multi = f.variants.length > 1;
    const price = multi && f.min !== f.max ? `<span class="price-from">dès</span> ${euro.format(f.min)}` : priceHtml(p);
    const badge = !f.stock ? '<span class="badge badge--muted">Épuisé</span>' : (f.sale ? '<span class="badge">Promotion</span>' : '');
    const img = p.img ? `<img src="${imgSrc(p)}" alt="" loading="lazy" decoding="async" width="480" height="480">` : '';
    const buy = !multi && p.buy && p.stock
      ? `<div class="product-buy" data-buy>${qtyHtml(`Quantité de « ${f.name} »`, true)}<a class="add-cart" data-cart="${p.id}" href="${cartUrl(p.id)}" rel="nofollow" aria-label="Ajouter « ${esc(f.name)} » au panier">${ICON_CART}</a></div>`
      : (multi ? '<span class="product-choose" aria-hidden="true">Choisir</span>' : '');
    return `<article class="product">
      ${badge}
      <div class="product-img">${img}</div>
      <div class="product-body">
        <span class="product-cat">${esc(summary(f))}</span>
        <h3><a href="${esc(ficheLink(f))}">${esc(f.name)}</a></h3>
        <div class="product-foot"><span class="price">${price}</span>${multi ? buy : ''}</div>
        ${multi ? '' : buy}
      </div>
    </article>`;
  }
  /* Carte d'une déclinaison précise (scène des parfums de l'accueil) */
  function variantCard(p, f) {
    const img = p.img ? `<img src="${imgSrc(p)}" alt="" loading="lazy" decoding="async" width="480" height="480">` : '';
    const label = f.variants.length > 1 ? `${f.name}, ${f.variants.find((v) => v.p === p).opts.join(', ')}` : f.name;
    const cartBtn = p.buy && p.stock ? `<a class="add-cart" href="${cartUrl(p.id)}" rel="nofollow" aria-label="Ajouter « ${esc(label)} » au panier">${ICON_CART}</a>` : '';
    return `<article class="product">
      <div class="product-img">${img}</div>
      <div class="product-body">
        <span class="product-cat">${esc(weight(p))}</span>
        <h3><a href="${esc(ficheLink(f, p))}">${esc(p.name)}</a></h3>
        <div class="product-foot"><span class="price">${priceHtml(p)}</span>${cartBtn}</div>
      </div>
    </article>`;
  }

  /* ---------- Mesure : événements e-commerce GA4, relayés par mesure.js après consentement ---------- */
  /* les événements émis avant le chargement de mesure.js attendent dans une file */
  const track = (name, params) => { if (window.moinetTrack) window.moinetTrack(name, params); else (window.MOINET_TRACKQ = window.MOINET_TRACKQ || []).push([name, params]); };
  const item = (p, f, q = 1) => ({ item_id: String(p.id), item_name: f ? f.name : p.name, item_variant: f && f.variants.length > 1 ? f.variants.find((v) => v.p === p).opts.join(', ') : undefined,
    item_category: f ? f.rayon : undefined, price: p.price, quantity: q });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="add-to-cart="]'); if (!a || a.classList.contains('is-disabled')) return;
    const u = new URL(a.href), pid = +u.searchParams.get('add-to-cart'), q = +u.searchParams.get('quantity') || 1;
    if (!modelCache) return;
    modelCache.then((m) => {
      const f = m.ofPid.get(pid), v = f && f.variants.find((x) => x.p.id === pid);
      if (v) track('add_to_cart', { currency: 'EUR', value: +(v.p.price * q).toFixed(2), items: [item(v.p, f, q)] });
    });
  });

  /* ---------- Sélecteur de quantité (cartes et fiche) ---------- */
  const clampQty = (v) => Math.min(99, Math.max(1, Math.round(+v) || 1));
  const syncQty = (input) => {
    const box = input.closest('[data-buy]'); if (!box) return;
    const q = clampQty(input.value);
    box.querySelectorAll('[data-cart]').forEach((a) => { a.href = cartUrl(a.dataset.cart, q); });
    box.dispatchEvent(new CustomEvent('moinet:qty', { detail: q }));
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.qty-btn'); if (!b) return;
    const input = b.parentElement.querySelector('.qty-input');
    input.value = clampQty(+input.value + +b.dataset.step); syncQty(input);
  });
  document.addEventListener('input', (e) => { if (e.target.classList && e.target.classList.contains('qty-input')) syncQty(e.target); });
  document.addEventListener('change', (e) => {
    if (e.target.classList && e.target.classList.contains('qty-input')) { e.target.value = clampQty(e.target.value); syncQty(e.target); }
  });

  /* ---------- Accueil : scène des parfums ---------- */
  const picker = document.querySelector('[data-flavor-picker]');
  if (picker) {
    const rail = picker.querySelector('.flavor-grid');
    const status = picker.querySelector('.rail-status');
    const buttons = picker.querySelectorAll('.flavor');
    const shopLink = picker.querySelector('[data-flavor-link]');
    /* les pastilles sans sucre ont leur propre entrée : elles ne comptent pas dans les quatre parfums */
    const sugar = (re) => (p) => re.test(p.name) && !p.cats.includes('pastilles-sans-sucre');
    const MATCH = {
      menthe: sugar(/menthe/i), citron: sugar(/citron/i), anis: sugar(/anis/i), orange: sugar(/orange/i),
      'sans-sucre': (p) => p.cats.includes('pastilles-sans-sucre')
    };
    const isPastille = (p) => p.cats.includes('pastilles') || p.cats.includes('pastilles-sans-sucre');
    const stage = picker.closest('[data-stage]');
    const kind = (p) => (/coffret/i.test(p.name) ? 'coffret' : /bo[iî]te/i.test(p.name) ? 'boite' : /sachet/i.test(p.name) ? 'sachet' : 'autre');
    const render = async (flavor) => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.flavor === flavor)));
      /* sans la scène animée, la section prend tout de suite la couleur du parfum */
      if (stage && !stage.classList.contains('is-live')) stage.dataset.flavor = flavor;
      try {
        const m = await loadModel();
        const all = [...m.ofPid.keys()].map((id) => m.ofPid.get(id).variants.find((v) => v.p.id === id).p)
          .filter((p) => isPastille(p) && p.stock && MATCH[flavor](p)).sort((a, b) => a.price - b.price);
        /* d'abord la présentation la moins chère de chaque type (sachet, boîte, coffret), puis le reste */
        const seen = new Set(), first = [], rest = [];
        all.forEach((p) => { const k = kind(p); if (seen.has(k)) rest.push(p); else { seen.add(k); first.push(p); } });
        const list = first.concat(rest).slice(0, 6);
        rail.innerHTML = list.map((p) => variantCard(p, m.ofPid.get(p.id))).join('');
        const label = picker.querySelector(`.flavor[data-flavor="${flavor}"]`).textContent.trim().toLowerCase();
        const n = `${all.length} présentation${all.length > 1 ? 's' : ''}`;
        status.textContent = flavor === 'sans-sucre' ? `${n} sans sucre, du sachet au coffret.` : `${n} au parfum ${label}, du sachet au coffret.`;
        if (shopLink) shopLink.href = link('boutique', flavor === 'sans-sucre' ? { cat: 'pastilles-sans-sucre' } : { cat: 'pastilles', q: flavor });
      } catch (e) {
        status.textContent = 'Le catalogue est momentanément indisponible.';
      }
    };
    picker.addEventListener('moinet:flavor', (e) => render(e.detail));
    buttons.forEach((b) => b.addEventListener('click', () => render(b.dataset.flavor)));
    render('menthe');
  }

  /* ---------- Page boutique : rayons, filtres, recherche, tri ---------- */
  const shop = document.querySelector('[data-shop]');
  if (shop) {
    const grid = shop.querySelector('.product-grid');
    const chips = shop.querySelector('[data-rayons]');
    const toggles = shop.querySelector('[data-filtres]');
    const search = shop.querySelector('#shop-search');
    const sort = shop.querySelector('#shop-sort');
    const count = shop.querySelector('.result-count');
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const state = { cat: 'all', with: new Set(), q: '', sort: 'pertinence' };

    loadModel().then((m) => {
      const fil = m.offre.filtres, legacy = m.offre.anciennesCategories || {};
      const read = (query) => {
        const u = new URLSearchParams(query);
        let cat = u.get('cat') || 'all';
        state.with = new Set((u.get('avec') || '').split(',').filter((x) => fil.some((f) => f.slug === x)));
        if (fil.some((f) => f.slug === cat)) { state.with.add(cat); cat = 'all'; }
        cat = legacy[cat] || cat;
        state.cat = m.rayons.some((r) => r.slug === cat) ? cat : 'all';
        state.q = u.get('q') || ''; state.sort = u.get('tri') || 'pertinence';
        search.value = state.q; sort.value = state.sort;
      };
      read(window.MOINET_QUERY ? window.MOINET_QUERY() : location.search);
      const hay = new Map(m.families.map((f) => [f, norm([f.name, ...f.variants.flatMap((v) => [v.p.name, ...v.opts]), (m.rayons.find((r) => r.slug === f.rayon) || {}).name || ''].join(' '))]));
      const nIn = (slug) => m.families.filter((f) => f.rayon === slug).length;
      chips.innerHTML = [`<button type="button" class="chip" data-cat="all">Tout<span class="n">${m.families.length}</span></button>`]
        .concat(m.rayons.filter((r) => nIn(r.slug)).map((r) => `<button type="button" class="chip" data-cat="${r.slug}">${esc(r.name)}<span class="n">${nIn(r.slug)}</span></button>`)).join('');
      toggles.innerHTML = fil.filter((f) => m.families.some((x) => x.filters.has(f.slug)))
        .map((f) => `<button type="button" class="chip chip--filter" data-with="${f.slug}" aria-pressed="false">${esc(f.name)}</button>`).join('');

      const apply = (push = true) => {
        chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === state.cat)));
        toggles.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(state.with.has(c.dataset.with))));
        const words = norm(state.q.trim()).split(/\s+/).filter(Boolean);
        let list = m.families.filter((f) => (state.cat === 'all' || f.rayon === state.cat)
          && [...state.with].every((w) => f.filters.has(w))
          && words.every((w) => hay.get(f).includes(w)));
        if (state.sort === 'prix-asc') list = [...list].sort((a, b) => a.min - b.min);
        if (state.sort === 'prix-desc') list = [...list].sort((a, b) => b.max - a.max);
        if (state.sort === 'nom') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        grid.innerHTML = list.length
          ? list.map(familyCard).join('')
          : '<p class="empty">Aucune douceur ne correspond à cette recherche. Essayez un autre mot, un autre rayon ou retirez un filtre.</p>';
        count.textContent = `${list.length} produit${list.length > 1 ? 's' : ''}`;
        track('view_item_list', { item_list_id: state.cat, item_list_name: (m.rayons.find((r) => r.slug === state.cat) || { name: 'Toute la boutique' }).name,
          items: list.slice(0, 20).map((f, i) => ({ ...item(f.def, f), index: i })) });
        if (push && !SINGLE) {
          const u = new URLSearchParams();
          if (state.cat !== 'all') u.set('cat', state.cat);
          if (state.with.size) u.set('avec', [...state.with].join(','));
          if (state.q) u.set('q', state.q);
          if (state.sort !== 'pertinence') u.set('tri', state.sort);
          history.replaceState(null, '', `${location.pathname}${u.toString() ? `?${u}` : ''}`);
        }
      };
      chips.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; state.cat = b.dataset.cat; apply(); });
      toggles.addEventListener('click', (e) => {
        const b = e.target.closest('.chip'); if (!b) return;
        if (state.with.has(b.dataset.with)) state.with.delete(b.dataset.with); else state.with.add(b.dataset.with);
        apply();
      });
      let t; search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = search.value; apply(); }, 160); });
      sort.addEventListener('change', () => { state.sort = sort.value; apply(); });
      apply(false);
      window.moinetShopSet = (q) => { read(q); apply(false); };
      if (window.MOINET_PENDING) { window.moinetShopSet(window.MOINET_PENDING); window.MOINET_PENDING = null; }
      chips.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }).catch(() => {
      grid.innerHTML = '<p class="empty">Le catalogue n’a pas pu être chargé. <a href="https://confiserie-moinet.fr/boutique-en-ligne/">Accéder à la boutique en ligne</a>.</p>';
    });
  }

  /* ---------- Fiche produit : déclinaisons, quantité, ajout au panier ---------- */
  const fiche = document.querySelector('[data-fiche]');
  if (fiche) {
    const show = async (query) => {
      const m = await loadModel().catch(() => null);
      const u = new URLSearchParams(query);
      const f = m && (m.bySlug.get(u.get('f')) || (u.get('v') && m.ofPid.get(+u.get('v'))));
      if (!f) {
        fiche.innerHTML = `<div class="wrap fiche-missing"><h1>Produit introuvable</h1><p class="lead">Ce produit n’existe plus ou son adresse a changé.</p><a class="btn" href="${esc(link('boutique'))}">Voir toute la boutique</a></div>`;
        return;
      }
      const rayon = m.rayons.find((r) => r.slug === f.rayon) || { name: 'Boutique', slug: '' };
      let cur = f.variants.find((v) => v.p.id === +u.get('v')) || f.variants.find((v) => v.p === f.def);
      const id = `fiche-${f.slug}`;
      fiche.innerHTML = `<div class="wrap">
        <nav class="breadcrumb" aria-label="Fil d’Ariane"><ol><li><a href="${esc(link('index'))}">Accueil</a></li><li><a href="${esc(link('boutique'))}">Boutique en ligne</a></li><li><a href="${esc(link('boutique', { cat: rayon.slug }))}">${esc(rayon.name)}</a></li><li aria-current="page">${esc(f.name)}</li></ol></nav>
        <div class="fiche">
          <div class="fiche-media"><div class="fiche-frame"><img alt="" width="480" height="480"></div></div>
          <div class="fiche-info" data-buy>
            <h1 id="${id}">${esc(f.name)}</h1>
            <p class="fiche-price"><span class="price"></span><span class="fiche-meta"></span></p>
            ${f.axes.map((a, i) => `<fieldset class="opt" data-axis="${i}"><legend>${esc(a)}<span class="opt-current"></span></legend><div class="opt-list">${values(f, i).map((val) =>
              `<label class="opt-item"><input type="radio" name="${id}-${i}" value="${esc(val)}"><span>${esc(val)}</span></label>`).join('')}</div></fieldset>`).join('')}
            <div class="fiche-buy">
              <div class="fiche-qty"><span class="fiche-label" id="${id}-q">Quantité</span>${qtyHtml('Quantité')}</div>
              <a class="btn fiche-add" data-cart="" rel="nofollow" href="#">Ajouter au panier</a>
            </div>
            <p class="fiche-total" aria-live="polite"></p>
            <p class="small muted">Le panier s’ouvre sur confiserie-moinet.fr. Paiement sécurisé par carte, livraison en Colissimo Suivi.</p>
            <a class="link-arrow fiche-more" href="#" rel="noopener">Voir la description complète</a>
          </div>
        </div>
      </div>
      <section class="section section--tight fiche-related" aria-labelledby="${id}-rel">
        <div class="wrap"><h2 id="${id}-rel">Dans le même rayon</h2><div class="product-grid">${m.families.filter((x) => x.rayon === f.rayon && x !== f).slice(0, 4).map(familyCard).join('')}</div></div>
      </section>`;
      const q = fiche.querySelector('.qty-input'), add = fiche.querySelector('.fiche-add');
      const img = fiche.querySelector('.fiche-frame img');
      img.loading = 'eager';
      /* une déclinaison existe-t-elle avec cette valeur, les autres choix restant les mêmes ? */
      let seen = null;
      const match = (i, val) => f.variants.find((v) => v.opts.every((o, k) => (k === i ? o === val : o === cur.opts[k])));
      const paint = (pushUrl) => {
        const p = cur.p, qty = clampQty(q.value), ok = p.buy && p.stock;
        if (p.img) img.src = (window.MOINET_IMG && window.MOINET_IMG[p.img]) || p.img;
        img.alt = cur.opts.length ? `${f.name}, ${cur.opts.join(', ')}` : f.name;
        fiche.querySelector('.fiche-price .price').innerHTML = priceHtml(p);
        fiche.querySelector('.fiche-meta').textContent = [weight(p), p.stock ? 'en stock' : 'épuisé'].filter(Boolean).join(', ');
        f.axes.forEach((a, i) => {
          const fs = fiche.querySelector(`[data-axis="${i}"]`);
          fs.querySelector('.opt-current').textContent = ` : ${cur.opts[i]}`;
          fs.querySelectorAll('input').forEach((r) => {
            r.checked = r.value === cur.opts[i];
            const v = match(i, r.value), off = !v || !v.p.stock;
            r.closest('.opt-item').classList.toggle('is-off', off);
            r.closest('.opt-item').title = !v ? 'Pas disponible avec ce choix' : (!v.p.stock ? 'Épuisé' : '');
          });
        });
        add.dataset.cart = p.id;
        add.href = ok ? cartUrl(p.id, qty) : '#';
        add.classList.toggle('is-disabled', !ok);
        add.setAttribute('aria-disabled', String(!ok));
        add.textContent = ok ? 'Ajouter au panier' : 'Épuisé';
        fiche.querySelector('.fiche-qty').hidden = !ok;
        fiche.querySelector('.fiche-total').textContent = ok && qty > 1 ? `Total : ${euro.format(p.price * qty)} pour ${qty} articles` : '';
        fiche.querySelector('.fiche-more').href = p.url;
        document.title = `${f.name} · Maison Moinet`;
        if (pushUrl) history.replaceState(null, '', ficheLink(f, f.variants.length > 1 ? p : null));
        if (seen !== p) { seen = p; track('view_item', { currency: 'EUR', value: p.price, items: [item(p, f)] }); }
      };
      fiche.querySelectorAll('.opt input').forEach((r) => r.addEventListener('change', () => {
        const i = +r.closest('[data-axis]').dataset.axis;
        cur = match(i, r.value) || f.variants.find((v) => v.opts[i] === r.value) || cur;
        paint(true);
      }));
      fiche.querySelector('[data-buy]').addEventListener('moinet:qty', () => paint(false));
      add.addEventListener('click', (e) => { if (add.classList.contains('is-disabled')) e.preventDefault(); });
      paint(false);
    };
    window.moinetFicheSet = (q) => show(q);
    if (!SINGLE) show(location.search);
    else if (window.MOINET_PENDING_FICHE) { show(window.MOINET_PENDING_FICHE); window.MOINET_PENDING_FICHE = null; }
  }
})();
