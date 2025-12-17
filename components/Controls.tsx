import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Direction } from '../types';

interface ControlsProps {
  onMove: (dir: Direction) => void;
  disabled: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onMove, disabled }) => {
  // Minimalist button style: dark background, subtle border, white icon
  // Reduced padding (p-3) for more compact layout
  const btnClass = "p-3 bg-black border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-900 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed group shadow-sm";
  
  // Reduced icon size
  const iconClass = "w-5 h-5 text-neutral-200 group-hover:text-white transition-colors";

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <button 
        className={btnClass} 
        onClick={() => onMove('UP')}
        disabled={disabled}
        aria-label="Move Up"
      >
        <ChevronUp className={iconClass} />
      </button>
      <div className="flex gap-2">
        <button 
          className={btnClass} 
          onClick={() => onMove('LEFT')}
          disabled={disabled}
          aria-label="Move Left"
        >
          <ChevronLeft className={iconClass} />
        </button>
        <button 
          className={btnClass} 
          onClick={() => onMove('DOWN')}
          disabled={disabled}
          aria-label="Move Down"
        >
          <ChevronDown className={iconClass} />
        </button>
        <button 
          className={btnClass} 
          onClick={() => onMove('RIGHT')}
          disabled={disabled}
          aria-label="Move Right"
        >
          <ChevronRight className={iconClass} />
        </button>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-2 font-medium">Navigation</p>
    </div>
  );
};

export default Controls;