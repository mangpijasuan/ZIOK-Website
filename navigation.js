// Shared, keyboard-accessible navigation drawer on every public page.
(() => {
  const toggle = document.getElementById('menu');
  const panel = document.getElementById('nav-panel');
  const close = document.getElementById('menu-close');
  if (!toggle || !panel || !close) return; // Pages without the drawer, such as the 404 page.
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
// The contact address is editable in the administrator portal; static hosts keep the address written in the page.
(function(){var email=typeof ZIOK_CONTENT!=='undefined'&&ZIOK_CONTENT&&ZIOK_CONTENT.contact&&ZIOK_CONTENT.contact.email;if(!/^[^\s@<>"]+@[^\s@<>"]+$/.test(email||''))return;document.querySelectorAll('a[data-contact-email]').forEach(function(a){a.href='mailto:'+email;a.textContent=email})})();

// Directory pages show when the published content last changed (set by the server; absent on static hosts).
(function(){var el=document.querySelector('[data-updated]');if(!el||typeof ZIOK_UPDATED==='undefined'||!ZIOK_UPDATED)return;var d=new Date(ZIOK_UPDATED+'T00:00:00Z');if(isNaN(d))return;el.textContent='Last updated '+d.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});el.hidden=false})();
