"use strict";

// Open the options page when the user clicks the toolbar icon
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Restore badge on every service-worker start-up (SW can be killed and restarted)
chrome.storage.local.get({ blockedCount: 0 }, ({ blockedCount }) => {
  applyBadge(blockedCount);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "POSTS_BLOCKED" && msg.count > 0) {
    chrome.storage.local.get({ blockedCount: 0 }, ({ blockedCount }) => {
      const next = blockedCount + msg.count;
      chrome.storage.local.set({ blockedCount: next });
      applyBadge(next);
    });
  }

  if (msg.type === "RESET_COUNTER") {
    chrome.storage.local.set({ blockedCount: 0 });
    applyBadge(0);
  }
});

function applyBadge(count) {
  const text = count > 9999 ? "9999+" : count > 0 ? String(count) : "";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#c0392b" });
}
