type PageUploadOptions = {
  onProgress: (progress: number) => void;
  onStatus: (status: string) => void;
};

type BridgeMessage = {
  type: "ISU_UPLOAD";
  requestId: string;
  file: File;
};

type BridgeResponse =
  | { type: "ISU_PROGRESS"; requestId: string; progress: number }
  | { type: "ISU_STATUS"; requestId: string; status: string }
  | { type: "ISU_DONE"; requestId: string }
  | { type: "ISU_ERROR"; requestId: string; message: string };

export function uploadStoryViaPage(
  file: File,
  options: PageUploadOptions,
  debug = false
) {
  return new Promise<void>((resolve, reject) => {
    const requestId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const handleMessage = (event: MessageEvent<BridgeResponse>) => {
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
    window.addEventListener("message", handleMessage as EventListener);
    const message: BridgeMessage = {
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
