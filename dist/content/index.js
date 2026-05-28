// src/services/validation.ts
var MAX_VIDEO_SIZE = 100 * 1024 * 1024;
var MAX_IMAGE_SIZE = 15 * 1024 * 1024;
var MAX_DURATION_SECONDS = 60;
async function validateMedia(file) {
  if (!file) {
    return { ok: false, error: "No file selected." };
  }
  if (file.type.startsWith("video/")) {
    if (file.size > MAX_VIDEO_SIZE) {
      return { ok: false, error: "Video exceeds 100MB." };
    }
    const duration = await getVideoDuration(file);
    if (duration > MAX_DURATION_SECONDS) {
      return { ok: false, error: "Video longer than 60 seconds." };
    }
  } else if (file.type.startsWith("image/")) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { ok: false, error: "Image exceeds 15MB." };
    }
  } else {
    return { ok: false, error: "Unsupported file type." };
  }
  return { ok: true };
}
function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error("Unable to read video."));
    video.src = URL.createObjectURL(file);
  });
}

// src/services/queue.ts
var queue = /* @__PURE__ */ new Map();
function addUpload(item) {
  queue.set(item.id, item);
}
function updateUpload(id, updates) {
  const existing = queue.get(id);
  if (!existing) {
    return;
  }
  queue.set(id, { ...existing, ...updates });
}
function listUploads() {
  return Array.from(queue.values()).sort((a, b) => a.createdAt - b.createdAt);
}

// src/content/bridge.ts
function uploadStoryViaPage(file, options, debug = false) {
  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const handleMessage = (event) => {
      if (event.source !== window) {
        return;
      }
      if (event.data?.requestId !== requestId) {
        return;
      }
      if (event.data.type === "ISU_PROGRESS") {
        options.onProgress(event.data.progress);
      }
      if (event.data.type === "ISU_STATUS") {
        options.onStatus(event.data.status);
      }
      if (event.data.type === "ISU_DONE") {
        window.removeEventListener("message", handleMessage);
        resolve();
      }
      if (event.data.type === "ISU_ERROR") {
        window.removeEventListener("message", handleMessage);
        reject(new Error(event.data.message));
      }
    };
    window.addEventListener("message", handleMessage);
    const message = {
      type: "ISU_UPLOAD",
      requestId,
      file
    };
    if (debug) {
      options.onStatus("Sending upload to page context");
    }
    window.postMessage(message, "*");
  });
}

// src/services/uploader.ts
async function uploadStory(file, callbacks, debug = false) {
  const validation = await validateMedia(file);
  if (!validation.ok) {
    throw new Error(validation.error || "Validation failed.");
  }
  const uploadId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  addUpload({
    id: uploadId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    state: "validating",
    progress: 0,
    createdAt: Date.now()
  });
  callbacks.onStatus("Initializing upload");
  updateUpload(uploadId, { state: "uploading" });
  callbacks.onStatus("Uploading media");
  await uploadStoryViaPage(file, {
    onProgress: (progress) => {
      updateUpload(uploadId, { progress });
      callbacks.onProgress(progress);
    },
    onStatus: (status) => callbacks.onStatus(status)
  }, debug);
  updateUpload(uploadId, { state: "success", progress: 100 });
  callbacks.onProgress(100);
  callbacks.onStatus("Story published");
  return uploadId;
}

// src/utils/logger.ts
var Logger = class {
  constructor(namespace, enabled = false) {
    this.namespace = namespace;
    this.enabled = enabled;
  }
  setEnabled(value) {
    this.enabled = value;
  }
  log(level, message, extra) {
    if (!this.enabled && level === "debug") {
      return;
    }
    const prefix = `[ISU:${this.namespace}]`;
    if (extra !== void 0) {
      console[level === "debug" ? "log" : level](prefix, message, extra);
    } else {
      console[level === "debug" ? "log" : level](prefix, message);
    }
  }
  debug(message, extra) {
    this.log("debug", message, extra);
  }
  info(message, extra) {
    this.log("info", message, extra);
  }
  warn(message, extra) {
    this.log("warn", message, extra);
  }
  error(message, extra) {
    this.log("error", message, extra);
  }
};

