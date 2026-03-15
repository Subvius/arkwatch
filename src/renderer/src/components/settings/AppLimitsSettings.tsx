import * as React from 'react';
import { Plus, Trash2, Minus } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { AppLimit, TopAppStat } from '../../../../shared/types';
import { formatDuration } from '../../lib/utils';
import { getAppIconCacheKey } from '../../lib/app-icon';
import { AppIcon } from '../AppIcon';

type AppLimitsSettingsProps = {
  limits: AppLimit[];
  onUpsert: (limit: Omit<AppLimit, 'id' | 'createdAt'>) => void;
  onRemove: (id: number) => void;
};

const STEP_SECONDS = 15 * 60; // 15-min increments

const isMissingLocalInstall = (app: TopAppStat, installStates: Record<string, boolean>): boolean => {
  const exePath = app.exePath?.trim();
  if (!exePath) {
    return false;
  }

  const normalizedPath = exePath.replace(/\//g, '\\').toLowerCase();
  if (!normalizedPath.includes('\\appdata\\local\\programs\\')) {
    return false;
  }

  return installStates[getAppIconCacheKey(app.appName, app.exePath)] === false;
};

export const AppLimitsSettings = ({ limits, onUpsert, onRemove }: AppLimitsSettingsProps): React.JSX.Element => {
  const [adding, setAdding] = React.useState(false);
  const [availableApps, setAvailableApps] = React.useState<TopAppStat[]>([]);
  const [selectedApp, setSelectedApp] = React.useState<TopAppStat | undefined>(undefined);
  const [limitSeconds, setLimitSeconds] = React.useState(STEP_SECONDS * 4); // 60 min default
  const [nativeIcons, setNativeIcons] = React.useState<Record<string, string>>({});
  const [installStates, setInstallStates] = React.useState<Record<string, boolean>>({});
  const [pickerIconsLoaded, setPickerIconsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!adding) {
      setSelectedApp(undefined);
      setPickerIconsLoaded(false);
      setInstallStates({});
      return;
    }

    let cancelled = false;
    const load = async (): Promise<void> => {
      setSelectedApp(undefined);
      setPickerIconsLoaded(false);
      setInstallStates({});
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const apps = await window.arkwatch.stats.getTopApps({ from, to, limit: 50 });
      if (cancelled) {
        return;
      }

      setAvailableApps(apps);

      const icons: Record<string, string> = {};
      const nextInstallStates: Record<string, boolean> = {};
      for (const app of apps) {
        if (cancelled) {
          break;
        }

        try {
          const cacheKey = getAppIconCacheKey(app.appName, app.exePath);
          const isInstalled = await window.arkwatch.icons.getAppInstallState({ appName: app.appName, exePath: app.exePath });
          if (cancelled) {
            break;
          }

          nextInstallStates[cacheKey] = isInstalled;

          const icon = await window.arkwatch.icons.getAppIcon({ appName: app.appName, exePath: app.exePath });
          if (cancelled) {
            break;
          }

          if (icon) {
            icons[cacheKey] = icon;
          }
        } catch {
          if (cancelled) {
            break;
          }

          // ignore
        }
      }

      if (cancelled) {
        return;
      }

      setInstallStates(nextInstallStates);
      setNativeIcons((prev) => ({ ...prev, ...icons }));
      setPickerIconsLoaded(true);
    };

    void load().catch(() => {
      if (!cancelled) {
        setAvailableApps([]);
        setSelectedApp(undefined);
        setInstallStates({});
        setPickerIconsLoaded(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [adding]);

  React.useEffect(() => {
    let cancelled = false;

    const loadLimitIcons = async (): Promise<void> => {
      const icons: Record<string, string> = {};
      for (const limit of limits) {
        if (cancelled) {
          break;
        }

        try {
          const icon = await window.arkwatch.icons.getAppIcon({ appName: limit.appName, exePath: limit.exePath });
          if (cancelled) {
            break;
          }

          if (icon) {
            icons[getAppIconCacheKey(limit.appName, limit.exePath)] = icon;
          }
        } catch {
          if (cancelled) {
            break;
          }

          // ignore
        }
      }

      if (cancelled) {
        return;
      }

      setNativeIcons((prev) => ({ ...prev, ...icons }));
    };

    if (limits.length > 0) {
      void loadLimitIcons();
    }

    return () => {
      cancelled = true;
    };
  }, [limits]);

  const filteredApps = availableApps.filter((app) => !limits.some((l) => l.appName === app.appName) && !isMissingLocalInstall(app, installStates));

  const handleAdd = (): void => {
    const nextApp = selectedApp ? filteredApps.find((app) => app.appName === selectedApp.appName) : undefined;
    if (!nextApp) {
      setSelectedApp(undefined);
      return;
    }

    onUpsert({
      appName: nextApp.appName,
      exePath: nextApp.exePath,
      dailyLimitSeconds: limitSeconds,
      enabled: true
    });
    setAdding(false);
    setSelectedApp(undefined);
    setPickerIconsLoaded(false);
    setLimitSeconds(STEP_SECONDS * 4);
  };

  return (
    <div className="space-y-3">
      {limits.length === 0 && !adding && (
        <p className="py-4 text-center text-sm text-[hsl(var(--muted))]">No app limits configured.</p>
      )}

      {limits.map((limit) => (
        <div key={limit.id} className="flex items-center justify-between rounded-md border px-3 py-2">
          <div className="flex items-center gap-2">
            <AppIcon
              appName={limit.appName}
              exePath={limit.exePath}
              nativeIconSrc={nativeIcons[getAppIconCacheKey(limit.appName, limit.exePath)] ?? null}
              size="md"
            />
            <span className="text-sm font-medium">{limit.appName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-[hsl(var(--muted))]">{formatDuration(limit.dailyLimitSeconds)}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(limit.id)}>
              <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--muted))]" />
            </Button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="space-y-3 rounded-md border p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted))]">App</label>
            <Select
              value={selectedApp?.appName ?? ''}
              onValueChange={(value) => {
                const app = filteredApps.find((a) => a.appName === value);
                setSelectedApp(app);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an app..." />
              </SelectTrigger>
              <SelectContent>
                {filteredApps.map((app) => (
                  <SelectItem key={app.appName} value={app.appName}>
                    <span className="flex items-center gap-2">
                      <AppIcon
                        appName={app.appName}
                        exePath={app.exePath}
                        nativeIconSrc={nativeIcons[getAppIconCacheKey(app.appName, app.exePath)] ?? null}
                        size="sm"
                      />
                      {app.appName}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted))]">Daily Limit</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={limitSeconds <= STEP_SECONDS}
                onClick={() => setLimitSeconds((s) => Math.max(STEP_SECONDS, s - STEP_SECONDS))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="min-w-[4rem] text-center text-sm font-medium tabular-nums">{formatDuration(limitSeconds)}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setLimitSeconds((s) => s + STEP_SECONDS)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" disabled={!selectedApp} onClick={handleAdd}>Add Limit</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setSelectedApp(undefined); setPickerIconsLoaded(false); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Limit
        </Button>
      )}
    </div>
  );
};

