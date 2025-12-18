export type CellType = 'EMPTY' | 'WALL' | 'TRAP' | 'START' | 'END';

export interface Coordinate {
  x: number;
  y: number;
}

export interface Cell {
  x: number;
  y: number;
  type: CellType;
  isRevealed: boolean; // Primarily for traps. Walls are always visible.
}

export type Grid = Cell[][];

export enum GameStatus {
  PLAYING = 'PLAYING',
  DIED = 'DIED',
  WON = 'WON',
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameMode = 'MANUAL' | 'AI';

export type AIAgentType = 'GEMINI' | 'EXTERNAL';

export interface AILogEntry {
  id: number;
  timestamp: string;
  direction: Direction;
  reasoning: string;
  position: Coordinate;
  agent: AIAgentType;
}