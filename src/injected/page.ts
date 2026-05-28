const MOBILE_VIEWPORT = { width: 414, height: 896 };
const originalUserAgent = navigator.userAgent;
const originalPlatform = navigator.platform;
const ORIGINAL_VIEWPORT =
  document.querySelector("meta[name=viewport]")?.getAttribute("content") || "";

function overrideUserAgent(enabled: boolean) {
  if (!("__defineGetter__" in Navigator.prototype)) {
    return;
  }
  if (enabled) {
    Navigator.prototype.__defineGetter__("userAgent", () =>
      originalUserAgent.replace("Windows", "iPhone")
    );
    Navigator.prototype.__defineGetter__("platform", () => "iPhone");
  } else {
    Navigator.prototype.__defineGetter__("userAgent", () => originalUserAgent);
    Navigator.prototype.__defineGetter__("platform", () => originalPlatform);
  }
}

function applyViewport(enabled: boolean) {
  const existing = document.getElementById("isu-viewport");
  if (enabled) {
    let meta = existing as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.id = "isu-viewport";
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.content = `width=${MOBILE_VIEWPORT.width}, height=${MOBILE_VIEWPORT.height}, initial-scale=1`;
  } else {
    if (existing) {
      existing.remove();
    }
    if (ORIGINAL_VIEWPORT) {
      const meta = document.querySelector("meta[name=viewport]") as HTMLMetaElement | null;
      if (meta) {
        meta.content = ORIGINAL_VIEWPORT;
      }
    }
  }
}

type SessionState = {
  csrfToken: string;
  appId: string;
  rolloutHash: string;
  userId: string | null;
  claim: string;
  deviceId: string | null;
};

async function initSession(): Promise<SessionState> {
  const shared = (window as unknown as { _sharedData?: any })._sharedData;
  const initialData = (window as unknown as { __initialData?: any }).__initialData;
  const csrfToken = shared?.config?.csrf_token || getCookie("csrftoken") || "";
  const appId =
    shared?.config?.viewer?.app_id ||
    getMetaContent("instagram:app_id") ||
    "936619743392459";
  const rolloutHash =
    shared?.rollout_hash || initialData?.data?.rollout_hash || "";
  const userId = shared?.config?.viewer?.id || null;
  const claim =
    getCookie("ig_www_claim") || initialData?.data?.ig_www_claim || "0";
  const deviceId = getCookie("ig_did");
  const mid = getCookie("mid");
  return { csrfToken, appId, rolloutHash, userId, claim, deviceId };
}

function buildHeaders(session: SessionState, extra: Record<string, string> = {}) {
  const base: Record<string, string> = {
    "X-IG-App-ID": session.appId,
    "X-ASBD-ID": "129477",
    "X-CSRFToken": session.csrfToken,
    "X-Requested-With": "XMLHttpRequest",
    ...extra
  };
  if (session.claim && session.claim !== "0") {
    base["X-IG-WWW-Claim"] = session.claim;
  }
  if (session.rolloutHash) {
    base["X-Instagram-AJAX"] = session.rolloutHash;
  }
  return {
    ...(session.deviceId ? { "X-IG-Device-ID": session.deviceId } : {}),
    ...base
  };
}

type VideoMeta = {
  durationMs: number;
  width: number;
  height: number;
  coverBlob: Blob | null;
};

async function getVideoMetadata(file: File): Promise<VideoMeta> {
  return new Promise<VideoMeta>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      const durationMs = Math.round(video.duration * 1000);
      const width = video.videoWidth || 720;
      const height = video.videoHeight || 1280;
      video.currentTime = Math.min(0.1, video.duration / 2);
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(video.src);
          resolve({ durationMs, width, height, coverBlob: null });
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(video.src);
            resolve({ durationMs, width, height, coverBlob: blob });
          },
          "image/jpeg",
          0.85
        );
      };
    };
    video.onerror = () => reject(new Error("Unable to read video."));
    video.src = URL.createObjectURL(file);
  });
}

