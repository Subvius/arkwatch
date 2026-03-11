const BROWSER_NAMES = [
  'chrome', 'google chrome', 'firefox', 'mozilla firefox',
  'microsoft edge', 'edge', 'brave', 'brave browser', 'opera',
  'safari', 'vivaldi', 'arc', 'chromium', 'zen browser'
];

export const isBrowserApp = (appName: string | null): boolean => {
  if (!appName) return false;
  const lower = appName.toLowerCase();
  return BROWSER_NAMES.some(name => lower.includes(name));
};
