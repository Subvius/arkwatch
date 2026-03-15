export const getAppIconCacheKey = (appName: string, exePath: string | null): string => `${appName}::${exePath ?? ''}`;

