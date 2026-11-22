/* Maison Moinet — mesure d'audience (Google Analytics 4) et consentement aux cookies.
   Rien n'est chargé tant que GA4_ID est vide : coller ici l'identifiant de la propriété GA4 de
   Moinet (G-XXXXXXXXXX), créée avec le compte Google de Moinet.
   Règles CNIL appliquées : aucun cookie de mesure avant un accord explicite ; « Refuser » aussi
   visible que « Accepter » ; choix modifiable à tout moment (lien « Gestion des cookies » du pied
   de page) ; accord conservé 13 mois, refus 6 mois. Mode consentement de Google (v2) déclaré
   « refusé » par défaut ; la balise Google n'est chargée qu'après l'accord.
   Les événements e-commerce (view_item_list, view_item, add_to_cart) viennent de catalogue.js
   (window.moinetTrack) ; ils ne partent vers Google qu'après l'accord.
   Dans le thème WordPress, l'achat lui-même (purchase) est mesuré côté WooCommerce
   (extension Google for WooCommerce ou Site Kit). */
(() => {
  'use strict';
  const GA4_ID = '';                                   /* ← identifiant GA4 de Moinet */
  const id = window.MOINET_GA4 || GA4_ID;
  if (!/^G-[A-Z0-9]{4,}$/.test(id)) return;

  const KEY = 'moinet-consentement';
  const MONTH = 30 * 24 * 3600 * 1000;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 });

  const read = () => {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!c) return null;
      const age = Date.now() - c.t;
      return age < (c.ok ? 13 : 6) * MONTH ? c : null;
    } catch (e) { return null; }
  };
  const save = (ok) => { try { localStorage.setItem(KEY, JSON.stringify({ ok, t: Date.now() })); } catch (e) { /* stockage indisponible */ } };

  let loaded = false;
  const queue = [];
  const start = () => {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    if (loaded) return;
    loaded = true;
    const s = document.createElement('script');
    s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.append(s);
    gtag('js', new Date());
    gtag('config', id);
    queue.splice(0).forEach(([name, params]) => gtag('event', name, params));
  };
  const stop = () => {
    gtag('consent', 'update', { analytics_storage: 'denied' });
    /* efface les cookies de mesure déjà posés */
    document.cookie.split(';').map((c) => c.trim().split('=')[0]).filter((n) => /^_ga/.test(n)).forEach((n) => {
      const host = location.hostname.split('.').slice(-2).join('.');
      [`${n}=; Max-Age=0; path=/`, `${n}=; Max-Age=0; path=/; domain=.${host}`].forEach((v) => { document.cookie = v; });
    });
  };

  /* événements du catalogue : envoyés seulement après accord */
  window.moinetTrack = (name, params) => {
    const c = read();
    if (c && c.ok) { if (loaded) gtag('event', name, params); else queue.push([name, params]); }
  };
  (window.MOINET_TRACKQ || []).splice(0).forEach(([n, p]) => window.moinetTrack(n, p));

  /* bandeau */
  let banner;
  const close = () => { if (banner) { banner.remove(); banner = null; } };
  const open = () => {
    if (banner) return;
    banner = document.createElement('section');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'cookie-title');
    banner.innerHTML = `<div class="cookie-in">
      <h2 id="cookie-title">Mesure d’audience</h2>
      <p>Avec votre accord, nous mesurons la fréquentation du site avec Google Analytics pour l’améliorer : pages vues, produits consultés, ajouts au panier. Vous pouvez changer d’avis à tout moment avec le lien « Gestion des cookies » en bas de page.</p>
      <div class="cookie-actions">
        <button type="button" class="btn btn--sm btn--ink" data-choice="0">Refuser</button>
        <button type="button" class="btn btn--sm btn--ink" data-choice="1">Accepter</button>
      </div>
    </div>`;
    banner.addEventListener('click', (e) => {
      const b = e.target.closest('[data-choice]'); if (!b) return;
      const ok = b.dataset.choice === '1';
      save(ok); if (ok) start(); else stop();
      close();
    });
    document.body.append(banner);
  };

  const init = () => {
    document.querySelectorAll('[data-cookies]').forEach((b) => { b.hidden = false; b.addEventListener('click', open); });
    const c = read();
    if (!c) open(); else if (c.ok) start();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
