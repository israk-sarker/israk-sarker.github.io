// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — Timer
// Inspection countdown + solve stopwatch
// ═══════════════════════════════════════════════════════════════════

import state from './state.js';

let startTime = 0;
let timerRAF = null;
let inspectionInterval = null;

/**
 * Format milliseconds to mm:ss.cc
 */
export function formatTime(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centis = Math.floor((ms % 1000) / 10);
  
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  }
  return `${seconds}.${String(centis).padStart(2, '0')}`;
}

/**
 * Start the 15-second WCA inspection timer.
 */
export function startInspection() {
  stopTimer();
  state.timerState = 'inspection';
  state.timerMs = 15000;

  const start = performance.now();

  inspectionInterval = setInterval(() => {
    const elapsed = performance.now() - start;
    const remaining = Math.max(0, 15000 - elapsed);
    state.timerMs = remaining;

    if (remaining <= 0) {
      clearInterval(inspectionInterval);
      inspectionInterval = null;
      // Auto-start solve timer
      startSolveTimer();
    }
  }, 50);
}

/**
 * Start the solve stopwatch.
 */
export function startSolveTimer() {
  if (inspectionInterval) {
    clearInterval(inspectionInterval);
    inspectionInterval = null;
  }

  state.timerState = 'running';
  startTime = performance.now();

  function tick() {
    state.timerMs = performance.now() - startTime;
    timerRAF = requestAnimationFrame(tick);
  }
  timerRAF = requestAnimationFrame(tick);
}

/**
 * Stop the timer and record the time.
 */
export function stopTimer() {
  if (timerRAF) {
    cancelAnimationFrame(timerRAF);
    timerRAF = null;
  }
  if (inspectionInterval) {
    clearInterval(inspectionInterval);
    inspectionInterval = null;
  }

  if (state.timerState === 'running') {
    state.timerState = 'stopped';
    // Add to history
    state.timerHistory = [
      { time: state.timerMs, date: Date.now() },
      ...state.timerHistory.slice(0, 49), // Keep last 50
    ];
  } else {
    state.timerState = 'idle';
  }
}

/**
 * Reset the timer.
 */
export function resetTimer() {
  stopTimer();
  state.timerState = 'idle';
  state.timerMs = 0;
}

/**
 * Toggle timer with spacebar.
 */
export function toggleTimer() {
  if (state.timerState === 'inspection') {
    startSolveTimer();
  } else if (state.timerState === 'running') {
    stopTimer();
  } else {
    startSolveTimer();
  }
}
