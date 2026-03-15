import { Schema } from 'effect';
import { defineIpcContract } from '../ipc';

export const PickDirectoryResultSchema = Schema.Struct({
  canceled: Schema.Boolean,
  path: Schema.NullOr(Schema.String)
});

export type PickDirectoryResult = Schema.Schema.Type<typeof PickDirectoryResultSchema>;

export class WindowUnavailableError extends Schema.TaggedError<WindowUnavailableError>(
  'arkwatch/effect/WindowUnavailableError'
)('WindowUnavailableError', {
  message: Schema.String
}) {}

export class DialogFailureError extends Schema.TaggedError<DialogFailureError>(
  'arkwatch/effect/DialogFailureError'
)('DialogFailureError', {
  message: Schema.String
}) {}

export const systemDialogContracts = {
  pickDirectory: defineIpcContract({
    channel: 'effect.systemDialog.pickDirectory',
    request: Schema.Struct({
      title: Schema.String,
      buttonLabel: Schema.optional(Schema.String)
    }),
    success: PickDirectoryResultSchema,
    error: Schema.Union(WindowUnavailableError, DialogFailureError)
  })
} as const;


