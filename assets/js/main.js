/* Maison Moinet — interactions communes (sans dépendance) */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* En-tête : ombre au défilement */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Menu mobile accessible */
  const toggle = document.querySelector('.nav-toggle');
  const panel = document.getElementById('mobile-nav');
  if (toggle && panel) {
    const closeBtn = panel.querySelector('.nav-close');
    const focusables = () => panel.querySelectorAll('a[href], button:not([disabled])');
    const open = () => {
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    };
    const close = () => {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      toggle.focus();
    };
    toggle.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const f = focusables(); const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 1200px)').addEventListener('change', (m) => { if (m.matches && !panel.hidden) close(); });
  }

  /* Moment « word-highlight » : la citation s'allume mot à mot pendant que sa propre section
     traverse l'écran. Sous reduced-motion, tout est allumé d'emblée. */
  document.querySelectorAll('[data-moment="word-highlight"]').forEach((section) => {
    const target = section.querySelector('[data-words]');
    if (!target) return;
    const words = target.textContent.trim().split(/\s+/);
    const full = target.textContent.trim().replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    target.innerHTML = `<span class="visually-hidden">${full}</span>` + words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    const spans = target.querySelectorAll('.w');
    if (reduceMotion) { spans.forEach((w) => w.classList.add('on')); return; }
    let ticking = false;
    const paint = () => {
      ticking = false;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height * 0.7)));
      const n = Math.round(p * spans.length);
      spans.forEach((w, i) => w.classList.toggle('on', i < n));
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    paint();
  });

  /* Barre d'actions mobile : masquée tant que les boutons du héros sont visibles */
  const bar = document.querySelector('.action-bar');
  const heroCtas = document.querySelector('.hero-ctas');
  if (bar && heroCtas && 'IntersectionObserver' in window) {
    bar.classList.add('is-hidden');
    new IntersectionObserver(([en]) => bar.classList.toggle('is-hidden', en.isIntersecting)).observe(heroCtas);
  }

  /* Formulaire de contact : validation + ouverture du client mail.
     À rebrancher sur Contact Form 7 lors de l'intégration WordPress. */
  const form = document.getElementById('contact-form');
  if (form) {
    const status = form.querySelector('.form-status');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const d = new FormData(form);
      const ref = (d.get('reference') || '').toString().trim();
      const subject = ref ? `Commande ${ref}` : 'Demande d’information';
      const body = `${d.get('message')}\n\n— ${d.get('email')}${ref ? `\nRéférence de commande : ${ref}` : ''}`;
      window.location.href = `mailto:contact@confiserie-moinet.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = 'Votre logiciel de messagerie s’ouvre avec votre message prérempli.';
    });
  }
})();
