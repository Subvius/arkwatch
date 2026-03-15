import type { AnyIpcContract } from './ipc';
import { preferencesContracts, systemDialogContracts } from './contracts';

export const effectContracts = {
  ...preferencesContracts,
  ...systemDialogContracts
} as const;

export type EffectContracts = typeof effectContracts;
export type EffectChannel = EffectContracts[keyof EffectContracts]['channel'];

export type EffectBridgeApi = {
  invoke: (channel: EffectChannel, payload: unknown) => Promise<unknown>;
};

export const isEffectChannel = (value: string): value is EffectChannel =>
  Object.values(effectContracts).some((contract: AnyIpcContract) => contract.channel === value);

