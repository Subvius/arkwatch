import { contextBridge, ipcRenderer } from 'electron';
import type { ArkWatchApi, AppSettings, DateRange } from '../shared/types';
import { IPC_CHANNELS } from '../shared/ipc';

const api: ArkWatchApi = {
  tracker: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.trackerGetStatus),
    pause: () => ipcRenderer.invoke(IPC_CHANNELS.trackerPause),
    resume: () => ipcRenderer.invoke(IPC_CHANNELS.trackerResume),
    toggle: () => ipcRenderer.invoke(IPC_CHANNELS.trackerToggle)
  },
  stats: {
    getSummary: (range: DateRange) => ipcRenderer.invoke(IPC_CHANNELS.statsGetSummary, range),
    getTopApps: (params: DateRange & { limit: number }) => ipcRenderer.invoke(IPC_CHANNELS.statsGetTopApps, params)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    update: (settings: Partial<AppSettings>) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, settings)
  },
  processes: {
    getAITools: () => ipcRenderer.invoke(IPC_CHANNELS.processesGetAITools)
  },
  window: {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.windowMinimize),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.windowMaximize),
    close: () => ipcRenderer.send(IPC_CHANNELS.windowClose)
  }
};

contextBridge.exposeInMainWorld('arkwatch', api);
