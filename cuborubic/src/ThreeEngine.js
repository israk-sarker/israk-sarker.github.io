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

  // Procedural environment map for PBR reflections (studio-like lighting)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x181825);

  // Gradient sky sphere with warm top / cool bottom
  const envGeo = new THREE.SphereGeometry(50, 64, 32);
  const envMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x3a3a5c) },
      bottomColor: { value: new THREE.Color(0x0e0e18) },
      horizonColor: { value: new THREE.Color(0x2a2a42) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 horizonColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.5, 0.0, h));
        col = mix(col, topColor, smoothstep(0.0, 0.6, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  envScene.add(new THREE.Mesh(envGeo, envMat));

  // Studio lights inside env scene for crisp reflections
  envScene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const envKey = new THREE.PointLight(0xffeedd, 60, 100);
  envKey.position.set(10, 20, 15);
  envScene.add(envKey);
  const envFill = new THREE.PointLight(0xccddff, 30, 100);
  envFill.position.set(-15, 5, -10);
  envScene.add(envFill);
  const envRim = new THREE.PointLight(0xffe4c4, 20, 80);
  envRim.position.set(0, -10, 20);
  envScene.add(envRim);

  const envMap = pmremGenerator.fromScene(envScene, 0.02).texture;
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
