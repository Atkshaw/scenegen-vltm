
import React, { useState } from 'react';
import { StimulusPair, StimulusItem } from '../types';

interface PairCardProps {
  pair: StimulusPair;
  index: number;
  onRemove: (id: string) => void;
  onUpload: (id: string, type: 'A' | 'B', file: File) => void;
  onUpdateObjectName: (id: string, name: string) => void;
  onUpdateObjectNumber: (id: string, num: string) => void;
  onUpdatePairPromptB: (id: string, prompt: string) => void;
  onRefresh: (id: string) => void;
  onLastDitchB: (id: string) => void;
}

const ItemSlot: React.FC<{ 
  item: StimulusItem; 
  label: string; 
  onFileSelect: (file: File) => void;
  isLocked: boolean;
  downloadName: string;
}> = ({ item, label, onFileSelect, isLocked, downloadName }) => {
  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        {item.status !== 'pending' && (
           <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
             item.status === 'processing' ? 'bg-blue-100 text-blue-600 animate-pulse' :
             item.status === 'completed' ? 'bg-green-100 text-green-600' :
             'bg-red-100 text-red-600'
           }`}>
             {item.status}
           </span>
        )}
      </div>
      
      <div className={`relative aspect-square rounded-xl border-2 border-dashed transition-all overflow-hidden flex items-center justify-center ${
        item.sourcePreview ? 'border-transparent' : 'border-gray-200 hover:border-blue-300 bg-gray-50'
      }`}>
        {item.sourcePreview ? (
          <div className="w-full h-full relative group">
            <img src={item.sourcePreview} className="w-full h-full object-cover" alt="Source" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <span className="text-[10px] text-white font-bold">SOURCE</span>
            </div>
          </div>
        ) : (
          <label className={`w-full h-full flex flex-col items-center justify-center cursor-pointer ${isLocked ? 'pointer-events-none opacity-50' : ''}`}>
            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
            />
          </label>
        )}
      </div>

      <div className={`mt-2 aspect-square rounded-xl border flex items-center justify-center overflow-hidden bg-gray-100 ${
        item.status === 'completed' ? 'border-green-200' : 'border-gray-100'
      }`}>
        {item.resultUrl ? (
          <div className="w-full h-full relative group">
            <img src={item.resultUrl} className="w-full h-full object-cover" alt="Result" />
            <a 
              href={item.resultUrl} 
              download={downloadName}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-center p-2"
            >
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-white font-bold mb-1">DOWNLOAD</span>
                <span className="text-[8px] text-white/70 font-mono break-all">{downloadName}</span>
              </div>
            </a>
          </div>
        ) : (
          <div className="text-center p-4">
             {item.status === 'processing' ? (
                <div className="space-y-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <span className="text-[10px] text-gray-400 font-medium uppercase">Generating...</span>
                </div>
             ) : (
                <span className="text-[10px] text-gray-300 font-medium uppercase text-center flex flex-col gap-1">
                  <span>Waiting for</span>
                  <span>Baseline A</span>
                </span>
             )}
          </div>
        )}
      </div>
      {item.error && <p className="text-[10px] text-red-500 mt-1 italic leading-tight">{item.error}</p>}
    </div>
  );
};

export const PairCard: React.FC<PairCardProps> = ({ pair, index, onRemove, onUpload, onUpdateObjectName, onUpdateObjectNumber, onUpdatePairPromptB, onRefresh, onLastDitchB }) => {
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isLocked = pair.itemA.status === 'processing' || pair.itemB.status === 'processing';
  
  const pairIndexStr = String(index).padStart(2, '0');
  const displayNum = pair.customNumber ?? pairIndexStr;
  
  const downloadNameA = `obj${displayNum}_T_scene.png`;
  const downloadNameB = `obj${displayNum}_F_scene.png`;

  const objectDisplay = pair.objectName.trim() || '(__)';
  const processedPromptBPreview = pair.promptB
    .replace(/\(\_\)/g, `[${objectDisplay}]`)
    .replace(/\_\_/g, `[${objectDisplay}]`);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4 transition-all hover:shadow-md">
      <div className="flex items-center justify-between pb-3 border-b border-gray-50">
        <div className="flex items-center gap-3 flex-1 mr-4">
           <div className="relative group/num">
              <input
                type="text"
                value={displayNum}
                onChange={(e) => onUpdateObjectNumber(pair.id, e.target.value)}
                className="w-8 h-8 rounded bg-gray-900 text-center text-[10px] font-bold text-white shrink-0 outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-gray-800"
                title="Edit Object Number"
                disabled={isLocked}
              />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover/num:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Object #
              </div>
           </div>
           
           <div className="flex-1">
             <div className="relative">
                <input
                  type="text"
                  value={pair.objectName}
                  onChange={(e) => onUpdateObjectName(pair.id, e.target.value)}
                  placeholder="Input Object Name (e.g. phone)"
                  className="w-full bg-gray-100 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-lg px-3 py-1.5 text-xs font-bold transition-all outline-none"
                  disabled={isLocked}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 uppercase pointer-events-none">
                  Identity
                </div>
             </div>
           </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => onRefresh(pair.id)}
            disabled={isLocked || !pair.itemA.sourceFile || !pair.itemB.sourceFile}
            className={`p-1.5 rounded-lg transition-all ${isLocked ? 'text-gray-200' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
            title="Refresh Stimulus Pair (A then B)"
          >
            <svg className={`w-4 h-4 ${isLocked ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button 
            onClick={() => onLastDitchB(pair.id)}
            disabled={isLocked || !pair.itemB.sourceFile}
            className={`p-1.5 rounded-lg transition-all ${isLocked ? 'text-gray-200' : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'}`}
            title="Last Ditch B: Run Image B with Prompt A (Independent generation)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          <button 
            onClick={() => setShowPromptEditor(!showPromptEditor)}
            className={`p-1.5 rounded-lg transition-colors ${showPromptEditor ? 'bg-purple-50 text-purple-600' : 'text-gray-400 hover:bg-gray-50'}`}
            title="Edit Individual Prompt B"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button 
            onClick={() => onRemove(pair.id)}
            disabled={isLocked}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {showPromptEditor && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-[10px] leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
           <div className="flex items-center justify-between mb-2">
             <div className="flex gap-2">
               <button 
                 onClick={() => setIsEditing(false)} 
                 className={`px-2 py-0.5 rounded ${!isEditing ? 'bg-white shadow-sm font-bold text-gray-900' : 'text-gray-400'}`}
               >
                 Preview
               </button>
               <button 
                 onClick={() => setIsEditing(true)} 
                 className={`px-2 py-0.5 rounded ${isEditing ? 'bg-white shadow-sm font-bold text-purple-600' : 'text-gray-400'}`}
               >
                 Edit Template
               </button>
             </div>
             <span className="text-gray-400 font-mono text-[8px] uppercase">Trial-Specific Override</span>
           </div>
           
           {isEditing ? (
             <textarea
               value={pair.promptB}
               onChange={(e) => onUpdatePairPromptB(pair.id, e.target.value)}
               className="w-full h-32 p-2 bg-white border border-gray-200 rounded-lg resize-none font-mono text-[9px] leading-tight focus:ring-1 focus:ring-purple-500 outline-none"
               placeholder="Edit Prompt B for this trial..."
               disabled={isLocked}
             />
           ) : (
             <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 min-h-[64px]">
               <p className="text-gray-600 italic whitespace-pre-wrap font-mono text-[9px]">
                 {processedPromptBPreview}
               </p>
             </div>
           )}
        </div>
      )}

      <div className="flex gap-4">
        <ItemSlot 
          item={pair.itemA} 
          label="Object A (Target)" 
          onFileSelect={(f) => onUpload(pair.id, 'A', f)}
          isLocked={isLocked}
          downloadName={downloadNameA}
        />
        <div className="flex items-center text-gray-200">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </div>
        <ItemSlot 
          item={pair.itemB} 
          label="Object B (Variant)" 
          onFileSelect={(f) => onUpload(pair.id, 'B', f)}
          isLocked={isLocked}
          downloadName={downloadNameB}
        />
      </div>
    </div>
  );
};
