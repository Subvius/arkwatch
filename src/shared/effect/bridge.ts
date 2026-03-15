import { preferencesContracts, systemDialogContracts } from './contracts';
import type { EffectBridgeApi, EffectChannel } from './channels';
export { EFFECT_CHANNELS, effectChannelValues, isEffectChannel } from './channels';

export const effectContracts = {
  ...preferencesContracts,
  ...systemDialogContracts
} as const;

export type EffectContracts = typeof effectContracts;
export type { EffectBridgeApi, EffectChannel };
