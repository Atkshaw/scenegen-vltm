
import React, { useState, useMemo, useEffect } from 'react';
import { StimulusPair, TaskStatus } from './types';
import { PairCard } from './components/PairCard';
import { generateStimulus } from './services/geminiService';

const DEFAULT_PROMPT_A = `Use the object from the image I provide below.

Generate a photorealistic scene where this exact same object is placed in a simple, realistic environment that is naturally appropriate for this kind of object.

HARD CONSTRAINTS:
– The object must remain identical (same shape, geometry, colours, materials).
– Keep the object centred and occupying 25–35% of the frame.
– Use neutral, natural lighting (not dramatic, not stylised).
– Keep the environment minimal: include only large, low-salience context elements that make sense for this object (e.g., ground, floor, grass, wall, simple surface, neutral background forms).
– You may include 1–2 low-salience background elements, but they must be generic and non-diagnostic.

Do NOT add text, logos, people, faces, screens, or reflections.
– Do NOT add clutter, patterns, or decorations.

IMPORTANT:
The model must infer an appropriate setting for the object, but keep it simple, generic, and non-distinctive.`;

const DEFAULT_PROMPT_B = `IMPORTANT: Treat the object in this image as a different physical object, not a variant or view of the previous one. Use this new second (_) this has a different design and structure from the first (_) I gave you, please acknowledge this. Now place this new (_) into a similar BUT DIFFERENT type of environment and scene style as Image A.

MAKE DIFFERENT (OBJECT):
– Use the second object exactly as shown
– Preserve its true shape, proportions, and structure
– Do NOT modify it to match the object in Image A
– The two objects must remain distinguishable by silhouette and structure, even when converted to line drawings

DO NOT:
– Reuse or morph the first object
– Enforce identical object identity across images

ONLY CHANGE:
– The specific background instance (e.g., different ground texture, different neutral foliage, different simple surface)
– The 1–2 background elements (swap tree for different tree, rock for different rock, wall for different wall, etc.)
– Minor colour/texture variation within natural limits

DO NOT CHANGE:
– Lighting type
– Camera angle / framing
– Semantic meaning of the scene
– Object identity

Generate one image only.`;

