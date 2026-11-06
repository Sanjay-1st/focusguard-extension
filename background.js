// background.js - Analytics & Tracking

let currentSite = null;
let startTime = null;
let timerInterval = null;
const LIMIT_SECONDS = 300; // 5 Minutes

// EVENT LISTENERS
chrome.tabs.onActivated.addListener(checkCurrentTab);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    checkCurrentTab();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'limit_reached') blockCurrentTab();
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "update_rules") checkCurrentTab();
});

// CORE LOGIC
async function checkCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0 || !tabs[0].url) return;

  const domain = getDomain(tabs[0].url);
  
  // Detect if we switched sites (to stop tracking old one)
  if (currentSite && currentSite !== domain) {
    await stopTracking();
  }

  if (!domain) return;

  const data = await chrome.storage.local.get(['blockedSites', 'usageLog', 'lastDate', 'stats']);
  checkDailyReset(data);

  const config = (data.blockedSites || {})[domain];
  
  // TRACKING LOGIC: If this is a monitored site (limit or block)
  if (config) {
    // If we just arrived at this domain (and weren't already there), count a visit
    if (currentSite !== domain) {
      trackVisit(domain, data.stats || {});
    }

    if (config.type === 'always') {
      blockCurrentTab();
      return;
    }

    if (config.type === 'limit') {
      const used = (data.usageLog || {})[domain] || 0;
      const remaining = LIMIT_SECONDS - used;

      if (remaining <= 0) {
        blockCurrentTab();
      } else if (currentSite !== domain) {
        startTracking(domain, remaining);
      }
    }
  }
}

async function trackVisit(domain, currentStats) {
  // Initialize stats for this domain if missing
  if (!currentStats[domain]) {
    currentStats[domain] = { visits: 0, totalTime: 0, lastVisit: Date.now() };
  }
  
  // Increment visit count
  currentStats[domain].visits += 1;
  currentStats[domain].lastVisit = Date.now();
  
  await chrome.storage.local.set({ stats: currentStats });
}

function startTracking(domain, remainingSeconds) {
  currentSite = domain;
  
  chrome.alarms.clear('limit_reached');
  if (timerInterval) clearInterval(timerInterval);

  chrome.alarms.create('limit_reached', { when: Date.now() + (remainingSeconds * 1000) });
  updateBadge(remainingSeconds);

  timerInterval = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      return;
    }
    updateBadge(remainingSeconds);
    saveUsage(domain, 1); 
  }, 1000);
}

function updateBadge(seconds) {
  let text = "";
  let color = "#27ae60";
  if (seconds > 60) {
    text = Math.ceil(seconds / 60) + "m";
  } else {
    text = seconds + "s";
    color = "#e74c3c";
  }
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
}

async function stopTracking() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  chrome.alarms.clear('limit_reached');
  currentSite = null;
  chrome.action.setBadgeText({ text: "" });
}

async function saveUsage(domain, amount) {
  // 1. Update Daily Limit Log
  const data = await chrome.storage.local.get(['usageLog', 'stats']);
  const usageLog = data.usageLog || {};
  usageLog[domain] = (usageLog[domain] || 0) + amount;
  
  // 2. Update Long-term Stats
  const stats = data.stats || {};
  if (!stats[domain]) stats[domain] = { visits: 1, totalTime: 0, lastVisit: Date.now() };
  stats[domain].totalTime += amount;

  await chrome.storage.local.set({ usageLog, stats });
}

function blockCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { url: chrome.runtime.getURL("blocked.html") });
    }
  });
}

function getDomain(url) {
  try {
    const u = new URL(url);
    if (!u.protocol.startsWith('http')) return null;
    return u.hostname.replace('www.', '');
  } catch (e) { return null; }
}

function checkDailyReset(data) {
  const today = new Date().toLocaleDateString();
  if (data.lastDate !== today) {
    // Reset limits but KEEP stats if you want long-term history
    // For now, we reset everything daily to keep it simple
    chrome.storage.local.set({ usageLog: {}, stats: {}, lastDate: today });
  }
}