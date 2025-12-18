import { Cell, CellType, Coordinate, Grid } from '../types';
import { GRID_SIZE, WALL_DENSITY, TRAP_DENSITY } from '../constants';

// Simple seeded random number generator (Mulberry32)
// This ensures Level 1 is always the same "random" layout, etc.
const createSeededRandom = (seed: number) => {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

// BFS to check if a path exists
const hasPath = (grid: Grid, start: Coordinate, end: Coordinate, treatTrapsAsWalls: boolean): boolean => {
  const queue: Coordinate[] = [start];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.x === end.x && curr.y === end.y) return true;

    for (const [dx, dy] of dirs) {
      const nx = curr.x + dx;
      const ny = curr.y + dy;

      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        const key = `${nx},${ny}`;
        if (!visited.has(key)) {
          const cell = grid[ny][nx];
          const isBlocked = cell.type === 'WALL' || (treatTrapsAsWalls && cell.type === 'TRAP');
          
          if (!isBlocked) {
            visited.add(key);
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
  }
  return false;
};

export const generateGrid = (level: number): { grid: Grid; start: Coordinate; end: Coordinate } => {
  // We use the level number as a seed so the map is consistent for that level every time.
  const rand = createSeededRandom(level * 12345);
  let attempts = 0;
  
  while (attempts < 1000) {
    attempts++;
    
    // 1. Initialize empty grid
    const grid: Grid = Array.from({ length: GRID_SIZE }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => ({
        x,
        y,
        type: 'EMPTY',
        isRevealed: false,
      }))
    );

    // 2. Place Start and End deterministically for the seed
    const s: Coordinate = {
      x: Math.floor(rand() * 4), // Keep start in top-left quadrant
      y: Math.floor(rand() * 4),
    };
    let e: Coordinate = {
      x: Math.floor(GRID_SIZE - 1 - rand() * 4), // Keep end in bottom-right quadrant
      y: Math.floor(GRID_SIZE - 1 - rand() * 4),
    };
    
    while (s.x === e.x && s.y === e.y) {
      e.x = Math.floor(rand() * GRID_SIZE);
      e.y = Math.floor(rand() * GRID_SIZE);
    }
    
    grid[s.y][s.x].type = 'START';
    grid[e.y][e.x].type = 'END';

    // 3. Place Walls
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x].type === 'EMPTY' && rand() < WALL_DENSITY) {
          grid[y][x].type = 'WALL';
        }
      }
    }

    // 4. Check connectivity (ignoring traps first)
    if (!hasPath(grid, s, e, false)) continue;

    // 5. Place Traps
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x].type === 'EMPTY' && rand() < TRAP_DENSITY) {
          grid[y][x].type = 'TRAP';
        }
      }
    }

    // 6. Final Solvability Check
    if (hasPath(grid, s, e, true)) {
      return { grid, start: s, end: e };
    }
  }

  // Final fallback (failsafe)
  return generateGrid(level + 1);
};