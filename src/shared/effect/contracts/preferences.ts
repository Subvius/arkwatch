import { Schema } from 'effect';
import { defineIpcContract, EmptyPayloadSchema } from '../ipc';

export const ThemeSchema = Schema.Literal('light', 'dark');

export const PreferencesSchema = Schema.Struct({
  idleThresholdSeconds: Schema.Int.pipe(Schema.greaterThanOrEqualTo(60)),
  launchAtLogin: Schema.Boolean,
  theme: ThemeSchema,
  dailyGoalHours: Schema.Int.pipe(Schema.greaterThanOrEqualTo(1), Schema.lessThanOrEqualTo(24)),
  minimizeToTray: Schema.Boolean,
  dailyGoalNotification: Schema.Boolean,
  autoCheckUpdates: Schema.Boolean,
  breakReminderEnabled: Schema.Boolean,
  breakReminderIntervalMinutes: Schema.Int.pipe(Schema.greaterThanOrEqualTo(5), Schema.lessThanOrEqualTo(480))
});

export const PreferencesPatchSchema = Schema.partial(PreferencesSchema);

export type Preferences = Schema.Schema.Type<typeof PreferencesSchema>;
export type PreferencesPatch = Schema.Schema.Type<typeof PreferencesPatchSchema>;

export class PreferencesPersistenceError extends Schema.TaggedError<PreferencesPersistenceError>(
  'arkwatch/effect/PreferencesPersistenceError'
)('PreferencesPersistenceError', {
  operation: Schema.Literal('get', 'update'),
  message: Schema.String
}) {}

export const preferencesContracts = {
  get: defineIpcContract({
    channel: 'effect.preferences.get',
    request: EmptyPayloadSchema,
    success: PreferencesSchema,
    error: PreferencesPersistenceError
  }),
  update: defineIpcContract({
    channel: 'effect.preferences.update',
    request: Schema.Struct({
      patch: PreferencesPatchSchema
    }),
    success: PreferencesSchema,
    error: PreferencesPersistenceError
  })
} as const;


