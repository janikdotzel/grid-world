import { Cell, CellType, Coordinate, Grid } from '../types';
import { GRID_SIZE, WALL_DENSITY, TRAP_DENSITY } from '../constants';

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
          // If treating traps as walls, we can't pass through them.
          // Otherwise, we only block on actual walls.
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

export const generateGrid = (): { grid: Grid; start: Coordinate; end: Coordinate } => {
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

    // 2. Place Start and End
    // Ensure they aren't the same and ideally somewhat far apart (optional, but better UX)
    const start: Coordinate = { x: 0, y: 0 }; 
    const end: Coordinate = { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };

    // Randomize slightly if desired, but corners are classic. 
    // Let's stick to random positions for variety as per "Grid World" roguelike feel.
    const randomPos = () => ({
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    });

    let s = randomPos();
    let e = randomPos();
    while (s.x === e.x && s.y === e.y) {
      e = randomPos();
    }
    
    grid[s.y][s.x].type = 'START';
    grid[e.y][e.x].type = 'END';

    // 3. Place Walls
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x].type === 'EMPTY' && Math.random() < WALL_DENSITY) {
          grid[y][x].type = 'WALL';
        }
      }
    }

    // 4. Check connectivity (ignoring traps first)
    // If we can't even walk without traps, the wall layout is bad.
    if (!hasPath(grid, s, e, false)) continue;

    // 5. Place Traps
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x].type === 'EMPTY' && Math.random() < TRAP_DENSITY) {
          grid[y][x].type = 'TRAP';
        }
      }
    }

    // 6. Final Solvability Check
    // We want to ensure there is at least ONE path that is completely safe.
    // The prompt says "learn and avoid", which implies there IS a way to avoid.
    if (hasPath(grid, s, e, true)) {
      return { grid, start: s, end: e };
    }
    
    // If not solvable, the loop continues and regenerates
  }

  // Fallback (should effectively never happen with decent density values)
  return generateGrid();
};