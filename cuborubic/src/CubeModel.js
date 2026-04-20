// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Cube Model
// Rounded cubies with PBR materials and sticker logic
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { markDirty, getScene } from './ThreeEngine.js';

// ─── Constants ───────────────────────────────────────────────────
export const FACE_COLORS = {
  U: 0xffffff,  // White
  D: 0xffd500,  // Yellow
  F: 0x009b48,  // Green
  B: 0x0045ad,  // Blue
  R: 0xb71234,  // Red
  L: 0xff5800,  // Orange
};

const INNER = 0x111216;
const CUBIE = 0.96;
const STEP = CUBIE + 0.04;       // 1.0
const S_INSET = 0.06;
const S_HALF = CUBIE / 2 + 0.005;
const S_SIZE = CUBIE - 2 * S_INSET;

// ─── Shared geometries ──────────────────────────────────────────
const GEO_BASE = new RoundedBoxGeometry(CUBIE, CUBIE, CUBIE, 4, 0.08);
const GEO_STICKER = {
  x: new RoundedBoxGeometry(0.01, S_SIZE, S_SIZE, 2, 0.04),
  y: new RoundedBoxGeometry(S_SIZE, 0.01, S_SIZE, 2, 0.04),
  z: new RoundedBoxGeometry(S_SIZE, S_SIZE, 0.01, 2, 0.04),
};

// Shared inner material (never modified by paint)
const INNER_MAT = new THREE.MeshStandardMaterial({
  color: INNER,
  roughness: 0.95,
  metalness: 0,
});
INNER_MAT.userData.isProtected = true;

// ─── Sticker config table ───────────────────────────────────────
const STICKER_CFG = [
  ['R', 'x', +1, [S_HALF, 0, 0]],
  ['L', 'x', -1, [-S_HALF, 0, 0]],
  ['U', 'y', +1, [0, S_HALF, 0]],
  ['D', 'y', -1, [0, -S_HALF, 0]],
  ['F', 'z', +1, [0, 0, S_HALF]],
  ['B', 'z', -1, [0, 0, -S_HALF]],
];

// ─── Cube structure ─────────────────────────────────────────────
export const cubeRoot = new THREE.Group();
export let cubies = [];
export let allStickerMeshes = [];

function makeCubie(x, y, z) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(GEO_BASE, INNER_MAT));

  const stickers = [];
  for (const [face, axis, sign, pos] of STICKER_CFG) {
    if ((axis === 'x' && x !== sign) ||
        (axis === 'y' && y !== sign) ||
        (axis === 'z' && z !== sign)) continue;

    // PBR sticker material — per-sticker instance for paint
    const mat = new THREE.MeshStandardMaterial({
      color: FACE_COLORS[face],
      roughness: 0.25,
      metalness: 0.1,
      envMapIntensity: 0.6,
    });

    const mesh = new THREE.Mesh(GEO_STICKER[axis], mat);
    mesh.position.set(...pos);
    group.add(mesh);
    stickers.push({ mesh, mat });
  }

  group.userData.stickers = stickers;
  group.userData.logical = { x, y, z };
  group.position.set(x * STEP, y * STEP, z * STEP);
  return group;
}

export function buildCube() {
  // Dispose old sticker materials to prevent GPU memory leak
  for (const c of cubies) {
    for (const { mat } of (c.userData.stickers || [])) mat.dispose();
    cubeRoot.remove(c);
  }
  cubies = [];

  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const c = makeCubie(x, y, z);
        cubeRoot.add(c);
        cubies.push(c);
      }

  // Flat sticker array for fast raycasting
  allStickerMeshes = cubies.flatMap(c => c.userData.stickers.map(s => s.mesh));
  markDirty();
}

export function addCubeToScene() {
  const scene = getScene();
  scene.add(cubeRoot);
  buildCube();
}

export { STEP, INNER_MAT };
