// src/services/queue.ts
var queue = /* @__PURE__ */ new Map();
function listUploads() {
  return Array.from(queue.values()).sort((a, b) => a.createdAt - b.createdAt);
}
function getQueueSize() {
  return queue.size;
}

// src/utils/storage.ts
var defaultSettings = {
  mobileMode: false,
  debugMode: false
};
async function getSettings() {
  const values = await chrome.storage.local.get(Object.keys(defaultSettings));
  return {
    mobileMode: Boolean(values.mobileMode ?? defaultSettings.mobileMode),
    debugMode: Boolean(values.debugMode ?? defaultSettings.debugMode)
  };
}
async function updateSettings(settings) {
  await chrome.storage.local.set(settings);
}

// src/background/index.ts
chrome.runtime.onInstalled.addListener(() => {
  void getSettings();
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_QUEUE") {
    sendResponse({ size: getQueueSize(), items: listUploads() });
    return true;
  }
  if (message.type === "UPDATE_SETTINGS") {
    void updateSettings(message.settings || {});
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
//# sourceMappingURL=index.js.map
