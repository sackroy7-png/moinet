/* Maison Moinet — animations signature (sans dépendance)
   Inspirations 21st.dev : text reveal, roll button, magnetic, spotlight card, hover preview,
   marquee, scroll-drawn timeline, animated tabs. Sous prefers-reduced-motion : rien ne bouge,
   tout est visible. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const doc = document.documentElement;
  const img = (p) => (window.MOINET_IMG && window.MOINET_IMG[p]) || p;
  if (reduce) { doc.classList.add('motion-off'); return; }
  doc.classList.add('motion');

  /* 1. Titres principaux : chaque mot sort de son masque, l'un après l'autre */
  document.querySelectorAll('.hero h1, .page-hero h1').forEach((h) => {
    if (h.dataset.split) return;
    h.dataset.split = '1';
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const outer = document.createElement('span'); outer.className = 'wm';
            const inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++);
            outer.append(inner); frag.append(outer);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(h);
    h.style.setProperty('--words', i);
    h.classList.add('is-split');
  });

  /* 2. Boutons : le libellé roule vers le haut au survol */
  document.querySelectorAll('.btn').forEach((b) => {
    if (b.querySelector('.roll')) return;
    const text = [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (!text) return;
    [...b.childNodes].filter((n) => n.nodeType === 3).forEach((n) => n.remove());
    const roll = document.createElement('span'); roll.className = 'roll';
    roll.innerHTML = `<span class="roll-a"></span><span class="roll-b" aria-hidden="true"></span>`;
    roll.firstChild.textContent = text; roll.lastChild.textContent = text;
    b.prepend(roll);
  });

  if (fine) {
    /* 3. Boutons principaux magnétiques */
    document.querySelectorAll('.hero-ctas .btn, .cta-band .btn').forEach((b) => {
      b.classList.add('magnetic');
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - 0.5) * 10}px`);
        b.style.setProperty('--my', `${((e.clientY - r.top) / r.height - 0.5) * 8}px`);
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });

    /* 4. Halo qui suit le pointeur sur les tuiles et les cartes */
    document.querySelectorAll('.tile, .recipe, .store, .product').forEach((c) => {
      c.classList.add('spot');
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--sx', `${e.clientX - r.left}px`);
        c.style.setProperty('--sy', `${e.clientY - r.top}px`);
      });
    });

    /* 5. Liste des boutiques : la devanture suit le pointeur */
    const list = document.querySelector('.store-list[data-previews]');
    if (list) {
      const fig = document.createElement('div'); fig.className = 'store-preview'; fig.setAttribute('aria-hidden', 'true');
      const pic = document.createElement('img'); pic.alt = ''; fig.append(pic); document.body.append(fig);
      let x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false;
      const loop = () => {
        x += (tx - x) * 0.18; y += (ty - y) * 0.18;
        fig.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        raf = on || Math.abs(tx - x) > 0.5 ? requestAnimationFrame(loop) : 0;
      };
      list.querySelectorAll('li[data-preview]').forEach((li) => {
        const src = img(li.dataset.preview);
        new Image().src = src;
        li.addEventListener('pointerenter', (e) => {
          if (!on) { x = tx = e.clientX + 24; y = ty = e.clientY - 120; }
          pic.src = src; on = true; fig.classList.add('is-on'); if (!raf) raf = requestAnimationFrame(loop);
        });
        li.addEventListener('pointermove', (e) => { tx = e.clientX + 24; ty = e.clientY - 120; });
      });
      list.addEventListener('pointerleave', () => { on = false; fig.classList.remove('is-on'); });
    }
  }

  /* 6. Frise : le fil se trace pendant que la section traverse l'écran */
  document.querySelectorAll('.timeline').forEach((tl) => {
    tl.classList.add('is-drawn');
    const items = tl.querySelectorAll('li');
    let ticking = false;
    const paint = () => {
      ticking = false;
      const r = tl.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.7 - r.top) / r.height));
      tl.style.setProperty('--draw', p.toFixed(3));
      items.forEach((li) => li.classList.toggle('reached', li.offsetTop + 24 <= p * r.height));
    };
    const on = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    paint();
  });

  /* 7. Sélecteur de parfum : la pastille de couleur glisse d'un parfum à l'autre,
        les produits arrivent les uns après les autres */
  const flavors = document.querySelector('.flavors');
  if (flavors) {
    const pill = document.createElement('span'); pill.className = 'flavor-pill'; pill.setAttribute('aria-hidden', 'true');
    flavors.append(pill); flavors.classList.add('has-pill');
    /* origine réelle de la pastille (dans un fieldset, elle démarre sous la légende) */
    let ox = 0, oy = 0;
    const origin = () => {
      const t = pill.style.transform; pill.style.transform = 'none';
      const fr = flavors.getBoundingClientRect(), pr = pill.getBoundingClientRect();
      ox = pr.left - fr.left; oy = pr.top - fr.top; pill.style.transform = t;
    };
    origin();
    const move = () => {
      const b = flavors.querySelector('.flavor[aria-pressed="true"]');
      if (!b) return;
      const fr = flavors.getBoundingClientRect(), br = b.getBoundingClientRect();
      pill.style.width = `${br.width}px`; pill.style.height = `${br.height}px`;
      pill.style.transform = `translate(${br.left - fr.left - ox}px, ${br.top - fr.top - oy}px)`;
      pill.style.background = getComputedStyle(b).getPropertyValue('--f');
    };
    new MutationObserver(move).observe(flavors, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
    window.addEventListener('resize', () => { pill.classList.remove('ready'); origin(); move(); requestAnimationFrame(() => pill.classList.add('ready')); });
    requestAnimationFrame(() => { move(); requestAnimationFrame(() => pill.classList.add('ready')); });
    const grid = document.querySelector('.flavor-grid');
    if (grid) new MutationObserver(() => {
      [...grid.children].forEach((c, i) => { c.style.setProperty('--i', i); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); });
    }).observe(grid, { childList: true });
  }

  /* 8. Défilement infini (boîtes en fer, villes) : clones pour boucler, pause au survol
        et bouton pause pour tout mouvement de plus de 5 secondes */
  document.querySelectorAll('[data-marquee]').forEach((m) => {
    m.querySelectorAll('.marquee-track').forEach((track) => {
      [...track.children].forEach((c) => {
        const k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true');
        k.querySelectorAll('img').forEach((i) => { i.alt = ''; });
        if (k.tagName === 'IMG') k.alt = '';
        track.append(k);
      });
    });
    m.classList.add('is-running');
    const btn = m.parentElement.querySelector('[data-marquee-toggle]');
    if (btn) btn.addEventListener('click', () => {
      const paused = m.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', String(paused));
      btn.querySelector('span').textContent = paused ? 'Relancer le défilement' : 'Mettre en pause';
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => m.classList.toggle('is-offscreen', !en.isIntersecting)).observe(m);
  });
})();
