document.addEventListener('DOMContentLoaded', () => {
  refreshDashboard();
  renderQuotes();
  setupNavigation();
  
  document.getElementById('addNewSiteBtn').addEventListener('click', manualAddSite);
  document.getElementById('addQuoteBtn').addEventListener('click', addQuote);
});

// --- NAVIGATION ---
function setupNavigation() {
  const menuDashboard = document.getElementById('menuDashboard');
  const menuQuotes = document.getElementById('menuQuotes');
  const secDashboard = document.getElementById('sectionDashboard');
  const secQuotes = document.getElementById('sectionQuotes');

  menuDashboard.addEventListener('click', () => {
    menuDashboard.classList.add('active');
    menuQuotes.classList.remove('active');
    secDashboard.classList.remove('hidden');
    secQuotes.classList.add('hidden');
    refreshDashboard(); // Refresh data when switching back
  });

  menuQuotes.addEventListener('click', () => {
    menuQuotes.classList.add('active');
    menuDashboard.classList.remove('active');
    secQuotes.classList.remove('hidden');
    secDashboard.classList.add('hidden');
  });
}

// --- MAIN DASHBOARD LOGIC ---
async function refreshDashboard() {
  const data = await chrome.storage.local.get(['blockedSites', 'usageLog', 'stats']);
  const sites = data.blockedSites || {};
  const usage = data.usageLog || {};
  const stats = data.stats || {};
  
  // 1. Calculate Stats
  let totalV = 0;
  let totalSeconds = 0;
  let topSiteName = '-';
  let maxVisits = -1;

  for (const [domain, s] of Object.entries(stats)) {
    totalV += s.visits;
    totalSeconds += s.totalTime;
    if (s.visits > maxVisits) {
      maxVisits = s.visits;
      topSiteName = domain;
    }
  }

  document.getElementById('totalVisits').innerText = totalV;
  document.getElementById('totalTime').innerText = formatTime(totalSeconds);
  document.getElementById('topSite').innerText = topSiteName;

  // 2. Render Table
  const tbody = document.getElementById('rulesTable');
  tbody.innerHTML = '';

  if (Object.keys(sites).length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#999;">No rules active. Add a site above!</td></tr>';
    return;
  }

  for (const [domain, config] of Object.entries(sites)) {
    const tr = document.createElement('tr');
    
    // Usage Data
    const usedSeconds = Math.floor(usage[domain] || 0);
    const minutes = Math.floor(usedSeconds / 60);
    const percent = Math.min((usedSeconds / 300) * 100, 100);
    const visitCount = stats[domain] ? stats[domain].visits : 0;
    
    let statusHTML = '';
    if (config.type === 'always') {
      statusHTML = '<span style="color:#e74c3c; font-weight:bold; background:#fff0f0; padding:4px 8px; border-radius:4px;">Blocked</span>';
    } else {
      const color = percent >= 100 ? '#e74c3c' : '#27ae60';
      statusHTML = `
        <div style="display:flex; align-items:center;">
          <div class="progress-bg"><div class="progress-fill" style="width:${percent}%; background:${color}"></div></div>
          <span style="font-size:12px; color:#7f8c8d; font-weight:600;">${minutes}m / 5m</span>
        </div>
      `;
    }

    tr.innerHTML = `
      <td style="font-weight:600; color:#2c3e50;">${domain}</td>
      <td>${config.type === 'limit' ? '5 Min Limit' : 'Full Block'}</td>
      <td>${statusHTML}</td>
      <td style="text-align:center;">${visitCount}</td>
      <td><button class="btn-delete" data-domain="${domain}">Remove</button></td>
    `;
    tbody.appendChild(tr);
  }

  // Attach Delete Listeners
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => removeSite(e.target.dataset.domain));
  });
}

function formatTime(seconds) {
  if (seconds < 60) return seconds + "s";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return mins + "m";
  const hrs = Math.floor(mins / 60);
  return hrs + "h " + (mins % 60) + "m";
}

// --- ADD / REMOVE ---
async function manualAddSite() {
  const input = document.getElementById('newSiteInput');
  const typeSelect = document.getElementById('newSiteType');
  const rawUrl = input.value.trim();

  if (!rawUrl) return;

  const domain = rawUrl.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0];
  const type = typeSelect.value;

  const data = await chrome.storage.local.get('blockedSites');
  let blockedSites = data.blockedSites || {};

  blockedSites[domain] = { type: type, addedDate: new Date().toLocaleDateString() };

  await chrome.storage.local.set({ blockedSites });
  input.value = '';
  
  // Refresh UI & Notify Background
  refreshDashboard();
  chrome.runtime.sendMessage({ action: "update_rules" });
}

async function removeSite(domain) {
  const data = await chrome.storage.local.get('blockedSites');
  const blockedSites = data.blockedSites;
  delete blockedSites[domain];
  await chrome.storage.local.set({ blockedSites });
  
  refreshDashboard();
  chrome.runtime.sendMessage({ action: "update_rules" });
}

// --- QUOTES ---
async function addQuote() {
  const input = document.getElementById('newQuoteInput');
  const text = input.value.trim();
  if (!text) return;

  const data = await chrome.storage.local.get('customQuotes');
  let quotes = data.customQuotes || [];
  quotes.push(text);

  await chrome.storage.local.set({ customQuotes: quotes });
  input.value = '';
  renderQuotes();
}

async function renderQuotes() {
  const data = await chrome.storage.local.get('customQuotes');
  const quotes = data.customQuotes || [];
  const list = document.getElementById('quotesList');
  list.innerHTML = '';

  if (quotes.length === 0) {
    list.innerHTML = '<p style="text-align:center; color:#ccc; margin-top:20px;">No custom quotes. Default quotes will appear.</p>';
    return;
  }

  quotes.forEach((quote, index) => {
    const div = document.createElement('div');
    div.className = 'quote-item';
    div.innerHTML = `<span style="font-style:italic; color:#555;">"${quote}"</span> <button class="btn-delete" data-index="${index}">Delete</button>`;
    list.appendChild(div);
  });

  document.querySelectorAll('.quote-item .btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => removeQuote(e.target.dataset.index));
  });
}

async function removeQuote(index) {
  const data = await chrome.storage.local.get('customQuotes');
  let quotes = data.customQuotes || [];
  quotes.splice(index, 1);
  await chrome.storage.local.set({ customQuotes: quotes });
  renderQuotes();
}