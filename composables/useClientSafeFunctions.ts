/**
 * Client-side safe functions that can be used by components
 * to avoid window/document not defined errors in SSR
 */
import { ref, onMounted } from 'vue';

export function useClientSafeFunctions() {
  const isClient = ref(false);
  
  onMounted(() => {
    isClient.value = true;
  });
  
  const getWindowOrigin = (): string => {
    if (isClient.value && typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };
  
  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (isClient.value && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  };
  
  const openWindow = (url: string, target: string = '_blank', features?: string): void => {
    if (isClient.value && typeof window !== 'undefined') {
      window.open(url, target, features);
    }
  };
  
  return {
    isClient,
    getWindowOrigin,
    copyToClipboard,
    openWindow
  };
}
