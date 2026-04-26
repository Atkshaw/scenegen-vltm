
import React from 'react';
import { StimulusTask } from '../types';

interface StimulusCardProps {
  task: StimulusTask;
  onRemove: (id: string) => void;
  onUpdatePrompt: (id: string, prompt: string) => void;
}

export const StimulusCard: React.FC<StimulusCardProps> = ({ task, onRemove, onUpdatePrompt }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col group transition-all hover:shadow-md">
      <div className="relative h-48 bg-gray-100 overflow-hidden flex items-center justify-center">
        {/* Fixed: Added null check for sourcePreview before rendering img tag */}
        {task.sourcePreview && (
          <img 
            src={task.sourcePreview} 
            alt="Source" 
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        )}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md">
          SOURCE
        </div>
        {task.status !== 'pending' && (
           <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
             task.status === 'processing' ? 'bg-blue-500 text-white animate-pulse' :
             task.status === 'completed' ? 'bg-green-500 text-white' :
             'bg-red-500 text-white'
           }`}>
             {task.status}
           </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
            Prompt for this item
          </label>
          <textarea
            value={task.prompt}
            onChange={(e) => onUpdatePrompt(task.id, e.target.value)}
            disabled={task.status === 'processing'}
            className="w-full text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-h-[60px] resize-none bg-gray-50"
            placeholder="Describe the desired variation..."
          />
        </div>

        {task.status === 'completed' && task.resultUrl && (
          <div className="mt-2 border-t pt-4">
             <label className="text-[10px] font-bold text-green-600 uppercase tracking-widest block mb-2">
              Generated Stimulus
            </label>
            <div className="relative rounded-lg overflow-hidden border border-green-100">
               <img src={task.resultUrl} alt="Result" className="w-full h-40 object-cover" />
               <a 
                 href={task.resultUrl} 
                 download={`stimulus-${task.id}.png`}
                 className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white font-medium"
               >
                 Download PNG
               </a>
            </div>
          </div>
        )}

        {task.error && (
          <div className="text-red-500 text-xs mt-1 p-2 bg-red-50 rounded">
            Error: {task.error}
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t flex justify-between items-center">
        {/* Fixed: Added optional chaining for sourceFile access */}
        <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
          {task.sourceFile?.name || 'No file'}
        </span>
        <button
          onClick={() => onRemove(task.id)}
          disabled={task.status === 'processing'}
          className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
};
