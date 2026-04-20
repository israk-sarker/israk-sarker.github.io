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
    name: 'Superflip',
    algorithm: "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2",
    description: 'All edges flipped in place — the most famous pattern',
  },
  {
    name: 'Cube in a Cube',
    algorithm: "F L F U' R U F2 L2 U' L' B D' B' L2 U",
    description: 'Nested cube illusion',
  },
  {
    name: 'Cube in Cube in Cube',
    algorithm: "U' L' U' F' R2 B' R F U B2 U B' L U' F U R F'",
    description: 'Triple nested cube illusion',
  },
  {
    name: 'Flowers',
    algorithm: "U D' R L' F B' U D'",
    description: 'Flower pattern on every face',
  },
  {
    name: '6 Spots',
    algorithm: "U D' R L' F B' U D' R L' F B' U D' R L' F B'",
    description: 'Center dot pattern on all faces',
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
