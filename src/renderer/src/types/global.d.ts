import type { EffectBridgeApi } from '../../../shared/effect/channels';
import type { ArkWatchApi } from '../../../shared/types';

declare global {
  interface Window {
    arkwatch: ArkWatchApi;
    effectBridge: EffectBridgeApi;
  }

  const __APP_VERSION__: string;
}

export {};
