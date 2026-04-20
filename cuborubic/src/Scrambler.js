// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Scramble Generator
// WCA-compliant random scrambles
// ═══════════════════════════════════════════════════════════════════

import { FACE_AXIS } from './CubeLogic.js';

const FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const TURNS = [1, -1, 2];

function tokenFor(face, turns) {
  return turns === 2 ? face + '2' : turns === -1 ? face + "'" : face;
}

/**
 * Generate a WCA-compliant scramble.
 * No consecutive same-face, no same-axis consecutive pairs.
 * @param {number} len - Number of moves (default 20)
 * @returns {Array<{face, turns, token}>}
 */
export function randomScramble(len = 20) {
  const moves = [];
  let lastFace = '';
  let lastAxis = '';

  for (let i = 0; i < len; i++) {
    let f, axis, tries = 0;
    do {
      f = FACES[Math.floor(Math.random() * 6)];
      axis = FACE_AXIS[f].axis;
    } while ((f === lastFace || axis === lastAxis) && ++tries < 20);

    lastFace = f;
    lastAxis = axis;

    const t = TURNS[Math.floor(Math.random() * 3)];
    moves.push({ face: f, turns: t, token: tokenFor(f, t) });
  }

  return moves;
}
