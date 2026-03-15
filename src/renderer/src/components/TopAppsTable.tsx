import * as React from 'react';
import { AppWindow } from 'lucide-react';
import type { TopAppStat } from '../../../shared/types';
import { formatDuration } from '../lib/utils';
import { detectAITool, getAITools } from '../lib/ai-tools';
import claudeLogoUrl from '../assets/claude-icon-logo.svg';
import openaiLogoUrl from '../assets/openai-icon-logo.svg';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type TopAppsTableProps = {
  apps: TopAppStat[];
};

const rowIconKey = (appName: string, exePath: string | null): string => `${appName}::${exePath ?? ''}`;

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
            return iconDataUrl ? ([rowIconKey(row.appName, row.exePath), iconDataUrl] as const) : null;
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

  const getAppIcon = (
    appName: string,
    exePath: string | null,
    aiTool: ReturnType<typeof detectAITool>
  ): React.JSX.Element => {
    const iconFrameClassName = 'flex h-6 w-6 shrink-0 items-center justify-center';

    if (aiTool === 'claude') {
      return (
        <span className={iconFrameClassName}>
          <img src={claudeLogoUrl} alt="Claude icon" className="h-5 w-5 object-contain" />
        </span>
      );
    }
    if (aiTool === 'codex') {
      return (
        <span className={iconFrameClassName}>
          <img src={openaiLogoUrl} alt="Codex icon" className="h-5 w-5 object-contain dark:invert" />
        </span>
      );
    }

    const nativeIcon = nativeIconsByRowKey[rowIconKey(appName, exePath)];
    if (nativeIcon) {
      return (
        <span className={iconFrameClassName}>
          <img src={nativeIcon} alt={`${appName} icon`} className="h-5 w-5 rounded object-contain" />
        </span>
      );
    }

    return (
      <span className={iconFrameClassName}>
        <AppWindow className="h-5 w-5 text-[hsl(var(--muted))]" aria-hidden="true" strokeWidth={1.75} />
      </span>
    );
  };
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

          return (
            <TableRow key={`${row.appName}-${row.exePath ?? 'none'}`}>
              <TableCell>{getAppIcon(row.appName, row.exePath, aiTool)}</TableCell>
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

