export type ModalStatus = 'confirm' | 'processing' | 'success' | 'error';

export interface ConfirmData {
  estimatedCost?: string;
  estimatedTime?: string;
}

export interface ProcessingData {
  progress?: number; // 0-100
  currentStage?: string;
  remainingTime?: string;
}

export interface SuccessData {
  podcastDuration?: string;
  fileSize?: string; // Optional
}

export interface ErrorData {
  errorMessage?: string;
}