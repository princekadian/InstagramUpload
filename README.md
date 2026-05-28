# Instagram Upload
Upload Instagram stories from desktop browsers using your existing session. Works on Chrome/Brave/Chromium with Manifest V3.

## Features

- Upload photo or video stories from desktop.
- Drag & drop or file picker.
- Upload queue and progress tracking.
- Mobile-mode toggle to unlock hidden web upload flows.
- Debug logging and developer diagnostics.
- Privacy-first: no passwords, no external servers, no tracking.

## Installation

### Option A: Download ZIP (Use Prebuilt `dist/`)

1. Click **Code** -> **Download ZIP** on GitHub.
2. Extract the ZIP.
3. Load the extension from the `dist/` folder (see steps below).

### Option B: Clone with Git (Build Locally)

```bash
git clone https://github.com/princekadian/InstagramUpload.git
cd InstagramUpload
npm install
npm run build
```

Then load the extension from the `dist/` folder.

### Load Unpacked (Chrome/Brave)

1. Go to `brave://extensions` or `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `dist/` folder.

## How to Use

1. Log in to Instagram.
2. Open `https://www.instagram.com/`.
3. Click the **Upload Story** floating button.
4. Drop a photo/video or use the file picker.
5. Watch progress and confirm success.

## Architecture

```
/instagram-upload
├── public/
│   ├── manifest.json
│   ├── popup/
│   ├── styles/
│   └── assets/
├── scripts/
├── src/
│   ├── background/
│   ├── content/
│   ├── injected/
│   ├── services/
│   └── utils/
├── package.json
└── tsconfig.json
```

Built output lives in `dist/`.

## How It Works

- Reads session cookies (`csrftoken`, `sessionid`) inside the Instagram tab.
- Initializes an upload session via Instagram Web endpoints.
- Streams the media file to the `rupload` endpoint.
- Sends a configure request (`/api/v1/media/configure_to_story/`) to publish.

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

## Rate Limit & Safety

- Keep uploads human-like (avoid bulk spam).
- If rate limited, wait and retry after 15-30 minutes.

## Debugging

- Enable **Debug logs** in the popup.
- Use DevTools -> Network, filter by `rupload` or `configure_to_story`.
- Check for `login_required` or `checkpoint_required` responses.

## Known Limitations

- Instagram may change endpoints without notice.
- Some sessions require extra checkpoints or 2FA.
- Large videos may be rejected.

## Contributing

1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m "Add amazing feature"`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## Disclaimer

This extension is for personal use only. Respect creators' rights and Instagram's terms. This project is not affiliated with, authorized by, or endorsed by Instagram or Meta Platforms, Inc.

## Icons

Source icon: `public/assets/icon.svg`.

Generate PNGs with:

```bash
npm run icons
```

## License

MIT License. See `LICENSE`.

## Copyright

Copyright (c) 2026 Prince Kadian. All rights reserved.
