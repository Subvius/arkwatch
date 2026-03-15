import { Effect } from 'effect';
import { preferencesContracts, systemDialogContracts } from '../../../shared/effect';
import { RendererIpcClient } from './client';
import type { PreferencesPatch } from '../../../shared/effect';

export const getPreferencesEffect = RendererIpcClient.invoke(preferencesContracts.get, {});

export const updatePreferencesEffect = (patch: PreferencesPatch) =>
  RendererIpcClient.invoke(preferencesContracts.update, { patch });

export const pickDirectoryEffect = (title: string, buttonLabel?: string) =>
  RendererIpcClient.invoke(systemDialogContracts.pickDirectory, {
    title,
    buttonLabel
  }).pipe(
    Effect.map((result) => result.path),
    Effect.catchTag('WindowUnavailableError', () => Effect.succeed(null))
  );

