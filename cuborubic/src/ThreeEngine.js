// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Three.js Engine
// Renderer, camera, lights, environment, raycaster, resize
// ═══════════════════════════════════════════════════════════════════

import * as THREE from 'three';

let renderer, scene, camera, canvas;
let needsRender = true;

/**
 * Initialize the Three.js engine.
 * @param {HTMLCanvasElement} canvasEl
 * @returns {{ renderer, scene, camera, markDirty, getCanvas }}
 */
export function initEngine(canvasEl) {
  canvas = canvasEl;

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(5.5, 5.2, 7);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
  keyLight.position.set(6, 10, 8);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xc9a96e, 0.45);
  rimLight.position.set(-6, -4, -5);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0x6b93d4, 0.25);
  fillLight.position.set(-8, 2, 4);
  scene.add(fillLight);

  // Procedural environment map for PBR reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x1a1a2e);

  // Add gradient sphere for reflections
  const envGeo = new THREE.SphereGeometry(50, 32, 16);
  const envMat = new THREE.MeshBasicMaterial({
    color: 0x2a2d3e,
    side: THREE.BackSide,
  });
  envScene.add(new THREE.Mesh(envGeo, envMat));
  envScene.add(new THREE.AmbientLight(0xffffff, 1));

  const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
  scene.environment = envMap;
  pmremGenerator.dispose();
  envGeo.dispose();
  envMat.dispose();

  // Resize
  resize();
  new ResizeObserver(resize).observe(canvas.parentElement);

  return { renderer, scene, camera, markDirty, getCanvas: () => canvas };
}

function resize() {
  if (!canvas || !canvas.parentElement) return;
  const { clientWidth: w, clientHeight: h } = canvas.parentElement;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  markDirty();
}

export function markDirty() {
  needsRender = true;
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function getCanvas() { return canvas; }

/**
 * Render loop — only renders when dirty (render-on-demand).
 * Call controlsUpdate each frame for damping.
 */
export function startRenderLoop(controlsUpdate) {
  function loop() {
    if (controlsUpdate) controlsUpdate();
    if (needsRender) {
      renderer.render(scene, camera);
      needsRender = false;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
