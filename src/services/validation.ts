export type ValidationResult = {
  ok: boolean;
  error?: string;
};

const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_DURATION_SECONDS = 60;

export async function validateMedia(file: File): Promise<ValidationResult> {
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

function getVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
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
