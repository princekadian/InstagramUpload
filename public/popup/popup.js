const statusText = document.getElementById("statusText");
const queueCount = document.getElementById("queueCount");
const openInstagram = document.getElementById("openInstagram");
const openModal = document.getElementById("openModal");
const mobileMode = document.getElementById("mobileMode");
const debugMode = document.getElementById("debugMode");

async function getActiveInstagramTab() {
  const tabs = await chrome.tabs.query({
    url: "https://www.instagram.com/*"
  });
  return tabs[0];
}

async function refreshStatus() {
  const tab = await getActiveInstagramTab();
  if (!tab) {
    statusText.textContent = "Instagram tab not found.";
    queueCount.textContent = "Queue: 0";
    return;
  }
  statusText.textContent = `Connected to ${tab.title || "Instagram"}`;
  const response = await chrome.runtime.sendMessage({ type: "GET_QUEUE" });
  queueCount.textContent = `Queue: ${response?.size ?? 0}`;
}

openInstagram.addEventListener("click", async () => {
  await chrome.tabs.create({ url: "https://www.instagram.com/" });
});

openModal.addEventListener("click", async () => {
  const tab = await getActiveInstagramTab();
  if (!tab?.id) {
    statusText.textContent = "Open Instagram first.";
    return;
  }
  await chrome.tabs.sendMessage(tab.id, { type: "OPEN_UPLOAD_MODAL" });
});

mobileMode.addEventListener("change", async () => {
  await chrome.storage.local.set({ mobileMode: mobileMode.checked });
  const tab = await getActiveInstagramTab();
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, {
      type: "SET_MOBILE_MODE",
      enabled: mobileMode.checked
    });
  }
});

debugMode.addEventListener("change", async () => {
  await chrome.storage.local.set({ debugMode: debugMode.checked });
  const tab = await getActiveInstagramTab();
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, {
      type: "SET_DEBUG_MODE",
      enabled: debugMode.checked
    });
  }
});

chrome.storage.local.get(["mobileMode", "debugMode"]).then((values) => {
  mobileMode.checked = Boolean(values.mobileMode);
  debugMode.checked = Boolean(values.debugMode);
});

refreshStatus();
