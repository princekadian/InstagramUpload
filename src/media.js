(() => {
  'use strict';
  const SU = (globalThis.StoryUploader ||= {});

  const STORY_W = 1080;
  const STORY_H = 1920;
  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

  function kindOf(file) {
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    if (IMAGE_TYPES.includes(type) || /\.(jpe?g|png|webp)$/.test(name)) return 'image';
    if (VIDEO_TYPES.includes(type) || /\.(mp4|m4v|mov)$/.test(name)) return 'video';
    return null;
  }

  const isStoryAspect = (w, h) => Math.abs(w / h - 9 / 16) < 0.02;

  async function decodeImage(file) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      throw new Error("Couldn't read this image. If it's HEIC, convert it to JPG first.");
    }
  }

  // Small scratch canvas for the blurred backdrop on video frames: blurring a
  // 90×160 image and scaling it up is far cheaper than blurring 1080×1920
  // every frame, and looks the same.
  const backdrop = document.createElement('canvas');
  backdrop.width = 90;
  backdrop.height = 160;

  // Draws `src` (an image or a playing <video>) onto a 1080×1920 canvas. That
  // canvas is both the preview and the exact pixels that get uploaded.
  function renderStory(canvas, src, mode, focus, { fast = false } = {}) {
    if (canvas.width !== STORY_W) canvas.width = STORY_W;
    if (canvas.height !== STORY_H) canvas.height = STORY_H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const sw = src.videoWidth || src.width;
    const sh = src.videoHeight || src.height;
    const cover = Math.max(STORY_W / sw, STORY_H / sh);
    const contain = Math.min(STORY_W / sw, STORY_H / sh);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, STORY_W, STORY_H);

    if (mode === 'fill') {
      const dw = sw * cover;
      const dh = sh * cover;
      ctx.drawImage(src, (STORY_W - dw) * focus.x, (STORY_H - dh) * focus.y, dw, dh);
      return { overflowX: dw - STORY_W, overflowY: dh - STORY_H };
    }

    if (mode === 'blur' && fast) {
      const b = backdrop.getContext('2d');
      const s = Math.max(backdrop.width / sw, backdrop.height / sh) * 1.3;
      b.filter = 'blur(5px) brightness(0.6) saturate(1.2)';
      b.drawImage(src, (backdrop.width - sw * s) / 2, (backdrop.height - sh * s) / 2, sw * s, sh * s);
      ctx.drawImage(backdrop, 0, 0, STORY_W, STORY_H);
    } else if (mode === 'blur') {
      // Oversize the backdrop so the blur doesn't pull black in from the edges.
      const s = cover * 1.3;
      const bw = sw * s;
      const bh = sh * s;
      ctx.save();
      ctx.filter = 'blur(64px) brightness(0.6) saturate(1.2)';
      ctx.drawImage(src, (STORY_W - bw) / 2, (STORY_H - bh) / 2, bw, bh);
      ctx.restore();
    }

    const dw = sw * contain;
    const dh = sh * contain;
    ctx.drawImage(src, (STORY_W - dw) / 2, (STORY_H - dh) / 2, dw, dh);
    return { overflowX: 0, overflowY: 0 };
  }

  function canvasToJpeg(canvas, quality = 0.92) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))),
        'image/jpeg',
        quality
      );
    });
  }

  function probeVideo(video, url) {
    return new Promise((resolve, reject) => {
      const done = () => {
        video.removeEventListener('loadeddata', onData);
        video.removeEventListener('error', onError);
      };
      const onData = () => {
        done();
        if (!video.videoWidth || !video.videoHeight) {
          reject(new Error("This file doesn't contain a playable video track."));
          return;
        }
        resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
      };
      const onError = () => {
        done();
        reject(new Error("Your browser can't decode this video. Export it as an H.264 MP4 and try again."));
      };
      video.addEventListener('loadeddata', onData);
      video.addEventListener('error', onError);
      video.preload = 'auto';
      video.src = url;
      video.load();
    });
  }

  function seek(video, t) {
    return new Promise((resolve) => {
      if (Math.abs(video.currentTime - t) < 0.01 && video.readyState >= 2) {
        resolve();
        return;
      }
      video.addEventListener('seeked', () => resolve(), { once: true });
      video.currentTime = t;
    });
  }

  async function captureFrame(video, t) {
    await seek(video, t);
    // Full video resolution: Instagram matches the cover against the
    // dimensions declared for the video upload.
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    return canvasToJpeg(c, 0.85);
  }

  const RECORDER_TYPES = [
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1.4d0028,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
  ];

  function recorderType() {
    if (typeof MediaRecorder === 'undefined') return null;
    return RECORDER_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || null;
  }

  // Re-records a video onto a 9:16 frame (1080×1920) with the chosen framing,
  // the way the Instagram app does before uploading, so non-vertical videos
  // keep their shape instead of being stretched or cropped on phones.
  // Plays in real time, so it takes about as long as the video itself.
  // `audio` is an AudioContext created during the user's click (autoplay rules).
  async function composeVideo(file, { fit, focus, audio, onProgress }) {
    const mimeType = recorderType();
    if (!mimeType) {
      throw new Error("Your browser can't record MP4 video. Update Brave and try again.");
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.playsInline = true;
    video.preload = 'auto';
    const canvas = document.createElement('canvas');
    canvas.width = STORY_W;
    canvas.height = STORY_H;

    try {
      const meta = await probeVideo(video, url);

      // Cover frame, composed the same way as the video.
      await seek(video, Math.min(0.1, meta.duration / 2));
      renderStory(canvas, video, fit, focus, { fast: true });
      const cover = await canvasToJpeg(canvas, 0.85);
      await seek(video, 0);
      renderStory(canvas, video, fit, focus, { fast: true });

      // Route the soundtrack into the recording only, never to the speakers.
      const sink = audio.createMediaStreamDestination();
      audio.createMediaElementSource(video).connect(sink);
      const stream = new MediaStream([
        ...canvas.captureStream(30).getVideoTracks(),
        ...sink.stream.getAudioTracks(),
      ]);

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 128_000,
      });
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = (e) => reject(e.error || new Error('Recording failed.'));
      });

      let frameHandle = 0;
      const draw = () => {
        renderStory(canvas, video, fit, focus, { fast: true });
        onProgress(Math.min(1, video.currentTime / meta.duration));
        frameHandle = video.requestVideoFrameCallback(draw);
      };
      frameHandle = video.requestVideoFrameCallback(draw);

      const ended = new Promise((resolve, reject) => {
        video.onended = resolve;
        video.onerror = () => reject(new Error('The video stopped playing while it was being prepared.'));
      });

      recorder.start(1000);
      await video.play();
      await ended;
      video.cancelVideoFrameCallback(frameHandle);
      recorder.stop();
      await stopped;
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunks, { type: 'video/mp4' });
      return {
        file: blob,
        cover,
        meta: { width: STORY_W, height: STORY_H, durationMs: Math.round(meta.duration * 1000) },
      };
    } finally {
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    }
  }

  SU.media = {
    STORY_W,
    STORY_H,
    kindOf,
    isStoryAspect,
    decodeImage,
    renderStory,
    canvasToJpeg,
    probeVideo,
    captureFrame,
    composeVideo,
  };
})();
