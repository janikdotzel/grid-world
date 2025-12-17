import React, { useState, useEffect, useCallback, useRef } from 'react';
import GridCell from './components/GridCell';
import Controls from './components/Controls';
import LevelSelector from './components/LevelSelector';
import { generateGrid } from './utils/gridGenerator';
import { Grid, Coordinate, GameStatus, Direction, GameMode } from './types';
import { GRID_SIZE } from './constants';
import { Skull, Trophy, ArrowRight, ChevronDown, Bot, Gamepad2, Play, Pause, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

const App: React.FC = () => {
  // Game State
  const [grid, setGrid] = useState<Grid>([]);
  const [playerPos, setPlayerPos] = useState<Coordinate>({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState<Coordinate>({ x: 0, y: 0 });
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLAYING);
  
  // Progression State
  const [level, setLevel] = useState(1);
  const [maxReachedLevel, setMaxReachedLevel] = useState(1);
  const [deaths, setDeaths] = useState(0);
  const [totalDeaths, setTotalDeaths] = useState(0);
  
  // UI State
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('MANUAL');
  const [isAIActive, setIsAIActive] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [aiThought, setAiThought] = useState<string>("");

  // Refs for AI loop management
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Level
  const initLevel = useCallback(() => {
    const { grid: newGrid, start, end } = generateGrid();
    setGrid(newGrid);
    setStartPos(start);
    setPlayerPos(start);
    setGameStatus(GameStatus.PLAYING);
    setDeaths(0); 
    setIsAIActive(false);
    setAiThought("");
  }, []);

  // Initial Load
  useEffect(() => {
    initLevel();
  }, [initLevel]);

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

      // 1. Boundary Check
      if (next.x < 0 || next.x >= GRID_SIZE || next.y < 0 || next.y >= GRID_SIZE) {
        return prev;
      }

      const targetCell = grid[next.y][next.x];

      // 2. Wall Check
      if (targetCell.type === 'WALL') {
        return prev; // Bump into wall
      }

      // 3. Trap Check
      if (targetCell.type === 'TRAP') {
        // Reveal trap logic
        const newGrid = [...grid];
        newGrid[next.y][next.x] = { ...targetCell, isRevealed: true };
        setGrid(newGrid);
        setGameStatus(GameStatus.DIED);
        setDeaths(d => d + 1);
        setTotalDeaths(d => d + 1);
        setIsAIActive(false); // Stop AI on death
        return next; // Move onto the trap (and die)
      }

      // 4. End Check
      if (targetCell.type === 'END') {
        setGameStatus(GameStatus.WON);
        setIsAIActive(false); // Stop AI on win
        return next;
      }

      // 5. Normal Move
      return next;
    });
  }, [grid, gameStatus]);

  // Restart after death (keep map)
  const handleTryAgain = useCallback(() => {
    setPlayerPos(startPos);
    setGameStatus(GameStatus.PLAYING);
    setIsAIActive(false);
    setAiThought("");
  }, [startPos]);

  // Next Level (new map)
  const handleNextLevel = useCallback(() => {
    const nextLevel = level + 1;
    setLevel(nextLevel);
    if (nextLevel > maxReachedLevel) {
      setMaxReachedLevel(nextLevel);
    }
    initLevel();
  }, [level, maxReachedLevel, initLevel]);

  // Select specific level
  const handleSelectLevel = useCallback((lvl: number) => {
    setLevel(lvl);
    setIsLevelSelectOpen(false);
    initLevel();
  }, [initLevel]);

  // --- AI Logic ---

  const fetchAIMove = async () => {
    if (!process.env.API_KEY) {
      setAiThought("Error: No API Key found.");
      setIsAIActive(false);
      return;
    }

    setIsThinking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Locate static obstacles and dynamic hazards
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
        You are an AI playing a Grid World game.
        Grid Size: ${GRID_SIZE}x${GRID_SIZE}.
        Current Position: {x: ${playerPos.x}, y: ${playerPos.y}}.
        Target Position: {x: ${target.x}, y: ${target.y}}.
        Walls (Impassable): ${JSON.stringify(walls)}.
        Known Traps (Fatal): ${JSON.stringify(knownTraps)}.
        
        Task: Provide the next single move to get closer to the Target.
        Rules:
        1. Do not move into a Wall.
        2. Do not move into a Known Trap.
        3. Do not move out of bounds (0-9).
        
        Return a JSON object with the "direction" (UP, DOWN, LEFT, RIGHT) and a short "reasoning".
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
      setAiThought(result.reasoning);
      movePlayer(result.direction as Direction);

    } catch (error) {
      console.error("AI Error:", error);
      setAiThought("Connection error. Stopping.");
      setIsAIActive(false);
    } finally {
      setIsThinking(false);
    }
  };

  // AI Loop
  useEffect(() => {
    if (isAIActive && gameStatus === GameStatus.PLAYING && !isThinking) {
      // Add a small delay for visual pacing
      aiTimeoutRef.current = setTimeout(() => {
        fetchAIMove();
      }, 600);
    }
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [isAIActive, gameStatus, isThinking, playerPos]); // Re-run when player moves


  // Keyboard Listeners (Only in Manual Mode)
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

      // Game state controls
      if (e.key === 'Enter') {
        if (gameStatus === GameStatus.DIED) {
          handleTryAgain();
        } else if (gameStatus === GameStatus.WON) {
          handleNextLevel();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, gameStatus, handleTryAgain, handleNextLevel, gameMode]);

  // Render
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans selection:bg-white selection:text-black">
      
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none" 
           style={{
             backgroundImage: 'radial-gradient(circle at 1px 1px, #333 1px, transparent 0)',
             backgroundSize: '40px 40px',
             opacity: 0.6
           }}
      />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
        
        {/* Header */}
        <header className="w-full flex justify-between items-end mb-8 px-2 max-w-[450px] md:max-w-full">
          <div className="flex flex-col gap-3">
             {/* Gradient Text Title */}
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/80">
              Grid World
            </h1>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsLevelSelectOpen(true)}
                className="group flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-white/10 text-white/90 border border-white/10 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer"
              >
                Sector {level}
                <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Mode Toggle */}
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
                  API Mode
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">Current Run</span>
              <div className="flex items-center gap-2 text-white font-mono">
                <Skull className="w-3 h-3 text-neutral-400" />
                <span>{deaths}</span>
              </div>
            </div>
            <div className="w-px h-8 bg-neutral-800" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">Total</span>
               <span className="text-neutral-200 font-mono">{totalDeaths}</span>
            </div>
          </div>
        </header>

        {/* Main Game Card */}
        <div className="relative p-1 rounded-2xl bg-neutral-900/40 ring-1 ring-white/20 shadow-2xl backdrop-blur-sm">
          
          {/* Level Selector Overlay */}
          {isLevelSelectOpen && (
            <LevelSelector 
              currentLevel={level}
              maxReachedLevel={maxReachedLevel}
              onSelectLevel={handleSelectLevel}
              onClose={() => setIsLevelSelectOpen(false)}
            />
          )}

          {/* The Grid */}
          <div 
            className="grid gap-px bg-neutral-800 border border-neutral-800 rounded-xl overflow-hidden"
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              width: 'min(85vw, 450px)',
              height: 'min(85vw, 450px)'
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

          {/* Game Over / Win Overlays */}
          
          {gameStatus === GameStatus.DIED && !isLevelSelectOpen && (
            <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center rounded-xl animate-in fade-in duration-300">
              <div className="p-8 bg-black border border-white/20 rounded-2xl flex flex-col items-center shadow-2xl max-w-[80%] text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/30">
                    <Skull className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Terminated</h2>
                <p className="text-neutral-300 text-sm mb-6">
                  Trap detected. <br/> Memory persistence active.
                </p>
                <button 
                  onClick={handleTryAgain}
                  className="group relative px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-2"
                >
                  Try Again
                  <span className="opacity-50 text-[10px] px-1.5 py-0.5 border border-black/20 rounded ml-1 group-hover:border-black/40">
                    ↵
                  </span>
                </button>
              </div>
            </div>
          )}

          {gameStatus === GameStatus.WON && !isLevelSelectOpen && (
            <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center rounded-xl animate-in fade-in duration-300">
               <div className="p-8 bg-black border border-white/20 rounded-2xl flex flex-col items-center shadow-2xl max-w-[80%] text-center">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4 border border-white/30">
                    <Trophy className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Complete</h2>
                <p className="text-neutral-300 text-sm mb-6">
                  Sector cleared. Proceed to next level.
                </p>
                <button 
                  onClick={handleNextLevel}
                  className="group relative px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-2"
                >
                  Next Level
                  <ArrowRight className="w-4 h-4" />
                  <span className="opacity-50 text-[10px] px-1.5 py-0.5 border border-black/20 rounded ml-1 group-hover:border-black/40">
                    ↵
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls / AI Status */}
        <div className="w-full flex justify-center h-32">
          {gameMode === 'MANUAL' ? (
             <Controls 
               onMove={movePlayer} 
               disabled={gameStatus !== GameStatus.PLAYING} 
             />
          ) : (
            <div className="mt-6 flex flex-col items-center w-full max-w-[450px]">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setIsAIActive(!isAIActive)}
                  disabled={gameStatus !== GameStatus.PLAYING}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all
                    ${isAIActive 
                      ? 'bg-neutral-800 text-white border border-neutral-700 hover:bg-neutral-700' 
                      : 'bg-white text-black hover:bg-neutral-200'}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isAIActive ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" /> Pause Autopilot
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" /> Start Autopilot
                    </>
                  )}
                </button>
              </div>
              
              {/* AI Thought Process Log */}
              <div className="w-full bg-neutral-900/50 border border-white/5 rounded-lg p-3 text-xs font-mono min-h-[60px] flex items-center justify-center text-center text-neutral-400">
                {isThinking ? (
                  <span className="flex items-center gap-2 text-white animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Analyzing grid topology...
                  </span>
                ) : aiThought ? (
                  <span className="text-emerald-400">"{aiThought}"</span>
                ) : (
                  "Ready to initiate navigation sequence."
                )}
              </div>
            </div>
          )}
        </div>

         {/* Footer */}
        <div className="mt-4 text-center">
           <p className="text-xs text-neutral-500 font-medium tracking-widest">
             {gameMode === 'AI' ? 'GEMINI API ACTIVE' : 'MANUAL OVERRIDE ENGAGED'}
           </p>
        </div>

      </div>
    </div>
  );
};

export default App;