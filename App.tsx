import React, { useState, useEffect, useCallback, useRef } from 'react';
import GridCell from './components/GridCell';
import Controls from './components/Controls';
import LevelSelector from './components/LevelSelector';
import DevConsole from './components/DevConsole';
import { generateGrid } from './utils/gridGenerator';
import { Grid, Coordinate, GameStatus, Direction, GameMode, AILogEntry, AIAgentType } from './types';
import { GRID_SIZE } from './constants';
import { Skull, Trophy, ArrowRight, ChevronDown, Bot, Gamepad2, Play, Pause, Loader2, Terminal, Cpu, Move } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

const App: React.FC = () => {
  // Game State
  const [grid, setGrid] = useState<Grid>([]);
  const [playerPos, setPlayerPos] = useState<Coordinate>({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState<Coordinate>({ x: 0, y: 0 });
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLAYING);
  
  // Progression State
  const [level, setLevel] = useState(1);
  const [deaths, setDeaths] = useState(0);
  const [totalDeaths, setTotalDeaths] = useState(0);
  const [steps, setSteps] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  
  // UI State
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('MANUAL');
  const [isAIActive, setIsAIActive] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [aiThought, setAiThought] = useState<string>("");
  
  // AI Settings
  const [agentType, setAgentType] = useState<AIAgentType>(() => {
    return (localStorage.getItem('grid-world-agent-type') as AIAgentType) || 'GEMINI';
  });
  const [externalUrl, setExternalUrl] = useState(() => {
    return localStorage.getItem('grid-world-external-url') || '';
  });

  // Dev State
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [aiLogs, setAiLogs] = useState<AILogEntry[]>([]);

  // Refs for AI loop management
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('grid-world-agent-type', agentType);
  }, [agentType]);

  useEffect(() => {
    localStorage.setItem('grid-world-external-url', externalUrl);
  }, [externalUrl]);

  // Initialize Level
  const initLevel = useCallback((levelToLoad: number) => {
    const { grid: newGrid, start } = generateGrid(levelToLoad);
    setGrid(newGrid);
    setStartPos(start);
    setPlayerPos(start);
    setGameStatus(GameStatus.PLAYING);
    setDeaths(0); 
    setSteps(0);
    setIsAIActive(false);
    setAiThought("");
    setAiLogs([]);
  }, []);

  // Initial Load
  useEffect(() => {
    initLevel(level);
  }, [initLevel, level]);

  // Movement Logic
  const movePlayer = useCallback((direction: Direction) => {
    if (gameStatus !== GameStatus.PLAYING) return;

    setPlayerPos((prev) => {
      let next = { ...prev };
      switch (direction) {
        case 'UP': next.y -= 1; break;
        case 'DOWN': next.y += 1; break;
        case 'LEFT': next.x -= 1; break;
        case 'RIGHT': next.x += 1; break;
      }

      if (next.x < 0 || next.x >= GRID_SIZE || next.y < 0 || next.y >= GRID_SIZE) return prev;

      const targetCell = grid[next.y][next.x];
      if (targetCell.type === 'WALL') return prev;

      setSteps(s => s + 1);
      setTotalSteps(ts => ts + 1);

      if (targetCell.type === 'TRAP') {
        const newGrid = [...grid];
        newGrid[next.y][next.x] = { ...targetCell, isRevealed: true };
        setGrid(newGrid);
        setGameStatus(GameStatus.DIED);
        setDeaths(d => d + 1);
        setTotalDeaths(d => d + 1);
        setIsAIActive(false);
        return next;
      }

      if (targetCell.type === 'END') {
        setGameStatus(GameStatus.WON);
        setIsAIActive(false);
        return next;
      }

      return next;
    });
  }, [grid, gameStatus]);

  const handleTryAgain = useCallback(() => {
    setPlayerPos(startPos);
    setGameStatus(GameStatus.PLAYING);
    setSteps(0);
    setIsAIActive(false);
    setAiThought("");
  }, [startPos]);

  const handleNextLevel = useCallback(() => {
    const nextLevel = (level % 10) + 1;
    setLevel(nextLevel);
  }, [level]);

  const handleSelectLevel = useCallback((lvl: number) => {
    setLevel(lvl);
    setIsLevelSelectOpen(false);
  }, []);

  // --- AI Logic ---
  const fetchAIMove = async () => {
    setIsThinking(true);
    try {
      const walls: Coordinate[] = [];
      const knownTraps: Coordinate[] = [];
      let target: Coordinate = { x: 0, y: 0 };

      grid.forEach(row => {
        row.forEach(cell => {
          if (cell.type === 'WALL') walls.push({ x: cell.x, y: cell.y });
          if (cell.type === 'TRAP' && cell.isRevealed) knownTraps.push({ x: cell.x, y: cell.y });
          if (cell.type === 'END') target = { x: cell.x, y: cell.y };
        });
      });

      const prompt = `
        AI in Grid World. Position: (${playerPos.x},${playerPos.y}), Target: (${target.x},${target.y}).
        Grid: 10x10. Walls: ${JSON.stringify(walls)}. Revealed Traps: ${JSON.stringify(knownTraps)}.
        Rule: Must avoid walls and traps. Return JSON: {"direction": "UP"|"DOWN"|"LEFT"|"RIGHT", "reasoning": "short string"}
      `;

      let direction: Direction;
      let reasoning: string;

      if (agentType === 'GEMINI') {
        if (!process.env.API_KEY) throw new Error("No API Key");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                direction: { type: Type.STRING, enum: ['UP', 'DOWN', 'LEFT', 'RIGHT'] },
                reasoning: { type: Type.STRING }
              }
            }
          }
        });
        const result = JSON.parse(response.text);
        direction = result.direction as Direction;
        reasoning = result.reasoning;
      } else {
        if (!externalUrl) throw new Error("URL not set");
        const response = await fetch(externalUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const result = await response.json();
        direction = result.direction as Direction;
        reasoning = result.reasoning;
      }

      setAiThought(reasoning);
      setAiLogs(prev => [
        ...prev, 
        {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          direction,
          reasoning,
          position: { ...playerPos },
          agent: agentType
        }
      ]);
      movePlayer(direction);
    } catch (error: any) {
      console.error(error);
      setAiThought(`Error: ${error.message}`);
      setIsAIActive(false);
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    if (isAIActive && gameStatus === GameStatus.PLAYING && !isThinking) {
      aiTimeoutRef.current = setTimeout(() => fetchAIMove(), 600);
    }
    return () => { if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current); };
  }, [isAIActive, gameStatus, isThinking, playerPos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameMode === 'MANUAL' && gameStatus === GameStatus.PLAYING) {
        switch (e.key) {
          case 'ArrowUp': case 'w': case 'W': movePlayer('UP'); break;
          case 'ArrowDown': case 's': case 'S': movePlayer('DOWN'); break;
          case 'ArrowLeft': case 'a': case 'A': movePlayer('LEFT'); break;
          case 'ArrowRight': case 'd': case 'D': movePlayer('RIGHT'); break;
        }
      }
      if (e.key === 'Enter') {
        if (gameStatus === GameStatus.DIED) handleTryAgain();
        else if (gameStatus === GameStatus.WON) handleNextLevel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, gameStatus, handleTryAgain, handleNextLevel, gameMode]);

  return (
    <div className={`min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans selection:bg-white selection:text-black transition-[padding] duration-300 ${isDevToolsOpen ? 'lg:pr-[400px]' : ''}`}>
      
      <div className="fixed inset-0 z-0 pointer-events-none" 
           style={{
             backgroundImage: 'radial-gradient(circle at 1px 1px, #333 1px, transparent 0)',
             backgroundSize: '40px 40px',
             opacity: 0.6
           }}
      />

      <DevConsole 
        isOpen={isDevToolsOpen}
        onClose={() => setIsDevToolsOpen(false)}
        logs={aiLogs}
        grid={grid}
        agentType={agentType}
        setAgentType={setAgentType}
        externalUrl={externalUrl}
        setExternalUrl={setExternalUrl}
      />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
        
        <header className="w-full flex justify-between items-end mb-8 px-2 max-w-[450px] md:max-w-full">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/80">
              Grid World
            </h1>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsLevelSelectOpen(true)}
                className="group flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold tracking-wider uppercase bg-white/10 text-white/90 border border-white/10 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
              >
                Sector {level}
                <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>

              <div className="flex bg-neutral-900 rounded-lg p-0.5 border border-neutral-800">
                <button
                  onClick={() => { setGameMode('MANUAL'); setIsAIActive(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all ${gameMode === 'MANUAL' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-white'}`}
                >
                  <Gamepad2 className="w-3 h-3" />
                  Manual
                </button>
                <button
                  onClick={() => setGameMode('AI')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all ${gameMode === 'AI' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-white'}`}
                >
                  <Bot className="w-3 h-3" />
                  Agent
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Attempt</span>
                <div className="flex items-center gap-4 text-white font-mono">
                  <div className="flex items-center gap-1.5">
                    <Skull className="w-3 h-3 text-red-500/60" />
                    <span>{deaths}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Move className="w-3 h-3 text-blue-500/60" />
                    <span>{steps}</span>
                  </div>
                </div>
              </div>
              <div className="w-px h-10 bg-neutral-800" />
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Session</span>
                 <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-neutral-300 font-mono text-[11px] leading-tight">
                      <Skull className="w-2.5 h-2.5 text-neutral-600" />
                      <span>{totalDeaths}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-300 font-mono text-[11px] leading-tight">
                      <Move className="w-2.5 h-2.5 text-neutral-600" />
                      <span>{totalSteps}</span>
                    </div>
                 </div>
              </div>
            </div>
            <button 
              onClick={() => setIsDevToolsOpen(true)}
              className={`flex items-center gap-1.5 text-[10px] transition-colors uppercase tracking-widest ${isDevToolsOpen ? 'text-green-400 font-bold' : 'text-neutral-500 hover:text-green-400'}`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Dev Console</span>
            </button>
          </div>
        </header>

        <div className="relative p-1 rounded-2xl bg-neutral-900/40 ring-1 ring-white/10 shadow-2xl backdrop-blur-sm">
          {isLevelSelectOpen && (
            <LevelSelector 
              currentLevel={level}
              onSelectLevel={handleSelectLevel}
              onClose={() => setIsLevelSelectOpen(false)}
            />
          )}

          <div 
            className="grid gap-px bg-neutral-800 border border-neutral-800 rounded-xl overflow-hidden"
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              width: 'min(88vw, 450px)',
              height: 'min(88vw, 450px)'
            }}
          >
            {grid.map((row, y) => (
              row.map((cell, x) => (
                <GridCell 
                  key={`${x}-${y}`} 
                  cell={cell} 
                  isPlayerHere={playerPos.x === x && playerPos.y === y}
                />
              ))
            ))}
          </div>
          
          {gameStatus === GameStatus.DIED && !isLevelSelectOpen && !isDevToolsOpen && (
            <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center rounded-xl animate-in fade-in duration-300">
              <div className="p-8 bg-black border border-white/20 rounded-2xl flex flex-col items-center shadow-2xl max-w-[80%] text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/30">
                    <Skull className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Terminated</h2>
                <p className="text-neutral-400 text-sm mb-6">Trap detected. Memory persistence active.</p>
                <button 
                  onClick={handleTryAgain}
                  className="group relative px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-2"
                >
                  Try Again
                  <span className="opacity-40 text-[10px] px-1.5 py-0.5 border border-black/20 rounded ml-1 group-hover:border-black/40">↵</span>
                </button>
              </div>
            </div>
          )}

          {gameStatus === GameStatus.WON && !isLevelSelectOpen && !isDevToolsOpen && (
            <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center rounded-xl animate-in fade-in duration-300">
               <div className="p-8 bg-black border border-white/20 rounded-2xl flex flex-col items-center shadow-2xl max-w-[80%] text-center">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4 border border-white/30">
                    <Trophy className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Complete</h2>
                <p className="text-neutral-400 text-sm mb-6">Sector cleared. Proceed to next sector.</p>
                <button 
                  onClick={handleNextLevel}
                  className="group relative px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-2"
                >
                  Next Sector
                  <ArrowRight className="w-4 h-4" />
                  <span className="opacity-40 text-[10px] px-1.5 py-0.5 border border-black/20 rounded ml-1 group-hover:border-black/40">↵</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-full flex justify-center mt-8 min-h-[170px] items-start">
          {gameMode === 'MANUAL' ? (
             <Controls 
               onMove={movePlayer} 
               disabled={gameStatus !== GameStatus.PLAYING} 
             />
          ) : (
            <div className="flex flex-col items-center w-full max-w-[450px]">
              <div className="flex items-center gap-4 mb-5">
                <button
                  onClick={() => setIsAIActive(!isAIActive)}
                  disabled={gameStatus !== GameStatus.PLAYING}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all shadow-lg
                    ${isAIActive 
                      ? 'bg-neutral-800 text-white border border-neutral-700 hover:bg-neutral-700' 
                      : 'bg-white text-black hover:bg-neutral-200'}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isAIActive ? <><Pause className="w-4 h-4 fill-current" /> Stop AI</> : <><Play className="w-4 h-4 fill-current" /> Launch AI</>}
                </button>
                
                <div className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${agentType === 'GEMINI' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
                   {agentType === 'GEMINI' ? <Bot className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
                   {agentType}
                </div>
              </div>
              
              <div className="w-full bg-neutral-900/60 border border-white/5 rounded-xl p-4 text-xs font-mono min-h-[70px] flex items-center justify-center text-center text-neutral-500 leading-relaxed">
                {isThinking ? (
                  <span className="flex items-center gap-2 text-white animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {agentType === 'GEMINI' ? 'Processing grid coordinates...' : 'External server thinking...'}
                  </span>
                ) : aiThought ? (
                  <span className={aiThought.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}>"{aiThought}"</span>
                ) : (
                  "Ready for autonomous navigation."
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="mt-8 mb-4 text-center">
           <p className="text-[10px] text-neutral-700 font-bold tracking-[0.2em] uppercase">
             {gameMode === 'AI' ? `${agentType} API ACTIVE` : 'MANUAL OVERRIDE ENGAGED'}
           </p>
        </footer>

      </div>
    </div>
  );
};

export default App;