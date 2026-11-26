/* Maison Moinet — scènes immersives (sans dépendance).
   La scène des pastilles (épinglée, pastille 3D, couleur qui s'ouvre en octogone), la fenêtre de
   l'atelier, l'éventail des boîtes (inspiré du « 3D Coverflow Carousel » de 21st.dev), les
   devantures et les petits mouvements liés au défilement. Aucun détournement de la molette :
   les scènes épinglées reposent sur position: sticky, les valeurs sont lissées image par image.
   Sous prefers-reduced-motion, seule la partie « état » fonctionne (devantures) : rien ne bouge. */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- Devantures : la photo suit la boutique survolée ou atteinte au clavier ---------- */
  document.querySelectorAll('[data-stores]').forEach((list) => {
    const frame = list.closest('section').querySelector('.store-frame');
    if (!frame) return;
    const imgs = [...frame.querySelectorAll('img')], rows = [...list.children];
    let cur = 0;
    rows[0].classList.add('is-on');
    const show = (i) => {
      if (i === cur || !imgs[i]) return;
      imgs.forEach((im) => im.classList.remove('was-on'));
      imgs[cur].classList.replace('is-on', 'was-on');
      rows[cur].classList.remove('is-on');
      cur = i;
      imgs[i].classList.add('is-on'); rows[i].classList.add('is-on');
    };
    rows.forEach((li, i) => {
      li.addEventListener('pointerenter', () => show(i));
      li.addEventListener('focusin', () => show(i));
    });
  });

  if (reduce) return;

  /* ---------- Une seule boucle, active tant qu'une scène est proche de l'écran ---------- */
  const scenes = [];
  let raf = 0, lastT = 0, lastY = window.scrollY, vel = 0;
  const frame = (t) => {
    const dt = Math.min(50, (t - lastT) || 16); lastT = t;
    const y = window.scrollY; vel = lerp(vel, (y - lastY) / dt, 0.18); lastY = y;
    let alive = false;
    for (const s of scenes) if (s.on) { s.fn(t, dt); alive = true; }
    raf = alive ? requestAnimationFrame(frame) : 0;
  };
  const wake = () => { if (!raf) { lastT = performance.now(); lastY = window.scrollY; raf = requestAnimationFrame(frame); } };
  const scene = (el, fn, margin = '25% 0px') => {
    const s = { fn, on: !('IntersectionObserver' in window) };
    scenes.push(s);
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { s.on = e.isIntersecting; if (s.on) wake(); }, { rootMargin: margin }).observe(el);
    else wake();
    return s;
  };
  /* rangée de noms dont l'élément choisi vient se placer au centre */
  /* le focus d'un nom fait défiler la rangée (overflow: hidden) : on annule ce défilement, le décalage --shift centre le nom */
  const centerRow = (row, el) => { row.scrollLeft = 0; row.style.setProperty('--shift', `${(row.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2)).toFixed(1)}px`); };
  /* une seule étape de tabulation par rangée, les flèches passent d'un nom à l'autre */
  const roving = (els, i) => els.forEach((b, k) => { b.tabIndex = k === i ? 0 : -1; });

  /* ---------- La scène des pastilles ---------- */
  const stage = document.querySelector('[data-stage]');
  if (stage) {
    const pin = stage.querySelector('.stage-pin'), visual = stage.querySelector('.stage-visual'), canvas = stage.querySelector('.pastille-canvas');
    const bg = stage.querySelector('.stage-bg'), iris = stage.querySelector('.stage-iris'), set = stage.querySelector('.flavors');
    const picker = stage.querySelector('[data-flavor-picker]'), shadow = stage.querySelector('.pastille-shadow');
    const heroFrame = document.querySelector('.opening .hero-frame');
    const buttons = [...set.querySelectorAll('.flavor')], names = buttons.map((b) => b.dataset.flavor), N = buttons.length;
    const rgb = (c) => {
      const m = c.match(/^#([0-9a-f]{6})$/i);
      if (m) return [0, 2, 4].map((i) => parseInt(m[1].substr(i, 2), 16) / 255);
      const n = c.match(/[\d.]+/g) || [128, 128, 128];
      return [n[0] / 255, n[1] / 255, n[2] / 255];
    };
    const colors = buttons.map((b) => getComputedStyle(b).getPropertyValue('--f').trim());
    /* l'octogone de la pastille, pour l'ouverture de la couleur */
    const A = 0.7, B = 0.5, CX = 0.34, CY = 0.26;
    const oct = (cx, cy, s) => 'polygon(' + [[A - CX, -B], [CX - A, -B], [-A, CY - B], [-A, B - CY], [CX - A, B], [A - CX, B], [A, B - CY], [A, CY - B]]
      .map(([x, y]) => `${(cx + x * s).toFixed(1)}px ${(cy + y * s).toFixed(1)}px`).join(', ') + ')';
    const reach = (cx, cy, w, h) => {
      const k = 1 + (A - CX) / CX + (B - CY) / CY; let s = 0;
      [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y]) => { const dx = Math.abs(x - cx), dy = Math.abs(y - cy); s = Math.max(s, dx / A, dy / B, (dx / CX + dy / CY) / k); });
      return s * 1.04;
    };

    stage.style.setProperty('--steps', N);
    stage.classList.add('is-live');
    const past = window.MoinetPastille ? window.MoinetPastille.create(canvas) : null;
    if (past) visual.classList.add('has-gl');

    let index = 0, spin = 0.2, spinV = 0, target = 0.2, drag = null, dragSpin = 0, px = 0, py = 0, tx = 0, ty = 0;
    let bounce = rgb(colors[0]), restY = 0, anim = null, held = colors[0], pending = colors[0], swap = 0;
    const wide = window.matchMedia('(min-width: 960px) and (min-height: 640px)');

    const measure = () => {
      visual.style.setProperty('--py', '0px'); visual.style.setProperty('--px', '0px'); visual.style.setProperty('--ps', '1');
      const v = visual.getBoundingClientRect(), p = pin.getBoundingClientRect();
      restY = v.top + v.height / 2 - p.top;                 /* centre de la pastille dans la scène */
      if (past) past.resize();
      centerRow(set, buttons[index]);
    };

    const go = (i) => {
      if (i === index) return;
      const dir = i > index ? 1 : -1;
      index = i; target += dir * Math.PI;                   /* la pastille se retourne */
      buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      roving(buttons, i); centerRow(set, buttons[i]);
      /* la nouvelle couleur s'ouvre en octogone depuis la pastille */
      if (anim) { held = pending; anim.cancel(); }
      bg.style.setProperty('--held', held);
      pending = colors[i]; iris.style.background = pending;
      const v = visual.getBoundingClientRect(), p = bg.getBoundingClientRect();
      const cx = v.left + v.width / 2 - p.left, cy = v.top + v.height / 2 - p.top;
      anim = iris.animate([{ clipPath: oct(cx, cy, 0) }, { clipPath: oct(cx, cy, reach(cx, cy, p.width, p.height)) }], { duration: 950, easing: 'cubic-bezier(.45, 0, .15, 1)' });
      const col = pending;
      anim.onfinish = () => { held = col; bg.style.setProperty('--held', col); iris.style.background = 'transparent'; anim = null; };
      clearTimeout(swap);
      swap = setTimeout(() => { stage.dataset.flavor = names[i]; }, 400);     /* le texte change de couleur quand l'octogone l'atteint */
      picker.dispatchEvent(new CustomEvent('moinet:flavor', { detail: names[i] }));
    };

    scene(stage, (t, dt) => {
      const r = stage.getBoundingClientRect(), vh = window.innerHeight;
      const p = clamp(-r.top / Math.max(1, r.height - vh)), enter = clamp(1 - r.top / vh), e = easeOut(enter);
      const i = Math.min(N - 1, Math.floor(p * N));
      if (i !== index) go(i);
      /* arrivée : la pastille dépasse du bord de la scène, puis gagne le centre en grandissant */
      if (wide.matches) {
        visual.style.setProperty('--py', `${(-(restY + visual.offsetHeight * 0.07) * (1 - e)).toFixed(1)}px`);
        visual.style.setProperty('--px', `${(window.innerWidth * 0.085 * (1 - e)).toFixed(1)}px`);   /* entre le texte et la carte du héros */
        visual.style.setProperty('--ps', (0.42 + 0.58 * e).toFixed(3));
      } else {
        visual.style.setProperty('--py', '0px'); visual.style.setProperty('--px', '0px');
        visual.style.setProperty('--ps', (0.7 + 0.3 * e).toFixed(3));
      }
      bg.style.setProperty('--flat', clamp((enter - 0.72) / 0.28).toFixed(3));
      if (heroFrame) heroFrame.style.setProperty('--cover', enter.toFixed(3));
      /* rotation : un ressort vers la face du parfum courant, plus un léger suivi du défilement et du pointeur */
      const dts = Math.min(dt, 34) / 1000;
      const want = target + dragSpin + (p * N - index - 0.5) * 0.5 - (1 - e) * 0.9;
      spinV += ((want - spin) * 52 - spinV * 11.5) * dts; spin += spinV * dts;
      px = lerp(px, tx, 0.07); py = lerp(py, ty, 0.07);
      const c = rgb(colors[index]);
      bounce = bounce.map((v, k) => lerp(v, c[k], 0.06));
      const angle = spin + px * 0.35;
      if (past) past.draw({ spin: angle, tiltX: -0.34 + Math.sin(t / 1900) * 0.05 - py * 0.22, tiltZ: -0.1 + Math.sin(t / 2700) * 0.035, bounce });
      shadow.style.setProperty('--sw', (0.5 + 0.5 * Math.abs(Math.cos(angle))).toFixed(3));
    }, '30% 0px');

    /* choisir un parfum : on saute au bon endroit de la scène, le défilement fait le reste */
    const jump = (i) => {
      const r = stage.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top + (r.height - window.innerHeight) * ((i + 0.5) / N), behavior: 'instant' });
    };
    set.addEventListener('click', (ev) => {
      const b = ev.target.closest('.flavor');
      if (!b) return;
      ev.stopPropagation(); jump(buttons.indexOf(b));
    }, true);
    set.addEventListener('keydown', (ev) => {
      const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      ev.preventDefault();
      const i = clamp(index + d, 0, N - 1);
      jump(i); buttons[i].focus({ preventScroll: true });
    });
    roving(buttons, 0);

    /* la pastille suit le pointeur ; on peut aussi la faire tourner en la glissant */
    if (fine) pin.addEventListener('pointermove', (ev) => { tx = ev.clientX / window.innerWidth * 2 - 1; ty = ev.clientY / window.innerHeight * 2 - 1; });
    canvas.addEventListener('pointerdown', (ev) => { drag = { x: ev.clientX, base: dragSpin }; canvas.setPointerCapture(ev.pointerId); });
    canvas.addEventListener('pointermove', (ev) => { if (drag) dragSpin = drag.base + (ev.clientX - drag.x) / 140; });
    const drop = () => {                                    /* relâchée, la pastille se pose sur la face la plus proche */
      if (!drag) return;
      drag = null; target += Math.round(dragSpin / Math.PI) * Math.PI; dragSpin = 0;
    };
    canvas.addEventListener('pointerup', drop); canvas.addEventListener('pointercancel', drop);

    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    window.addEventListener('moinet:route', () => requestAnimationFrame(measure));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
  }

  /* ---------- Bandeaux défilants : ils accélèrent avec le défilement ---------- */
  document.querySelectorAll('[data-marquee]').forEach((m) => {
    let rate = 1;
    scene(m, () => {
      rate = lerp(rate, 1 + Math.min(5, Math.abs(vel) * 2.2), 0.08);
      m.querySelectorAll('.marquee-track').forEach((tr) => tr.getAnimations().forEach((a) => { a.playbackRate = rate; }));
    }, '10% 0px');
  });

  /* ---------- Mosaïque : les photos glissent légèrement dans leur cadre ---------- */
  document.querySelectorAll('[data-parallax]').forEach((box) => {
    const tiles = [...box.querySelectorAll('.tile')];
    scene(box, () => {
      const vh = window.innerHeight;
      tiles.forEach((tile) => {
        const r = tile.getBoundingClientRect();
        if (r.bottom < -60 || r.top > vh + 60) return;
        tile.style.setProperty('--par', `${(-((r.top + r.height / 2) / vh - 0.5) * r.height * 0.12).toFixed(1)}px`);
      });
    });
  });

  /* ---------- Atelier : la fenêtre s'ouvre sur la photo, puis le texte se met au point ---------- */
  document.querySelectorAll('[data-expand]').forEach((track) => {
    const pin = track.querySelector('.atelier-pin'), win = track.querySelector('.atelier-window');
    track.classList.add('is-live');
    let cur = 0;
    scene(track, () => {
      const r = track.getBoundingClientRect(), vh = window.innerHeight;
      cur = lerp(cur, clamp(-r.top / Math.max(1, r.height - vh)), 0.16);
      const q = easeInOut(clamp(cur / 0.68)), w = win.clientWidth, h = win.clientHeight;
      const w0 = Math.min(w, Math.max(210, w * 0.24)), h0 = Math.min(h, w0 * 1.28), s = pin.style;
      s.setProperty('--ix', `${((w - w0) / 2 * (1 - q)).toFixed(1)}px`);
      s.setProperty('--it', `${((h - h0) / 2 * (1 - q)).toFixed(1)}px`);
      s.setProperty('--ib', `${((h - h0) / 2 * (1 - q)).toFixed(1)}px`);
      s.setProperty('--c', `${lerp(16, Math.min(48, w * 0.035), q).toFixed(1)}px`);
      s.setProperty('--zoom', (1.22 - 0.22 * q).toFixed(3));
      s.setProperty('--show', clamp((cur - 0.66) / 0.24).toFixed(3));
    });
  });

  /* ---------- Frises qui glissent : gravures, archives ---------- */
  document.querySelectorAll('[data-drift]').forEach((el) => {
    if (el.dataset.drift === 'fine' && !fine) return;        /* sur écran tactile, la rangée se fait défiler à la main */
    const inner = el.firstElementChild;
    scene(el, () => {
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const k = clamp((vh - r.top) / (vh + r.height)), over = Math.max(0, inner.offsetWidth - el.clientWidth);
      inner.style.setProperty('--drift', `${(-lerp(0.03, 0.97, k) * over).toFixed(1)}px`);
    });
  });

  /* ---------- Photos qui glissent dans leur cadre ---------- */
  document.querySelectorAll('[data-plx]').forEach((el) => {
    scene(el, () => {
      const r = el.getBoundingClientRect();
      const k = clamp((r.top + r.height / 2) / window.innerHeight - 0.5, -1, 1);
      el.style.setProperty('--plx', `${(-k * r.height * 0.065).toFixed(1)}px`);
    });
  });

  /* ---------- Frise tracée le long d'une liste ---------- */
  document.querySelectorAll('[data-trace]').forEach((list) => {
    const items = [...list.children];
    scene(list, () => {
      const r = list.getBoundingClientRect();
      const p = clamp((window.innerHeight * 0.62 - r.top) / r.height);
      list.style.setProperty('--draw', p.toFixed(3));
      items.forEach((it) => it.classList.toggle('reached', it.offsetTop + 30 <= p * r.height));
    });
  });

  /* ---------- Pastille seule : elle tourne pendant que son bloc traverse l'écran ---------- */
  document.querySelectorAll('[data-pastille]').forEach((box) => {
    const past = window.MoinetPastille ? window.MoinetPastille.create(box.querySelector('canvas')) : null;
    if (!past) return;
    box.classList.add('has-gl'); past.resize();
    const bounce = [0.184, 0.384, 0.706];
    scene(box, (t) => {
      const r = box.getBoundingClientRect(), vh = window.innerHeight;
      const k = clamp((vh - r.top) / (vh + r.height));
      past.draw({ spin: 0.2 + k * Math.PI * 2 + Math.sin(t / 2100) * 0.08, tiltX: -0.34 + Math.sin(t / 1900) * 0.05, tiltZ: -0.1, bounce });
    });
    window.addEventListener('resize', () => past.resize());
    window.addEventListener('moinet:route', () => requestAnimationFrame(() => past.resize()));
  });

  /* ---------- L'éventail des boîtes ---------- */
  document.querySelectorAll('[data-fan]').forEach((fan) => {
    const floor = fan.querySelector('.fan-stage'), row = fan.querySelector('.fan-names'), amb = fan.querySelector('.fan-ambient');
    const items = [...fan.querySelectorAll('.fan-item')], names = [...fan.querySelectorAll('.fan-name')], n = items.length;
    if (n < 3 || names.length !== n) return;
    fan.classList.add('is-live');
    /* boîtes en vente : le contenu, le prix et le lien de la boîte choisie s'affichent sous les noms */
    const details = fan.querySelector('.fan-details');
    const infos = details ? items.map((it) => it.querySelector('.fan-info')).filter(Boolean) : [];
    infos.forEach((x) => details.append(x));
    const glow = [document.createElement('img'), document.createElement('img')];
    glow.forEach((g) => { g.alt = ''; amb.append(g); });
    let cur = 0, side = 0;
    const place = () => {
      items.forEach((it, i) => {
        let d = i - cur;
        if (d > n / 2) d -= n; else if (d < -n / 2) d += n;
        it.dataset.pos = Math.abs(d) <= 2 ? String(d) : (d > 0 ? 'out-r' : 'out-l');
        it.setAttribute('aria-hidden', String(d !== 0));
      });
      names.forEach((b, i) => b.setAttribute('aria-pressed', String(i === cur)));
      infos.forEach((x, i) => { x.hidden = i !== cur; });
      roving(names, cur); centerRow(row, names[cur]);
      light();
    };
    /* halo : la pièce choisie, floutée, éclaire la scène (chargé seulement quand l'éventail approche de l'écran) */
    let near = !('IntersectionObserver' in window);
    const light = () => {
      if (!near) return;
      const src = items[cur].querySelector('img');
      side = 1 - side;
      glow[side].src = src.currentSrc || src.src;
      glow[side].classList.add('is-on'); glow[1 - side].classList.remove('is-on');
    };
    if (!near) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { near = true; o.disconnect(); light(); } }, { rootMargin: '60% 0px' }).observe(fan);
    const go = (i) => { cur = (i % n + n) % n; place(); };
    names.forEach((b, i) => b.addEventListener('click', () => go(i)));
    row.addEventListener('scroll', () => { row.scrollLeft = 0; });
    fan.querySelector('[data-fan-prev]').addEventListener('click', () => go(cur - 1));
    fan.querySelector('[data-fan-next]').addEventListener('click', () => go(cur + 1));
    row.addEventListener('keydown', (ev) => {
      const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      ev.preventDefault(); go(cur + d); names[cur].focus({ preventScroll: true });
    });
    /* glisser ou cliquer une pièce de côté */
    let start = null, moved = false;
    floor.addEventListener('pointerdown', (ev) => { start = ev.clientX; moved = false; });
    floor.addEventListener('pointerup', (ev) => {
      if (start === null) return;
      const dx = ev.clientX - start; start = null;
      if (Math.abs(dx) > 45) { moved = true; go(cur + (dx < 0 ? 1 : -1)); }
    });
    floor.addEventListener('pointercancel', () => { start = null; });
    items.forEach((it, i) => it.addEventListener('click', () => { if (!moved && i !== cur) go(i); moved = false; }));
    window.addEventListener('resize', () => centerRow(row, names[cur]));
    window.addEventListener('moinet:route', () => requestAnimationFrame(() => centerRow(row, names[cur])));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => centerRow(row, names[cur]));
    place();
  });

  /* ---------- Pied de page : le nom de la maison se lève ---------- */
  const word = document.querySelector('.footer-word');
  if (word && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { word.classList.add('is-in'); o.disconnect(); } }, { threshold: 0.35 }).observe(word);
  } else if (word) word.classList.add('is-in');

  /* ---------- Pluie de pastilles en arrière-plan (demande du client, nov. 2026) ----------
     Des pastilles du Bassin de Vichy tombent lentement derrière le contenu, en trois plans de
     profondeur (les plus lointaines plus petites, floues et pâles). Le défilement les entraîne,
     chaque plan à sa vitesse. Un canvas fixe en z-index -1 : visible sur le fond crème, caché par
     les sections colorées et les photos. Rien sous prefers-reduced-motion (sortie plus haut). */
  (() => {
    const cv = document.createElement('canvas');
    cv.className = 'pluie'; cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    /* image de la pastille : intégrée (site-complet.html), dossier du thème (WordPress) ou relative */
    const here = document.querySelector('script[src*="immersif.js"]');
    img.src = (window.MOINET_IMG && window.MOINET_IMG['assets/img/pastille.webp'])
      || (here ? here.src.replace(/js\/immersif\.js.*$/, 'img/pastille.webp') : 'assets/img/pastille.webp');
    const PLANS = [ // taille (px), flou (px), opacité, vitesse de chute (px/s), entraînement au défilement
      { size: 30, blur: 2.4, alpha: 0.55, fall: 18, drag: 0.25 },
      { size: 52, blur: 0.8, alpha: 0.85, fall: 30, drag: 0.5 },
      { size: 84, blur: 0, alpha: 1, fall: 44, drag: 0.85 },
    ];
    let W = 0, H = 0, dpr = 1, sprites = [], drops = [];
    const sprite = (pl) => { // pastille pré-dessinée une fois par plan (le flou coûte cher image par image)
      const pad = Math.ceil(pl.blur * 3), n = Math.ceil((pl.size + pad * 2) * dpr);
      const c = document.createElement('canvas'); c.width = c.height = n;
      const x = c.getContext('2d'); x.scale(dpr, dpr);
      if (pl.blur) x.filter = `blur(${pl.blur}px)`;
      x.shadowColor = 'rgba(34, 28, 25, .34)'; x.shadowBlur = pl.size * 0.22; x.shadowOffsetY = pl.size * 0.1;
      x.drawImage(img, pad, pad, pl.size, pl.size);
      return { c, half: n / dpr / 2 };
    };
    const seed = (d, top) => {
      d.pl = d.pl ?? (Math.random() < 0.45 ? 0 : Math.random() < 0.6 ? 1 : 2);
      const P = PLANS[d.pl];
      d.x = Math.random() * W; d.y = top ? -P.size * 2 - Math.random() * H * 0.5 : Math.random() * H;
      d.r = Math.random() * Math.PI * 2; d.vr = (Math.random() - 0.5) * 0.9;
      d.sw = Math.random() * Math.PI * 2; d.amp = 8 + Math.random() * 18; d.k = 0.8 + Math.random() * 0.4;
      return d;
    };
    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      if (img.complete && img.naturalWidth) sprites = PLANS.map(sprite);
      const n = W < 700 ? 10 : 20;
      while (drops.length < n) drops.push(seed({}, false));
      drops.length = n;
    };
    let lastScroll = window.scrollY;
    const draw = (t, dt) => {
      if (!sprites.length) return;
      const sy = window.scrollY, ds = sy - lastScroll; lastScroll = sy;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      for (const d of drops) {
        const P = PLANS[d.pl], sp = sprites[d.pl];
        d.y += (P.fall * d.k * dt) / 1000 - ds * P.drag;
        d.r += (d.vr * dt) / 1000; d.sw += dt / 1600;
        /* boucle verticale : sortie en bas, retour en haut (et l'inverse quand on remonte vite) */
        const m = P.size * 1.5, span = H + m * 2;
        if (d.y > H + m) { d.y -= span; d.x = Math.random() * W; }
        else if (d.y < -m) { d.y += span; d.x = Math.random() * W; }
        const x = d.x + Math.sin(d.sw) * d.amp;
        ctx.setTransform(dpr * Math.cos(d.r), dpr * Math.sin(d.r), -dpr * Math.sin(d.r), dpr * Math.cos(d.r), x * dpr, d.y * dpr);
        ctx.globalAlpha = P.alpha;
        ctx.drawImage(sp.c, -sp.half, -sp.half, sp.half * 2, sp.half * 2);
      }
      ctx.globalAlpha = 1;
    };
    img.addEventListener('load', () => { sprites = PLANS.map(sprite); });
    size();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 150); });
    scene(document.body, draw, '0px');
  })();
})();
