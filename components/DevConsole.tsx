import React, { useMemo, useState } from 'react';
import { X, Terminal, Map, Activity, Bug, Settings, Globe, Cpu } from 'lucide-react';
import { Grid, AILogEntry, AIAgentType } from '../types';

interface DevConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AILogEntry[];
  grid: Grid;
  agentType: AIAgentType;
  setAgentType: (type: AIAgentType) => void;
  externalUrl: string;
  setExternalUrl: (url: string) => void;
}

const DevConsole: React.FC<DevConsoleProps> = ({ 
  isOpen, 
  onClose, 
  logs, 
  grid, 
  agentType, 
  setAgentType, 
  externalUrl, 
  setExternalUrl 
}) => {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'MAP' | 'SETTINGS'>('LOGS');

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
          Logs
        </button>
        <button
          onClick={() => setActiveTab('MAP')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'MAP' ? 'border-blue-500 text-blue-500 bg-blue-500/5' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
        >
          World
        </button>
        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'SETTINGS' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
        >
          Settings
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
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${log.agent === 'GEMINI' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                      {log.agent}
                    </span>
                    <span className="text-white font-bold bg-neutral-800 px-1.5 rounded">
                      {log.direction}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 mb-2">
                    <Activity className="w-3 h-3 mt-0.5 text-neutral-400 shrink-0" />
                    <p className="text-neutral-300 leading-relaxed">{log.reasoning}</p>
                  </div>
                  <div className="text-neutral-600 mt-2 pt-2 border-t border-neutral-800/50 flex justify-between">
                    <span>Pos: ({log.position.x}, {log.position.y})</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'MAP' && (
          <div className="flex flex-col gap-6">
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
                      <span className="text-[10px] uppercase">{trap.revealed ? 'REV' : 'HID'}</span>
                    </div>
                  ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SETTINGS' && (
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3 text-neutral-400 uppercase tracking-widest font-bold">
                <Cpu className="w-3 h-3" />
                AI Configuration
              </div>
              <div className="space-y-4 bg-neutral-900 rounded border border-neutral-800 p-4">
                <div>
                  <label className="block text-[10px] text-neutral-500 uppercase mb-2">Agent Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAgentType('GEMINI')}
                      className={`flex-1 py-2 rounded border transition-all ${agentType === 'GEMINI' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-neutral-800 text-neutral-500'}`}
                    >
                      Gemini
                    </button>
                    <button
                      onClick={() => setAgentType('EXTERNAL')}
                      className={`flex-1 py-2 rounded border transition-all ${agentType === 'EXTERNAL' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'border-neutral-800 text-neutral-500'}`}
                    >
                      External
                    </button>
                  </div>
                </div>

                {agentType === 'EXTERNAL' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-[10px] text-neutral-500 uppercase mb-2">Agent URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-600" />
                      <input
                        type="text"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://your-agent.com/api/move"
                        className="w-full bg-black border border-neutral-800 rounded py-2 pl-9 pr-3 text-neutral-300 focus:outline-none focus:border-yellow-500 transition-colors"
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-neutral-600 leading-relaxed italic">
                      Request: POST payload &#123; "prompt": string &#125;<br/>
                      Expects: &#123; "direction": "UP"|"DOWN"|..., "reasoning": string &#125;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevConsole;