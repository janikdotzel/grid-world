import React from 'react';
import { Lock } from 'lucide-react';

interface LevelSelectorProps {
  currentLevel: number;
  maxReachedLevel: number;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ currentLevel, maxReachedLevel, onSelectLevel, onClose }) => {
  // Generate a list of levels to display. 
  // We show up to the next row of 5 from the max reached level to hint at progress.
  const displayLimit = Math.max(15, Math.ceil((maxReachedLevel + 1) / 5) * 5);
  const levels = Array.from({ length: displayLimit }, (_, i) => i + 1);

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 rounded-2xl">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
        
        <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Select Sector</h2>
        <p className="text-xs text-neutral-500 mb-6 uppercase tracking-widest">Clear levels to unlock</p>
        
        <div className="grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          {levels.map((lvl) => {
            const isUnlocked = lvl <= maxReachedLevel;
            const isCurrent = lvl === currentLevel;
            
            return (
              <button
                key={lvl}
                disabled={!isUnlocked}
                onClick={() => {
                  if (isUnlocked) {
                    onSelectLevel(lvl);
                  }
                }}
                className={`
                  aspect-square rounded-md flex flex-col items-center justify-center text-sm font-bold transition-all duration-200
                  ${isCurrent 
                    ? 'bg-white text-black border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.3)] scale-105' 
                    : isUnlocked 
                      ? 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-500 hover:bg-neutral-800 hover:text-white' 
                      : 'bg-black text-neutral-800 border border-neutral-900 cursor-not-allowed opacity-50'}
                `}
              >
                {isUnlocked ? (
                  <span>{lvl}</span>
                ) : (
                  <Lock className="w-3 h-3 opacity-30" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LevelSelector;