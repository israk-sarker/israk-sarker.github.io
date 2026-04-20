// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Smart State Validator
// Validates painted cube state before sending to solver.
// Returns human-readable errors instead of cryptic solver crashes.
// ═══════════════════════════════════════════════════════════════════

/**
 * Cube facelet layout (54 chars, Kociemba order):
 *   U: 0-8, R: 9-17, F: 18-26, D: 27-35, L: 36-44, B: 45-53
 *   Center indices: U=4, R=13, F=22, D=31, L=40, B=49
 */

const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
const CENTER_IDX = { U: 4, R: 13, F: 22, D: 31, L: 40, B: 49 };

// All 12 edge positions as [facelet1, facelet2]
const EDGES = [
  [1, 46],  // UB
  [3, 37],  // UL
  [5, 10],  // UR
  [7, 19],  // UF
  [28, 25], // DF
  [30, 43], // DL
  [32, 16], // DR
  [34, 52], // DB
  [21, 14], // FR
  [23, 41], // FL
  [48, 12], // BR
  [50, 39], // BL
];

// All 8 corner positions as [facelet1, facelet2, facelet3]
const CORNERS = [
  [0, 47, 36], // UBL
  [2, 9, 45],  // UBR
  [6, 38, 18], // UFL
  [8, 20, 11], // UFR
  [27, 24, 44], // DFL
  [29, 15, 26], // DFR
  [33, 42, 53], // DBL
  [35, 51, 17], // DBR
];

// Valid edge color pairs (order-independent)
function getValidEdges() {
  // Each edge connects two adjacent faces
  const adjacent = [
    'UR', 'UF', 'UL', 'UB',
    'DR', 'DF', 'DL', 'DB',
    'FR', 'FL', 'BR', 'BL',
  ];
  return new Set(adjacent.map(e => [e[0], e[1]].sort().join('')));
}

// Valid corner color triples (order-independent)
function getValidCorners() {
  const corners = [
    'URF', 'UFL', 'ULB', 'UBR',
    'DFR', 'DLF', 'DBL', 'DRB',
  ];
  return new Set(corners.map(c => [...c].sort().join('')));
}

/**
 * Validate a 54-char facelet string.
 * @param {string} facelets — e.g. "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCubeState(facelets) {
  const errors = [];

  if (!facelets || facelets.length !== 54) {
    errors.push(`Invalid facelet string length: ${facelets?.length ?? 0} (expected 54)`);
    return { valid: false, errors };
  }

  // 1. Check that centers are all different faces
  const centers = {};
  for (const face of FACES) {
    const centerColor = facelets[CENTER_IDX[face]];
    if (centers[centerColor]) {
      errors.push(`Duplicate center color: ${colorName(centerColor)} appears on both ${centers[centerColor]} and ${face} centers`);
    }
    centers[centerColor] = face;
  }

  // Map colors back to face names using centers
  const colorToFace = {};
  for (const face of FACES) {
    colorToFace[facelets[CENTER_IDX[face]]] = face;
  }

  // 2. Count each color — must be exactly 9
  const counts = {};
  for (const ch of facelets) {
    counts[ch] = (counts[ch] || 0) + 1;
  }

  for (const [color, count] of Object.entries(counts)) {
    if (count !== 9) {
      errors.push(`${colorName(color)}: ${count} facelets (expected 9)`);
    }
  }

  const uniqueColors = Object.keys(counts);
  if (uniqueColors.length !== 6) {
    errors.push(`${uniqueColors.length} distinct colors found (expected 6)`);
  }

  // If basic counts are wrong, skip structural checks
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 3. Edge validation
  const validEdges = getValidEdges();
  const seenEdges = new Map();

  for (const [i, j] of EDGES) {
    const c1 = facelets[i];
    const c2 = facelets[j];
    const f1 = colorToFace[c1];
    const f2 = colorToFace[c2];

    if (!f1 || !f2) continue;

    const edgeKey = [f1, f2].sort().join('');

    if (!validEdges.has(edgeKey)) {
      errors.push(`Invalid edge: ${colorName(c1)}-${colorName(c2)} is not a valid edge combination`);
    }

    if (seenEdges.has(edgeKey)) {
      errors.push(`Duplicate edge: ${colorName(c1)}-${colorName(c2)} appears more than once`);
    }
    seenEdges.set(edgeKey, true);
  }

  // 4. Corner validation
  const validCorners = getValidCorners();
  const seenCorners = new Map();

  for (const [i, j, k] of CORNERS) {
    const c1 = facelets[i];
    const c2 = facelets[j];
    const c3 = facelets[k];
    const f1 = colorToFace[c1];
    const f2 = colorToFace[c2];
    const f3 = colorToFace[c3];

    if (!f1 || !f2 || !f3) continue;

    const cornerKey = [f1, f2, f3].sort().join('');

    if (!validCorners.has(cornerKey)) {
      errors.push(`Invalid corner: ${colorName(c1)}-${colorName(c2)}-${colorName(c3)} is not a valid corner`);
    }

    if (seenCorners.has(cornerKey)) {
      errors.push(`Duplicate corner: ${colorName(c1)}-${colorName(c2)}-${colorName(c3)} appears more than once`);
    }
    seenCorners.set(cornerKey, true);
  }

  // 5. Edge orientation parity
  const edgeFlipSum = computeEdgeOrientation(facelets, colorToFace);
  if (edgeFlipSum % 2 !== 0) {
    errors.push('Edge orientation parity error: a single edge appears flipped (impossible state)');
  }

  // 6. Corner orientation parity
  const cornerTwistSum = computeCornerOrientation(facelets, colorToFace);
  if (cornerTwistSum % 3 !== 0) {
    errors.push('Corner orientation parity error: a single corner appears twisted (impossible state)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Compute edge orientation sum.
 * For each edge, orientation = 0 if the U/D-color facelet is in the U/D position.
 */
