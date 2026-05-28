import { Logger } from "../utils/logger";

export type UploadInitResponse = {
  uploadId: string;
  ruploadUrl: string;
  mediaId: string;
};

export type UploadStatus = {
  status: "ok" | "fail";
  message?: string;
  uploadId?: string;
  mediaId?: string;
};

export type PublishResponse = {
  status: "ok" | "fail";
  message?: string;
  mediaId?: string;
};

const logger = new Logger("api");

export class InstagramApi {
  constructor(private session: SessionContext, debug = false) {
    logger.setEnabled(debug);
  }

  static async fromPageContext(debug = false): Promise<InstagramApi> {
    const session = await SessionContext.fromWindow();
    return new InstagramApi(session, debug);
  }

  async initVideoUpload(file: File): Promise<UploadInitResponse> {
    const uploadId = `${Date.now()}`;
    const ruploadName = `story_${uploadId}_0_${file.size}`;
    const ruploadUrl = `https://i.instagram.com/rupload_igvideo/${ruploadName}`;
    const headers = this.session.buildHeaders({
      "X-Instagram-Rupload-Params": JSON.stringify({
        upload_id: uploadId,
        media_type: 2,
        for_album: false,
        media_upload_type: 1,
        image_compression: JSON.stringify({
          lib_name: "moz",
          lib_version: "3.1.m",
          quality: 80
        })
      }),
      "X-Entity-Name": ruploadName,
      "X-Entity-Length": String(file.size),
      "X-Entity-Type": file.type || "video/mp4",
      "Offset": "0"
    });

    logger.info("init upload", { uploadId, ruploadUrl });

    const initResponse = await fetch(ruploadUrl, {
      method: "POST",
      credentials: "include",
      headers
    });
    if (!initResponse.ok) {
      const text = await initResponse.text();
      logger.error("rupload init failed", { status: initResponse.status, text });
      throw new Error(`Rupload init failed: ${initResponse.status}`);
    }

    return { uploadId, ruploadUrl, mediaId: uploadId };
  }

  async uploadVideoChunk(
    ruploadUrl: string,
    file: File,
    onProgress: (progress: number) => void
  ) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", ruploadUrl, true);
      xhr.withCredentials = true;
      const headers = this.session.buildHeaders({
        "X-Entity-Type": file.type || "video/mp4",
        "Offset": "0"
      });
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });
  }

  async configureStory(uploadId: string): Promise<PublishResponse> {
    const url = "https://www.instagram.com/api/v1/media/configure_to_story/";
    const payload = new URLSearchParams({
      upload_id: uploadId,
      source_type: "4",
      configure_mode: "1",
      device: JSON.stringify({
        manufacturer: "Apple",
        model: "iPhone",
        android_version: 0,
        android_release: "iOS"
      })
    });
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: this.session.buildHeaders({
        "Content-Type": "application/x-www-form-urlencoded"
      }),
      body: payload
    });
    const data = (await response.json()) as PublishResponse;
    logger.info("configure response", data);
    return data;
  }
}

export class SessionContext {
  constructor(
    public csrfToken: string,
    public appId: string,
    public rolloutHash: string,
    public userId: string | null
  ) {}

  static async fromWindow(): Promise<SessionContext> {
    const shared = (window as unknown as { _sharedData?: any })._sharedData;
    const csrfToken = shared?.config?.csrf_token || getCookie("csrftoken") || "";
    const appId =
      shared?.config?.viewer?.app_id ||
      getMetaContent("instagram:app_id") ||
      "936619743392459";
    const rolloutHash = shared?.rollout_hash || "";
    const userId = shared?.config?.viewer?.id || null;
    return new SessionContext(csrfToken, appId, rolloutHash, userId);
  }

  buildHeaders(extra: Record<string, string> = {}) {
    return {
      "X-IG-App-ID": this.appId,
      "X-CSRFToken": this.csrfToken,
      "X-Requested-With": "XMLHttpRequest",
      "X-Instagram-AJAX": this.rolloutHash,
      ...extra
    };
  }
}

function getCookie(name: string) {
  const match = document.cookie.match(
    new RegExp(`(^|;\\s*)${name}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[2]) : null;
}

function getMetaContent(name: string) {
  return document.querySelector(`meta[property="${name}"]`)?.getAttribute("content");
}
