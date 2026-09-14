// ===== PORTAL LOGIC ===== (SHEET_ENDPOINT comes from script.js, loaded first)

// --- auth guard (demo-level only, see PORTAL_SETUP.md) ---
const clientName = sessionStorage.getItem('s3tek_client');
if (!clientName) {
  window.location.href = 'portal-login.html';
}
const clientBiz = sessionStorage.getItem('s3tek_client_biz') || clientName;
document.getElementById('client-name') && (document.getElementById('client-name').textContent = clientBiz);
document.getElementById('logout-btn')?.addEventListener('click', () => {
  sessionStorage.clear();
  window.location.href = 'portal-login.html';
});

// --- tab switching ---
document.querySelectorAll('.portal-tab[data-view]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.portal-tab[data-view]').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.portal-view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('view-' + tab.dataset.view).classList.add('active');
  });
});

// --- overview: demo bars + connect stubs ---
const barsEl = document.getElementById('demo-bars');
if (barsEl) {
  [40, 55, 48, 62, 58, 70, 66, 80].forEach(h => {
    const d = document.createElement('div');
    d.style.height = h + '%';
    barsEl.appendChild(d);
  });
}
document.querySelectorAll('[data-gsc],[data-ga4],[data-meta]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    alert('This connects via Google/Meta sign-in on our side. Ping us in Messages and we\'ll switch it on for your account — see PORTAL_SETUP.md for what\'s involved.');
  });
});

// --- helper: call the shared Apps Script endpoint ---
async function portalCall(type, payload = {}, method = 'POST') {
  if (!SHEET_ENDPOINT || SHEET_ENDPOINT.includes('PASTE_')) {
    return { demo: true };
  }
  const body = { ...payload, type, client: clientBiz };
  if (method === 'GET') {
    const url = SHEET_ENDPOINT + '?type=' + encodeURIComponent(type) + '&client=' + encodeURIComponent(clientBiz);
    const res = await fetch(url);
    return res.json();
  }
  await fetch(SHEET_ENDPOINT, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  return { sent: true };
}

// --- messages ---
const msgThread = document.getElementById('msg-thread');
const msgForm = document.getElementById('msg-form');
async function loadMessages() {
  try {
    const data = await portalCall('messages', {}, 'GET');
    if (Array.isArray(data.rows)) {
      data.rows.forEach(r => {
        const el = document.createElement('div');
        el.className = 'msg ' + (r.from === 'S3tek Elevate' ? 'them' : 'us');
        el.innerHTML = `${r.text}<span class="meta">${r.from} · ${r.time || ''}</span>`;
        msgThread.appendChild(el);
      });
    }
  } catch (e) { /* endpoint not wired yet — demo message stays as-is */ }
}
loadMessages();
msgForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = document.getElementById('msg-text').value.trim();
  if (!text) return;
  const el = document.createElement('div');
  el.className = 'msg us';
  el.innerHTML = `${text}<span class="meta">You · just now</span>`;
  msgThread.appendChild(el);
  msgThread.scrollTop = msgThread.scrollHeight;
  document.getElementById('msg-text').value = '';
  const status = document.getElementById('msg-status');
  const res = await portalCall('message', { text, from: clientBiz, time: new Date().toLocaleString() });
  status.textContent = res.demo ? 'Demo mode — connect Google Sheets in script.js to send for real.' : 'Sent.';
});

// --- weekly goals ---
const goalList = document.getElementById('goal-list');
let localGoals = JSON.parse(localStorage.getItem('s3tek_goals_' + clientBiz) || '[]');
if (localGoals.length === 0) {
  localGoals = [
    { text: 'Approve this week\'s ad creative', done: false },
    { text: 'Send 3 customer photos for the site', done: false }
  ];
}
function renderGoals() {
  goalList.innerHTML = '';
  localGoals.forEach((g, i) => {
    const row = document.createElement('div');
    row.className = 'goal-row' + (g.done ? ' done' : '');
    row.innerHTML = `<input type="checkbox" ${g.done ? 'checked' : ''}><span class="gtext">${g.text}</span>`;
    row.querySelector('input').addEventListener('change', (e) => {
      localGoals[i].done = e.target.checked;
      persistGoals();
      renderGoals();
    });
    goalList.appendChild(row);
  });
}
function persistGoals() {
  localStorage.setItem('s3tek_goals_' + clientBiz, JSON.stringify(localGoals));
  portalCall('goals', { goals: localGoals });
}
renderGoals();
document.getElementById('goal-add-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('goal-text');
  if (!input.value.trim()) return;
  localGoals.push({ text: input.value.trim(), done: false });
  input.value = '';
  persistGoals();
  renderGoals();
  document.getElementById('goal-status').textContent = 'Saved on this device. Wire up Google Sheets in script.js to sync across devices.';
});

// --- Brand Tensor ---
document.getElementById('bt-run')?.addEventListener('click', async () => {
  const desc = document.getElementById('bt-desc').value.trim();
  const website = document.getElementById('bt-website').value.trim();
  const gbp = document.getElementById('bt-gbp').value.trim();
  const ig = document.getElementById('bt-ig').value.trim();
  const fb = document.getElementById('bt-fb').value.trim();
  const status = document.getElementById('bt-status');
  const resultEl = document.getElementById('bt-result');
  if (!desc || !website) { status.textContent = 'Add at least a positioning description and your website URL.'; return; }

  status.textContent = 'Analysing… this calls your website + GBP and can take 15–30s.';
  resultEl.style.display = 'none';

  if (!SHEET_ENDPOINT || SHEET_ENDPOINT.includes('PASTE_')) {
    status.textContent = 'Demo mode — connect the Brand Tensor backend in script.js (see PORTAL_SETUP.md) to run real analysis.';
    renderBrandTensorDemo(resultEl);
    return;
  }

  try {
    const res = await fetch(SHEET_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'brandtensor', client: clientBiz, desc, website, gbp, instagram: ig, facebook: fb })
    });
    const data = await res.json();
    status.textContent = '';
    renderBrandTensorResult(resultEl, data);
  } catch (e) {
    status.textContent = 'Something broke reaching the analysis backend — try again or message us.';
  }
});

function scoreBar(pct) { return `<div class="bar"><span style="width:${pct}%"></span></div>`; }

function renderBrandTensorResult(el, data) {
  el.style.display = 'block';
  el.innerHTML = `
    <div class="bt-score"><div class="num">${data.overallScore ?? '—'}<span class="of">/100</span></div><div>${data.summary || ''}</div></div>
    <div class="bt-layer"><h4>Sense (message) <span>${data.sense?.score ?? '—'}/100</span></h4>${scoreBar(data.sense?.score || 0)}<p>${data.sense?.note || ''}</p></div>
    <div class="bt-layer"><h4>Structure (identity &amp; site) <span>${data.structure?.score ?? '—'}/100</span></h4>${scoreBar(data.structure?.score || 0)}<p>${data.structure?.note || ''}</p></div>
    <div class="bt-layer"><h4>Surface (social &amp; local) <span>${data.surface?.score ?? '—'}/100</span></h4>${scoreBar(data.surface?.score || 0)}<p>${data.surface?.note || ''}</p></div>
  `;
}

function renderBrandTensorDemo(el) {
  renderBrandTensorResult(el, {
    overallScore: 61,
    summary: 'Demo output — connect the real backend for your actual score.',
    sense: { score: 55, note: 'Your stated positioning is clear, but this is placeholder demo text until the backend is connected.' },
    structure: { score: 70, note: 'Demo note about identity/site consistency.' },
    surface: { score: 58, note: 'Demo note about social/local presence.' }
  });
}