function updateClaimFromHeaders(session: SessionState, headers: Headers | null) {
  if (!headers) {
    return;
  }
  const claim = headers.get("x-ig-set-www-claim") || headers.get("x-ig-www-claim");
  if (claim) {
    session.claim = claim;
  }
}

async function uploadViaPage(file: File, requestId: string) {
  const session = await initSession();
  const uploadId = `${Date.now()}`;
  const ruploadName = `story_${uploadId}_0_${file.size}`;
  const ruploadUrl = `https://www.instagram.com/rupload_igvideo/${ruploadName}`;
  const videoMeta = file.type.startsWith("video/")
    ? await getVideoMetadata(file)
    : null;
  const durationMs = videoMeta ? videoMeta.durationMs : 0;
  const ruploadParams = {
    upload_id: uploadId,
    media_type: 2,
    for_album: false,
    media_upload_type: 1,
    image_compression: JSON.stringify({
      lib_name: "moz",
      lib_version: "3.1.m",
      quality: 80
    }),
    upload_media_duration_ms: durationMs,
    upload_media_height: videoMeta?.height || 1280,
    upload_media_width: videoMeta?.width || 720
  };

  window.postMessage({ type: "ISU_STATUS", requestId, status: "Uploading media" }, "*");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ruploadUrl, true);
    xhr.withCredentials = true;
    const headers = buildHeaders(session, {
      "X-Instagram-Rupload-Params": JSON.stringify(ruploadParams),
      "X-Entity-Name": ruploadName,
      "X-Entity-Length": String(file.size),
      "X-Entity-Type": file.type || "video/mp4",
      "Offset": "0",
      "Content-Type": "application/octet-stream"
    });
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        window.postMessage(
          { type: "ISU_PROGRESS", requestId, progress },
          "*"
        );
      }
    };
    xhr.onload = () => {
      const claimHeader =
        xhr.getResponseHeader("x-ig-set-www-claim") ||
        xhr.getResponseHeader("x-ig-www-claim");
      if (claimHeader) {
        session.claim = claimHeader;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        const detail = xhr.responseText || "";
        reject(
          new Error(
            detail
              ? `Upload failed: ${xhr.status} ${detail}`
              : `Upload failed: ${xhr.status}`
          )
        );
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(file);
  });

  if (videoMeta?.coverBlob) {
    window.postMessage(
      { type: "ISU_STATUS", requestId, status: "Uploading cover" },
      "*"
    );
    await uploadCoverPhoto(session, uploadId, videoMeta.coverBlob, videoMeta);
  }

  window.postMessage({ type: "ISU_STATUS", requestId, status: "Processing video" }, "*");
  await configureStory(session, uploadId, requestId, videoMeta);
}

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }
  if (event.data?.type === "ISU_MOBILE_MODE") {
    const enabled = Boolean(event.data.enabled);
    overrideUserAgent(enabled);
    applyViewport(enabled);
  }
  if (event.data?.type === "ISU_UPLOAD") {
    const requestId = event.data.requestId as string;
    const file = event.data.file as File;
    uploadViaPage(file, requestId)
      .then(() => {
        window.postMessage({ type: "ISU_DONE", requestId }, "*");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Upload failed";
        window.postMessage(
          { type: "ISU_ERROR", requestId, message },
          "*"
        );
      });
  }
});

