// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Solver Worker Bridge
// Promise-based API to communicate with the Kociemba Web Worker
// ═══════════════════════════════════════════════════════════════════

import state from './state.js';

let worker = null;
let resolveInit = null;
let resolveSolve = null;
let rejectSolve = null;

/**
 * Initialize the solver by creating a Web Worker.
 * Returns a promise that resolves when the solver tables are ready.
 */
export function initSolver() {
  return new Promise((resolve, reject) => {
    worker = new Worker(new URL('./solver.worker.js', import.meta.url), { type: 'module' });

    worker.onmessage = (e) => {
      const { type, data, error } = e.data;

      if (type === 'init-done') {
        state.solverReady = true;
        if (resolveInit) resolveInit();
        resolveInit = null;
      }

      if (type === 'init-error') {
        if (resolveInit) {
          reject(new Error(error || 'Solver init failed'));
          resolveInit = null;
        }
      }

      if (type === 'solve-done') {
        if (resolveSolve) resolveSolve(data);
        resolveSolve = null;
        rejectSolve = null;
      }

      if (type === 'solve-error') {
        if (rejectSolve) rejectSolve(new Error(error || 'Invalid cube state'));
        resolveSolve = null;
        rejectSolve = null;
      }
    };

    worker.onerror = (err) => {
      console.error('Solver worker error:', err);
    };

    resolveInit = resolve;
    worker.postMessage({ type: 'init' });
  });
}

/**
 * Solve the cube from a 54-char facelet string.
 * @param {string} facelets
 * @returns {Promise<string>} solution moves string
 */
export function solve(facelets) {
  return new Promise((resolve, reject) => {
    if (!worker || !state.solverReady) {
      reject(new Error('Solver not initialized yet'));
      return;
    }
    resolveSolve = resolve;
    rejectSolve = reject;
    worker.postMessage({ type: 'solve', facelets });
  });
}

/**
 * Wait for solver to be ready if not already.
 */
export async function ensureSolverReady() {
  if (state.solverReady) return;
  await initSolver();
}
