import { getQueueSize, listUploads } from "../services/queue";
import { getSettings, updateSettings } from "../utils/storage";

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
