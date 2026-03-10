import * as React from 'react';
import type { AIToolConfig } from '../lib/ai-tools';
import { formatDuration } from '../lib/utils';
import claudeLogoUrl from '../assets/claude-icon-logo.svg';
import openaiLogoUrl from '../assets/openai-icon-logo.svg';

type AIToolCardProps = {
  config: AIToolConfig;
  activeSeconds: number;
  sessionCount: number;
  isRunning?: boolean;
};

export const AIToolCard = ({ config, activeSeconds, sessionCount, isRunning }: AIToolCardProps): React.JSX.Element => {
  const logoSrc = config.id === 'claude' ? claudeLogoUrl : openaiLogoUrl;

  return (
    <div
      className="flex items-center gap-4 rounded-lg border px-4 py-3"
      style={{
        background: config.bgLight,
        borderColor: config.borderColor
      }}
    >
      <img src={logoSrc} alt={config.label} className="h-6 w-6 shrink-0" />
      <div className="flex min-w-0 flex-1 items-center gap-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: config.color }}>
            {config.label}
          </span>
          {isRunning !== undefined && (
            <span className="flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: isRunning ? '#22c55e' : '#d1d5db' }}
              />
              {isRunning ? 'Running' : 'Offline'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-[hsl(var(--muted))]">
            <span className="font-semibold tabular-nums text-[hsl(var(--ink))]">{formatDuration(activeSeconds)}</span> active
          </span>
          <span className="text-[hsl(var(--muted))]">
            <span className="font-semibold tabular-nums text-[hsl(var(--ink))]">{sessionCount}</span> sessions
          </span>
        </div>
      </div>
    </div>
  );
};
