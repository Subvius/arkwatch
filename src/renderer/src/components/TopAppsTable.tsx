import * as React from 'react';
import type { TopAppStat } from '../../../shared/types';
import { formatDuration } from '../lib/utils';
import { detectAITool, AI_TOOLS } from '../lib/ai-tools';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type TopAppsTableProps = {
  apps: TopAppStat[];
};

export const TopAppsTable = ({ apps }: TopAppsTableProps): React.JSX.Element => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>App</TableHead>
          <TableHead>Executable</TableHead>
          <TableHead className="text-right">Active Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apps.map((row) => {
          const aiTool = detectAITool(row.appName, row.exePath);
          const toolConfig = aiTool ? AI_TOOLS[aiTool] : null;

          return (
            <TableRow key={`${row.appName}-${row.exePath ?? 'none'}`}>
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
              <TableCell className="max-w-[320px] truncate text-[hsl(var(--muted))]">
                {row.exePath ?? 'N/A'}
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
