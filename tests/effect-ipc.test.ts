import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  IpcDecodeError,
  preferencesContracts,
  serializeParseError,
  systemDialogContracts
} from '../src/shared/effect';

describe('effect ipc contracts', () => {
  it('round-trips a success envelope for preferences', async () => {
    const response = {
      _tag: 'Success' as const,
      payload: {
        idleThresholdSeconds: 300,
        launchAtLogin: true,
        theme: 'dark' as const,
        dailyGoalHours: 8,
        minimizeToTray: true,
        dailyGoalNotification: true,
        autoCheckUpdates: true,
        breakReminderEnabled: true,
        breakReminderIntervalMinutes: 90
      }
    };

    const encoded = await Effect.runPromise(
      Schema.encodeUnknown(preferencesContracts.get.response)(response)
    );
    const decoded = await Effect.runPromise(
      Schema.decodeUnknown(preferencesContracts.get.response)(encoded)
    );

    expect(decoded).toEqual(response);
  });

  it('keeps protocol errors inside the typed response union', async () => {
    const failure = {
      _tag: 'Failure' as const,
      error: new IpcDecodeError({
        stage: 'request',
        issues: [{ path: ['patch', 'dailyGoalHours'], message: 'Expected an integer' }]
      })
    };

    const encoded = await Effect.runPromise(
      Schema.encodeUnknown(systemDialogContracts.pickDirectory.response)(failure)
    );
    const decoded = await Effect.runPromise(
      Schema.decodeUnknown(systemDialogContracts.pickDirectory.response)(encoded)
    );

    expect(decoded._tag).toBe('Failure');

    if (decoded._tag === 'Failure') {
      expect(decoded.error._tag).toBe('IpcDecodeError');
    }
  });

  it('serializes schema parse failures into stable ipc decode errors', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        Schema.decodeUnknown(preferencesContracts.update.request)({
          patch: { dailyGoalHours: 'invalid' }
        })
      )
    );

    expect(Either.isLeft(result)).toBe(true);

    if (Either.isLeft(result)) {
      const protocolError = serializeParseError('request', result.left);
      expect(protocolError._tag).toBe('IpcDecodeError');
      expect(protocolError.issues.length).toBeGreaterThan(0);
    }
  });
});
