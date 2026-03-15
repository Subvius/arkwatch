import { ipcRenderer } from 'electron';
import { isEffectChannel, type EffectBridgeApi } from '../shared/effect';

export const effectBridgeApi: EffectBridgeApi = {
  invoke: (channel, payload) => {
    if (typeof channel !== 'string' || !isEffectChannel(channel)) {
      return Promise.reject(new Error(`Invalid effect IPC channel: ${String(channel)}`));
    }

    return ipcRenderer.invoke(channel, payload);
  }
};
