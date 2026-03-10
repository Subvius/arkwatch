export const IPC_CHANNELS = {
  trackerGetStatus: 'tracker.getStatus',
  trackerPause: 'tracker.pause',
  trackerResume: 'tracker.resume',
  trackerToggle: 'tracker.toggle',
  statsGetSummary: 'stats.getSummary',
  statsGetTopApps: 'stats.getTopApps',
  settingsGet: 'settings.get',
  settingsUpdate: 'settings.update',
  processesGetAITools: 'processes.getAITools',
  windowMinimize: 'window.minimize',
  windowMaximize: 'window.maximize',
  windowClose: 'window.close'
} as const;
