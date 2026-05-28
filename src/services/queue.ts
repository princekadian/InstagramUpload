export type UploadState =
  | "pending"
  | "validating"
  | "uploading"
  | "processing"
  | "success"
  | "error";

export type UploadItem = {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  state: UploadState;
  progress: number;
  error?: string;
  createdAt: number;
};

const queue = new Map<string, UploadItem>();

export function addUpload(item: UploadItem) {
  queue.set(item.id, item);
}

export function updateUpload(id: string, updates: Partial<UploadItem>) {
  const existing = queue.get(id);
  if (!existing) {
    return;
  }
  queue.set(id, { ...existing, ...updates });
}

export function removeUpload(id: string) {
  queue.delete(id);
}

export function listUploads() {
  return Array.from(queue.values()).sort((a, b) => a.createdAt - b.createdAt);
}

export function getUpload(id: string) {
  return queue.get(id);
}

export function getQueueSize() {
  return queue.size;
}
