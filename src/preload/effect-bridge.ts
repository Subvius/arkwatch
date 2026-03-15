import { ipcRenderer } from 'electron';
import type { EffectBridgeApi } from '../shared/effect';

export const effectBridgeApi: EffectBridgeApi = {
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload)
};
