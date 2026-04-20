// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Input Controller
// OrbitControls, drag-to-rotate layers, keyboard shortcuts
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getCamera, getCanvas, markDirty } from './ThreeEngine.js';
import { allStickerMeshes, cubeRoot, cubies } from './CubeModel.js';
import { animateMove, FACE_AXIS, FACE_CW_SIGN } from './CubeLogic.js';
import state from './state.js';

let controls;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Drag-to-rotate state
let isDragging = false;
let dragStart = new THREE.Vector2();
let dragHitFace = null;
let dragHitNormal = new THREE.Vector3();
let dragHitCubiePos = new THREE.Vector3();
let dragCommitted = false;

/**
 * Initialize OrbitControls and input handlers.
 */
export function initInputController() {
  const camera = getCamera();
  const canvas = getCanvas();

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 16;
  controls.enablePan = false;

  // Right-click orbit only (left-click reserved for cube interaction)
  controls.mouseButtons = {
    LEFT: null,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  };

  controls.addEventListener('change', markDirty);

  // ─── Pointer events for drag-to-rotate ─────────────────────
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);

  // ─── Keyboard shortcuts ────────────────────────────────────
  window.addEventListener('keydown', onKeyDown);

  return controls;
}

export function getControls() {
  return controls;
}

// ─── Pointer handlers ───────────────────────────────────────────
function onPointerDown(e) {
  if (e.button !== 0) return; // left-click only
  if (state.isAnimating) return;

  const canvas = getCanvas();
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, getCamera());

  // Paint mode: handle click directly
  if (state.currentMode === 'paint') {
    const hits = raycaster.intersectObjects(allStickerMeshes);
    if (hits.length) {
      hits[0].object.material.color.setHex(state.paintColor);
      markDirty();
    }
    return;
  }

  // Drag-to-rotate: detect if we hit the cube
  const hits = raycaster.intersectObjects(allStickerMeshes);
  if (hits.length) {
    isDragging = true;
    dragCommitted = false;
    dragStart.set(e.clientX, e.clientY);

    // Determine which face was hit from the normal
    const hit = hits[0];
    dragHitNormal.copy(hit.face.normal);
    dragHitNormal.transformDirection(hit.object.matrixWorld);

    // Snap normal to nearest axis
    snapToAxis(dragHitNormal);

    // Get cubie position in cube-root space
    const cubie = hit.object.parent;
    dragHitCubiePos.copy(cubie.position);

    // Disable orbit while dragging
    controls.enabled = false;
  } else {
    // Clicked on background — enable orbit for left click
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.enabled = true;
  }
}

function onPointerMove(e) {
  if (!isDragging || dragCommitted || state.isAnimating) return;

  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  const dragDist = Math.sqrt(dx * dx + dy * dy);

  if (dragDist < 15) return; // Threshold before committing

  // Determine rotation from drag direction
  const moveInfo = determineMoveFromDrag(dx, dy, dragHitNormal, dragHitCubiePos);
  if (moveInfo) {
    dragCommitted = true;
    state.isAnimating = true;
    animateMove(moveInfo.face, moveInfo.turns).then(() => {
      state.isAnimating = false;
    });
  }
}

function onPointerUp() {
  if (isDragging) {
    isDragging = false;
    dragCommitted = false;
    controls.enabled = true;
    controls.mouseButtons.LEFT = null;
  }
}

function snapToAxis(v) {
  const abs = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)];
  const maxIdx = abs.indexOf(Math.max(...abs));
  v.set(
    maxIdx === 0 ? Math.sign(v.x) : 0,
    maxIdx === 1 ? Math.sign(v.y) : 0,
    maxIdx === 2 ? Math.sign(v.z) : 0
  );
}

function determineMoveFromDrag(dx, dy, hitNormal, cubiePos) {
  // Screen-space drag direction
  const camera = getCamera();

  // Get camera's right and up vectors in world space
  const camRight = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  camera.matrixWorld.extractBasis(camRight, camUp, new THREE.Vector3());

  // Drag vector in world space
  const dragWorld = new THREE.Vector3()
    .addScaledVector(camRight, dx)
    .addScaledVector(camUp, -dy)
    .normalize();

  // The two possible rotation axes are perpendicular to the hit normal
  // and to each other
  const possibleAxes = [];
  const axes = ['x', 'y', 'z'];
  const axisVecs = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];

  for (let i = 0; i < 3; i++) {
    if (Math.abs(hitNormal.dot(axisVecs[i])) < 0.5) {
      possibleAxes.push({ name: axes[i], vec: axisVecs[i] });
    }
  }

  if (possibleAxes.length < 2) return null;

  // Choose the axis most aligned with cross(hitNormal, dragWorld)
  const cross = new THREE.Vector3().crossVectors(hitNormal, dragWorld);

  let bestAxis = null;
  let bestDot = 0;

  for (const pa of possibleAxes) {
    const d = Math.abs(cross.dot(pa.vec));
    if (d > bestDot) {
      bestDot = d;
      bestAxis = pa;
    }
  }

  if (!bestAxis) return null;

  // Determine which face based on the rotation axis and cubie position
  const face = findFace(bestAxis.name, cubiePos);
  if (!face) return null;

  // Determine CW vs CCW from sign of cross dot axis
  const crossDot = cross.dot(bestAxis.vec);
  const turns = crossDot > 0 ? 1 : -1;

  return { face, turns };
}

function findFace(axisName, cubiePos) {
  for (const [face, { axis, layer }] of Object.entries(FACE_AXIS)) {
    if (axis === axisName) {
      const posVal = Math.round(cubiePos[axisName]);
      if (posVal === layer) return face;
    }
  }
  return null;
}

// ─── Keyboard shortcuts ─────────────────────────────────────────
function onKeyDown(e) {
  if (state.isAnimating) return;

  // Don't capture when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

  const key = e.key.toUpperCase();
  const faces = ['R', 'L', 'U', 'D', 'F', 'B'];

  if (faces.includes(key)) {
    e.preventDefault();
    const turns = e.shiftKey ? -1 : 1;
    state.isAnimating = true;
    animateMove(key, turns).then(() => {
      state.isAnimating = false;
    });
  }
}
