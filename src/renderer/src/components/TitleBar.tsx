import * as React from 'react';
import { Minus, Square, X } from 'lucide-react';
import { AnimatedThemeToggler } from './AnimatedThemeToggler';

const isDev = import.meta.env.DEV;

export const TitleBar = (): React.JSX.Element => {
  return (
    <div className="title-bar flex h-10 shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-widest text-[hsl(var(--muted))]">
          ARKWATCH
        </span>
        {isDev && (
          <span className="bg-red-400 px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-[0.2em] text-white">
            DEV
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <AnimatedThemeToggler
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--ink))]"
        />
        <button
          onClick={() => window.arkwatch.window.minimize()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--ink))]"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => window.arkwatch.window.maximize()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--ink))]"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          onClick={() => window.arkwatch.window.close()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[hsl(var(--muted))] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
