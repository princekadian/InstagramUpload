(() => {
  'use strict';
  const SU = globalThis.StoryUploader;
  if (!SU || SU.mounted) return;
  SU.mounted = true;
  const { api, media } = SU;

  const svg = (body, extra = '') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

  const ICON = {
    plus: svg('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.4"'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    upload: svg('<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>'),
    play: svg('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>'),
    pause: svg('<path d="M8 5.5v13M16 5.5v13" stroke-width="2.6"/>'),
    sound: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
    muted: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>'),
    heart: svg('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>'),
    send: svg('<path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z"/>'),
    check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'stroke-width="2.6"'),
    bang: svg('<path d="M12 6v8M12 18.5v.01"/>', 'stroke-width="3"'),
    cross: svg('<path d="M7 7l10 10M17 7 7 17"/>', 'stroke-width="2.8"'),
    person: svg('<circle cx="12" cy="9" r="3.6"/><path d="M5 20.5a7 7 0 0 1 14 0"/>', 'style="width:16px;height:16px;opacity:.75"'),
    dash: svg('<path d="M7 12h10"/>', 'stroke-width="2.8"'),
  };

  const FIT_HINTS = {
    fill: 'Fills the whole screen. Drag the preview to choose what stays in frame.',
    blur: 'Keeps the original shape, centered over a soft, blurred copy of itself.',
    black: 'Keeps the original shape, centered on plain black.',
  };

  const TEMPLATE = `
<div class="root">
  <button class="launcher" data-action="open" hidden>
    <span class="launcher-ring">${ICON.plus}</span>
    <span>Upload story</span>
  </button>

  <div class="scrim" hidden>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="su-title" tabindex="-1">
      <header class="head">
        <h2 id="su-title">New story</h2>
        <span class="crumb" data-ref="crumb">Choose media</span>
        <span class="grow"></span>
        <button class="icon-btn" data-action="close" aria-label="Close">${ICON.close}</button>
      </header>

      <div class="body">
        <section class="stage is-empty" data-ref="stage">
          <div class="drop" data-ref="drop" data-action="pick">
            <div>
              <div class="drop-glyph">${ICON.upload}</div>
              <p class="drop-title">Drop a photo or video</p>
              <p class="drop-sub">or <button class="link" data-action="pick">browse your files</button> &middot; paste with Ctrl+V</p>
              <p class="drop-fine">JPG &middot; PNG &middot; WEBP &middot; MP4 &middot; MOV up to 60s</p>
              <p class="drop-error" data-ref="dropError" hidden></p>
            </div>
          </div>

          <div class="phone" data-ref="phone" hidden>
            <video class="media-video" data-ref="video" playsinline loop muted hidden></video>
            <canvas class="media-canvas" data-ref="canvas" hidden></canvas>
            <div class="shade top"></div>
            <div class="shade bottom"></div>
            <div class="hint-pill">Drag to reposition &middot; double-click to center</div>
            <div class="phone-top">
              <div class="bar" data-ref="bar"><span class="bar-fill" data-ref="barFill"></span></div>
              <div class="who">
                <span class="avatar" data-ref="avatar">${ICON.person}</span>
                <span class="name" data-ref="username">Your story</span>
                <span class="time">Just now</span>
                <span class="grow"></span>
                <button class="ghost" data-action="mute" data-ref="muteBtn" aria-label="Unmute" hidden>${ICON.muted}</button>
                <button class="ghost" data-action="play" data-ref="playBtn" aria-label="Pause" hidden>${ICON.pause}</button>
              </div>
            </div>
            <div class="phone-bottom">
              <div class="reply">Send message</div>
              ${ICON.heart}
              ${ICON.send}
            </div>
          </div>
        </section>

        <aside class="panel">
          <div class="panel-scroll" data-ref="intro">
            <p class="eyebrow">Before you share</p>
            <ol class="tips">
              <li><span class="n">01</span><div><b>What you see is what posts</b>The preview on the left is the exact frame your followers will get.</div></li>
              <li><span class="n">02</span><div><b>Photos become 1080 &times; 1920</b>Pick how they're framed: fill the screen, or fit them on a background.</div></li>
              <li><span class="n">03</span><div><b>Videos keep their shape</b>Square or landscape videos are placed on a 9:16 frame, so they're never stretched on phones.</div></li>
            </ol>
          </div>

          <div class="panel-scroll" data-ref="details" hidden>
            <div class="file-row">
              <span class="tag" data-ref="kindTag">Photo</span>
              <span class="file-name" data-ref="fileName"></span>
              <button class="link" data-action="pick" data-ref="replaceBtn">Replace</button>
            </div>
            <dl class="meta">
              <div><dt>Source</dt><dd data-ref="mRes"></dd></div>
              <div><dt>Aspect</dt><dd data-ref="mAspect"></dd></div>
              <div><dt>Duration</dt><dd data-ref="mDur"></dd></div>
              <div><dt>Size</dt><dd data-ref="mSize"></dd></div>
            </dl>
            <div class="field" data-ref="fitField">
              <p class="eyebrow">Framing</p>
              <div class="seg" role="group" aria-label="Framing">
                <button data-fit="fill" aria-pressed="false">Fill</button>
                <button data-fit="blur" aria-pressed="false">Blur</button>
                <button data-fit="black" aria-pressed="false">Black</button>
              </div>
              <p class="field-hint" data-ref="fitHint"></p>
            </div>
            <p class="eyebrow">Checks</p>
            <ul class="checks" data-ref="checks"></ul>
          </div>

          <div class="done" data-ref="done" hidden>
            <div class="done-mark">${ICON.check}</div>
            <h3>It's on your story</h3>
            <p>Your followers can see it now. It'll stay up for 24 hours.</p>
            <div class="actions">
              <a class="btn primary" data-ref="viewLink" href="https://www.instagram.com/">View your story</a>
              <button class="btn secondary" data-action="again">Share another</button>
            </div>
          </div>

          <div class="foot" data-ref="foot">
            <div class="status" data-ref="status" hidden>
              <div class="track"><span data-ref="statusFill"></span></div>
              <div class="status-row"><span data-ref="statusText"></span><span data-ref="statusPct"></span></div>
            </div>
            <div class="actions">
              <button class="btn secondary" data-action="close" data-ref="cancelBtn">Cancel</button>
              <button class="btn primary" data-action="share" data-ref="shareBtn" disabled>Share to story</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>

  <input type="file" data-ref="input" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,.mov,.m4v" hidden>
</div>`;

  // ── Mount ──────────────────────────────────────────────────────────────
  const host = document.createElement('div');
  host.id = 'story-uploader-host';
  const shadow = host.attachShadow({ mode: 'open' });
  const sheetCss = new CSSStyleSheet();
  sheetCss.replaceSync(SU.css);
  shadow.adoptedStyleSheets = [sheetCss];
  shadow.innerHTML = TEMPLATE;

  const ref = {};
  shadow.querySelectorAll('[data-ref]').forEach((el) => (ref[el.dataset.ref] = el));
  const launcher = shadow.querySelector('.launcher');
  const scrim = shadow.querySelector('.scrim');
  const sheet = shadow.querySelector('.sheet');
  const fitButtons = [...shadow.querySelectorAll('[data-fit]')];

  const state = {
    open: false,
    busy: false,
    kind: null,
    file: null,
    bitmap: null,
    meta: null,
    videoUrl: null,
    cover: null,
    coverUrl: null,
    fit: 'fill',
    focus: { x: 0.5, y: 0.5 },
    overflow: { overflowX: 0, overflowY: 0 },
    user: null,
    userRequested: false,
    raf: 0,
    prevOverflow: '',
  };

  // ── Formatting ─────────────────────────────────────────────────────────
  const RATIOS = [[9, 16], [3, 4], [4, 5], [2, 3], [1, 1], [4, 3], [3, 2], [16, 9]];

  function aspectLabel(w, h) {
    const r = w / h;
    for (const [a, b] of RATIOS) if (Math.abs(r - a / b) / (a / b) < 0.015) return `${a}:${b}`;
    return r < 1 ? `1:${(h / w).toFixed(2)}` : `${r.toFixed(2)}:1`;
  }

  function formatBytes(n) {
    if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
    return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  }

  function formatDuration(s) {
    const m = Math.floor(s / 60);
    const sec = s - m * 60;
    return `${m}:${sec.toFixed(1).padStart(4, '0')}`;
  }

  // ── Views ──────────────────────────────────────────────────────────────
  function setCrumb(text) {
    ref.crumb.textContent = text;
  }

  function openSheet() {
    if (state.open) return;
    state.open = true;
    scrim.hidden = false;
    launcher.classList.add('is-open');
    state.prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    sheet.focus();
    loadUser();
    if (state.kind === 'video') ref.video.play().catch(() => {});
  }

  function closeSheet() {
    if (state.busy) return;
    state.open = false;
    scrim.hidden = true;
    launcher.classList.remove('is-open');
    document.documentElement.style.overflow = state.prevOverflow;
    resetAll();
  }

  function resetAll() {
    clearMedia();
    ref.dropError.hidden = true;
    ref.done.hidden = true;
    ref.foot.hidden = false;
    ref.status.hidden = true;
    ref.status.classList.remove('error');
    ref.shareBtn.textContent = 'Share to story';
    showEmpty();
  }

  function showEmpty() {
    ref.stage.classList.add('is-empty');
    ref.drop.hidden = false;
    ref.phone.hidden = true;
    ref.intro.hidden = false;
    ref.details.hidden = true;
    ref.shareBtn.disabled = true;
    setCrumb('Choose media');
  }

  function showPreview() {
    ref.stage.classList.remove('is-empty');
    ref.drop.hidden = true;
    ref.phone.hidden = false;
    // Restart the entry animation on every new file.
    ref.phone.style.animation = 'none';
    void ref.phone.offsetWidth;
    ref.phone.style.animation = '';
    ref.intro.hidden = true;
    ref.details.hidden = false;
    setCrumb('Preview');
  }

  function clearMedia() {
    cancelAnimationFrame(state.raf);
    const v = ref.video;
    v.pause();
    v.removeAttribute('src');
    v.load();
    v.hidden = true;
    ref.canvas.hidden = true;
    ref.bar.classList.remove('timed');
    ref.barFill.style.width = '0';
    ref.muteBtn.hidden = true;
    ref.playBtn.hidden = true;
    ref.phone.classList.remove('can-drag', 'dragging');
    if (state.bitmap) state.bitmap.close();
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    if (state.coverUrl) URL.revokeObjectURL(state.coverUrl);
    Object.assign(state, {
      kind: null,
      file: null,
      bitmap: null,
      meta: null,
      videoUrl: null,
      cover: null,
      coverUrl: null,
    });
  }

  function showDropError(message) {
    showEmpty();
    ref.dropError.textContent = message;
    ref.dropError.hidden = false;
  }

  async function loadUser() {
    if (state.userRequested) return;
    state.userRequested = true;
    const user = await api.currentUser();
    if (!user) return;
    state.user = user;
    ref.username.textContent = user.username;
    ref.viewLink.href = `https://www.instagram.com/stories/${encodeURIComponent(user.username)}/`;
    const img = document.createElement('img');
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      ref.avatar.textContent = user.username.charAt(0).toUpperCase();
    };
    img.src = user.avatar;
    ref.avatar.replaceChildren(img);
  }

  // ── Loading files ──────────────────────────────────────────────────────
  async function loadFile(file) {
    if (!file || state.busy) return;
    const kind = media.kindOf(file);
    if (!kind) {
      if (!state.kind) showDropError("That file type isn't supported. Use JPG, PNG, WEBP, MP4 or MOV.");
      return;
    }
    clearMedia();
    ref.status.hidden = true;
    ref.status.classList.remove('error');
    ref.shareBtn.textContent = 'Share to story';
    ref.dropError.hidden = true;
    state.kind = kind;
    state.file = file;
    state.focus = { x: 0.5, y: 0.5 };
    setCrumb('Loading…');

    try {
      if (kind === 'image') {
        const bitmap = await media.decodeImage(file);
        state.bitmap = bitmap;
        state.meta = { width: bitmap.width, height: bitmap.height };
        state.fit = media.isStoryAspect(bitmap.width, bitmap.height) ? 'fill' : 'blur';
        ref.canvas.hidden = false;
        ref.bar.classList.add('timed');
        renderFrame();
      } else {
        const v = ref.video;
        state.videoUrl = URL.createObjectURL(file);
        state.meta = await media.probeVideo(v, state.videoUrl);
        state.cover = await media.captureFrame(v, Math.min(0.1, state.meta.duration / 2));
        state.coverUrl = URL.createObjectURL(state.cover);
        state.fit = media.isStoryAspect(state.meta.width, state.meta.height) ? 'fill' : 'blur';
        // The <video> sits under the canvas as the frame source; the canvas
        // shows each frame composed exactly as it will be uploaded.
        v.hidden = false;
        ref.canvas.hidden = false;
        v.muted = true;
        v.currentTime = 0;
        ref.muteBtn.hidden = false;
        ref.playBtn.hidden = false;
        syncVideoButtons();
        v.play().catch(() => {});
        tickVideo();
      }
    } catch (err) {
      clearMedia();
      showDropError(err.message);
      return;
    }

    showPreview();
    renderDetails();
  }

  function renderFrame() {
    const isVideo = state.kind === 'video';
    state.overflow = media.renderStory(ref.canvas, isVideo ? ref.video : state.bitmap, state.fit, state.focus, { fast: isVideo });
    const draggable = state.fit === 'fill' && (state.overflow.overflowX > 1 || state.overflow.overflowY > 1);
    ref.phone.classList.toggle('can-drag', draggable && !state.busy);
  }

  function tickVideo() {
    const v = ref.video;
    if (v.duration) ref.barFill.style.width = `${(v.currentTime / v.duration) * 100}%`;
    if (v.readyState >= 2) renderFrame();
    state.raf = requestAnimationFrame(tickVideo);
  }

  function syncVideoButtons() {
    const v = ref.video;
    ref.muteBtn.innerHTML = v.muted ? ICON.muted : ICON.sound;
    ref.muteBtn.setAttribute('aria-label', v.muted ? 'Unmute' : 'Mute');
    ref.playBtn.innerHTML = v.paused ? ICON.play : ICON.pause;
    ref.playBtn.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
  }

  // ── Details panel ──────────────────────────────────────────────────────
  function assess() {
    const { kind, meta, file, fit } = state;
    const out = [];
    if (kind === 'image') {
      out.push({ level: 'ok', title: 'Rendered at 1080 × 1920', sub: 'The preview is the exact image that gets posted.' });
      if (Math.min(meta.width, meta.height) < 720) {
        out.push({ level: 'warn', title: 'Low-resolution source', sub: 'It may look soft on newer phones.' });
      }
      if (fit === 'fill' && !media.isStoryAspect(meta.width, meta.height)) {
        out.push({ level: 'info', title: 'Cropped to fill the screen', sub: 'Drag the preview to choose the crop.' });
      }
      return out;
    }

    const isMov = /quicktime/.test(file.type) || /\.mov$/i.test(file.name);
    const vertical = media.isStoryAspect(meta.width, meta.height);
    if (vertical) {
      out.push({ level: 'ok', title: 'Vertical 9:16', sub: 'Uploads as-is and fills the screen edge to edge.' });
      if (isMov) {
        out.push({ level: 'warn', title: 'MOV container', sub: 'Usually fine. If Instagram fails to process it, export as H.264 MP4.' });
      }
    } else if (fit === 'fill') {
      out.push({ level: 'info', title: 'Cropped to fill the screen', sub: 'Drag the preview to choose the crop.' });
    } else {
      out.push({ level: 'ok', title: `Keeps its ${aspectLabel(meta.width, meta.height)} shape`, sub: "Placed on a 9:16 frame, so it won't be stretched or cropped on phones." });
    }
    if (!vertical) {
      out.push({ level: 'info', title: 'Prepared before upload', sub: `Rendering takes about ${Math.ceil(meta.duration)}s. Keep this tab in front while it runs.` });
    }
    if (meta.duration > 60.05) {
      out.push({ level: 'warn', title: `Longer than 60 seconds (${formatDuration(meta.duration)})`, sub: 'Instagram may cut it short or reject it. Trimming to 60s is safest.' });
    } else if (meta.duration < 1) {
      out.push({ level: 'bad', title: 'Too short', sub: 'Videos need to be at least one second long.' });
    } else {
      out.push({ level: 'ok', title: 'Length is within 60 seconds', sub: `Plays for ${formatDuration(meta.duration)}.` });
    }
    if (Math.min(meta.width, meta.height) < 540) {
      out.push({ level: 'warn', title: 'Low resolution', sub: 'It may look soft on newer phones.' });
    }
    if (file.size > 100 * 1024 * 1024) {
      out.push({ level: 'warn', title: 'Large file', sub: 'Uploading will take a while on slower connections.' });
    }
    return out;
  }

  const DOT = { ok: ICON.check, warn: ICON.bang, bad: ICON.cross, info: ICON.dash };

  function renderDetails() {
    const { kind, meta, file } = state;
    ref.kindTag.textContent = kind === 'image' ? 'Photo' : 'Video';
    ref.fileName.textContent = file.name || (kind === 'image' ? 'Pasted image' : 'Video');
    ref.fileName.title = file.name || '';
    ref.mRes.textContent = `${meta.width} × ${meta.height}`;
    ref.mAspect.textContent = aspectLabel(meta.width, meta.height);
    ref.mDur.textContent = kind === 'image' ? '5.0s' : formatDuration(meta.duration);
    ref.mSize.textContent = formatBytes(file.size);

    ref.fitField.hidden = kind === 'video' && media.isStoryAspect(meta.width, meta.height);
    fitButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fit === state.fit)));
    ref.fitHint.textContent = FIT_HINTS[state.fit];

    const checks = assess();
    ref.checks.replaceChildren(
      ...checks.map((c) => {
        const li = document.createElement('li');
        li.className = c.level;
        li.innerHTML = `<span class="dot">${DOT[c.level]}</span><div><b></b><span></span></div>`;
        li.querySelector('b').textContent = c.title;
        li.querySelector('div span').textContent = c.sub;
        return li;
      })
    );
    ref.shareBtn.disabled = state.busy || checks.some((c) => c.level === 'bad');
  }

  // ── Sharing ────────────────────────────────────────────────────────────
  function setBusy(busy) {
    state.busy = busy;
    shadow.querySelectorAll('[data-action="close"], [data-action="pick"], [data-fit]').forEach((b) => (b.disabled = busy));
    ref.shareBtn.disabled = busy;
    if (state.kind) renderFrame();
  }

  function setStatus(fraction, label) {
    ref.status.hidden = false;
    ref.status.classList.remove('error');
    const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
    ref.statusFill.style.width = `${pct}%`;
    ref.statusText.textContent = label;
    ref.statusPct.textContent = `${pct}%`;
  }

  async function share() {
    if (state.busy || !state.kind) return;
    setBusy(true);
    setCrumb('Sharing');
    try {
      if (state.kind === 'image') {
        setStatus(0, 'Preparing photo');
        const jpeg = await media.canvasToJpeg(ref.canvas, 0.92);
        await api.uploadStory({ kind: 'image', file: jpeg }, setStatus);
      } else if (media.isStoryAspect(state.meta.width, state.meta.height)) {
        const { width, height, duration } = state.meta;
        await api.uploadStory(
          {
            kind: 'video',
            file: state.file,
            cover: state.cover,
            meta: { width, height, durationMs: Math.round(duration * 1000) },
          },
          setStatus
        );
      } else {
        // Created before any await so it counts as part of the click.
        const audio = new AudioContext();
        ref.video.pause();
        try {
          const label = 'Placing video on a 9:16 frame';
          setStatus(0, label);
          const composed = await media.composeVideo(state.file, {
            fit: state.fit,
            focus: { ...state.focus },
            audio,
            onProgress: (p) => setStatus(p * 0.45, label),
          });
          await api.uploadStory({ kind: 'video', ...composed }, (p, l) => setStatus(0.45 + p * 0.55, l));
        } finally {
          audio.close();
        }
      }
      setStatus(1, 'Done');
      setBusy(false);
      showDone();
    } catch (err) {
      setBusy(false);
      ref.status.hidden = false;
      ref.status.classList.add('error');
      ref.statusText.textContent = err.message || 'Something went wrong.';
      ref.statusPct.textContent = '';
      ref.shareBtn.textContent = 'Try again';
      setCrumb('Preview');
      renderDetails();
    }
  }

  function showDone() {
    ref.video.pause();
    ref.details.hidden = true;
    ref.foot.hidden = true;
    ref.done.hidden = false;
    setCrumb('Shared');
  }

  // ── Events ─────────────────────────────────────────────────────────────
  shadow.addEventListener('click', (e) => {
    const fitBtn = e.target.closest('[data-fit]');
    if (fitBtn && !state.busy) {
      state.fit = fitBtn.dataset.fit;
      state.focus = { x: 0.5, y: 0.5 };
      renderFrame();
      renderDetails();
      return;
    }
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const action = el.dataset.action;
    if (action === 'open') openSheet();
    else if (action === 'close') closeSheet();
    else if (action === 'pick') {
      e.stopPropagation();
      ref.input.click();
    } else if (action === 'share') share();
    else if (action === 'again') resetAll();
    else if (action === 'mute') {
      ref.video.muted = !ref.video.muted;
      syncVideoButtons();
    } else if (action === 'play') {
      if (ref.video.paused) ref.video.play().catch(() => {});
      else ref.video.pause();
    }
  });

  ref.video.addEventListener('play', syncVideoButtons);
  ref.video.addEventListener('pause', syncVideoButtons);

  ref.input.addEventListener('change', () => {
    const file = ref.input.files && ref.input.files[0];
    ref.input.value = '';
    loadFile(file);
  });

  scrim.addEventListener('mousedown', (e) => {
    if (e.target === scrim) closeSheet();
  });

  let dragDepth = 0;
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  sheet.addEventListener('dragenter', (e) => {
    if (!hasFiles(e) || state.busy) return;
    dragDepth++;
    sheet.classList.add('is-dragover');
  });
  sheet.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) sheet.classList.remove('is-dragover');
  });
  sheet.addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  sheet.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    sheet.classList.remove('is-dragover');
    loadFile(e.dataTransfer.files[0]);
  });

  window.addEventListener('paste', (e) => {
    if (!state.open || state.busy) return;
    const file = e.clipboardData && e.clipboardData.files[0];
    if (file) {
      e.preventDefault();
      loadFile(file);
    }
  });

  window.addEventListener(
    'keydown',
    (e) => {
      if (!state.open) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeSheet();
      }
    },
    true
  );

  // Drag-to-reposition for "Fill" photos.
  let drag = null;
  let renderQueued = false;
  const clamp01 = (n) => Math.min(1, Math.max(0, n));

  ref.canvas.addEventListener('pointerdown', (e) => {
    if (!ref.phone.classList.contains('can-drag')) return;
    ref.canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, fx: state.focus.x, fy: state.focus.y };
    ref.phone.classList.add('dragging');
  });
  ref.canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const scale = media.STORY_W / ref.canvas.clientWidth;
    const { overflowX, overflowY } = state.overflow;
    if (overflowX > 1) state.focus.x = clamp01(drag.fx - ((e.clientX - drag.x) * scale) / overflowX);
    if (overflowY > 1) state.focus.y = clamp01(drag.fy - ((e.clientY - drag.y) * scale) / overflowY);
    if (!renderQueued) {
      renderQueued = true;
      requestAnimationFrame(() => {
        renderQueued = false;
        renderFrame();
      });
    }
  });
  const endDrag = () => {
    drag = null;
    ref.phone.classList.remove('dragging');
  };
  ref.canvas.addEventListener('pointerup', endDrag);
  ref.canvas.addEventListener('pointercancel', endDrag);
  ref.canvas.addEventListener('dblclick', () => {
    if (!ref.phone.classList.contains('can-drag')) return;
    state.focus = { x: 0.5, y: 0.5 };
    renderFrame();
  });

  // ── "Upload story" entry in Instagram's sidebar ────────────────────────
  // Clones Instagram's own "Create" item so the button matches the native
  // nav in both light and dark mode. Falls back to the floating launcher.
  function buildNavIcon(original) {
    const NS = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(NS, 'svg');
    for (const attr of ['class', 'width', 'height']) {
      if (original.hasAttribute(attr)) icon.setAttribute(attr, original.getAttribute(attr));
    }
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '2');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('aria-label', 'Upload story');
    icon.setAttribute('role', 'img');
    const ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('cx', '12');
    ring.setAttribute('cy', '12');
    ring.setAttribute('r', '10');
    ring.setAttribute('stroke-dasharray', '4.2 2.3');
    const plus = document.createElementNS(NS, 'path');
    plus.setAttribute('d', 'M12 8v8M8 12h8');
    icon.append(ring, plus);
    return icon;
  }

  function injectNavItem() {
    const existing = document.querySelector('[data-story-uploader-nav]');
    if (existing && existing.isConnected) return true;

    const createIcon = document.querySelector('svg[aria-label="New post"]');
    if (!createIcon) return false;
    const item = createIcon.closest('a, [role="link"], [role="button"]');
    if (!item) return false;

    let wrapper = item;
    for (let i = 0; i < 4 && wrapper.parentElement && wrapper.parentElement.childElementCount === 1; i++) {
      wrapper = wrapper.parentElement;
    }

    const clone = wrapper.cloneNode(true);
    clone.setAttribute('data-story-uploader-nav', '');
    clone.querySelectorAll('[href]').forEach((n) => n.removeAttribute('href'));
    clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    clone.querySelectorAll('[aria-describedby], [aria-expanded], [aria-haspopup]').forEach((n) => {
      n.removeAttribute('aria-describedby');
      n.removeAttribute('aria-expanded');
      n.removeAttribute('aria-haspopup');
    });

    const oldIcon = clone.querySelector('svg[aria-label="New post"]');
    if (oldIcon) oldIcon.replaceWith(buildNavIcon(oldIcon));

    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeValue.trim()) {
        node.nodeValue = 'Upload story';
        break;
      }
    }

    const target = clone.matches('a, [role="link"], [role="button"]')
      ? clone
      : clone.querySelector('a, [role="link"], [role="button"]') || clone;
    target.setAttribute('role', 'button');
    target.setAttribute('tabindex', '0');
    target.setAttribute('aria-label', 'Upload story');
    target.style.cursor = 'pointer';

    const activate = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSheet();
    };
    clone.addEventListener('click', activate, true);
    clone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') activate(e);
    });

    wrapper.after(clone);
    return true;
  }

  function ensureMounted() {
    if (!host.isConnected) (document.body || document.documentElement).appendChild(host);
    let inNav = false;
    try {
      inNav = injectNavItem();
    } catch {}
    launcher.hidden = inNav;
  }

  ensureMounted();
  setInterval(ensureMounted, 1500);
})();
