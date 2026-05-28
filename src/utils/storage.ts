export type Settings = {
  mobileMode: boolean;
  debugMode: boolean;
};

export const defaultSettings: Settings = {
  mobileMode: false,
  debugMode: false
};

export async function getSettings(): Promise<Settings> {
  const values = await chrome.storage.local.get(Object.keys(defaultSettings));
  return {
    mobileMode: Boolean(values.mobileMode ?? defaultSettings.mobileMode),
    debugMode: Boolean(values.debugMode ?? defaultSettings.debugMode)
  };
}

export async function updateSettings(settings: Partial<Settings>) {
  await chrome.storage.local.set(settings);
}
