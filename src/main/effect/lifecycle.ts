import type { App } from 'electron';
import { Chunk, Effect, Stream } from 'effect';

export type ElectronLifecycleEvent =
  | { readonly _tag: 'Ready' }
  | { readonly _tag: 'Activate' }
  | { readonly _tag: 'WindowAllClosed' }
  | { readonly _tag: 'BeforeQuit' };

export const electronLifecycleStream = (app: App): Stream.Stream<ElectronLifecycleEvent> =>
  Stream.async((emit) => {
    const onReady = (): void => {
      void emit(Effect.succeed(Chunk.of({ _tag: 'Ready' } as const)));
    };
    const onActivate = (): void => {
      void emit(Effect.succeed(Chunk.of({ _tag: 'Activate' } as const)));
    };
    const onWindowAllClosed = (): void => {
      void emit(Effect.succeed(Chunk.of({ _tag: 'WindowAllClosed' } as const)));
    };
    const onBeforeQuit = (): void => {
      void emit(Effect.succeed(Chunk.of({ _tag: 'BeforeQuit' } as const)));
    };

    app.on('ready', onReady);
    app.on('activate', onActivate);
    app.on('window-all-closed', onWindowAllClosed);
    app.on('before-quit', onBeforeQuit);

    return Effect.sync(() => {
      app.off('ready', onReady);
      app.off('activate', onActivate);
      app.off('window-all-closed', onWindowAllClosed);
      app.off('before-quit', onBeforeQuit);
    });
  });

