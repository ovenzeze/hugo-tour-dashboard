<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-out" :class="visible ? 'opacity-100' : 'opacity-0 pointer-events-none'">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-lg transform transition-all duration-300 ease-out" :class="visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ modalTitle }}</h2>
        <button @click="handleClose" aria-label="Close modal" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- ===== Confirm Phase ===== -->
      <div v-if="status === 'confirm'" class="space-y-6">
        <p class="text-slate-700 dark:text-slate-300">You are about to start synthesizing the podcast <strong class="text-slate-900 dark:text-slate-100">"{{ podcastName }}"</strong>.</p>
        
        <div v-if="confirmData.estimatedCost" class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div class="flex items-center">
            <!-- Placeholder for cost icon -->
            <svg class="w-5 h-5 text-blue-500 mr-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <div>
              <strong class="block text-sm text-slate-600 dark:text-slate-400">Estimated Resource Consumption</strong>
              <span class="text-slate-800 dark:text-slate-200">{{ confirmData.estimatedCost }}</span>
            </div>
          </div>
        </div>

        <div v-if="confirmData.estimatedTime" class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div class="flex items-center">
             <!-- Placeholder for time icon -->
            <svg class="w-5 h-5 text-green-500 mr-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <div>
              <strong class="block text-sm text-slate-600 dark:text-slate-400">Estimated Completion Time</strong>
              <span class="text-slate-800 dark:text-slate-200">{{ confirmData.estimatedTime }}</span>
            </div>
          </div>
        </div>
        
        <p class="text-xs text-slate-500 dark:text-slate-400/80 italic"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1 relative -top-px"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" /></svg>Synthesis will be processed in the background. You can check the results later. You will be notified upon completion.</p>
        
        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-8">
          <button @click="handleCancel" class="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500">
            Cancel
          </button>
          <button @click="handleConfirmSynthesis" class="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md hover:shadow-lg">
            Confirm Synthesis
          </button>
        </div>
      </div>

      <!-- ===== Processing Phase ===== -->
      <div v-else-if="status === 'processing'" class="space-y-6">
        <p class="text-slate-700 dark:text-slate-300">Podcast <strong class="text-slate-900 dark:text-slate-100">"{{ podcastName }}"</strong> is being synthesized...</p>
        
        <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden my-3">
          <div class="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-linear" :style="{ width: `${processingData.progress || 0}%` }">
             <span class="sr-only">{{ processingData.progress || 0 }}% Complete</span>
          </div>
        </div>
        
        <div v-if="processingData.currentStage" class="text-sm text-slate-600 dark:text-slate-400">
          <strong class="font-semibold">Current Stage:</strong> {{ processingData.currentStage }}
        </div>
        <div v-if="processingData.remainingTime" class="text-sm text-slate-600 dark:text-slate-400">
          <strong class="font-semibold">Estimated Time Remaining:</strong> {{ processingData.remainingTime }}
        </div>
        
        <p class="text-xs text-slate-500 dark:text-slate-400/80 italic"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1 relative -top-px"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" /></svg>Synthesis is processing in the background. You can hide this modal. You will be notified upon completion.</p>

        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-8">
          <button @click="handleClose" class="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500">
            Hide
          </button>
          <button @click="handleCancelSynthesis" class="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 shadow-md hover:shadow-lg">
            Cancel Synthesis
          </button>
        </div>
      </div>

      <!-- ===== Success Phase ===== -->
      <div v-else-if="status === 'success'" class="space-y-5 text-center">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-800/30 mb-3">
          <svg class="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h3 class="text-xl font-semibold text-slate-800 dark:text-slate-100">Podcast <strong class="text-green-600 dark:text-green-400">"{{ podcastName }}"</strong> synthesized successfully!</h3>
        
        <div v-if="successData.podcastDuration" class="text-slate-600 dark:text-slate-300">
          <strong class="font-medium">Podcast Duration:</strong> {{ successData.podcastDuration }}
        </div>
        <div v-if="successData.fileSize" class="text-slate-600 dark:text-slate-300">
          <strong class="font-medium">File Size:</strong> {{ successData.fileSize }}
        </div>
        
        <div class="pt-5 space-y-3 sm:space-y-0 sm:flex sm:justify-center sm:space-x-3">
          <button @click="handlePlay" class="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md hover:shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 inline-block mr-1.5 relative -top-px"><path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" /></svg>
            Play Now
          </button>
          <button @click="handleDownload" class="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium text-blue-600 border border-blue-500 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 inline-block mr-1.5 relative -top-px"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
            Download
          </button>
          <button v-if="successData.fileSize" @click="handleShare" class="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 inline-block mr-1.5 relative -top-px"><path d="M13 4.5a2.5 2.5 0 1 1 .702 4.244l-1.962 1.569a.75.75 0 0 1 -1.082-.328l-.002-.005a.75.75 0 0 1 .328-1.082l.005-.002L13 7.43V4.5Zm2.5 8.5a2.5 2.5 0 1 0 -4.244-.702l-1.569 1.962a.75.75 0 0 0 .328 1.082l.005.002a.75.75 0 0 0 1.082-.328l-.002-.005L13 12.57V15.5a2.5 2.5 0 1 0 2.5-2.5Z" /><path d="M4.5 7A2.5 2.5 0 0 0 2 9.5v1A2.5 2.5 0 0 0 4.5 13H7a2.5 2.5 0 0 0 2.5-2.5v-1A2.5 2.5 0 0 0 7 7H4.5Zm2.055 2.508a.75.75 0 0 1 .642-.852l.003-.001a.75.75 0 0 1 .852.642l-.001.003v.708a.75.75 0 0 1 -1.495.141l.005-.141v-.708Z" /></svg>
            Share
          </button>
        </div>
         <button @click="handleClose" class="mt-6 px-5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none">
            Close
          </button>
      </div>

      <!-- ===== Error Phase ===== -->
      <div v-else-if="status === 'error'" class="space-y-5 text-center">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-800/30 mb-3">
          <svg class="h-10 w-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h3 class="text-xl font-semibold text-slate-800 dark:text-slate-100">Podcast <strong class="text-red-600 dark:text-red-400">"{{ podcastName }}"</strong> synthesis failed</h3>
        
        <div v-if="errorData.errorMessage" class="p-3 bg-red-50 dark:bg-red-900/30 rounded-md text-sm text-red-700 dark:text-red-300 text-left">
          <strong class="block mb-1">Error Details:</strong>
          {{ errorData.errorMessage }}
        </div>
        <p v-else class="text-slate-500 dark:text-slate-400">Sorry, an unknown error occurred.</p>
        
        <p class="text-xs text-slate-500 dark:text-slate-400/80 italic">Please check the error message or try synthesizing again. If the problem persists, please contact the support team.</p>

        <div class="pt-5 space-y-3 sm:space-y-0 sm:flex sm:justify-center sm:space-x-3">
          <button @click="handleRetry" class="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md hover:shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 inline-block mr-1.5 relative -top-px"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.204 4.306A6.5 6.5 0 0 0 10 18.5a6.502 6.502 0 0 0 5.312-7.076ZM10 2.5A6.5 6.5 0 0 0 4.688 9.576a5.5 5.5 0 0 1 9.204-4.306A6.502 6.502 0 0 0 10 2.5Z" clip-rule="evenodd" /></svg>
            Retry Synthesis
          </button>
          <button @click="handleViewHelp" class="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 inline-block mr-1.5 relative -top-px"><path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>
            View Help
          </button>
        </div>
         <button @click="handleClose" class="mt-6 px-5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none">
            Close
          </button>
      </div>

      <!-- Fallback for unknown status -->
      <div v-else class="text-center py-8">
        <p class="text-slate-600 dark:text-slate-400">Invalid modal status. Please contact technical support.</p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { ModalStatus, ConfirmData, ProcessingData, SuccessData, ErrorData } from './PodcastSynthesisModalTypes';

