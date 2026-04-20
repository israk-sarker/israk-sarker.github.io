// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Web Worker Script
// Runs Kociemba solver off the main thread
// ═══════════════════════════════════════════════════════════════════

// cubejs is a UMD library — we load it via importScripts
// Vite bundles this as a separate worker chunk
importScripts('https://cdn.jsdelivr.net/npm/cubejs@1.3.2/lib/cube.min.js');
importScripts('https://cdn.jsdelivr.net/npm/cubejs@1.3.2/lib/solve.js');

self.onmessage = function (e) {
  const { type, facelets } = e.data;

  if (type === 'init') {
    try {
      Cube.initSolver();
      self.postMessage({ type: 'init-done' });
    } catch (err) {
      self.postMessage({ type: 'init-error', error: err.message });
    }
  }

  if (type === 'solve') {
    try {
      const cube = Cube.fromString(facelets);
      const solution = cube.solve();
      self.postMessage({ type: 'solve-done', data: solution });
    } catch (err) {
      self.postMessage({ type: 'solve-error', error: err.message });
    }
  }
};
