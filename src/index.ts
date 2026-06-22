import { createUploader } from '@autorender/js';
import type { CreateUploaderOptions, UploaderInstance } from '@autorender/js';

export type AutorenderVueOptions = Omit<CreateUploaderOptions, 'target'>;

// Re-export types for convenience
export type { UploaderInstance, CreateUploaderOptions } from '@autorender/js';

/**
 * Vue composable for Autorender uploader
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useAutorenderUploader } from '@autorender/vue';
 * 
 * const containerRef = ref(null);
 * const uploader = useAutorenderUploader({
 *   apiKey: 'your-api-key',
 *   type: 'inline',
 *   containerRef,
 * });
 * </script>
 * ```
 */
export function useAutorenderUploader(
  options: AutorenderVueOptions & { containerRef: { value: HTMLElement | null } }
): UploaderInstance | null {
  let instance: UploaderInstance | null = null;

  const init = () => {
    if (!options.containerRef.value || instance) return;
    
    instance = createUploader({
      ...options,
      target: options.containerRef.value,
    });
  };

  // Initialize when container is available
  if (options.containerRef.value) {
    init();
  } else {
    // Watch for container to become available
    const checkInterval = setInterval(() => {
      if (options.containerRef.value) {
        init();
        clearInterval(checkInterval);
      }
    }, 50);
    
    // Cleanup after 5 seconds if still not available
    setTimeout(() => clearInterval(checkInterval), 5000);
  }

  return instance;
}

/**
 * Direct function to create uploader instance (for manual control)
 */
export function createAutorenderUploader(
  element: HTMLElement,
  options: AutorenderVueOptions
): UploaderInstance {
  return createUploader({
    ...options,
    target: element,
  });
}

