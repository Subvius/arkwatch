import path from 'node:path';
import { app } from 'electron';
import { NodeRuntime } from '@effect/platform-node';
import { Effect, ManagedRuntime, Stream } from 'effect';
import { electronLifecycleStream } from './lifecycle';
import { BrowserWindowController, makeBrowserWindowLayer } from './services';

const windowLayer = makeBrowserWindowLayer({
  width: 1280,
  height: 860,
  show: false,
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.cjs'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
});

const windowRuntime = ManagedRuntime.make(windowLayer);
let windowRuntimeDisposed = false;

const disposeWindowRuntime = Effect.suspend(() => {
  if (windowRuntimeDisposed) {
    return Effect.void;
  }

  windowRuntimeDisposed = true;
  return Effect.promise(() => windowRuntime.dispose());
});

const runWithWindowRuntime = <A, E>(effect: Effect.Effect<A, E, BrowserWindowController>) =>
  Effect.tryPromise({
    try: () => windowRuntime.runPromise(effect),
    catch: (cause) => cause
  });

const openPrimaryWindow = Effect.gen(function*() {
  const browserWindow = yield* BrowserWindowController;
  yield* browserWindow.show;
  yield* Effect.tryPromise({
    try: () =>
      process.env.ELECTRON_RENDERER_URL
        ? browserWindow.window.loadURL(process.env.ELECTRON_RENDERER_URL)
        : browserWindow.window.loadFile(path.join(__dirname, '../renderer/index.html')),
    catch: (cause) => cause
  });
}).pipe(
  Effect.catchAllCause((cause) => Effect.logError(`Effect main bootstrap failed: ${cause}`)),
  Effect.onInterrupt(() => Effect.logDebug('Primary window bootstrap interrupted'))
);

export const effectMainProgram = Stream.runForEach(
  electronLifecycleStream(app),
  (event) => {
    switch (event._tag) {
      case 'Ready':
        return runWithWindowRuntime(openPrimaryWindow);
      case 'WindowAllClosed':
        return Effect.sync(() => {
          if (process.platform !== 'darwin') {
            app.quit();
          }
        });
      case 'Activate':
        return Effect.void;
      case 'BeforeQuit':
        return Effect.zipRight(
          Effect.logDebug('Electron before-quit received'),
          disposeWindowRuntime
        );
    }
  }
);

export const runEffectMain = (): void => {
  NodeRuntime.runMain(
    effectMainProgram.pipe(
      Effect.ensuring(disposeWindowRuntime)
    )
  );
};