function getCookie(name: string) {
  const match = document.cookie.match(
    new RegExp(`(^|;\\s*)${name}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[2]) : null;
}

function getMetaContent(name: string) {
  return document.querySelector(`meta[property="${name}"]`)?.getAttribute("content");
}

async function configureStory(
  session: SessionState,
  uploadId: string,
  requestId: string,
  videoMeta?: VideoMeta | null
) {
  const maxAttempts = 6;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const configureResponse = await fetch(
      "https://www.instagram.com/api/v1/media/configure_to_story/",
      {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(session, {
          "Content-Type": "application/x-www-form-urlencoded"
        }),
        body: new URLSearchParams({
          upload_id: uploadId,
          source_type: "4",
          configure_mode: "1",
          story_media_creation: "1",
          client_shared_at: `${Math.floor(Date.now() / 1000)}`,
          timezone_offset: `${-new Date().getTimezoneOffset() * 60}`,
          camera_position: "back",
          caption: "",
          poster_frame_index: "0",
          length: videoMeta ? `${Math.round(videoMeta.durationMs / 1000)}` : "0",
          device: JSON.stringify({
            manufacturer: "Apple",
            model: "iPhone",
            android_version: 0,
            android_release: "iOS"
          })
        })
      }
    );
    updateClaimFromHeaders(session, configureResponse.headers);
    const configureData = await safeJson(configureResponse);
    if (!configureData) {
      throw new Error("Session expired or blocked. Please re-login.");
    }
    const message = String(configureData.message || "");
    if (message === "media_needs_reupload" && videoMeta?.coverBlob) {
      await uploadCoverPhoto(session, uploadId, videoMeta.coverBlob, videoMeta);
      await delay(1200 + attempt * 500);
      continue;
    }
    if (configureData.status === "ok" && message !== "media_needs_reupload") {
      const mediaId =
        configureData.media?.id ||
        configureData.media?.pk ||
        configureData.media_id ||
        null;
      if (mediaId) {
        window.postMessage(
          {
            type: "ISU_STATUS",
            requestId,
            status: `Published story ${mediaId}`
          },
          "*"
        );
      }
      return;
    }
    if (message && !message.toLowerCase().includes("transcode")) {
      throw new Error(message);
    }
    window.postMessage(
      { type: "ISU_STATUS", requestId, status: message },
      "*"
    );
    await delay(1500 + attempt * 800);
  }
  throw new Error("Transcode not finished yet.");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadCoverPhoto(
  session: SessionState,
  uploadId: string,
  coverBlob: Blob,
  meta: { width: number; height: number }
) {
  const name = `story_${uploadId}_cover_${coverBlob.size}`;
  const url = `https://www.instagram.com/rupload_igphoto/${name}`;
  const ruploadParams = {
    upload_id: uploadId,
    media_type: 1,
    for_album: false,
    media_upload_type: 1,
    image_compression: JSON.stringify({
      lib_name: "moz",
      lib_version: "3.1.m",
      quality: 80
    }),
    upload_media_height: meta.height,
    upload_media_width: meta.width
  };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    const headers = buildHeaders(session, {
      "X-Instagram-Rupload-Params": JSON.stringify(ruploadParams),
      "X-Entity-Name": name,
      "X-Entity-Length": String(coverBlob.size),
      "X-Entity-Type": "image/jpeg",
      "Offset": "0",
      "Content-Type": "application/octet-stream"
    });
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    xhr.onload = () => {
      const claimHeader =
        xhr.getResponseHeader("x-ig-set-www-claim") ||
        xhr.getResponseHeader("x-ig-www-claim");
      if (claimHeader) {
        session.claim = claimHeader;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Cover upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Cover upload network error"));
    xhr.send(coverBlob);
  });
}

async function safeJson(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const text = await response.text();
    if (text.trim().startsWith("<")) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return { status: "fail", message: text || `HTTP ${response.status}` };
    }
  }
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (text.trim().startsWith("<")) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return { status: "fail", message: "Unexpected response" };
    }
  }
  return response.json();
}

function parseHeaders(raw: string) {
  const result: Record<string, string> = {};
  raw.trim()
    .split(/\r?\n/)
    .forEach((line) => {
      const parts = line.split(": ");
      const key = parts.shift();
      if (!key) {
        return;
      }
      result[key.toLowerCase()] = parts.join(": ");
    });
  return result;
}
