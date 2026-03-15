import { Context, Effect, Layer, Schema } from 'effect';
import {
  IpcTransportError,
  type AnyIpcContract,
  type ContractClientError,
  type ContractRequest,
  type ContractSuccess,
  serializeParseError
} from '../../../shared/effect';

export class EffectBridgePort extends Context.Tag('arkwatch/renderer/effect/EffectBridgePort')<
  EffectBridgePort,
  {
    readonly invoke: Window['effectBridge']['invoke'];
  }
>() {}

export const EffectBridgePortLive = Layer.succeed(EffectBridgePort, {
  invoke: window.effectBridge.invoke
});

export class RendererIpcClient extends Context.Tag('arkwatch/renderer/effect/RendererIpcClient')<
  RendererIpcClient,
  {
    readonly invoke: <TContract extends AnyIpcContract>(
      contract: TContract,
      request: ContractRequest<TContract>
    ) => Effect.Effect<ContractSuccess<TContract>, ContractClientError<TContract>>;
  }
>() {
  static invoke = <TContract extends AnyIpcContract>(
    contract: TContract,
    request: ContractRequest<TContract>
  ): Effect.Effect<ContractSuccess<TContract>, ContractClientError<TContract>, RendererIpcClient> =>
    Effect.flatMap(this, (client) => client.invoke(contract, request));
}

export const RendererIpcClientLive: Layer.Layer<RendererIpcClient, never, EffectBridgePort> = Layer.effect(
  RendererIpcClient,
  Effect.gen(function*() {
    const bridge = yield* EffectBridgePort;

    return {
      invoke: <TContract extends AnyIpcContract>(
        contract: TContract,
        request: ContractRequest<TContract>
      ): Effect.Effect<ContractSuccess<TContract>, ContractClientError<TContract>> =>
        Effect.gen(function*() {
          const payload = yield* Schema.encodeUnknown(
            contract.request as Schema.Schema<ContractRequest<TContract>, unknown, never>
          )(request).pipe(Effect.orDie);
          const rawResponse = yield* Effect.tryPromise({
            try: () => bridge.invoke(contract.channel as Parameters<typeof bridge.invoke>[0], payload),
            catch: (cause) =>
              new IpcTransportError({
                message: cause instanceof Error ? cause.message : String(cause)
              })
          });
          const response = yield* Schema.decodeUnknown(
            contract.response as Schema.Schema<
              { _tag: 'Success'; payload: ContractSuccess<TContract> } |
              { _tag: 'Failure'; error: ContractClientError<TContract> },
              unknown,
              never
            >
          )(rawResponse).pipe(
            Effect.mapError((error) => serializeParseError('response', error))
          );

          return response._tag === 'Failure' ? yield* Effect.fail(response.error) : response.payload;
        })
    };
  })
);
