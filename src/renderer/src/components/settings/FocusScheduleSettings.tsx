import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { TextEffect } from '../ui/text-effect';
import type { FocusSchedule } from '../../../../shared/types';
import {
  parseNaturalLanguageSchedule,
  type NaturalLanguageSchedule
} from '../../lib/natural-language-schedule';

type FocusScheduleSettingsProps = {
  schedules: FocusSchedule[];
  onCreate: (schedule: Omit<FocusSchedule, 'id' | 'createdAt'>) => void;
  onUpdate: (schedule: FocusSchedule) => void;
  onRemove: (id: number) => void;
};

export const FocusScheduleSettings = ({
  schedules,
  onCreate,
  onRemove
}: FocusScheduleSettingsProps): React.JSX.Element => {
  const [adding, setAdding] = React.useState(false);
  const [label, setLabel] = React.useState('');

  const [naturalInput, setNaturalInput] = React.useState('');
  const [naturalError, setNaturalError] = React.useState<string | null>(null);
  const [parsedSchedule, setParsedSchedule] =
    React.useState<NaturalLanguageSchedule | null>(null);
  const [parseVersion, setParseVersion] = React.useState(0);

  const naturalInputRef = React.useRef<HTMLInputElement>(null);
  const labelInputRef = React.useRef<HTMLInputElement>(null);

  const parsedSummary = parsedSchedule
    ? `${parsedSchedule.daysOfWeek.join(', ')} | ${parsedSchedule.startTime}-${parsedSchedule.endTime}`
    : '';

  const handleNaturalParse = (): void => {
    if (!naturalInput.trim()) return;
    const parsed = parseNaturalLanguageSchedule(naturalInput);
    if (!parsed.ok) {
      setNaturalError(parsed.error);
      setParsedSchedule(null);
      return;
    }

    setNaturalError(null);
    setParsedSchedule(parsed.value);
    setParseVersion((prev) => prev + 1);
  };

  const handleCreate = (): void => {
    if (!label.trim()) return;

    let schedule = parsedSchedule;
    if (!schedule) {
      const parsed = parseNaturalLanguageSchedule(naturalInput);
      if (!parsed.ok) {
        setNaturalError(parsed.error);
        return;
      }
      schedule = parsed.value;
      setParsedSchedule(parsed.value);
      setNaturalError(null);
      setParseVersion((prev) => prev + 1);
    }

    onCreate({
      label: label.trim(),
      daysOfWeek: schedule.daysOfWeek.join(','),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      enabled: true
    });

    resetForm();
  };

  const resetForm = (): void => {
    setAdding(false);
    setLabel('');
    setNaturalInput('');
    setNaturalError(null);
    setParsedSchedule(null);
  };

  const canSubmit = label.trim() && naturalInput.trim();

  return (
    <div className="space-y-1">
      {/* Existing schedules */}
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[hsl(var(--bg))]"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--bg))] text-[hsl(var(--muted))] group-hover:bg-[hsl(var(--panel))]">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-medium leading-tight text-[hsl(var(--ink))]">
              {schedule.label}
            </span>
            <span className="mt-0.5 block text-[11px] leading-tight text-[hsl(var(--muted))]">
              {schedule.daysOfWeek.replace(/,/g, ', ')}
              <span className="mx-1.5 opacity-40">/</span>
              {schedule.startTime}–{schedule.endTime}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRemove(schedule.id)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[hsl(var(--muted))] opacity-0 transition-all hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--ink))] group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}

      {schedules.length === 0 && !adding && (
        <div className="flex flex-col items-center gap-2 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--bg))]">
            <Clock className="h-4 w-4 text-[hsl(var(--muted))]" />
          </div>
          <p className="text-xs text-[hsl(var(--muted))]">No schedules yet</p>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="space-y-3 pt-1">
          {/* Unified input area */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--panel))]">
            {/* Label row */}
            <div className="flex items-center border-b border-[hsl(var(--border))]/60 px-3">
              <span className="w-16 shrink-0 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted))]">
                Label
              </span>
              <input
                ref={labelInputRef}
                type="text"
                placeholder="Morning Focus"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-10 flex-1 bg-transparent text-sm text-[hsl(var(--ink))] placeholder:text-[hsl(var(--muted))]/50 focus:outline-none"
              />
            </div>

            {/* Schedule row */}
            <div className="flex items-center px-3">
              <span className="w-16 shrink-0 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted))]">
                When
              </span>
              <input
                ref={naturalInputRef}
                type="text"
                placeholder="weekdays 9am to 5pm"
                value={naturalInput}
                onChange={(e) => {
                  setNaturalInput(e.target.value);
                  setNaturalError(null);
                  setParsedSchedule(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (parsedSchedule && canSubmit) {
                      handleCreate();
                    } else {
                      handleNaturalParse();
                    }
                  }
                }}
                onBlur={() => {
                  if (naturalInput.trim() && !parsedSchedule) {
                    handleNaturalParse();
                  }
                }}
                className="h-10 flex-1 bg-transparent text-sm text-[hsl(var(--ink))] placeholder:text-[hsl(var(--muted))]/50 focus:outline-none"
              />
              <AnimatePresence>
                {naturalInput.trim() && !parsedSchedule && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleNaturalParse}
                    className="ml-1 flex h-6 items-center gap-1 rounded-md bg-[hsl(var(--bg))] px-2 text-[10px] font-medium text-[hsl(var(--muted))] transition-colors hover:text-[hsl(var(--ink))]"
                  >
                    Parse
                    <ArrowRight className="h-2.5 w-2.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Parsed result / error */}
          {naturalError && (
            <p className="px-1 text-[11px] text-rose-500">
              {naturalError}
            </p>
          )}
          {!naturalError && parsedSchedule && (
            <div className="flex items-center gap-2 px-1">
              <div className="flex items-center gap-1.5 rounded-md bg-[hsl(var(--accent))]/8 px-2.5 py-1.5">
                <div className="h-1 w-1 rounded-full bg-[hsl(var(--accent))]" />
                <TextEffect
                  key={`${parseVersion}-${parsedSummary}`}
                  per="char"
                  preset="fade"
                  speedReveal={2}
                  className="text-[11px] font-medium text-[hsl(var(--ink))]"
                >
                  {parsedSummary}
                </TextEffect>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={!canSubmit}
              onClick={handleCreate}
              className="gap-1.5 text-xs"
            >
              Add Schedule
            </Button>
            <button
              type="button"
              onClick={resetForm}
              className="flex h-8 items-center px-2 text-xs text-[hsl(var(--muted))] transition-colors hover:text-[hsl(var(--ink))]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!adding && (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setTimeout(() => labelInputRef.current?.focus(), 50);
          }}
          className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-[hsl(var(--border))] px-3 py-2.5 text-[hsl(var(--muted))] transition-all hover:border-[hsl(var(--accent))]/30 hover:bg-[hsl(var(--bg))] hover:text-[hsl(var(--ink))]"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-md">
            <Plus className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-medium">Add schedule</span>
        </button>
      )}
    </div>
  );
};
