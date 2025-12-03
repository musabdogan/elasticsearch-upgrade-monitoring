// Background service worker for Elasticsearch Upgrade Monitoring Extension

// Open the dashboard in a new tab when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
});

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open the dashboard on first install
    chrome.tabs.create({
      url: chrome.runtime.getURL('index.html')
    });
  }
});

