import * as React from 'react';
import type { TopAppStat } from '../../../shared/types';
import { formatDuration } from '../lib/utils';
import { detectAITool, getAITools } from '../lib/ai-tools';
import { getAppIconCacheKey } from '../lib/app-icon';
import { AppIcon } from './AppIcon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type TopAppsTableProps = {
  apps: TopAppStat[];
};

export const TopAppsTable = ({ apps }: TopAppsTableProps): React.JSX.Element => {
  const [isDark, setIsDark] = React.useState(document.documentElement.classList.contains('dark'));
  React.useEffect(() => {
    const update = (): void => setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const aiTools = React.useMemo(() => getAITools(isDark), [isDark]);

  const [nativeIconsByRowKey, setNativeIconsByRowKey] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;

    const loadNativeIcons = async (): Promise<void> => {
      const rowsToResolve = apps.filter((row) => !detectAITool(row.appName, row.exePath));

      if (rowsToResolve.length === 0) {
        if (!cancelled) {
          setNativeIconsByRowKey({});
        }
        return;
      }

      const iconEntries = await Promise.all(
        rowsToResolve.map(async (row) => {
          try {
            const iconDataUrl = await window.arkwatch.icons.getAppIcon({
              appName: row.appName,
              exePath: row.exePath
            });
            return iconDataUrl ? ([getAppIconCacheKey(row.appName, row.exePath), iconDataUrl] as const) : null;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) {
        return;
      }

      const nextIcons: Record<string, string> = {};
      for (const entry of iconEntries) {
        if (entry) {
          nextIcons[entry[0]] = entry[1];
        }
      }

      setNativeIconsByRowKey(nextIcons);
    };

    void loadNativeIcons();

    return () => {
      cancelled = true;
    };
  }, [apps]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[56px]">Icon</TableHead>
          <TableHead>App</TableHead>
          <TableHead className="text-right">Active Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apps.map((row) => {
          const aiTool = detectAITool(row.appName, row.exePath);
          const toolConfig = aiTool ? aiTools[aiTool] : null;
          const nativeIconSrc = nativeIconsByRowKey[getAppIconCacheKey(row.appName, row.exePath)] ?? null;

          return (
            <TableRow key={`${row.appName}-${row.exePath ?? 'none'}`}>
              <TableCell>
                <AppIcon appName={row.appName} exePath={row.exePath} nativeIconSrc={nativeIconSrc} size="lg" />
              </TableCell>
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  {toolConfig && (
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: toolConfig.color }}
                    />
                  )}
                  {row.appName}
                </span>
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatDuration(row.activeSeconds)}
              </TableCell>
            </TableRow>
          );
        })}
        {apps.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="py-8 text-center text-[hsl(var(--muted))]">
              No tracked app activity yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

