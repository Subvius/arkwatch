import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { FocusSchedule } from '../../../../shared/types';

type FocusScheduleSettingsProps = {
  schedules: FocusSchedule[];
  onCreate: (schedule: Omit<FocusSchedule, 'id' | 'createdAt'>) => void;
  onUpdate: (schedule: FocusSchedule) => void;
  onRemove: (id: number) => void;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const FocusScheduleSettings = ({ schedules, onCreate, onRemove }: FocusScheduleSettingsProps): React.JSX.Element => {
  const [adding, setAdding] = React.useState(false);
  const [label, setLabel] = React.useState('');
  const [selectedDays, setSelectedDays] = React.useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('09:25');

  const toggleDay = (day: string): void => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCreate = (): void => {
    if (!label.trim() || selectedDays.length === 0) return;
    onCreate({
      label: label.trim(),
      daysOfWeek: selectedDays.join(','),
      startTime,
      endTime,
      enabled: true
    });
    setAdding(false);
    setLabel('');
    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setStartTime('09:00');
    setEndTime('09:25');
  };

  return (
    <div className="space-y-3">
      {schedules.length === 0 && !adding && (
        <p className="py-4 text-center text-sm text-[hsl(var(--muted))]">No focus schedules configured.</p>
      )}

      {schedules.map((schedule) => (
        <div key={schedule.id} className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <span className="text-sm font-medium">{schedule.label}</span>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted))]">
              <span>{schedule.daysOfWeek.replace(/,/g, ', ')}</span>
              <span>·</span>
              <span>{schedule.startTime}–{schedule.endTime}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(schedule.id)}>
            <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--muted))]" />
          </Button>
        </div>
      ))}

      {adding ? (
        <div className="space-y-3 rounded-md border p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted))]" htmlFor="schedule-label">Label</label>
            <Input
              id="schedule-label"
              placeholder="e.g. Morning Focus"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted))]">Days</label>
            <div className="flex flex-wrap gap-1">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    selectedDays.includes(day)
                      ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-ink))]'
                      : 'border text-[hsl(var(--muted))] hover:text-[hsl(var(--ink))]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted))]" htmlFor="schedule-start">Start</label>
              <Input id="schedule-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted))]" htmlFor="schedule-end">End</label>
              <Input id="schedule-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" disabled={!label.trim() || selectedDays.length === 0} onClick={handleCreate}>Add Schedule</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Schedule
        </Button>
      )}
    </div>
  );
};
