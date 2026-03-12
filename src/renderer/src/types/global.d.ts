import type { ArkWatchApi } from '../../../shared/types';

declare global {
  interface Window {
    arkwatch: ArkWatchApi;
  }

  const __APP_VERSION__: string;
}

export {};