const App: React.FC = () => {
  const [pairs, setPairs] = useState<StimulusPair[]>([]);
  const [promptA, setPromptA] = useState(DEFAULT_PROMPT_A);
  const [promptB, setPromptB] = useState(DEFAULT_PROMPT_B);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // Fallback or development environment
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleOpenSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume selection was successful to proceed
      setHasApiKey(true);
    }
  };

  const stats = useMemo(() => {
    const total = pairs.length;
    const completed = pairs.filter(p => p.itemA.status === 'completed' && p.itemB.status === 'completed').length;
    return { total, completed };
  }, [pairs]);

  const addNewPair = () => {
    // Calculate the next number in sequence
    let nextNum = 0;
    if (pairs.length > 0) {
      const currentNums = pairs.map((p, idx) => {
        const val = p.customNumber ? parseInt(p.customNumber, 10) : idx;
        return isNaN(val) ? 0 : val;
      });
      nextNum = Math.max(...currentNums) + 1;
    } else {
      nextNum = 0; // Start at 00 if no pairs
    }

    const paddedNum = String(nextNum).padStart(2, '0');

    const newPair: StimulusPair = {
      id: Math.random().toString(36).substring(2, 11).toUpperCase(),
      objectName: '',
      customNumber: paddedNum,
      itemA: { id: 'a', sourceFile: null, sourcePreview: null, resultUrl: null, status: 'pending' },
      itemB: { id: 'b', sourceFile: null, sourcePreview: null, resultUrl: null, status: 'pending' },
      promptA: promptA,
      promptB: promptB,
    };
    setPairs(prev => [...prev, newPair]);
  };

  const updateObjectName = (pairId: string, objectName: string) => {
    setPairs(prev => prev.map(p => p.id === pairId ? { ...p, objectName } : p));
  };

  const updateObjectNumber = (pairId: string, customNumber: string) => {
    setPairs(prev => prev.map(p => p.id === pairId ? { ...p, customNumber } : p));
  };

  const updatePairPromptB = (pairId: string, newPrompt: string) => {
    setPairs(prev => prev.map(p => p.id === pairId ? { ...p, promptB: newPrompt } : p));
  };

  const handleUpload = (pairId: string, type: 'A' | 'B', file: File) => {
    setPairs(prev => prev.map(p => {
      if (p.id === pairId) {
        const item = type === 'A' ? p.itemA : p.itemB;
        if (item.sourcePreview) URL.revokeObjectURL(item.sourcePreview);
        const newItem = {
          ...item,
          sourceFile: file,
          sourcePreview: URL.createObjectURL(file),
          status: 'pending' as TaskStatus,
          error: undefined
        };
        return type === 'A' ? { ...p, itemA: newItem } : { ...p, itemB: newItem };
      }
      return p;
    }));
  };

  const removePair = (pairId: string) => {
    setPairs(prev => {
      const p = prev.find(pair => pair.id === pairId);
      if (p) {
        if (p.itemA.sourcePreview) URL.revokeObjectURL(p.itemA.sourcePreview);
        if (p.itemB.sourcePreview) URL.revokeObjectURL(p.itemB.sourcePreview);
      }
      return prev.filter(pair => pair.id !== pairId);
    });
  };

  const processPair = async (pair: StimulusPair) => {
    setPairs(prev => prev.map(p => p.id === pair.id ? { ...p, itemA: { ...p.itemA, status: 'processing', error: undefined } } : p));
    let currentResultA = pair.itemA.resultUrl;
    
    try {
      currentResultA = await generateStimulus(pair.itemA.sourceFile!, pair.promptA);
      setPairs(prev => prev.map(p => p.id === pair.id ? { ...p, itemA: { ...p.itemA, status: 'completed', resultUrl: currentResultA } } : p));
    } catch (err: any) {
      if (err.message?.includes("API Key")) setHasApiKey(false);
      setPairs(prev => prev.map(p => p.id === pair.id ? { ...p, itemA: { ...p.itemA, status: 'error', error: err.message } } : p));
      return;
    }

    setPairs(prev => prev.map(p => p.id === pair.id ? { ...p, itemB: { ...p.itemB, status: 'processing', error: undefined } } : p));
    try {
      const objectDisplay = pair.objectName.trim() || 'object';
      const processedPromptB = pair.promptB
        .replace(/\(\_\)/g, objectDisplay)
        .replace(/\_\_/g, objectDisplay);

      const resultB = await generateStimulus(pair.itemB.sourceFile!, processedPromptB, currentResultA);
      setPairs(prev => prev.map(p => p.id === pair.id ? { ...p, itemB: { ...p.itemB, status: 'completed', resultUrl: resultB } } : p));
    } catch (err: any) {
      if (err.message?.includes("API Key")) setHasApiKey(false);
      setPairs(prev => prev.map(p => p.id === pair.id ? { ...p, itemB: { ...p.itemB, status: 'error', error: err.message } } : p));
    }
  };

  const runAllPairs = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const pairsToProcess = [...pairs].filter(p => 
      (p.itemA.status !== 'completed' || p.itemB.status !== 'completed') && 
      p.itemA.sourceFile && p.itemB.sourceFile
    );

    for (const pair of pairsToProcess) {
      await processPair(pair);
    }

    setIsProcessing(false);
  };

  const runSinglePair = async (pairId: string) => {
    const pair = pairs.find(p => p.id === pairId);
    if (!pair || !pair.itemA.sourceFile || !pair.itemB.sourceFile) return;
    if (isProcessing) return;
    
    setIsProcessing(true);
    await processPair(pair);
    setIsProcessing(false);
  };

  const runLastDitchB = async (pairId: string) => {
    const pair = pairs.find(p => p.id === pairId);
    if (!pair || !pair.itemB.sourceFile || isProcessing) return;
    
    setIsProcessing(true);
    setPairs(prev => prev.map(p => p.id === pairId ? { ...p, itemB: { ...p.itemB, status: 'processing', error: undefined } } : p));
    
    try {
      const resultB = await generateStimulus(pair.itemB.sourceFile!, pair.promptA);
      setPairs(prev => prev.map(p => p.id === pairId ? { ...p, itemB: { ...p.itemB, status: 'completed', resultUrl: resultB } } : p));
    } catch (err: any) {
      if (err.message?.includes("API Key")) setHasApiKey(false);
      setPairs(prev => prev.map(p => p.id === pairId ? { ...p, itemB: { ...p.itemB, status: 'error', error: err.message } } : p));
    } finally {
      setIsProcessing(false);
    }
  };

  if (hasApiKey === false) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900">API Key Selection Required</h2>
          <p className="text-gray-500 text-sm">
            To use Gemini 3 Pro Image (Nano Banana Pro), you must select your own API key from a paid GCP project.
          </p>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-600 leading-relaxed text-left">
            <p className="font-bold mb-1">Important:</p>
            <p>Ensure your project has billing enabled. See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">billing documentation</a> for details.</p>
          </div>
          <button 
            onClick={handleOpenSelectKey}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-3">
          Psych<span className="text-blue-600">Stim</span> Pairs
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
          Batch generation for experimental stimulus sets. 
          Powered by <span className="text-blue-600 font-bold">Gemini 3 Pro Image</span>.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm sticky top-10">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Master Templates
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 block">Prompt Template A</label>
                <textarea 
                  value={promptA} 
                  onChange={(e) => setPromptA(e.target.value)}
                  className="w-full h-32 text-[10px] p-3 bg-gray-50 border-gray-100 rounded-xl resize-none focus:ring-1 focus:ring-blue-500 transition-all font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-purple-600 uppercase mb-1 block">Prompt Template B</label>
                <textarea 
                  value={promptB} 
                  onChange={(e) => setPromptB(e.target.value)}
                  className="w-full h-48 text-[10px] p-3 bg-gray-50 border-gray-100 rounded-xl resize-none focus:ring-1 focus:ring-purple-500 transition-all font-mono leading-relaxed"
                />
                <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-[9px] text-purple-700 font-medium">
                    <span className="font-bold">Placeholder:</span> Use <code className="bg-purple-200 px-1 rounded">(_)</code> to inject the Object Name. Individual overrides possible on cards.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
               <button 
                 onClick={runAllPairs}
                 disabled={isProcessing || stats.total === 0}
                 className={`w-full py-4 rounded-2xl font-black transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 shadow-xl ${
                   isProcessing || stats.total === 0 
                   ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                   : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                 }`}
               >
                 {isProcessing ? (
                   <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-[10px] uppercase">Processing...</span>
                   </>
                 ) : (
                   <>
                    <span className="text-lg uppercase tracking-tight">Generate Batch</span>
                    <span className="text-[9px] font-bold uppercase opacity-70 tracking-widest">{stats.completed} / {stats.total} Trials Ready</span>
                   </>
                 )}
               </button>
               <button 
                 onClick={handleOpenSelectKey}
                 className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold uppercase rounded-xl transition-colors"
               >
                 Change API Key
               </button>
            </div>
          </div>
        </aside>

        <main className="lg:col-span-3">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h2 className="text-xl font-bold text-gray-800">Experiment Trials</h2>
                <p className="text-xs text-gray-400">Labels and filenames (objXX) are customizable. Edit trial-specific Prompt B in each card.</p>
             </div>
             <button 
               onClick={addNewPair}
               className="px-6 py-2.5 bg-gray-900 text-white text-xs font-black rounded-full hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg shadow-gray-200"
             >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
               </svg>
               Add New Trial
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pairs.map((pair, idx) => (
              <PairCard 
                key={pair.id} 
                pair={pair} 
                index={idx}
                onRemove={removePair} 
                onUpload={handleUpload}
                onUpdateObjectName={updateObjectName}
                onUpdateObjectNumber={updateObjectNumber}
                onUpdatePairPromptB={updatePairPromptB}
                onRefresh={runSinglePair}
                onLastDitchB={runLastDitchB}
              />
            ))}
          </div>

          {pairs.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/50">
               <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                 <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
               </div>
               <h3 className="text-lg font-bold text-gray-400">Queue Empty</h3>
               <p className="text-sm text-gray-300">Start by adding a new stimulus trial</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
