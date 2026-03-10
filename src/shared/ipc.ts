export const IPC_CHANNELS = {
  trackerGetStatus: 'tracker.getStatus',
  trackerPause: 'tracker.pause',
  trackerResume: 'tracker.resume',
  trackerToggle: 'tracker.toggle',
  statsGetSummary: 'stats.getSummary',
  statsGetTopApps: 'stats.getTopApps',
  settingsGet: 'settings.get',
  settingsUpdate: 'settings.update'
} as const;
