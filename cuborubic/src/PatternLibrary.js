// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Pattern Library
// Famous Rubik's Cube patterns with move sequences
// ═══════════════════════════════════════════════════════════════════

export const patterns = [
  {
    name: 'Checkerboard',
    algorithm: "U2 D2 F2 B2 L2 R2",
    description: 'Classic alternating color pattern',
  },
  {
    name: 'Cube in a Cube',
    algorithm: "F L F U' R U F2 L2 U' L' B D' B' L2 U",
    description: 'Nested cube illusion',
  },
  {
    name: 'Anaconda',
    algorithm: "L U B' U' R L' B R' F B' D R D' F'",
    description: 'Snake-like pattern on all faces',
  },
  {
    name: 'Python',
    algorithm: "F2 R' B' U R' L F' L F' B D' R B L2",
    description: 'Twisted serpent pattern',
  },
  {
    name: 'Tetris',
    algorithm: "L R F B U' D' L' R'",
    description: 'T-shaped blocks on all faces',
  },
  {
    name: 'Plus/Minus',
    algorithm: "U2 D2 F2 B2",
    description: 'Plus signs on four faces',
  },
  {
    name: 'Wire',
    algorithm: "R L U2 F2 D2 F2 U2 R' L'",
    description: 'Cross-wire pattern',
  },
  {
    name: 'Spiral',
    algorithm: "L' B' D U R U' R' D2 R2 D L D' L' R' F U",
    description: 'Spiral staircase pattern',
  },
];