function computeEdgeOrientation(facelets, colorToFace) {
  const udFaces = new Set(['U', 'D']);
  let sum = 0;

  for (const [i, j] of EDGES) {
    const f1 = colorToFace[facelets[i]];
    const f2 = colorToFace[facelets[j]];
    if (!f1 || !f2) continue;

    // Determine which facelet slot belongs to U/D group
    const slot1Face = getFaceFromIndex(i);
    const hasUD = udFaces.has(f1) || udFaces.has(f2);

    if (hasUD) {
      const udColor = udFaces.has(f1) ? f1 : f2;
      const udIdx = udColor === f1 ? i : j;
      const udSlotFace = getFaceFromIndex(udIdx);
      // Good orientation: U/D color in U/D slot
      if (!udFaces.has(udSlotFace)) sum++;
    } else {
      // No U/D color: check F/B rule
      const fbFaces = new Set(['F', 'B']);
      const hasFB = fbFaces.has(f1) || fbFaces.has(f2);
      if (hasFB) {
        const fbColor = fbFaces.has(f1) ? f1 : f2;
        const fbIdx = fbColor === f1 ? i : j;
        const fbSlotFace = getFaceFromIndex(fbIdx);
        if (!fbFaces.has(fbSlotFace) && !udFaces.has(fbSlotFace)) sum++;
      }
    }
  }
  return sum;
}

/**
 * Compute corner orientation sum.
 */
function computeCornerOrientation(facelets, colorToFace) {
  const udFaces = new Set(['U', 'D']);
  let sum = 0;

  for (const triple of CORNERS) {
    const colors = triple.map(i => colorToFace[facelets[i]]);
    if (colors.some(c => !c)) continue;

    // Find which position in the triple has the U or D color
    const udPos = colors.findIndex(c => udFaces.has(c));
    if (udPos === -1) continue;

    // Position 0 = U/D face position in the standard corner layout
    // Orientation: 0 if U/D color is in position 0, 1 if pos 1, 2 if pos 2
    sum += udPos;
  }
  return sum;
}

/**
 * Get which face a facelet index belongs to.
 */
function getFaceFromIndex(idx) {
  if (idx < 9) return 'U';
  if (idx < 18) return 'R';
  if (idx < 27) return 'F';
  if (idx < 36) return 'D';
  if (idx < 45) return 'L';
  return 'B';
}

/**
 * Convert face letter to human-readable color name.
 */
function colorName(face) {
  const names = {
    U: 'White', R: 'Red', F: 'Green',
    D: 'Yellow', L: 'Orange', B: 'Blue',
  };
  return names[face] || face;
}
