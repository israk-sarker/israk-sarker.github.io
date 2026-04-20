// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Centralized State Management
// Proxy-based reactive state with pub/sub
// ═══════════════════════════════════════════════════════════════════

const listeners = new Map();

const initialState = {
  isAnimating: false,
  currentMode: 'play',        // 'play' | 'solve' | 'paint' | 'timer'
  cubeState: '',               // 54-char facelet string
  solverReady: false,
  theme: 'dark',
  speed: 320,                  // animation ms (derived from slider)
  stepMoves: [],
  stepIndex: 0,
  timerState: 'idle',          // 'idle' | 'inspection' | 'running' | 'stopped'
  timerMs: 0,
  timerHistory: [],
  paintColor: 0xffffff,
};

const state = new Proxy({ ...initialState }, {
  set(target, key, value) {
    const old = target[key];
    target[key] = value;
    if (old !== value) {
      const subs = listeners.get(key);
      if (subs) subs.forEach(fn => fn(value, old, key));
    }
    return true;
  },
});

/**
 * Subscribe to state changes for a specific key.
 * @param {string} key
 * @param {Function} callback (newValue, oldValue, key)
 * @returns {Function} unsubscribe
 */
export function subscribe(key, callback) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(callback);
  return () => listeners.get(key).delete(callback);
}

/**
 * Batch update multiple state keys without triggering intermediate subscriptions.
 */
export function batchUpdate(updates) {
  for (const [key, value] of Object.entries(updates)) {
    state[key] = value;
  }
}

export default state;
