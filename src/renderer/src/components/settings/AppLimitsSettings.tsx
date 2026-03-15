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

const isMissingLocalInstall = (app: TopAppStat, nativeIcons: Record<string, string>, iconsLoaded: boolean): boolean => {
  if (!iconsLoaded) {
    return false;
  }

  const exePath = app.exePath?.trim();
  if (!exePath) {
    return false;
  }

  const iconKey = getAppIconCacheKey(app.appName, app.exePath);
  if (nativeIcons[iconKey]) {
    return false;
  }

  const normalizedPath = exePath.replace(/\//g, '\\').toLowerCase();
  return normalizedPath.includes('\\appdata\\local\\programs\\');
};

export const AppLimitsSettings = ({ limits, onUpsert, onRemove }: AppLimitsSettingsProps): React.JSX.Element => {
  const [adding, setAdding] = React.useState(false);
  const [availableApps, setAvailableApps] = React.useState<TopAppStat[]>([]);
  const [selectedApp, setSelectedApp] = React.useState<TopAppStat | null>(null);
  const [limitSeconds, setLimitSeconds] = React.useState(STEP_SECONDS * 4); // 60 min default
  const [nativeIcons, setNativeIcons] = React.useState<Record<string, string>>({});
  const [pickerIconsLoaded, setPickerIconsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!adding) {
      setPickerIconsLoaded(false);
      return;
    }

    let cancelled = false;
    const load = async (): Promise<void> => {
      setPickerIconsLoaded(false);
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const apps = await window.arkwatch.stats.getTopApps({ from, to, limit: 50 });
      if (cancelled) {
        return;
      }

      setAvailableApps(apps);

      const icons: Record<string, string> = {};
      for (const app of apps) {
        try {
          const icon = await window.arkwatch.icons.getAppIcon({ appName: app.appName, exePath: app.exePath });
          if (icon) {
            icons[getAppIconCacheKey(app.appName, app.exePath)] = icon;
          }
        } catch {
          // ignore
        }
      }

      if (cancelled) {
        return;
      }

      setNativeIcons((prev) => ({ ...prev, ...icons }));
      setPickerIconsLoaded(true);
    };

    void load().catch(() => {
      if (!cancelled) {
        setPickerIconsLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [adding]);

  React.useEffect(() => {
    const loadLimitIcons = async (): Promise<void> => {
      const icons: Record<string, string> = {};
      for (const limit of limits) {
        try {
          const icon = await window.arkwatch.icons.getAppIcon({ appName: limit.appName, exePath: limit.exePath });
          if (icon) {
            icons[getAppIconCacheKey(limit.appName, limit.exePath)] = icon;
          }
        } catch {
          // ignore
        }
      }
      setNativeIcons((prev) => ({ ...prev, ...icons }));
    };
    if (limits.length > 0) void loadLimitIcons();
  }, [limits]);

  const filteredApps = availableApps.filter((app) => !limits.some((l) => l.appName === app.appName) && !isMissingLocalInstall(app, nativeIcons, pickerIconsLoaded));

  const handleAdd = (): void => {
    if (!selectedApp) return;
    onUpsert({
      appName: selectedApp.appName,
      exePath: selectedApp.exePath,
      dailyLimitSeconds: limitSeconds,
      enabled: true
    });
    setAdding(false);
    setSelectedApp(null);
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
                const app = availableApps.find((a) => a.appName === value);
                setSelectedApp(app ?? null);
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
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
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

