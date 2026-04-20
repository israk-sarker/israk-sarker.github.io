// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Main Entry Point
// Bootstrap all modules and wire up the application
// ═══════════════════════════════════════════════════════════════════

// Styles
import './styles/index.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/animations.css';

// Modules
import { initEngine, startRenderLoop, markDirty } from './ThreeEngine.js';
import { addCubeToScene } from './CubeModel.js';
import { initInputController, getControls } from './InputController.js';
import { initSolver } from './SolverWorker.js';
import { initUI, toast } from './UIManager.js';

// ─── Bootstrap ──────────────────────────────────────────────────
async function init() {
  // 1. Initialize Three.js engine
  const canvas = document.getElementById('cube-canvas');
  initEngine(canvas);

  // 2. Build the cube and add to scene
  addCubeToScene();

  // 3. Set up input (orbit, drag-to-rotate, keyboard)
  const controls = initInputController();

  // 4. Start render loop (render-on-demand with damping)
  startRenderLoop(() => controls.update());

  // 5. Initialize UI bindings
  initUI();

  // 6. Initialize solver in background (Web Worker)
  try {
    await initSolver();
    toast('Solver ready', 'success', 1500);
  } catch (e) {
    console.warn('Solver initialization failed:', e);
    toast('Solver failed to load — solving features unavailable', 'error', 4000);
  }
}

// Go!
init().catch(err => {
  console.error('Failed to initialize Rubik Solver:', err);
});
