import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import { dialog, BrowserWindow as ElectronBrowserWindow } from 'electron';
import { Context, Effect, Layer, ParseResult, Schema } from 'effect';
import type { ArkWatchDatabase } from '../db/database';
import type { AppSettings } from '../../shared/types';
import {
  type PickDirectoryResult,
  DialogFailureError,
  PreferencesPersistenceError,
  PreferencesPatchSchema,
  PreferencesSchema,
  WindowUnavailableError
} from '../../shared/effect';
import type { Preferences, PreferencesPatch } from '../../shared/effect';

const formatParseError = (error: ParseResult.ParseError): string => ParseResult.TreeFormatter.formatErrorSync(error);
const toMessage = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

const decodePreferences = (
  operation: 'get' | 'update'
) => (input: unknown): Effect.Effect<Preferences, PreferencesPersistenceError> =>
  Schema.decodeUnknown(PreferencesSchema)(input).pipe(
    Effect.mapError(
      (error) =>
        new PreferencesPersistenceError({
          operation,
          message: formatParseError(error)
        })
    )
  );

export class PreferencesRepository extends Context.Tag('arkwatch/main/effect/PreferencesRepository')<
  PreferencesRepository,
  {
    readonly get: Effect.Effect<Preferences, PreferencesPersistenceError>;
    readonly update: (patch: PreferencesPatch) => Effect.Effect<Preferences, PreferencesPersistenceError>;
  }
>() {}

export const makePreferencesRepositoryLayer = (database: ArkWatchDatabase): Layer.Layer<PreferencesRepository> =>
  Layer.succeed(PreferencesRepository, {
    get: Effect.tryPromise({
      try: () => database.getSettings(),
      catch: (cause) =>
        new PreferencesPersistenceError({
          operation: 'get',
          message: toMessage(cause)
        })
    }).pipe(Effect.flatMap(decodePreferences('get'))),
    update: (patch) =>
      Effect.gen(function*() {
        const encodedPatch = yield* Schema.encode(PreferencesPatchSchema)(patch).pipe(
          Effect.mapError(
            (error) =>
              new PreferencesPersistenceError({
                operation: 'update',
                message: formatParseError(error)
              })
          )
        );

        const updated = yield* Effect.tryPromise({
          try: () => database.updateSettings(encodedPatch as Partial<AppSettings>),
          catch: (cause) =>
            new PreferencesPersistenceError({
              operation: 'update',
              message: toMessage(cause)
            })
        });

        return yield* decodePreferences('update')(updated);
      })
  });

export class MainWindowRef extends Context.Tag('arkwatch/main/effect/MainWindowRef')<
  MainWindowRef,
  {
    readonly current: Effect.Effect<BrowserWindow, WindowUnavailableError>;
  }
>() {}

export const makeMainWindowRefLayer = (
  getMainWindow: () => BrowserWindow | null
): Layer.Layer<MainWindowRef> =>
  Layer.succeed(MainWindowRef, {
    current: Effect.sync(getMainWindow).pipe(
      Effect.flatMap((window) =>
        window && !window.isDestroyed()
          ? Effect.succeed(window)
          : Effect.fail(
              new WindowUnavailableError({
                message: 'Main window is not available.'
              })
            )
      )
    )
  });

export class ElectronDialogService extends Context.Tag('arkwatch/main/effect/ElectronDialogService')<
  ElectronDialogService,
  {
    readonly pickDirectory: (options: {
      readonly title: string;
      readonly buttonLabel?: string | undefined;
    }) => Effect.Effect<PickDirectoryResult, WindowUnavailableError | DialogFailureError>;
  }
>() {}

export const ElectronDialogLive: Layer.Layer<
  ElectronDialogService,
  never,
  MainWindowRef
> = Layer.effect(
  ElectronDialogService,
  Effect.gen(function*() {
    const mainWindowRef = yield* MainWindowRef;

    return {
      pickDirectory: ({ title, buttonLabel }) =>
        Effect.gen(function*() {
          const window = yield* mainWindowRef.current;
          const result = yield* Effect.tryPromise({
            try: () =>
              dialog.showOpenDialog(window, {
                properties: ['openDirectory'],
                title,
                buttonLabel
              }),
            catch: (cause) =>
              new DialogFailureError({
                message: toMessage(cause)
              })
          });

          return {
            canceled: result.canceled,
            path: result.filePaths[0] ?? null
          } satisfies PickDirectoryResult;
        }).pipe(
          Effect.catchTag(
            'WindowUnavailableError',
            (error) => Effect.fail(error)
          ),
          Effect.catchTag('DialogFailureError', (error) => Effect.fail(error)),
          Effect.onInterrupt(() => Effect.logDebug('Directory selection interrupted'))
        )
    };
  })
);

export class BrowserWindowController extends Context.Tag('arkwatch/main/effect/BrowserWindowController')<
  BrowserWindowController,
  {
    readonly window: BrowserWindow;
    readonly show: Effect.Effect<void, never>;
  }
>() {}

export class BrowserWindowFailureError extends Schema.TaggedError<BrowserWindowFailureError>(
  'arkwatch/effect/BrowserWindowFailureError'
)('BrowserWindowFailureError', {
  message: Schema.String
}) {}

export const makeBrowserWindowLayer = (
  options: BrowserWindowConstructorOptions
): Layer.Layer<BrowserWindowController, BrowserWindowFailureError> =>
  Layer.scoped(
    BrowserWindowController,
    Effect.acquireRelease(
      Effect.try({
        try: () => new ElectronBrowserWindow(options),
        catch: (cause) =>
          new BrowserWindowFailureError({
            message: toMessage(cause)
          })
      }),
      (window) =>
        Effect.sync(() => {
          if (!window.isDestroyed()) {
            window.destroy();
          }
        })
    ).pipe(
      Effect.map((window) => ({
        window,
        show: Effect.sync(() => {
          if (!window.isDestroyed()) {
            window.show();
          }
        })
      }))
    )
  );



