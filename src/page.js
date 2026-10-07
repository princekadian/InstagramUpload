// Runs in Instagram's own page context (manifest "world": "MAIN") so upload
// requests look exactly like the ones Instagram's front end makes.
(() => {
  'use strict';
  if (window.__storyUploaderPage) return;
  window.__storyUploaderPage = true;

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  function getCookie(name) {
    const m = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`));
    return m ? decodeURIComponent(m[2]) : null;
  }

  function getMetaContent(name) {
    const el = document.querySelector(`meta[property="${name}"]`);
    return el ? el.getAttribute('content') : null;
  }

  function initSession() {
    const shared = window._sharedData;
    const initial = window.__initialData;
    return {
      csrfToken: (shared && shared.config && shared.config.csrf_token) || getCookie('csrftoken') || '',
      appId:
        (shared && shared.config && shared.config.viewer && shared.config.viewer.app_id) ||
        getMetaContent('instagram:app_id') ||
        '936619743392459',
      rolloutHash: (shared && shared.rollout_hash) || (initial && initial.data && initial.data.rollout_hash) || '',
      claim: getCookie('ig_www_claim') || (initial && initial.data && initial.data.ig_www_claim) || '0',
      deviceId: getCookie('ig_did'),
    };
  }

  function buildHeaders(session, extra = {}) {
    const base = {
      'X-IG-App-ID': session.appId,
      'X-ASBD-ID': '129477',
      'X-CSRFToken': session.csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
      ...extra,
    };
    if (session.claim && session.claim !== '0') base['X-IG-WWW-Claim'] = session.claim;
    if (session.rolloutHash) base['X-Instagram-AJAX'] = session.rolloutHash;
    return { ...(session.deviceId ? { 'X-IG-Device-ID': session.deviceId } : {}), ...base };
  }

  function takeClaim(session, get) {
    const claim = get('x-ig-set-www-claim') || get('x-ig-www-claim');
    if (claim) session.claim = claim;
  }

  function rupload(session, url, name, blob, params, entityType, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.withCredentials = true;
      const headers = buildHeaders(session, {
        'X-Instagram-Rupload-Params': JSON.stringify(params),
        'X-Entity-Name': name,
        'X-Entity-Length': String(blob.size),
        'X-Entity-Type': entityType,
        Offset: '0',
        'Content-Type': 'application/octet-stream',
      });
      for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(e.loaded / e.total);
        };
      }
      xhr.onload = () => {
        takeClaim(session, (h) => xhr.getResponseHeader(h));
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(xhr.responseText ? `Upload failed: ${xhr.status} ${xhr.responseText}` : `Upload failed: ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection.'));
      xhr.send(blob);
    });
  }

  function uploadCover(session, uploadId, cover, meta) {
    const name = `story_${uploadId}_cover_${cover.size}`;
    return rupload(
      session,
      `https://www.instagram.com/rupload_igphoto/${name}`,
      name,
      cover,
      {
        upload_id: uploadId,
        media_type: 1,
        for_album: false,
        media_upload_type: 1,
        image_compression: JSON.stringify({ lib_name: 'moz', lib_version: '3.1.m', quality: 80 }),
        upload_media_height: meta.height,
        upload_media_width: meta.width,
      },
      'image/jpeg'
    );
  }

  async function safeJson(res) {
    const text = await res.text();
    if (text.trim().startsWith('<')) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { status: 'fail', message: res.ok ? 'Unexpected response' : text || `HTTP ${res.status}` };
    }
  }

  async function configureStory(session, uploadId, videoMeta, cover, report) {
    const maxAttempts = 6;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const res = await fetch('https://www.instagram.com/api/v1/media/configure_to_story/', {
        method: 'POST',
        credentials: 'include',
        headers: buildHeaders(session, { 'Content-Type': 'application/x-www-form-urlencoded' }),
        body: new URLSearchParams({
          upload_id: uploadId,
          source_type: '4',
          configure_mode: '1',
          story_media_creation: '1',
          client_shared_at: `${Math.floor(Date.now() / 1000)}`,
          timezone_offset: `${-new Date().getTimezoneOffset() * 60}`,
          camera_position: 'back',
          caption: '',
          poster_frame_index: '0',
          length: videoMeta ? `${Math.round(videoMeta.durationMs / 1000)}` : '0',
          device: JSON.stringify({ manufacturer: 'Apple', model: 'iPhone', android_version: 0, android_release: 'iOS' }),
        }),
      });
      takeClaim(session, (h) => res.headers.get(h));
      const data = await safeJson(res);
      if (!data) throw new Error('login_required');

      const message = String(data.message || '');
      if (message === 'media_needs_reupload' && cover) {
        await uploadCover(session, uploadId, cover, videoMeta);
        await delay(1200 + attempt * 500);
        continue;
      }
      if (data.status === 'ok' && message !== 'media_needs_reupload') return;
      if (message && !message.toLowerCase().includes('transcode')) throw new Error(message);

      report(0.92, 'Instagram is processing the video');
      await delay(1500 + attempt * 800);
    }
    throw new Error("Instagram didn't finish processing the video in time. Try again in a moment.");
  }

  async function uploadStory({ kind, file, cover, meta }, report) {
    const session = initSession();
    const uploadId = `${Date.now()}`;
    const name = `story_${uploadId}_0_${file.size}`;
    const videoMeta = kind === 'video' ? meta : null;
    const label = kind === 'video' ? 'Uploading video' : 'Uploading photo';

    report(0, label);
    await rupload(
      session,
      `https://www.instagram.com/rupload_igvideo/${name}`,
      name,
      file,
      {
        upload_id: uploadId,
        media_type: 2,
        for_album: false,
        media_upload_type: 1,
        image_compression: JSON.stringify({ lib_name: 'moz', lib_version: '3.1.m', quality: 80 }),
        upload_media_duration_ms: videoMeta ? videoMeta.durationMs : 0,
        upload_media_height: (videoMeta && videoMeta.height) || 1280,
        upload_media_width: (videoMeta && videoMeta.width) || 720,
      },
      file.type || 'video/mp4',
      (p) => report(p * 0.85, label)
    );

    if (videoMeta && cover) {
      report(0.87, 'Uploading cover frame');
      await uploadCover(session, uploadId, cover, videoMeta);
    }

    report(0.9, 'Publishing to your story');
    await configureStory(session, uploadId, videoMeta, cover, report);
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.type !== 'SU_UPLOAD') return;
    const { requestId } = event.data;
    const reply = (msg) => window.postMessage({ ...msg, requestId }, '*');
    uploadStory(event.data, (fraction, label) => reply({ type: 'SU_PROGRESS', fraction, label }))
      .then(() => reply({ type: 'SU_DONE' }))
      .catch((err) => reply({ type: 'SU_ERROR', message: (err && err.message) || 'Upload failed' }));
  });
})();
