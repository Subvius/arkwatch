import type { ActiveApp } from '../tracker/types';

const UNKNOWN_APP_NAME = 'unknown';
const IGNORED_APP_NAMES = new Set([
  'lockapp.exe',
  'application frame host',
  'windows shell experience host',
  'windows start experience host',
  'searchhost.exe'
]);
const IGNORED_EXE_SUFFIXES = [
  'lockapp.exe',
  'applicationframehost.exe',
  'shellexperiencehost.exe',
  'startmenuexperiencehost.exe',
  'searchhost.exe'
];

const normalize = (value: string | null | undefined): string => value?.trim().toLowerCase() ?? '';

const hasEmptyPath = (exePath: string | null): boolean => normalize(exePath) === '';
const endsWithIgnoredExe = (normalizedPath: string): boolean =>
  IGNORED_EXE_SUFFIXES.some((suffix) => normalizedPath.endsWith(`\\${suffix}`) || normalizedPath.endsWith(`/${suffix}`));

export const isIgnoredAppRecord = (appName: string, exePath: string | null): boolean => {
  const normalizedName = normalize(appName);
  const normalizedPath = normalize(exePath);

  if (normalizedName === UNKNOWN_APP_NAME && hasEmptyPath(exePath)) {
    return true;
  }

  if (IGNORED_APP_NAMES.has(normalizedName)) {
    return true;
  }

  return endsWithIgnoredExe(normalizedPath);
};

export const isTrackableForegroundApp = (app: ActiveApp | null): app is ActiveApp => {
  if (!app) {
    return false;
  }

  return !isIgnoredAppRecord(app.appName, app.exePath);
};

export const buildIgnoredAppsSql = (tableAlias?: string): string => {
  const col = (name: string): string => (tableAlias ? `${tableAlias}.${name}` : name);
  const appName = `LOWER(TRIM(COALESCE(${col('app_name')}, '')))`;
  const exePath = `LOWER(TRIM(COALESCE(${col('exe_path')}, '')))`;
  const ignoredNames = Array.from(IGNORED_APP_NAMES).map((name) => `'${name}'`).join(', ');
  const ignoredPathChecks = IGNORED_EXE_SUFFIXES
    .map((suffix) => `${exePath} LIKE '%\\${suffix}' OR ${exePath} LIKE '%/${suffix}'`)
    .join(' OR ');

  return `NOT ((${appName} = '${UNKNOWN_APP_NAME}' AND TRIM(COALESCE(${col('exe_path')}, '')) = '') OR ${appName} IN (${ignoredNames}) OR ${ignoredPathChecks})`;
};
