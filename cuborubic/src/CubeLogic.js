// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Cube Logic
// Move engine, permutations, facelet reading
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { gsap } from 'gsap';
import { cubeRoot, cubies, STEP, FACE_COLORS } from './CubeModel.js';
import { markDirty } from './ThreeEngine.js';
import state from './state.js';

// ─── Move constants ─────────────────────────────────────────────
export const FACE_AXIS = {
  U: { axis: 'y', layer: +1 }, D: { axis: 'y', layer: -1 },
  R: { axis: 'x', layer: +1 }, L: { axis: 'x', layer: -1 },
  F: { axis: 'z', layer: +1 }, B: { axis: 'z', layer: -1 },
};

export const FACE_CW_SIGN = {
  U: -1, D: +1, R: -1, L: +1, F: -1, B: +1,
};

const AXIS_VEC = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

// ─── Layer helpers ──────────────────────────────────────────────
function getLayerCubies(face) {
  const { axis, layer } = FACE_AXIS[face];
  return cubies.filter(c => c.userData.logical[axis] === layer);
}

function rotateLogical(c, axis, dir) {
  const { x, y, z } = c.userData.logical;
  if (axis === 'x') c.userData.logical = { x, y: -dir * z, z: dir * y };
  if (axis === 'y') c.userData.logical = { x: dir * z, y, z: -dir * x };
  if (axis === 'z') c.userData.logical = { x: -dir * y, y: dir * x, z };
}

// ─── Animate a single move using GSAP ───────────────────────────
export function animateMove(face, turns = 1) {
  return new Promise(resolve => {
    const { axis } = FACE_AXIS[face];
    const sign = FACE_CW_SIGN[face];
    const total = sign * turns * (Math.PI / 2);
    const dur = Math.max(0.08, (state.speed / 1000) * Math.abs(turns));
    const layer = getLayerCubies(face);
    const ax = AXIS_VEC[axis];

    const pivot = new THREE.Group();
    cubeRoot.add(pivot);
    layer.forEach(c => pivot.attach(c));

    const progress = { t: 0 };

    gsap.to(progress, {
      t: 1,
      duration: dur,
      ease: 'back.out(1.4)',
      onUpdate() {
        pivot.setRotationFromAxisAngle(ax, total * progress.t);
        markDirty();
      },
      onComplete() {
        // Snap and re-parent
        pivot.setRotationFromAxisAngle(ax, total);
        pivot.updateMatrixWorld(true);
        layer.forEach(c => cubeRoot.attach(c));
        cubeRoot.remove(pivot);

        const logDir = (sign > 0 ? 1 : -1) * turns;
        const steps = Math.abs(logDir);
        const stepDir = Math.sign(logDir);

        for (const c of layer) {
          for (let i = 0; i < steps; i++) rotateLogical(c, axis, stepDir);
          const lg = c.userData.logical;
          c.position.set(lg.x * STEP, lg.y * STEP, lg.z * STEP);

          // Floating-point cleanup
          c.updateMatrix();
          const m = c.matrix.elements;
          for (let i = 0; i < 16; i++) {
            const r = Math.round(m[i]);
            m[i] = Math.abs(m[i] - r) < 1e-6 ? r : Math.round(m[i] * 1e6) / 1e6;
          }
          c.matrix.decompose(c.position, c.quaternion, c.scale);
        }
        resolve();
      },
    });
  });
}

// ─── Parse move notation ────────────────────────────────────────
export function parseMoves(str) {
  if (!str) return [];
  return str.trim().split(/\s+/).map(tok => {
    const face = tok[0];
    if (!FACE_AXIS[face]) return null;
    const turns = tok.endsWith('2') ? 2 : tok.endsWith("'") ? -1 : 1;
    return { face, turns, token: tok };
  }).filter(Boolean);
}

// ─── Play a sequence of moves ───────────────────────────────────
export async function playMoves(moves, onStep) {
  for (let i = 0; i < moves.length; i++) {
    if (onStep) onStep(i, moves[i]);
    await animateMove(moves[i].face, moves[i].turns);
  }
}

// ─── Read cube state as 54-char facelet string ──────────────────
const FACE_FRAME = {
  U: { n: [0, 1, 0], u: [0, 0, -1], r: [1, 0, 0] },
  D: { n: [0, -1, 0], u: [0, 0, 1], r: [1, 0, 0] },
  F: { n: [0, 0, 1], u: [0, 1, 0], r: [1, 0, 0] },
  B: { n: [0, 0, -1], u: [0, 1, 0], r: [-1, 0, 0] },
  R: { n: [1, 0, 0], u: [0, 1, 0], r: [0, 0, -1] },
  L: { n: [-1, 0, 0], u: [0, 1, 0], r: [0, 0, 1] },
};

// Pre-computed RGB table for color matching
const FACE_RGB = Object.entries(FACE_COLORS).map(([face, hex]) => ({
  face,
  r: (hex >> 16) & 255,
  g: (hex >> 8) & 255,
  b: hex & 255,
}));

function closestFaceColor(hex) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  let best = 'U', minD = Infinity;
  for (const fc of FACE_RGB) {
    const d = (r - fc.r) ** 2 + (g - fc.g) ** 2 + (b - fc.b) ** 2;
    if (d < minD) { minD = d; best = fc.face; }
  }
  return best;
}

const _tmpNormal = new THREE.Vector3();
const _tmpFaceN = new THREE.Vector3();

export function getFacelets() {
  const cubieMap = new Map(
    cubies.map(c => {
      const { x, y, z } = c.userData.logical;
      return [`${x},${y},${z}`, c];
    })
  );

  const order = ['U', 'R', 'F', 'D', 'L', 'B'];
  const out = [];

  for (const f of order) {
    const { n, u, r } = FACE_FRAME[f];
    _tmpFaceN.set(n[0], n[1], n[2]);

    for (let row = 1; row >= -1; row--) {
      for (let col = -1; col <= 1; col++) {
        const lx = Math.round(n[0] + u[0] * row + r[0] * col);
        const ly = Math.round(n[1] + u[1] * row + r[1] * col);
        const lz = Math.round(n[2] + u[2] * row + r[2] * col);

        const cubie = cubieMap.get(`${lx},${ly},${lz}`);
        if (!cubie) { out.push('?'); continue; }

        let color = f;
        cubie.updateWorldMatrix(true, false);
        for (const { mesh, mat } of cubie.userData.stickers) {
          _tmpNormal.copy(mesh.position).normalize().transformDirection(cubie.matrixWorld);
          if (_tmpNormal.dot(_tmpFaceN) > 0.9) {
            color = closestFaceColor(mat.color.getHex());
            break;
          }
        }
        out.push(color);
      }
    }
  }
  return out.join('');
}

// ─── Token helper ───────────────────────────────────────────────
export function tokenFor(face, turns) {
  return turns === 2 ? face + '2' : turns === -1 ? face + "'" : face;
}
