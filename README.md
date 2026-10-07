# Story Uploader for Instagram

A Brave/Chrome extension that adds an **Upload story** button to instagram.com, so you can post photo and video stories from your desktop. A preview shows exactly what you'll post before you share.

## Install (Brave)

1. Open `brave://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select the folder you cloned or unzipped (the one containing `manifest.json`)
4. Open or refresh https://www.instagram.com while logged in

**Upload story** appears in Instagram's left sidebar under **Create**. If the sidebar isn't there (narrow window, or Instagram in a language other than English), a floating **Upload story** button appears in the bottom-right corner instead.

## Using it

- Drop a file onto the window, click to browse, or paste an image with Ctrl+V.
- **Photos** are rendered to 1080 × 1920. Pick a framing:
  - **Fill**: crops the photo to fill the screen. Drag the preview to change the crop, and double-click to re-center it.
  - **Blur**: shows the whole photo over a blurred copy of itself.
  - **Black**: shows the whole photo on a black background.
- **Videos** that are already 9:16 upload unchanged. Square or landscape videos are re-rendered onto a 9:16 frame (Fill, Blur or Black, same as photos) so they keep their shape on phones. This plays the video once in real time, so keep the tab in front. Keep videos to 60 seconds or less. Click the preview's speaker icon to hear the audio.
- The checks panel flags anything Instagram is likely to reject before you upload.

## Files

| File | Purpose |
| --- | --- |
| `src/ui.js` | Button, modal, story previewer |
| `src/styles.js` | All styling (lives in a Shadow DOM so Instagram's CSS can't leak in) |
| `src/media.js` | Image framing/rendering, video probing, cover-frame capture |
| `src/page.js` | Runs inside Instagram's page context and does the actual upload + publish requests |
| `src/instagram.js` | Bridge between the UI and `page.js`, plus friendly error messages |

## Caveats

This extension uses Instagram's private web endpoints, the same ones its mobile website uses. Instagram can change them without notice. If uploads start failing, the error message in the panel shows what Instagram returned. Photo stories are the most reliable. Video stories depend on Instagram's processing and may need a retry.
