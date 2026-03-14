import * as chrono from 'chrono-node';
import { addMinutes, format } from 'date-fns';

type DayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

const ORDERED_DAYS: DayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS: DayName[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKENDS: DayName[] = ['Sat', 'Sun'];
const DAY_BY_JS_INDEX: DayName[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_TOKEN_TO_NAME: Record<string, DayName> = {
  mon: 'Mon',
  monday: 'Mon',
  tue: 'Tue',
  tues: 'Tue',
  tuesday: 'Tue',
  wed: 'Wed',
  wednesday: 'Wed',
  thu: 'Thu',
  thur: 'Thu',
  thurs: 'Thu',
  thursday: 'Thu',
  fri: 'Fri',
  friday: 'Fri',
  sat: 'Sat',
  saturday: 'Sat',
  sun: 'Sun',
  sunday: 'Sun'
};

const DAY_TOKEN_PATTERN = /\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/gi;
const DAY_RANGE_PATTERN = /\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b\s*(?:-|to|through|thru|until)\s*\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/gi;
const DURATION_PATTERN = /\bfor\s+(\d+)\s*(minutes?|mins?|min|m|hours?|hrs?|hr|h)\b/i;

const toDayName = (token: string): DayName | null => {
  const normalized = token.trim().toLowerCase();
  return DAY_TOKEN_TO_NAME[normalized] ?? null;
};

const buildDayRange = (start: DayName, end: DayName): DayName[] => {
  const startIndex = ORDERED_DAYS.indexOf(start);
  const endIndex = ORDERED_DAYS.indexOf(end);
  if (startIndex === -1 || endIndex === -1) {
    return [];
  }

  if (startIndex <= endIndex) {
    return ORDERED_DAYS.slice(startIndex, endIndex + 1);
  }

  return [...ORDERED_DAYS.slice(startIndex), ...ORDERED_DAYS.slice(0, endIndex + 1)];
};

const detectDays = (input: string, fallbackStart: Date): DayName[] => {
  const lower = input.toLowerCase();

  if (/\b(?:every day|each day|daily|everyday)\b/.test(lower)) {
    return ORDERED_DAYS;
  }

  const days = new Set<DayName>();

  if (/\bweekdays?\b/.test(lower)) {
    for (const day of WEEKDAYS) {
      days.add(day);
    }
  }

  if (/\bweekends?\b/.test(lower)) {
    for (const day of WEEKENDS) {
      days.add(day);
    }
  }

  for (const match of lower.matchAll(DAY_RANGE_PATTERN)) {
    const startDay = toDayName(match[1]);
    const endDay = toDayName(match[2]);
    if (!startDay || !endDay) {
      continue;
    }
    for (const day of buildDayRange(startDay, endDay)) {
      days.add(day);
    }
  }

  for (const match of lower.matchAll(DAY_TOKEN_PATTERN)) {
    const day = toDayName(match[1]);
    if (day) {
      days.add(day);
    }
  }

  if (days.size > 0) {
    return ORDERED_DAYS.filter((day) => days.has(day));
  }

  return [DAY_BY_JS_INDEX[fallbackStart.getDay()]];
};

const parseDurationMinutes = (input: string): number | null => {
  const match = input.match(DURATION_PATTERN);
  if (!match) {
    return null;
  }

  const amount = Number.parseInt(match[1], 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unit = match[2].toLowerCase();
  const minuteUnits = new Set(['minute', 'minutes', 'min', 'mins', 'm']);
  if (minuteUnits.has(unit)) {
    return amount;
  }

  return amount * 60;
};

export type NaturalLanguageSchedule = {
  daysOfWeek: DayName[];
  startTime: string;
  endTime: string;
};

export type ParseNaturalLanguageScheduleResult =
  | { ok: true; value: NaturalLanguageSchedule }
  | { ok: false; error: string };

export const parseNaturalLanguageSchedule = (
  input: string,
  referenceDate: Date = new Date()
): ParseNaturalLanguageScheduleResult => {
  const text = input.trim();
  if (!text) {
    return { ok: false, error: 'Enter a schedule phrase first.' };
  }

  const parsed = chrono.parse(text, referenceDate, { forwardDate: true });
  if (parsed.length === 0) {
    return { ok: false, error: 'Could not parse date/time. Example: weekdays 9am to 9:25am.' };
  }

  const startDate = parsed[0].start.date();
  let endDate = parsed[0].end?.date() ?? null;

  if (!endDate && parsed.length > 1) {
    endDate = parsed[1].start.date();
  }

  if (!endDate) {
    const durationMinutes = parseDurationMinutes(text);
    if (durationMinutes) {
      endDate = addMinutes(startDate, durationMinutes);
    }
  }

  if (!endDate) {
    return { ok: false, error: 'Include an end time or duration. Example: for 25 minutes.' };
  }

  const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
  const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
  if (startMinutes === endMinutes) {
    return { ok: false, error: 'Start and end time cannot be the same.' };
  }

  return {
    ok: true,
    value: {
      daysOfWeek: detectDays(text, startDate),
      startTime: format(startDate, 'HH:mm'),
      endTime: format(endDate, 'HH:mm')
    }
  };
};
