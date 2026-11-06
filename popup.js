document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  detectUrl(); // Auto-fill URL
});

document.getElementById('addLimit').addEventListener('click', () => addSite('limit'));
document.getElementById('addBlock').addEventListener('click', () => addSite('always'));
document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// FEATURE: Auto-detect URL from active tab
function detectUrl() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs.length > 0 && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        if (url.protocol.startsWith('http')) {
            const domain = url.hostname.replace('www.', '');
            document.getElementById('siteInput').value = domain;
        }
      } catch (e) { console.log("Invalid URL"); }
    }
  });
}

async function addSite(type) {
  const input = document.getElementById('siteInput');
  const rawUrl = input.value.trim();
  if (!rawUrl) return;

  const domain = rawUrl.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0];
  const data = await chrome.storage.local.get('blockedSites');
  let blockedSites = data.blockedSites || {};

  blockedSites[domain] = {
    type: type,
    addedDate: new Date().toLocaleDateString()
  };

  await chrome.storage.local.set({ blockedSites });
  input.value = '';
  loadSites();
}

async function loadSites() {
  const data = await chrome.storage.local.get(['blockedSites']);
  const list = document.getElementById('siteList');
  const sites = data.blockedSites || {};
  list.innerHTML = '';
  
  const keys = Object.keys(sites).reverse().slice(0, 5); // Show last 5
  if (keys.length === 0) list.innerHTML = '<li style="color:#aaa;">No rules active</li>';

  keys.forEach(domain => {
    const config = sites[domain];
    const li = document.createElement('li');
    li.innerHTML = `<b>${domain}</b> <span>${config.type === 'limit' ? '5m Limit' : 'Blocked'}</span>`;
    list.appendChild(li);
  });
}