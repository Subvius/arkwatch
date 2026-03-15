import { Layer, ManagedRuntime } from 'effect';
import { EffectBridgePortLive, RendererIpcClientLive } from './client';

export const rendererLayer = Layer.provide(RendererIpcClientLive, EffectBridgePortLive);
export const rendererRuntime = ManagedRuntime.make(rendererLayer);
