/* Shared behaviour for every page. Each HTML page has its own stylesheet. */
(() => {
  'use strict';

  // Mobile navigation: close button, outside click, Escape, and keyboard focus.
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  const header = document.querySelector('.site-header');
  const mobile = window.matchMedia('(max-width: 991.98px)');
  function setMenu(open, restoreFocus = false) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    if (restoreFocus) toggle.focus();
  }
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', event => {
    if (header && !header.contains(event.target)) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });
  header?.addEventListener('focusout', event => {
    if (event.relatedTarget && !header.contains(event.relatedTarget)) setMenu(false);
  });
  mobile.addEventListener('change', () => setMenu(false));

  // Navigation remains usable when JavaScript is unavailable.
  document.documentElement.classList.add('js-enabled');
  const config = window.MPILO_CONFIG || {};
  if (/^[1-9]\d{7,14}$/.test(config.whatsappNumber || '')) {
    const message = 'Hello ' + config.dealershipName + ', I would like to enquire about a vehicle.';
    document.querySelectorAll('[data-whatsapp]').forEach(link => {
      link.href = 'https://wa.me/' + config.whatsappNumber + '?text=' + encodeURIComponent(message);
    });
  }
  document.querySelectorAll('[data-year]').forEach(element => {
    element.textContent = new Date().getFullYear();
  });

  // Reveal once, and respect the visitor's reduced-motion preference.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    document.body.classList.add('motion-enabled');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  }
})();
