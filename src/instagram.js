(() => {
  'use strict';
  const SU = (globalThis.StoryUploader ||= {});

  // The upload itself runs in src/page.js (Instagram's page context). This
  // side hands it the file over postMessage and relays progress back.

  function friendly(message) {
    const m = String(message || '');
    if (/login_required|^Upload failed: 40[13]\b/.test(m)) {
      return 'Your Instagram session expired. Refresh the page and log in again.';
    }
    if (/checkpoint_required|challenge_required/.test(m)) {
      return 'Instagram wants to verify your account. Open the Instagram app, confirm it was you, then retry.';
    }
    if (/feedback_required|^Upload failed: 429\b/.test(m)) {
      return 'Instagram is temporarily limiting uploads from this account. Wait a while before trying again.';
    }
    return m || 'Upload failed.';
  }

  function uploadStory(payload, onProgress) {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const onMessage = (event) => {
        const d = event.data;
        if (event.source !== window || !d || d.requestId !== requestId) return;
        if (d.type === 'SU_PROGRESS') onProgress(d.fraction, d.label);
        else if (d.type === 'SU_DONE') {
          window.removeEventListener('message', onMessage);
          resolve();
        } else if (d.type === 'SU_ERROR') {
          window.removeEventListener('message', onMessage);
          reject(new Error(friendly(d.message)));
        }
      };
      window.addEventListener('message', onMessage);
      window.postMessage({ type: 'SU_UPLOAD', requestId, ...payload }, '*');
    });
  }

  function cookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function currentUser() {
    try {
      const res = await fetch(`${location.origin}/api/v1/accounts/current_user/?edit=true`, {
        credentials: 'include',
        headers: {
          'X-CSRFToken': cookie('csrftoken') || '',
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const data = await res.json();
      if (!data || !data.user) return null;
      return { username: data.user.username, avatar: data.user.profile_pic_url };
    } catch {
      return null;
    }
  }

  SU.api = { uploadStory, currentUser };
})();
