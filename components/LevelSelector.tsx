import React from 'react';

interface LevelSelectorProps {
  currentLevel: number;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ currentLevel, onSelectLevel, onClose }) => {
  // Always 10 fixed maps
  const levels = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 rounded-2xl">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-2"
          aria-label="Close"
        >
          ✕
        </button>
        
        <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Select Sector</h2>
        <p className="text-xs text-neutral-500 mb-6 uppercase tracking-widest">Select any sector to deploy</p>
        
        <div className="grid grid-cols-5 gap-3">
          {levels.map((lvl) => {
            const isCurrent = lvl === currentLevel;
            
            return (
              <button
                key={lvl}
                onClick={() => onSelectLevel(lvl)}
                className={`
                  aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200
                  ${isCurrent 
                    ? 'bg-white text-black border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105 z-10' 
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-500 hover:bg-neutral-800 hover:text-white'}
                `}
              >
                {lvl}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LevelSelector;