# Instagram Upload
Upload Instagram stories from desktop browsers using your existing session. Works on Chrome/Brave/Chromium with Manifest V3.

## Download and Install

1. Download the repository as a ZIP from GitHub and extract it.
2. Open your browser extensions page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted folder (this folder contains `manifest.json`).

## How to Use

1. Log in to Instagram.
2. Open `https://www.instagram.com/`.
3. Click the **Upload Story** floating button.
4. Drop a photo/video or use the file picker.
5. Watch progress and confirm success.

## Features

- Upload photo or video stories from desktop.
- Drag & drop or file picker.
- Upload queue and progress tracking.
- Mobile-mode toggle to unlock hidden web upload flows.
- Debug logging and developer diagnostics.
- Privacy-first: no passwords, no external servers, no tracking.

## Technical Details

Feature | Implementation
--- | ---
Manifest Version | V3
Upload Method | Instagram Web `rupload` + configure_to_story
Content Scripts | Injected UI + page bridge for headers/tokens
Queue | In-memory queue with progress events
Validation | Type/size/duration checks before upload
SPA Handling | MutationObserver + URL watching

## Privacy & Permissions

Permission | Why
--- | ---
activeTab | Inject the uploader UI on the current Instagram tab
scripting | Inject page bridge logic for headers/tokens
storage | Save user preferences (debug, mobile mode)
tabs | Detect Instagram tab changes
Host access | `https://www.instagram.com/*` and `https://i.instagram.com/*`

No data is collected, stored externally, or transmitted to third parties.

## Disclaimer

This extension is for personal use only. Respect creators' rights and Instagram's terms. This project is not affiliated with, authorized by, or endorsed by Instagram or Meta Platforms, Inc.

## License

MIT License. See `LICENSE`.

## Copyright

Copyright (c) 2026 Prince Kadian. All rights reserved.
