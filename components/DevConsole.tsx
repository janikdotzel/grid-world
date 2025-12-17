import React, { useMemo, useState } from 'react';
import { X, Terminal, Map, Activity, Bug } from 'lucide-react';
import { Grid, AILogEntry } from '../types';

interface DevConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AILogEntry[];
  grid: Grid;
}

const DevConsole: React.FC<DevConsoleProps> = ({ isOpen, onClose, logs, grid }) => {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'MAP'>('LOGS');

  // Derive map data
  const mapData = useMemo(() => {
    const walls: string[] = [];
    const traps: { pos: string; revealed: boolean }[] = [];
    
    grid.forEach(row => {
      row.forEach(cell => {
        const coord = `(${cell.x}, ${cell.y})`;
        if (cell.type === 'WALL') walls.push(coord);
        if (cell.type === 'TRAP') traps.push({ pos: coord, revealed: cell.isRevealed });
      });
    });
    return { walls, traps };
  }, [grid]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[400px] bg-black/95 border-l border-neutral-800 shadow-2xl backdrop-blur-sm flex flex-col font-mono text-xs animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-2 text-green-500">
          <Terminal className="w-4 h-4" />
          <span className="font-bold tracking-wider uppercase">Dev_Console</span>
        </div>
        <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => setActiveTab('LOGS')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'LOGS' ? 'border-green-500 text-green-500 bg-green-500/5' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
        >
          AI Logs
        </button>
        <button
          onClick={() => setActiveTab('MAP')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'MAP' ? 'border-blue-500 text-blue-500 bg-blue-500/5' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
        >
          World State
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        
        {activeTab === 'LOGS' && (
          <div className="flex flex-col gap-4">
            {logs.length === 0 ? (
              <div className="text-neutral-600 italic text-center py-10">No AI activity recorded.</div>
            ) : (
              [...logs].reverse().map((log) => (
                <div key={log.id} className="border border-neutral-800 bg-neutral-900/30 rounded p-3">
                  <div className="flex justify-between items-start mb-2 text-neutral-500">
                    <span>[{log.timestamp}]</span>
                    <span className="text-white font-bold bg-neutral-800 px-1.5 rounded">
                      {log.direction}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 mb-2">
                    <Activity className="w-3 h-3 mt-0.5 text-neutral-400 shrink-0" />
                    <p className="text-neutral-300 leading-relaxed">{log.reasoning}</p>
                  </div>
                  <div className="text-neutral-600 mt-2 pt-2 border-t border-neutral-800/50 flex gap-4">
                    <span>Pos: ({log.position.x}, {log.position.y})</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'MAP' && (
          <div className="flex flex-col gap-6">
            
            {/* Walls */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-neutral-400 uppercase tracking-widest font-bold">
                <Map className="w-3 h-3" />
                Walls ({mapData.walls.length})
              </div>
              <div className="bg-neutral-900 rounded border border-neutral-800 p-3">
                <div className="flex flex-wrap gap-2">
                  {mapData.walls.map((pos, i) => (
                    <span key={i} className="bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">
                      {pos}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Traps */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-red-400 uppercase tracking-widest font-bold">
                <Bug className="w-3 h-3" />
                Traps ({mapData.traps.length})
              </div>
              <div className="bg-neutral-900 rounded border border-neutral-800 p-3">
                 <div className="grid grid-cols-2 gap-2">
                  {mapData.traps.map((trap, i) => (
                    <div key={i} className={`flex items-center justify-between px-2 py-1 rounded border ${trap.revealed ? 'border-red-900 bg-red-900/10 text-red-400' : 'border-neutral-800 bg-neutral-950 text-neutral-600'}`}>
                      <span>{trap.pos}</span>
                      <span className="text-[10px] uppercase">{trap.revealed ? 'REVEALED' : 'HIDDEN'}</span>
                    </div>
                  ))}
                 </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default DevConsole;