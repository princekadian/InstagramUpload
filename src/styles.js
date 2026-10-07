(() => {
  'use strict';
  const SU = (globalThis.StoryUploader ||= {});

  SU.css = String.raw`
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }

.root {
  --bg: #0e0e0f;
  --surface: #151517;
  --raised: #1f1f22;
  --line: rgba(255, 255, 255, 0.07);
  --line-strong: rgba(255, 255, 255, 0.14);
  --text: #f3f1ec;
  --muted: #8f8c86;
  --faint: #5f5d59;
  --accent: #ff5c35;
  --ok: #8fd19e;
  --warn: #f0c060;
  --bad: #ff7a6b;
  --sans: "Segoe UI Variable Text", "SF Pro Text", -apple-system, system-ui, "Helvetica Neue", sans-serif;
  --display: "Segoe UI Variable Display", "SF Pro Display", -apple-system, system-ui, sans-serif;
  --mono: ui-monospace, "Cascadia Mono", "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  font-family: var(--sans);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  font-size: 14px;
  line-height: 1.45;
}

button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
svg { display: block; }

/* ── Floating launcher (used only when the sidebar slot isn't available) ── */
.launcher {
  position: fixed;
  right: 24px;
  bottom: 92px;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 18px 0 7px;
  border-radius: 999px;
  background: #121213;
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 32px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  font: 600 14px/1 var(--sans);
  letter-spacing: -0.005em;
  transition: transform 0.25s var(--ease), background 0.2s;
}
.launcher.is-open { opacity: 0; pointer-events: none; }
.launcher:hover { transform: translateY(-2px); background: #1a1a1c; }
.launcher:active { transform: translateY(0); }
.launcher-ring {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  display: grid;
  place-items: center;
}
.launcher-ring svg { width: 15px; height: 15px; }

/* ── Modal ── */
.scrim {
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(6, 6, 7, 0.74);
  backdrop-filter: blur(8px);
  animation: su-fade 0.2s ease-out;
}
.sheet {
  position: relative;
  width: min(980px, 100%);
  height: min(700px, calc(100vh - 32px));
  display: grid;
  grid-template-rows: auto 1fr;
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 40px 120px -30px rgba(0, 0, 0, 0.8);
  animation: su-rise 0.32s var(--ease);
}
.sheet:focus { outline: none; }

.head {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 12px 0 22px;
  border-bottom: 1px solid var(--line);
}
.head h2 {
  margin: 0;
  font: 600 15px/1 var(--display);
  letter-spacing: -0.01em;
}
.crumb { color: var(--muted); font-size: 13px; display: flex; align-items: center; gap: 12px; }
.crumb::before { content: ""; width: 3px; height: 3px; border-radius: 50%; background: var(--faint); }
.head .grow { flex: 1; }
.icon-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--muted);
  transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: var(--raised); color: var(--text); }
.icon-btn svg { width: 18px; height: 18px; }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.body {
  display: grid;
  grid-template-columns: 1fr 340px;
  min-height: 0;
}

/* ── Stage ── */
.stage {
  position: relative;
  display: grid;
  place-items: center;
  padding: 28px;
  min-height: 0;
  background-color: #0a0a0b;
  background-image: radial-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: 18px 18px;
}
.sheet.is-dragover .stage::after {
  content: "Drop to replace";
  position: absolute;
  inset: 14px;
  display: grid;
  place-items: center;
  border: 1.5px dashed var(--accent);
  border-radius: 14px;
  background: rgba(10, 10, 11, 0.82);
  font: 600 15px var(--display);
}
.sheet.is-dragover .stage.is-empty::after { display: none; }

.drop {
  width: 100%;
  height: 100%;
  max-height: 600px;
  display: grid;
  place-items: center;
  border: 1.5px dashed var(--line-strong);
  border-radius: 16px;
  text-align: center;
  transition: border-color 0.2s, background 0.2s;
  cursor: pointer;
}
.drop:hover { border-color: rgba(255, 255, 255, 0.24); }
.sheet.is-dragover .drop { border-color: var(--accent); background: rgba(255, 92, 53, 0.04); }
.drop-glyph {
  width: 56px;
  height: 56px;
  margin: 0 auto 20px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  background: var(--raised);
  border: 1px solid var(--line-strong);
}
.drop-glyph svg { width: 22px; height: 22px; }
.drop-title { margin: 0 0 6px; font: 600 18px/1.2 var(--display); letter-spacing: -0.015em; }
.drop-sub { margin: 0; color: var(--muted); }
.drop-fine {
  margin: 22px 0 0;
  font: 500 11px/1 var(--mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--faint);
}
.drop-error { margin: 18px auto 0; max-width: 340px; color: var(--bad); font-size: 13px; }
.link {
  color: var(--text);
  text-decoration: underline;
  text-decoration-color: var(--faint);
  text-underline-offset: 3px;
  transition: text-decoration-color 0.15s;
}
.link:hover { text-decoration-color: var(--text); }

/* ── Phone preview ── */
.phone {
  position: relative;
  height: 100%;
  max-height: 600px;
  aspect-ratio: 9 / 16;
  border-radius: 22px;
  overflow: hidden;
  background: #000;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.09), 0 34px 70px -24px rgba(0, 0, 0, 0.9);
  user-select: none;
  animation: su-pop 0.35s var(--ease);
}
.media-canvas, .media-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.media-video { object-fit: cover; }
.phone.can-drag .media-canvas { cursor: grab; }
.phone.dragging .media-canvas { cursor: grabbing; }

.shade { position: absolute; left: 0; right: 0; pointer-events: none; }
.shade.top { top: 0; height: 110px; background: linear-gradient(rgba(0, 0, 0, 0.5), transparent); }
.shade.bottom { bottom: 0; height: 120px; background: linear-gradient(transparent, rgba(0, 0, 0, 0.5)); }

.phone-top { position: absolute; top: 0; left: 0; right: 0; padding: 9px 10px 0; pointer-events: none; }
.bar { height: 2px; border-radius: 2px; background: rgba(255, 255, 255, 0.35); overflow: hidden; }
.bar-fill { display: block; height: 100%; width: 0; background: #fff; }
.bar.timed .bar-fill { animation: su-fill 5s linear infinite; }
.who { display: flex; align-items: center; gap: 8px; margin-top: 10px; color: #fff; }
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  overflow: hidden;
  background: #3a3a3d;
  display: grid;
  place-items: center;
  font: 600 13px var(--sans);
  flex: none;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.who .name { font-weight: 600; font-size: 13.5px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); }
.who .time { font-size: 13.5px; color: rgba(255, 255, 255, 0.72); }
.who .grow { flex: 1; }
.ghost {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  color: #fff;
  border-radius: 50%;
  pointer-events: auto;
  transition: background 0.15s;
}
.ghost:hover { background: rgba(255, 255, 255, 0.14); }
.ghost svg { width: 19px; height: 19px; }

.phone-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
  color: #fff;
  pointer-events: none;
}
.reply {
  flex: 1;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.92);
}
.phone-bottom svg { width: 23px; height: 23px; }

.hint-pill {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(6px);
  color: #fff;
  font: 500 12px/1 var(--sans);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
}
.phone.can-drag:hover .hint-pill { opacity: 1; }
.phone.dragging .hint-pill { opacity: 0; }

/* ── Panel ── */
.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--surface);
  border-left: 1px solid var(--line);
}
.panel-scroll { flex: 1; overflow-y: auto; padding: 22px; scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent; }
.eyebrow {
  margin: 0 0 14px;
  font: 500 11px/1 var(--mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.tips { list-style: none; margin: 0; padding: 0; display: grid; gap: 18px; }
.tips li { display: grid; grid-template-columns: 26px 1fr; gap: 6px; color: var(--muted); }
.tips b { display: block; color: var(--text); font-weight: 600; margin-bottom: 2px; }
.tips .n { font: 500 12px/1.6 var(--mono); color: var(--accent); }

.file-row { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.tag {
  flex: none;
  padding: 4px 6px;
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  font: 600 10px/1 var(--mono);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--muted);
}
.file-name { flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-row .link { flex: none; font-size: 13px; color: var(--muted); }
.file-row .link:hover { color: var(--text); }

.meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 0 0 24px;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}
.meta div { padding: 12px 14px; }
.meta div:nth-child(odd) { border-right: 1px solid var(--line); }
.meta div:nth-child(-n + 2) { border-bottom: 1px solid var(--line); }
.meta dt {
  margin: 0 0 5px;
  font: 500 10.5px/1 var(--mono);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--faint);
}
.meta dd { margin: 0; font: 500 13.5px/1.2 var(--mono); color: var(--text); white-space: nowrap; }

.field { margin-bottom: 24px; }
.seg {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  padding: 3px;
  border-radius: 11px;
  background: var(--bg);
  border: 1px solid var(--line);
}
.seg button {
  height: 32px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  transition: background 0.15s, color 0.15s;
}
.seg button:hover { color: var(--text); }
.seg button[aria-pressed="true"] { background: var(--raised); color: var(--text); box-shadow: inset 0 0 0 1px var(--line-strong); }
.seg button:disabled { cursor: not-allowed; }
.field-hint { margin: 10px 0 0; font-size: 12.5px; color: var(--muted); }

.checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.checks li { display: grid; grid-template-columns: 18px 1fr; gap: 10px; align-items: start; }
.dot {
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 1.5px solid currentColor;
}
.dot svg { width: 10px; height: 10px; }
.checks .ok .dot { color: var(--ok); }
.checks .warn .dot { color: var(--warn); }
.checks .bad .dot { color: var(--bad); }
.checks .info .dot { color: var(--muted); }
.checks b { display: block; font-weight: 600; font-size: 13.5px; }
.checks span { display: block; color: var(--muted); font-size: 12.5px; }

.foot { padding: 16px 22px 20px; border-top: 1px solid var(--line); }
.status { margin-bottom: 14px; }
.status .track { height: 3px; border-radius: 3px; background: var(--line-strong); overflow: hidden; }
.status .track span { display: block; height: 100%; width: 0; background: var(--accent); transition: width 0.25s var(--ease); }
.status-row { display: flex; justify-content: space-between; gap: 12px; margin-top: 9px; font: 500 12px/1.4 var(--mono); color: var(--muted); }
.status.error .status-row { color: var(--bad); font-family: var(--sans); font-size: 12.5px; }
.status.error .track { display: none; }
.status.error .status-row { margin-top: 0; }

.actions { display: flex; gap: 10px; }
.btn {
  flex: 1;
  height: 42px;
  border-radius: 11px;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: -0.005em;
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
}
.btn:active:not(:disabled) { transform: scale(0.985); }
.btn.primary { flex: 1.6; background: var(--text); color: #121212; }
.btn.primary:hover:not(:disabled) { background: #fff; }
.btn.secondary { border: 1px solid var(--line-strong); color: var(--text); }
.btn.secondary:hover:not(:disabled) { background: var(--raised); }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
a.btn { display: grid; place-items: center; text-decoration: none; }

/* ── Done ── */
.done { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 28px; animation: su-fade 0.3s ease-out; }
.done-mark {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  color: var(--accent);
  display: grid;
  place-items: center;
  margin-bottom: 22px;
}
.done-mark svg { width: 22px; height: 22px; }
.done h3 { margin: 0 0 8px; font: 600 22px/1.2 var(--display); letter-spacing: -0.02em; }
.done p { margin: 0 0 28px; color: var(--muted); }
.done .actions { flex-direction: column; }
.done .btn { flex: none; }

@keyframes su-fade { from { opacity: 0; } }
@keyframes su-rise { from { opacity: 0; transform: translateY(10px) scale(0.985); } }
@keyframes su-pop { from { opacity: 0; transform: scale(0.97); } }
@keyframes su-fill { from { width: 0; } to { width: 100%; } }

@media (max-width: 760px) {
  .scrim { padding: 0; }
  .sheet { height: 100vh; border-radius: 0; border: 0; }
  .body { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr) auto; }
  .stage { padding: 16px; }
  .panel { border-left: 0; border-top: 1px solid var(--line); max-height: 46vh; }
  .launcher { right: 16px; bottom: 76px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;
})();
