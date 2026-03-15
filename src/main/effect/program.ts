import path from 'node:path';
import { app } from 'electron';
import { NodeRuntime } from '@effect/platform-node';
import { Effect, Layer, Stream } from 'effect';
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
        return openPrimaryWindow.pipe(Effect.provide(windowLayer));
      case 'WindowAllClosed':
        return Effect.sync(() => {
          if (process.platform !== 'darwin') {
            app.quit();
          }
        });
      case 'Activate':
        return Effect.void;
      case 'BeforeQuit':
        return Effect.logDebug('Electron before-quit received');
    }
  }
).pipe(Effect.scoped, Effect.provide(Layer.empty));

export const runEffectMain = (): void => {
  NodeRuntime.runMain(effectMainProgram);
};

