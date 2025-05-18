import { onMounted, onUnmounted } from 'vue';
import { toast } from 'vue-sonner';

export function useGlobalAudioInterceptor() {
  const playAudioFile = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      toast.error('Error playing audio', { description: error instanceof Error ? error.message : 'Unknown error' });
    });
  };

  const preventDefaultForAudioLinks = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');

    if (link && link.href) {
      const href = link.href;
      // Check if link points to audio files or podcast segments
      if (
        (href.includes('/podcasts/') || href.includes('/segments/')) &&
        (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.ogg') || href.endsWith('.json'))
      ) {
        console.log('[GlobalAudioInterceptor] Intercepting audio/json link click:', href);
        event.preventDefault();
        event.stopPropagation();

        if (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.ogg')) {
          playAudioFile(href);
        } else if (href.endsWith('.json')) {
          window.open(href, '_blank');
        }
        return false; // Indicate that the event was handled
      }
    }
    return true; // Indicate that the event was not handled by this interceptor
  };

  onMounted(() => {
    // Using a more specific name for the window property to avoid potential collisions
    if (!(window as any).__playgroundGlobalAudioLinkInterceptor) {
      document.addEventListener('click', preventDefaultForAudioLinks, true);
      (window as any).__playgroundGlobalAudioLinkInterceptor = preventDefaultForAudioLinks;
      console.log('[GlobalAudioInterceptor] Attached.');
    }
  });

  onUnmounted(() => {
    if ((window as any).__playgroundGlobalAudioLinkInterceptor) {
      document.removeEventListener('click', (window as any).__playgroundGlobalAudioLinkInterceptor, true);
      delete (window as any).__playgroundGlobalAudioLinkInterceptor;
      console.log('[GlobalAudioInterceptor] Detached.');
    }
  });

  // No need to return anything as this composable only sets up global listeners
}