import { uploadStory } from "../services/uploader";
import { listUploads } from "../services/queue";
import { Logger } from "../utils/logger";

const logger = new Logger("ui");

export class UploadUI {
  private backdrop: HTMLDivElement | null = null;
  private floatingButton: HTMLButtonElement | null = null;
  private queueContainer: HTMLDivElement | null = null;
  private statusText: HTMLDivElement | null = null;
  private progressBar: HTMLSpanElement | null = null;
  private currentFile: File | null = null;
  private previewImage: HTMLImageElement | null = null;
  private previewVideo: HTMLVideoElement | null = null;
  private previewUrl: string | null = null;
  private modalRoot: HTMLDivElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private successPanel: HTMLDivElement | null = null;

  constructor(private debug = false) {
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
          <div class="isu-success-icon">✓</div>
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

    const closeButton = modal.querySelector(".isu-close") as HTMLButtonElement;
    closeButton.addEventListener("click", () => this.closeModal());
    const cancel = modal.querySelector("#isuCancel") as HTMLButtonElement;
    cancel.addEventListener("click", () => this.closeModal());

    this.fileInput = modal.querySelector("#isuFile") as HTMLInputElement;
    this.fileInput.addEventListener("change", () => {
      if (this.fileInput?.files?.length) {
        this.setFile(this.fileInput.files[0]);
      }
    });

    const uploadButton = modal.querySelector("#isuUpload") as HTMLButtonElement;
    uploadButton.addEventListener("click", () => this.startUpload());

    this.queueContainer = modal.querySelector("#isuQueue") as HTMLDivElement;
    this.statusText = modal.querySelector("#isuStatus") as HTMLDivElement;
    this.progressBar = modal.querySelector(".isu-progress span") as HTMLSpanElement;
    this.previewImage = modal.querySelector("#isuPreviewImage") as HTMLImageElement;
    this.previewVideo = modal.querySelector("#isuPreviewVideo") as HTMLVideoElement;
    this.successPanel = modal.querySelector("#isuSuccess") as HTMLDivElement;
    this.modalRoot = modal;

    const uploadNew = modal.querySelector("#isuUploadNew") as HTMLButtonElement;
    const done = modal.querySelector("#isuDone") as HTMLButtonElement;
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

  private setFile(file: File) {
    this.currentFile = file;
    this.updatePreview(file);
    if (this.statusText) {
      this.statusText.innerHTML = `
        <strong>Status</strong>
        <span>Selected. Ready to publish.</span>
      `;
    }
  }

  private async startUpload() {
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

  private setStatus(message: string, state: "info" | "success" | "error") {
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

  private setProgress(value: number) {
    if (this.progressBar) {
      this.progressBar.style.width = `${value}%`;
    }
  }

  private renderQueue() {
    if (!this.queueContainer) {
      return;
    }
    const items = listUploads();
    if (!items.length) {
      this.queueContainer.innerHTML = "";
      return;
    }
    this.queueContainer.innerHTML = items
      .map(
        (item) => `
        <div class="isu-item">
          <div class="isu-item-title">${item.fileName}</div>
          <div class="isu-progress"><span style="width: ${item.progress}%"></span></div>
          <div class="isu-status ${item.state === "error" ? "error" : ""}">
            ${item.state}
          </div>
        </div>
      `
      )
      .join("");
  }

  private createFloatingButton() {
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

  private placeButtonInSidebar() {
    if (!this.floatingButton) {
      return false;
    }
    if (document.querySelector(".isu-sidebar-slot")) {
      return true;
    }
    const nav =
      document.querySelector('nav[role="navigation"]') || document.querySelector("nav");
    const candidates = Array.from(
      (nav || document).querySelectorAll("a, div[role=link], button")
    );
    const profileItem =
      candidates.find((item) => item.textContent?.trim() === "Profile") ||
      candidates.find((item) => item.getAttribute("aria-label") === "Profile") ||
      candidates.find((item) => {
        const label = item.getAttribute("aria-label") || "";
        return label.toLowerCase().includes("profile");
      }) ||
      candidates.find((item) => {
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

  private injectStyles() {
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

  private updatePreview(file: File) {
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

  private clearPreview() {
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

  private showSuccess() {
    this.modalRoot?.classList.add("isu-success-mode");
  }

  private hideSuccess() {
    this.modalRoot?.classList.remove("isu-success-mode");
  }
}
