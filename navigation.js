// Shared, keyboard-accessible navigation drawer on every public page.
(() => {
  const toggle = document.getElementById('menu');
  const panel = document.getElementById('nav-panel');
  const close = document.getElementById('menu-close');
  function reflect(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }
  function closeMenu() {
    if (panel.open) panel.close();
    reflect(false);
  }
  toggle.addEventListener('click', () => {
    if (panel.open) { closeMenu(); return; }
    panel.showModal(); reflect(true); close.focus();
  });
  close.addEventListener('click', closeMenu);
  panel.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  panel.addEventListener('close', () => reflect(false));
  panel.addEventListener('click', event => { if (event.target === panel) closeMenu(); });
  panel.querySelectorAll('a[href]').forEach(link => link.addEventListener('click', closeMenu));
})();

// Keep the public footer copyright year current.
document.querySelectorAll('[data-copyright-year]').forEach(element => {
  element.textContent = String(new Date().getFullYear());
});
