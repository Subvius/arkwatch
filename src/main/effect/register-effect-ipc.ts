import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import { Cause, Effect, Layer, ManagedRuntime, Option, Schema } from 'effect';
import type { ArkWatchDatabase } from '../db/database';
import {
  effectContracts,
  IpcUnexpectedError,
  type AnyIpcContract,
  type ContractRemoteError,
  type ContractRequest,
  type ContractResponse,
  type ContractSuccess,
  preferencesContracts,
  serializeParseError,
  systemDialogContracts
} from '../../shared/effect';
import {
  ElectronDialogLive,
  ElectronDialogService,
  makeMainWindowRefLayer,
  makePreferencesRepositoryLayer,
  PreferencesRepository
} from './services';

const encodeResponse = <TContract extends AnyIpcContract>(
  contract: TContract,
  response: ContractResponse<TContract>
): Effect.Effect<unknown, never> =>
  Schema.encodeUnknown(contract.response as Schema.Schema<ContractResponse<TContract>, unknown, never>)(response).pipe(
    Effect.orDie
  );

const decodeRequest = <TContract extends AnyIpcContract>(
  contract: TContract,
  rawRequest: unknown
): Effect.Effect<ContractRequest<TContract>, ReturnType<typeof serializeParseError>> =>
  Schema.decodeUnknown(contract.request as Schema.Schema<ContractRequest<TContract>, unknown, never>)(rawRequest).pipe(
    Effect.mapError((error) => serializeParseError('request', error))
  );

const registerContract = <TRuntime, TContract extends AnyIpcContract>(
  runtime: ManagedRuntime.ManagedRuntime<TRuntime, never>,
  contract: TContract,
  handler: (request: ContractRequest<TContract>) => Effect.Effect<ContractSuccess<TContract>, ContractRemoteError<TContract>, TRuntime>
): void => {
  ipcMain.handle(contract.channel, async (_event, rawRequest: unknown) => {
    const program = Effect.gen(function*() {
      const request = yield* decodeRequest(contract, rawRequest ?? {});
      const payload = yield* handler(request);
      return yield* encodeResponse(contract, {
        _tag: 'Success',
        payload
      } as ContractResponse<TContract>);
    }).pipe(
      Effect.catchAll((error) =>
        encodeResponse(contract, {
          _tag: 'Failure',
          error
        } as ContractResponse<TContract>)
      ),
      Effect.catchAllCause((cause) =>
        encodeResponse(contract, {
          _tag: 'Failure',
          error: Option.getOrElse(
            Cause.failureOption(cause),
            () => new IpcUnexpectedError({ message: Cause.pretty(cause) })
          )
        } as ContractResponse<TContract>)
      )
    );

    return runtime.runPromise(program);
  });
};

let ipcRuntime: ManagedRuntime.ManagedRuntime<PreferencesRepository | ElectronDialogService, never> | null = null;
const appCleanupContracts = new Set<string>();

export const registerEffectIpcHandlers = (
  database: ArkWatchDatabase,
  getMainWindow: () => BrowserWindow | null
): void => {
  const dialogLayer = Layer.provide(ElectronDialogLive, makeMainWindowRefLayer(getMainWindow));
  const liveLayer = Layer.mergeAll(makePreferencesRepositoryLayer(database), dialogLayer);
  const runtime = ManagedRuntime.make(liveLayer);
  ipcRuntime = runtime;

  registerContract(runtime, preferencesContracts.get, () =>
    Effect.gen(function*() {
      const repository = yield* PreferencesRepository;
      return yield* repository.get;
    })
  );

  registerContract(runtime, preferencesContracts.update, ({ patch }) =>
    Effect.gen(function*() {
      const repository = yield* PreferencesRepository;
      return yield* repository.update(patch);
    })
  );

  registerContract(runtime, systemDialogContracts.pickDirectory, (request) =>
    Effect.gen(function*() {
      const dialog = yield* ElectronDialogService;
      return yield* dialog.pickDirectory(request);
    })
  );

  for (const contract of Object.values(effectContracts)) {
    appCleanupContracts.add(contract.channel);
  }
};

export const unregisterEffectIpcHandlers = async (): Promise<void> => {
  for (const channel of appCleanupContracts) {
    ipcMain.removeHandler(channel);
  }
  appCleanupContracts.clear();

  if (ipcRuntime) {
    const runtime = ipcRuntime;
    ipcRuntime = null;
    await runtime.dispose();
  }
};
