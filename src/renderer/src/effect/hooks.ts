import * as React from 'react';
import { Cause, Effect, Exit, Option } from 'effect';
import { RendererIpcClient } from './client';
import { rendererRuntime } from './runtime';

type QueryState<A, E> =
  | { readonly status: 'idle' | 'loading'; readonly data: null; readonly error: null }
  | { readonly status: 'success'; readonly data: A; readonly error: null }
  | { readonly status: 'error'; readonly data: null; readonly error: E };

export const useEffectQuery = <A, E>(
  effectFactory: () => Effect.Effect<A, E, RendererIpcClient>,
  deps: React.DependencyList
): QueryState<A, E> => {
  const [state, setState] = React.useState<QueryState<A, E>>({
    status: 'idle',
    data: null,
    error: null
  });

  React.useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', data: null, error: null });

    void rendererRuntime.runPromiseExit(effectFactory(), { signal: controller.signal }).then((exit) => {
      if (Exit.isSuccess(exit)) {
        setState({ status: 'success', data: exit.value, error: null });
        return;
      }

      if (Cause.isInterruptedOnly(exit.cause)) {
        return;
      }

      const error = Option.getOrUndefined(Cause.failureOption(exit.cause));
      if (error !== undefined) {
        setState({ status: 'error', data: null, error });
        return;
      }

      console.error('[effect-query] untyped defect', Cause.pretty(exit.cause));
    });

    return () => {
      controller.abort();
    };
  }, deps);

  return state;
};

export const useEffectCommand = <Args extends ReadonlyArray<unknown>, A, E>(
  effectFactory: (...args: Args) => Effect.Effect<A, E, RendererIpcClient>
): {
  readonly execute: (...args: Args) => Promise<A | null>;
  readonly pending: boolean;
  readonly error: E | null;
} => {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<E | null>(null);

  const execute = async (...args: Args): Promise<A | null> => {
    setPending(true);
    setError(null);

    const exit = await rendererRuntime.runPromiseExit(effectFactory(...args));
    setPending(false);

    if (Exit.isSuccess(exit)) {
      return exit.value;
    }

    const failure = Option.getOrNull(Cause.failureOption(exit.cause));
    if (failure !== null) {
      setError(failure);
      return null;
    }

    console.error('[effect-command] untyped defect', Cause.pretty(exit.cause));
    return null;
  };

  return {
    execute,
    pending,
    error
  };
};
