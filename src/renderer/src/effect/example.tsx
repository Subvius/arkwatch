import * as React from 'react';
import { getPreferencesEffect, pickDirectoryEffect } from './api';
import { useEffectCommand, useEffectQuery } from './hooks';

type DisplayableError = {
  readonly _tag: string;
  readonly message?: string | undefined;
  readonly issues?: ReadonlyArray<{
    readonly path: ReadonlyArray<string>;
    readonly message: string;
  }>;
};

const renderError = (error: DisplayableError): string => {
  switch (error._tag) {
    case 'PreferencesPersistenceError':
    case 'WindowUnavailableError':
    case 'DialogFailureError':
    case 'IpcUnexpectedError':
    case 'IpcTransportError':
      return error.message ?? error._tag;
    case 'IpcDecodeError':
      return (error.issues ?? []).map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ');
    default:
      return error._tag;
  }
};

export const EffectExample = (): React.JSX.Element => {
  const preferences = useEffectQuery(() => getPreferencesEffect, []);
  const [selectedDirectory, setSelectedDirectory] = React.useState<string | null>(null);
  const directoryPicker = useEffectCommand((title: string) => pickDirectoryEffect(title, 'Use folder'));

  return (
    <section className="rounded-lg border bg-[hsl(var(--panel))] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Effect IPC Example</h2>
          <p className="text-xs text-[hsl(var(--muted))]">Typed renderer calls backed by schema-validated IPC envelopes.</p>
        </div>
        <button
          className="rounded-md border px-3 py-1.5 text-sm"
          disabled={directoryPicker.pending}
          onClick={() => {
            void directoryPicker.execute('Select export directory').then(setSelectedDirectory);
          }}
          type="button"
        >
          {directoryPicker.pending ? 'Choosing...' : 'Pick directory'}
        </button>
      </div>

      <div className="mt-3 text-sm">
        {preferences.status === 'loading' || preferences.status === 'idle' ? <p>Loading preferences...</p> : null}
        {preferences.status === 'success' ? <p>Theme from main process: {preferences.data.theme}</p> : null}
        {preferences.status === 'error' ? <p className="text-red-500">{renderError(preferences.error as DisplayableError)}</p> : null}
        {directoryPicker.error ? <p className="text-red-500">{renderError(directoryPicker.error as DisplayableError)}</p> : null}
        {selectedDirectory ? <p className="text-[hsl(var(--muted))]">Selected: {selectedDirectory}</p> : null}
      </div>
    </section>
  );
};
