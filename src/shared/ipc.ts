export const IPC_CHANNELS = {
  trackerGetStatus: 'tracker.getStatus',
  trackerPause: 'tracker.pause',
  trackerResume: 'tracker.resume',
  trackerToggle: 'tracker.toggle',
  statsGetSummary: 'stats.getSummary',
  statsGetTopApps: 'stats.getTopApps',
  statsGetAIToolDailyStats: 'stats.getAIToolDailyStats',
  settingsGet: 'settings.get',
  settingsUpdate: 'settings.update',
  processesGetAITools: 'processes.getAITools',
  iconsGetAppIcon: 'icons.getAppIcon',
  windowMinimize: 'window.minimize',
  windowMaximize: 'window.maximize',
  windowClose: 'window.close',
  windowRestoredFromTray: 'window.restoredFromTray'
} as const;
