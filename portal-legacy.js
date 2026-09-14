// Paste your Google Apps Script Web App URL here[cite: 3, 6]
const SHEET_ENDPOINT = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Navbar scroll background[cite: 6]
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('is-scrolled', window.scrollY > 40);
}, { passive: true });

// Scroll Reveal Observer (triggered section by section)[cite: 6]
const revealElements = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window && !prefersReducedMotion) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  
  revealElements.forEach(el => observer.observe(el));
} else {
  revealElements.forEach(el => el.classList.add('is-in'));
}

// Custom Cursor Tracker[cite: 6]
if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (dot && ring) {
    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    });

    function renderCursor() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      requestAnimationFrame(renderCursor);
    }
    renderCursor();

    document.querySelectorAll('a, button, input, label, [data-handle]').forEach(interactiveEl => {
      interactiveEl.addEventListener('mouseenter', () => ring.classList.add('is-active'));
      interactiveEl.addEventListener('mouseleave', () => ring.classList.remove('is-active'));
    });
  }
}

// Magnetic Button Micro-Interactions[cite: 6]
if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('[data-magnetic]').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.22}px, ${y * 0.3}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// 0% - 100% Full Travel Slider[cite: 6]
const slider = document.querySelector('[data-slider]');
if (slider) {
  const panelB = slider.querySelector('.slider__panel--b');
  const handle = slider.querySelector('[data-handle]');
  let dragging = false;

  function setPos(pct) {
    pct = Math.min(100, Math.max(0, pct)); // Unrestricted 0 to 100 range
    panelB.style.clipPath = `inset(0 0 0 ${pct}%)`;
    handle.style.left = `${pct}%`;
    handle.setAttribute('aria-valuenow', Math.round(pct));
  }

  function pctFromEvent(clientX) {
    const r = slider.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  }

  slider.addEventListener('pointerdown', (e) => { 
    dragging = true; 
    setPos(pctFromEvent(e.clientX)); 
  });
  window.addEventListener('pointermove', (e) => { 
    if (dragging) setPos(pctFromEvent(e.clientX)); 
  });
  window.addEventListener('pointerup', () => dragging = false);
  setPos(50); // Start centered[cite: 6]
}

// Choice-based Google Sheets Form[cite: 6]
const form = document.getElementById('lead-form');
if (form) {
  const status = document.getElementById('form-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (SHEET_ENDPOINT.startsWith('PASTE_')) {
      status.textContent = 'Demo mode: Add your Google Apps Script URL in script.js to record rows live.';
      return;
    }
    const data = new FormData(form);
    data.append('submitted_at', new Date().toISOString());
    data.append('page', window.location.pathname);
    status.textContent = 'Submitting choices…';
    try {
      await fetch(SHEET_ENDPOINT, { method: 'POST', mode: 'no-cors', body: data });
      status.textContent = 'Audit request received! Our strategy team will reach out shortly.';
      form.reset();
    } catch (err) {
      status.textContent = 'Something went wrong. Please reach out to us directly.';
    }
  });
}