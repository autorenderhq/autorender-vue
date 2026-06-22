/**
 * AutoRender Provider for Vue
 * Provides AR instance via provide/inject
 */

import { provide, inject, type InjectionKey } from 'vue';
import { createAR, type CreateARConfig, type ARInstance } from '@autorender/js/viewtag';

const AutoRenderKey: InjectionKey<ARInstance> = Symbol('AutoRender');

export interface AutoRenderProviderOptions extends CreateARConfig {
  workspace: string; // Ensure workspace is required
}

/**
 * Provide AutoRender instance to child components
 */
export function useAutoRenderProvider(options: AutoRenderProviderOptions): ARInstance {
  const ar = createAR(options);
  provide(AutoRenderKey, ar);
  return ar;
}

/**
 * Inject AutoRender instance from parent provider
 */
export function useAutoRender(): ARInstance {
  const ar = inject(AutoRenderKey);
  if (!ar) {
    throw new Error('useAutoRender must be used within AutoRenderProvider');
  }
  return ar;
}

