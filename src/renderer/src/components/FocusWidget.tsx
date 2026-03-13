import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Square, CheckCircle2 } from 'lucide-react';
import { ClockDial } from './ClockDial';
import { AnimatedNumber } from './AnimatedNumber';
import type { FocusSessionState } from '../../../shared/types';

type FocusWidgetProps = {
  focusState: FocusSessionState;
  todayCount: number;
  onStart: (durationSec: number) => void;
  onStop: () => void;
};

const PRESETS = [
  { label: '25', seconds: 25 * 60 },
  { label: '50', seconds: 50 * 60 },
  { label: '90', seconds: 90 * 60 }
];

const fmt = (seconds: number): { m: string; s: string } => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return { m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
};

const TodayBadge = ({ count }: { count: number }): React.JSX.Element | null =>
  count > 0 ? (
    <span className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted))]">
      <CheckCircle2 className="h-3 w-3" />
      <AnimatedNumber value={count} springOptions={{ stiffness: 200, damping: 20 }} />
    </span>
  ) : null;

const Blinker = ({ className }: { className?: string }): React.JSX.Element => (
  <motion.span
    className={className}
    animate={{ opacity: [1, 0.2, 1] }}
    transition={{ duration: 1, repeat: Infinity }}
  >:</motion.span>
);

/* ─────────────────────────────────────────────────────────
   "Linear" style — clean, compact, precise.
   Pulsing status dot when active, countdown in recessed chip,
   sharp 2px bottom progress line.
   ───────────────────────────────────────────────────────── */
export const FocusWidget = ({ focusState, todayCount, onStart, onStop }: FocusWidgetProps): React.JSX.Element => {
  const [dialOpen, setDialOpen] = React.useState(false);
  const progress = focusState.active && focusState.plannedDurationSec > 0
    ? focusState.elapsedSeconds / focusState.plannedDurationSec : 0;
  const time = fmt(focusState.remainingSeconds);

  return (
    <>
      <div className="group relative overflow-hidden rounded-lg border bg-[hsl(var(--panel))]">
        <AnimatePresence mode="wait">
          {focusState.active ? (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Pulsing status dot */}
                <div className="relative flex h-5 w-5 items-center justify-center">
                  <motion.div
                    className="absolute h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]"
                    animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="relative h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
                </div>

                <span className="text-[13px] font-medium tracking-tight">Focus</span>

                <div className="flex items-baseline gap-px rounded bg-[hsl(var(--bg))] px-2.5 py-1">
                  <span className="text-sm font-semibold tabular-nums leading-none tracking-tighter">{time.m}</span>
                  <Blinker className="text-sm font-semibold leading-none text-[hsl(var(--muted))]" />
                  <span className="text-sm font-semibold tabular-nums leading-none tracking-tighter">{time.s}</span>
                </div>

                <span className="text-[11px] text-[hsl(var(--muted))]">{focusState.label ?? 'Deep work'}</span>

                <div className="ml-auto flex items-center gap-3">
                  <TodayBadge count={todayCount} />
                  <motion.button
                    onClick={onStop}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--ink))]"
                  >
                    <Square className="h-2.5 w-2.5" /> Stop
                  </motion.button>
                </div>
              </div>

              {/* Sharp bottom progress line */}
              <div className="h-[2px] bg-[hsl(var(--border))]">
                <motion.div
                  className="h-full bg-[hsl(var(--accent))]"
                  initial={false}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--border))]" />
              <span className="text-[13px] font-medium text-[hsl(var(--muted))]">Focus</span>

              <div className="ml-auto flex items-center gap-1">
                {PRESETS.map((p, i) => (
                  <motion.button
                    key={p.label}
                    onClick={() => onStart(p.seconds)}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 500, damping: 30 }}
                    whileHover={{ backgroundColor: 'hsl(var(--border))' }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-md px-2.5 py-1 text-[11px] font-medium tabular-nums text-[hsl(var(--muted))] transition-colors hover:text-[hsl(var(--ink))]"
                  >
                    {p.label}m
                  </motion.button>
                ))}
                <motion.button
                  onClick={() => setDialOpen(true)}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12, type: 'spring', stiffness: 500, damping: 30 }}
                  whileHover={{ backgroundColor: 'hsl(var(--border))' }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-md px-2.5 py-1 text-[11px] text-[hsl(var(--muted))] transition-colors hover:text-[hsl(var(--ink))]"
                >
                  Custom
                </motion.button>
                <TodayBadge count={todayCount} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ClockDial open={dialOpen} onOpenChange={setDialOpen} onStart={onStart} />
    </>
  );
};
