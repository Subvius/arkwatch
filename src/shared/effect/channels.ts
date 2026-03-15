export const EFFECT_CHANNELS = {
  preferencesGet: 'effect.preferences.get',
  preferencesUpdate: 'effect.preferences.update',
  systemDialogPickDirectory: 'effect.systemDialog.pickDirectory'
} as const;

export const effectChannelValues = [
  EFFECT_CHANNELS.preferencesGet,
  EFFECT_CHANNELS.preferencesUpdate,
  EFFECT_CHANNELS.systemDialogPickDirectory
] as const;

export type EffectChannel = (typeof effectChannelValues)[number];

export type EffectBridgeApi = {
  invoke: (channel: EffectChannel, payload: unknown) => Promise<unknown>;
};

export const isEffectChannel = (value: string): value is EffectChannel =>
  effectChannelValues.includes(value as EffectChannel);
