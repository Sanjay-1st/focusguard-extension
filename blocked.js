document.addEventListener('DOMContentLoaded', async () => {
  
  // 1. Open Dashboard Button Logic
  document.getElementById('openDashboardBtn').addEventListener('click', () => {
    // Open Dashboard
    chrome.runtime.openOptionsPage();
    // Close this blocked tab to clean up
    window.close();
  });

  // 2. Load Quotes (Same as before)
  const data = await chrome.storage.local.get('customQuotes');
  const customQuotes = data.customQuotes || [];

  const defaultQuotes = [
    "Focus on being productive instead of busy.",
    "The secret of getting ahead is getting started.",
    "Lost time is never found again.",
    "Don't let yesterday take up too much of today.",
    "You can do anything, but not everything."
  ];

  const allQuotes = customQuotes.length > 0 ? customQuotes : defaultQuotes;
  const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
  
  document.getElementById('quoteDisplay').innerText = `"${randomQuote}"`;
});