// --- Props ---
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String as PropType<ModalStatus>,
    required: true,
    validator: (value: string) => ['confirm', 'processing', 'success', 'error'].includes(value),
  },
  podcastName: {
    type: String,
    default: 'Untitled Podcast',
  },
  confirmData: {
    type: Object as PropType<ConfirmData>,
    default: () => ({ estimatedCost: 'N/A', estimatedTime: 'N/A' }),
  },
  processingData: {
    type: Object as PropType<ProcessingData>,
    default: () => ({ progress: 0, currentStage: 'Initializing...', remainingTime: 'Calculating...' }),
  },
  successData: {
    type: Object as PropType<SuccessData>,
    default: () => ({ podcastDuration: 'N/A', fileSize: 'N/A' }),
  },
  errorData: {
    type: Object as PropType<ErrorData>,
    default: () => ({ errorMessage: 'An unknown error occurred' }),
  },
});

// --- Emits ---
const emit = defineEmits([
  'update:visible',
  'confirm-synthesis',
  'cancel-synthesis', // For processing phase, might need confirmation
  'cancel-confirmation', // For confirm phase
  'close', // General close/hide action
  'play-podcast',
  'download-podcast',
  'share-podcast',
  'retry-synthesis',
  'view-help',
]);

// --- Computed Properties ---
const modalTitle = computed(() => {
  switch (props.status) {
    case 'confirm':
      return 'Start Podcast Synthesis';
    case 'processing':
      return 'Synthesizing Podcast';
    case 'success':
      return 'Synthesis Successful';
    case 'error':
      return 'Synthesis Failed';
    default:
      return 'Podcast Synthesis';
  }
});

// --- Event Handlers ---
const handleClose = () => {
  emit('update:visible', false);
  emit('close');
};

const handleConfirmSynthesis = () => {
  emit('confirm-synthesis');
};

const handleCancel = () => { // For confirm phase
  emit('cancel-confirmation');
  handleClose();
};

const handleCancelSynthesis = () => {
  // Consider adding a more robust confirmation dialog here if needed
  if (window.confirm('Are you sure you want to cancel the current podcast synthesis? This action may not be reversible and could incur partial charges.')) {
    emit('cancel-synthesis');
    // Parent component should handle the state change, e.g., to 'error' or close.
  }
};

const handlePlay = () => emit('play-podcast');
const handleDownload = () => emit('download-podcast');
const handleShare = () => emit('share-podcast');
const handleRetry = () => emit('retry-synthesis');
const handleViewHelp = () => emit('view-help');

</script>

<style scoped>
/* Scoped styles can be added here if needed, but Tailwind should cover most cases. */
/* Example: Adding a subtle entrance animation for the modal content */
.transform.transition-all {
  /* Default state is handled by :class bindings */
}
</style>