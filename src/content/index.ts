import { UploadUI } from "./ui";
import { getSettings } from "../utils/storage";
import { Logger } from "../utils/logger";

const logger = new Logger("content");

let ui: UploadUI | null = null;
let currentPath = location.pathname;

function injectPageScript() {
  const existing = document.getElementById("isu-page");
  if (existing) {
    return;
  }
  const script = document.createElement("script");
  script.id = "isu-page";
  script.src = chrome.runtime.getURL("injected/page.js");
  script.type = "module";
  document.documentElement.appendChild(script);
}

async function init() {
  const settings = await getSettings();
  logger.setEnabled(settings.debugMode);
  if (!ui) {
    ui = new UploadUI(settings.debugMode);
  }
  ui.mount();
  injectPageScript();
  logger.info("initialized");
}

function watchRouteChanges() {
  const observer = new MutationObserver(() => {
    if (currentPath !== location.pathname) {
      currentPath = location.pathname;
      init();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "OPEN_UPLOAD_MODAL") {
    ui?.openModal();
  }
  if (message.type === "SET_DEBUG_MODE") {
    logger.setEnabled(Boolean(message.enabled));
  }
  if (message.type === "SET_MOBILE_MODE") {
    window.postMessage({ type: "ISU_MOBILE_MODE", enabled: message.enabled }, "*");
  }
});

init();
watchRouteChanges();
