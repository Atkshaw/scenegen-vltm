
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface StimulusItem {
  id: string;
  sourceFile: File | null;
  sourcePreview: string | null;
  resultUrl: string | null;
  status: TaskStatus;
  error?: string;
}

export interface StimulusTask extends StimulusItem {
  prompt: string;
}

export interface StimulusPair {
  id: string;
  objectName: string;
  customNumber?: string; // Manual override for the objXX prefix
  itemA: StimulusItem;
  itemB: StimulusItem;
  promptA: string;
  promptB: string;
}

export interface BatchStats {
  totalPairs: number;
  completedPairs: number;
  processing: boolean;
}
