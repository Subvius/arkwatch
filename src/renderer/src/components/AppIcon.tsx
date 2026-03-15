import * as React from 'react';
import { AppWindow } from 'lucide-react';
import { detectAITool } from '../lib/ai-tools';
import claudeLogoUrl from '../assets/claude-icon-logo.svg';
import openaiLogoUrl from '../assets/openai-icon-logo.svg';

type AppIconProps = {
  appName: string;
  exePath: string | null;
  nativeIconSrc?: string | null;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: {
    frame: 'h-4 w-4',
    icon: 'h-4 w-4'
  },
  md: {
    frame: 'h-5 w-5',
    icon: 'h-5 w-5'
  },
  lg: {
    frame: 'h-6 w-6',
    icon: 'h-5 w-5'
  }
} as const;

export const AppIcon = ({
  appName,
  exePath,
  nativeIconSrc = null,
  size = 'md'
}: AppIconProps): React.JSX.Element => {
  const aiTool = detectAITool(appName, exePath);
  const classes = sizeClasses[size];
  const frameClassName = `flex ${classes.frame} shrink-0 items-center justify-center`;
  const iconClassName = `${classes.icon} object-contain`;

  if (aiTool === 'claude') {
    return (
      <span className={frameClassName}>
        <img src={claudeLogoUrl} alt="" aria-hidden="true" className={iconClassName} />
      </span>
    );
  }

  if (aiTool === 'codex') {
    return (
      <span className={frameClassName}>
        <img src={openaiLogoUrl} alt="" aria-hidden="true" className={`${iconClassName} dark:invert`} />
      </span>
    );
  }

  if (nativeIconSrc) {
    return (
      <span className={frameClassName}>
        <img src={nativeIconSrc} alt="" aria-hidden="true" className={`${iconClassName} rounded`} />
      </span>
    );
  }

  return (
    <span className={frameClassName}>
      <AppWindow className={`${classes.icon} text-[hsl(var(--muted))]`} aria-hidden="true" strokeWidth={1.75} />
    </span>
  );
};

