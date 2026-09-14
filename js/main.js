const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Nav scroll state + mobile toggle
const nav = document.querySelector('.nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 30);
  }, { passive: true });
}
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
hamburger?.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !prefersReducedMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('is-in'));
}


// Perception-gap slider (Tensor)
const slider = document.querySelector('[data-slider]');
if (slider) {
  const panelB = slider.querySelector('.slider__panel--b');
  const handle = slider.querySelector('[data-handle]');
  let dragging = false;
  function setPos(pct){ pct = Math.min(100, Math.max(0, pct)); panelB.style.clipPath = `inset(0 0 0 ${pct}%)`; handle.style.left = `${pct}%`; }
  function pctFromEvent(x){ const r = slider.getBoundingClientRect(); return ((x - r.left) / r.width) * 100; }
  slider.addEventListener('pointerdown', e => { dragging = true; setPos(pctFromEvent(e.clientX)); });
  window.addEventListener('pointermove', e => { if (dragging) setPos(pctFromEvent(e.clientX)); });
  window.addEventListener('pointerup', () => dragging = false);
  setPos(50);
}

// FAQ accordion
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q')?.addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    item.closest('.faq-list')?.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// Radar bars (Tensor page) animate on view
document.querySelectorAll('.radar-fill').forEach(bar => {
  const io2 = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { bar.style.width = bar.dataset.value + '%'; io2.unobserve(bar); } });
  }, { threshold: 0.4 });
  io2.observe(bar);
});

// Lead form -> Google Sheets endpoint (shared with portal-legacy.js)
const leadForm = document.getElementById('lead-form');
if (leadForm && typeof SHEET_ENDPOINT !== 'undefined') {
  const status = document.getElementById('form-status');
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!SHEET_ENDPOINT || SHEET_ENDPOINT.includes('PASTE_')) {
      if (status) status.textContent = 'Demo mode: add your Google Apps Script URL in script.js to record submissions live.';
      return;
    }
    const data = new FormData(leadForm);
    data.append('submitted_at', new Date().toISOString());
    data.append('page', window.location.pathname);
    if (status) status.textContent = 'Sending…';
    try {
      await fetch(SHEET_ENDPOINT, { method: 'POST', mode: 'no-cors', body: data });
      if (status) status.textContent = 'Audit request received — we\'ll reach out shortly.';
      leadForm.reset();
    } catch (err) {
      if (status) status.textContent = 'Something went wrong — please email hello@s3tekelevate.in directly.';
    }
  });
}