// src/content/ui.ts
var logger = new Logger("ui");
var UploadUI = class {
  constructor(debug = false) {
    this.debug = debug;
    this.backdrop = null;
    this.floatingButton = null;
    this.queueContainer = null;
    this.statusText = null;
    this.progressBar = null;
    this.currentFile = null;
    this.previewImage = null;
    this.previewVideo = null;
    this.previewUrl = null;
    this.modalRoot = null;
    this.fileInput = null;
    this.successPanel = null;
    logger.setEnabled(debug);
  }
  mount() {
    if (document.getElementById("isu-floating")) {
      return;
    }
    this.injectStyles();
    this.createFloatingButton();
  }
  openModal(autoPick = false) {
    if (this.backdrop) {
      return;
    }
    this.backdrop = document.createElement("div");
    this.backdrop.className = "isu-modal-backdrop";
    this.backdrop.addEventListener("click", (event) => {
      if (event.target === this.backdrop) {
        this.closeModal();
      }
    });
    const modal = document.createElement("div");
    modal.className = "isu-modal";
    modal.innerHTML = `
      <header>
        <h2>Upload Story</h2>
        <button class="isu-close" aria-label="Close">&times;</button>
      </header>
      <div class="isu-preview" id="isuPreview">
        <div class="isu-preview-empty">Select a file to preview</div>
        <img id="isuPreviewImage" alt="Story preview" />
        <video id="isuPreviewVideo" controls playsinline></video>
      </div>
      <div class="isu-success" id="isuSuccess">
        <div class="isu-success-card">
          <div class="isu-success-icon">\u2713</div>
          <div class="isu-success-title">Story uploaded!</div>
        </div>
        <div class="isu-success-actions">
          <button class="isu-secondary" id="isuUploadNew">Upload New</button>
          <button class="isu-primary" id="isuDone">Done</button>
        </div>
      </div>
      <input id="isuFile" type="file" accept="video/*,image/*" hidden />
      <div class="isu-queue" id="isuQueue"></div>
      <div class="isu-status" id="isuStatus">
        <strong>Status</strong>
        <span>Select a file to begin.</span>
      </div>
      <div class="isu-progress" aria-hidden="true"><span></span></div>
      <div class="isu-actions">
        <button class="isu-secondary" id="isuCancel">Cancel</button>
        <button class="isu-primary" id="isuUpload">Publish</button>
      </div>
    `;
    this.backdrop.appendChild(modal);
    document.body.appendChild(this.backdrop);
    const closeButton = modal.querySelector(".isu-close");
    closeButton.addEventListener("click", () => this.closeModal());
    const cancel = modal.querySelector("#isuCancel");
    cancel.addEventListener("click", () => this.closeModal());
    this.fileInput = modal.querySelector("#isuFile");
    this.fileInput.addEventListener("change", () => {
      if (this.fileInput?.files?.length) {
        this.setFile(this.fileInput.files[0]);
      }
    });
    const uploadButton = modal.querySelector("#isuUpload");
    uploadButton.addEventListener("click", () => this.startUpload());
    this.queueContainer = modal.querySelector("#isuQueue");
    this.statusText = modal.querySelector("#isuStatus");
    this.progressBar = modal.querySelector(".isu-progress span");
    this.previewImage = modal.querySelector("#isuPreviewImage");
    this.previewVideo = modal.querySelector("#isuPreviewVideo");
    this.successPanel = modal.querySelector("#isuSuccess");
    this.modalRoot = modal;
    const uploadNew = modal.querySelector("#isuUploadNew");
    const done = modal.querySelector("#isuDone");
    uploadNew.addEventListener("click", () => {
      this.hideSuccess();
      this.clearPreview();
      this.fileInput?.click();
    });
    done.addEventListener("click", () => this.closeModal());
    this.renderQueue();
    if (autoPick) {
      this.fileInput.click();
    }
  }
  setFile(file) {
    this.currentFile = file;
    this.updatePreview(file);
    if (this.statusText) {
      this.statusText.innerHTML = `
        <strong>Status</strong>
        <span>Selected. Ready to publish.</span>
      `;
    }
  }
  async startUpload() {
    if (!this.currentFile) {
      this.setStatus("Please select a file first.", "error");
      return;
    }
    this.setStatus("Starting upload...", "info");
    try {
      await uploadStory(
        this.currentFile,
        {
          onProgress: (progress) => this.setProgress(progress),
          onStatus: (status) => this.setStatus(status, "info")
        },
        this.debug
      );
      this.setStatus("Story uploaded successfully", "success");
      this.showSuccess();
      this.currentFile = null;
      this.renderQueue();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      this.setStatus(message, "error");
      logger.error("upload error", error);
      this.renderQueue();
    }
  }
  setStatus(message, state) {
    if (!this.statusText) {
      return;
    }
    this.statusText.innerHTML = `
      <strong>Status</strong>
      <span>${message}</span>
    `;
    this.statusText.classList.remove("success", "error");
    if (state === "success") {
      this.statusText.classList.add("success");
    }
    if (state === "error") {
      this.statusText.classList.add("error");
    }
  }
  setProgress(value) {
    if (this.progressBar) {
      this.progressBar.style.width = `${value}%`;
    }
  }
  renderQueue() {
    if (!this.queueContainer) {
      return;
    }
    const items = listUploads();
    if (!items.length) {
      this.queueContainer.innerHTML = "";
      return;
    }
    this.queueContainer.innerHTML = items.map(
      (item) => `
        <div class="isu-item">
          <div class="isu-item-title">${item.fileName}</div>
          <div class="isu-progress"><span style="width: ${item.progress}%"></span></div>
          <div class="isu-status ${item.state === "error" ? "error" : ""}">
            ${item.state}
          </div>
        </div>
      `
    ).join("");
  }
  createFloatingButton() {
    this.floatingButton = document.createElement("button");
    this.floatingButton.id = "isu-floating";
    this.floatingButton.className = "isu-button";
    this.floatingButton.type = "button";
    this.floatingButton.textContent = "Upload Story";
    this.floatingButton.addEventListener("click", () => this.openModal(true));
    if (this.placeButtonInSidebar()) {
      return;
    }
    this.floatingButton.classList.add("isu-floating");
    document.body.appendChild(this.floatingButton);
    const observer = new MutationObserver(() => {
      if (this.placeButtonInSidebar()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  placeButtonInSidebar() {
    if (!this.floatingButton) {
      return false;
    }
    if (document.querySelector(".isu-sidebar-slot")) {
      return true;
    }
    const nav = document.querySelector('nav[role="navigation"]') || document.querySelector("nav");
    const candidates = Array.from(
      (nav || document).querySelectorAll("a, div[role=link], button")
    );
    const profileItem = candidates.find((item) => item.textContent?.trim() === "Profile") || candidates.find((item) => item.getAttribute("aria-label") === "Profile") || candidates.find((item) => {
      const label = item.getAttribute("aria-label") || "";
      return label.toLowerCase().includes("profile");
    }) || candidates.find((item) => {
      const href = item.getAttribute("href") || "";
      return /\/accounts\/edit\/?$/.test(href) || /\/[a-z0-9._]+\/?$/.test(href);
    });
    const profileContainer = profileItem?.closest("li") ?? profileItem?.parentElement;
    if (!profileContainer?.parentElement) {
      return false;
    }
    const slot = document.createElement("div");
    slot.className = "isu-sidebar-slot";
    this.floatingButton.classList.remove("isu-floating");
    this.floatingButton.classList.add("isu-sidebar");
    slot.appendChild(this.floatingButton);
    profileContainer.parentElement.insertBefore(slot, profileContainer.nextSibling);
    return true;
  }
  injectStyles() {
    if (document.getElementById("isu-styles")) {
      return;
    }
    const link = document.createElement("link");
    link.id = "isu-styles";
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("styles/injected.css");
    document.head.appendChild(link);
  }
  closeModal() {
    this.backdrop?.remove();
    this.backdrop = null;
    this.clearPreview();
    this.hideSuccess();
  }
  updatePreview(file) {
    if (!this.previewImage || !this.previewVideo) {
      return;
    }
    this.clearPreview();
    this.previewUrl = URL.createObjectURL(file);
    const container = document.getElementById("isuPreview");
    container?.classList.add("has-preview");
    if (file.type.startsWith("video/")) {
      this.previewVideo.src = this.previewUrl;
      this.previewVideo.style.display = "block";
      this.previewImage.style.display = "none";
    } else {
      this.previewImage.src = this.previewUrl;
      this.previewImage.style.display = "block";
      this.previewVideo.style.display = "none";
    }
  }
  clearPreview() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
    if (this.previewImage) {
      this.previewImage.removeAttribute("src");
      this.previewImage.style.display = "none";
    }
    if (this.previewVideo) {
      this.previewVideo.removeAttribute("src");
      this.previewVideo.style.display = "none";
    }
    const container = document.getElementById("isuPreview");
    container?.classList.remove("has-preview");
  }
  showSuccess() {
    this.modalRoot?.classList.add("isu-success-mode");
  }
  hideSuccess() {
    this.modalRoot?.classList.remove("isu-success-mode");
  }
};

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

// src/content/index.ts
var logger2 = new Logger("content");
var ui = null;
var currentPath = location.pathname;
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
  logger2.setEnabled(settings.debugMode);
  if (!ui) {
    ui = new UploadUI(settings.debugMode);
  }
  ui.mount();
  injectPageScript();
  logger2.info("initialized");
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
    logger2.setEnabled(Boolean(message.enabled));
  }
  if (message.type === "SET_MOBILE_MODE") {
    window.postMessage({ type: "ISU_MOBILE_MODE", enabled: message.enabled }, "*");
  }
});
init();
watchRouteChanges();
//# sourceMappingURL=index.js.map
