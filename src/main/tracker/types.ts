export type ActiveApp = {
  appName: string;
  exePath: string | null;
};

export interface ActivitySource {
  getActiveApp: () => Promise<ActiveApp | null>;
  getIdleSeconds: (idleThresholdSeconds?: number) => number;
  onSuspend: (cb: () => void) => void;
  onResume: (cb: () => void) => void;
}

