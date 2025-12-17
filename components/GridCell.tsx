import React from 'react';
import { Cell, CellType } from '../types';
import { Skull, Flag, Ban } from 'lucide-react';

interface GridCellProps {
  cell: Cell;
  isPlayerHere: boolean;
}

const GridCell: React.FC<GridCellProps> = ({ cell, isPlayerHere }) => {
  const { type, isRevealed } = cell;

  // Next.js / Vercel Aesthetic
  // Updated: Slightly lighter grays for better visibility
  
  let bgColor = 'bg-black'; // Default empty
  let borderColor = 'border-neutral-800'; // Lightened from neutral-900
  let content = null;

  if (type === 'WALL') {
    bgColor = 'bg-neutral-800'; // Lightened from neutral-900
    // Minimalist wall: slightly lighter dot for texture
    content = <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />; 
  } else if (type === 'START') {
    bgColor = 'bg-blue-500/15'; // Slightly more visible
    borderColor = 'border-blue-500/30';
    if (!isPlayerHere) content = <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />;
  } else if (type === 'END') {
    bgColor = 'bg-white/10'; // Slightly more visible
    borderColor = 'border-white/20';
    content = <Flag className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-pulse" />;
  } else if (type === 'TRAP') {
    if (isRevealed) {
      bgColor = 'bg-red-500/15';
      borderColor = 'border-red-500/30';
      content = <Skull className="w-4 h-4 text-red-500" />;
    } else {
      // Hidden
      bgColor = 'bg-black'; 
    }
  }

  // Player overlay - A distinct glowing entity
  const playerOverlay = isPlayerHere ? (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div className="relative flex items-center justify-center">
        <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10" />
        <div className="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping opacity-20" />
      </div>
    </div>
  ) : null;

  return (
    <div
      className={`
        relative w-full h-full aspect-square border ${borderColor} ${bgColor} 
        flex items-center justify-center transition-all duration-300
      `}
    >
      {content}
      {playerOverlay}
    </div>
  );
};

export default React.memo(GridCell);