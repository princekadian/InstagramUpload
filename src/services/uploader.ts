import { validateMedia } from "./validation";
import { addUpload, updateUpload } from "./queue";
import { uploadStoryViaPage } from "../content/bridge";

export type UploadCallbacks = {
  onProgress: (progress: number) => void;
  onStatus: (status: string) => void;
};

export async function uploadStory(
  file: File,
  callbacks: UploadCallbacks,
  debug = false
) {
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
