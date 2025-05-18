// composables/podcast/usePodcastAudioPlayer.ts
import { ref, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'

export function usePodcastAudioPlayer() {
  const currentAudio = ref<HTMLAudioElement | null>(null)

  function handlePlayFileWithoutRedirect(url?: string) {
    if (!url) return

    if (currentAudio.value) {
      currentAudio.value.pause()
      // Optional: Revoke object URL if it was created via URL.createObjectURL
      // if (currentAudio.value.src.startsWith('blob:')) {
      //   URL.revokeObjectURL(currentAudio.value.src);
      // }
    }

    const audio = new Audio(url)
    currentAudio.value = audio

    audio.play().catch(error => {
      console.error('Error playing audio:', error)
      toast.error('Error playing audio', { description: error instanceof Error ? error.message : 'Unknown error' })
    })
  }

  function handleViewJSON(url: string) {
    // Open in new tab to avoid page navigation
    window.open(url, '_blank');
  }
  
  // Store the listener function to ensure the correct one is removed
  const interceptAudioLinksListener = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a'); 
    
    if (link && link.href) {
      const href = link.href;
      // Check if the link is intended for asset viewing/playing rather than navigation
      // This check can be made more robust based on specific URL patterns of your assets
      const isAssetLink = (href.includes('/podcasts/') || href.includes('/segments/')) && 
                          (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.ogg') || href.endsWith('.json'));

      if (isAssetLink) {
        // Check if the click originated from within a component that should handle its own clicks
        // This is a simple check; more complex scenarios might need event.stopPropagation() in child components
        // or a more sophisticated way to identify "handled" links.
        if ((event.currentTarget as HTMLElement)?.dataset?.linkHandledInternally === 'true') {
            return true;
        }

        console.log('Intercepting audio/json link click:', href);
        event.preventDefault();
        event.stopPropagation(); // Prevent other listeners and default action
        
        if (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.ogg')) {
          handlePlayFileWithoutRedirect(href);
        } else if (href.endsWith('.json')) {
          handleViewJSON(href);
        }
        return false; 
      }
    }
    return true;
  };

  onMounted(() => {
    document.addEventListener('click', interceptAudioLinksListener, true); 
  })

  onUnmounted(() => {
    document.removeEventListener('click', interceptAudioLinksListener, true);
    if (currentAudio.value) {
      currentAudio.value.pause()
      // Optional: Revoke object URL
      // if (currentAudio.value.src.startsWith('blob:')) {
      //   URL.revokeObjectURL(currentAudio.value.src);
      // }
      currentAudio.value = null
    }
  })

  return {
    handlePlayFileWithoutRedirect, // Exposed for direct use if needed
    handleViewJSON, // Exposed for direct use if needed
    // currentAudio is not exposed as its managed internally
  }
}