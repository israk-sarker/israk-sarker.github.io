// ═══════════════════════════════════════════════════════════════════
// Rubik Solver — UI Manager
// DOM manipulation, state binding, toast, mode switching, panels
// ═══════════════════════════════════════════════════════════════════

import state, { subscribe } from './state.js';
import { buildCube } from './CubeModel.js';
import { parseMoves, playMoves, animateMove, getFacelets } from './CubeLogic.js';
import { randomScramble } from './Scrambler.js';
import { patterns } from './PatternLibrary.js';
import { ensureSolverReady, solve } from './SolverWorker.js';
import { formatTime, toggleTimer, startInspection, resetTimer } from './Timer.js';
import { markDirty } from './ThreeEngine.js';
import { validateCubeState } from './StateValidator.js';

const $ = id => document.getElementById(id);

// ─── DOM References ─────────────────────────────────────────────
let els = {};
let stepMoves = [];
let stepIdx = 0;
let toastTimeout = null;

/**
 * Initialize all UI bindings.
 */
export function initUI() {
  // Cache DOM elements
  els = {
    btnScramble: $('btn-scramble'),
    btnReset: $('btn-reset'),
    btnSolve: $('btn-solve'),
    btnStepMode: $('btn-step-mode'),
    btnPrev: $('btn-prev'),
    btnNext: $('btn-next'),
    btnResetColors: $('btn-reset-colors'),
    btnTheme: $('btn-theme'),
    btnTimerScramble: $('btn-timer-scramble'),
    btnValidateSolve: $('btn-validate-solve'),
    speedInput: $('speed'),
    stepCard: $('step-card'),
    stepCurrent: $('step-current'),
    stepTotal: $('step-total'),
    stepMove: $('step-move'),
    stepProgressBar: $('step-progress-bar'),
    movesList: $('moves-list'),
    toast: $('toast'),
    loadingOverlay: $('loading-overlay'),
    timerDigits: $('timer-digits'),
    timerHistory: $('timer-history'),
    patternSelect: $('pattern-select'),
    panel: $('panel'),
    panelHandle: $('panel-handle'),
    colorPalette: $('color-palette'),
    validationStatus: $('validation-status'),
    validationIcon: $('validation-icon'),
    validationTitle: $('validation-title'),
    validationErrors: $('validation-errors'),
  };

  // ─── Speed slider ───────────────────────────────────────────
  els.speedInput.addEventListener('input', e => {
    state.speed = 1000 - Number(e.target.value);
  });
  state.speed = 1000 - Number(els.speedInput.value);

  // ─── Mode tabs ──────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.currentMode = tab.dataset.mode;
    });
  });

  subscribe('currentMode', (mode) => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    document.querySelectorAll('.mode-section').forEach(s => s.classList.toggle('active', s.id === `mode-${mode}`));
    // Clear validation when leaving paint mode
    if (mode !== 'paint' && els.validationStatus) {
      els.validationStatus.hidden = true;
    }
  });

  // ─── Scramble ───────────────────────────────────────────────
  els.btnScramble.addEventListener('click', async () => {
    if (state.isAnimating) return;
    setBusy(true);
    hideSteps();
    await playMoves(randomScramble(20));
    setBusy(false);
  });

  // ─── Reset ──────────────────────────────────────────────────
  els.btnReset.addEventListener('click', () => {
    if (state.isAnimating) return;
    hideSteps();
    buildCube();
    toast('Cube reset', 'success');
  });

  // ─── Solve (auto) ──────────────────────────────────────────
  els.btnSolve.addEventListener('click', () => handleSolve());

  // ─── Validate & Solve (paint mode) ─────────────────────────
  if (els.btnValidateSolve) {
    els.btnValidateSolve.addEventListener('click', () => handleValidateAndSolve());
  }

  // ─── Step mode ─────────────────────────────────────────────
  els.btnStepMode.addEventListener('click', async () => {
    if (state.isAnimating) return;
    setBusy(true);
    try {
      await ensureSolverReady();
      const facelets = getFacelets();
      const solution = await solve(facelets);
      const moves = parseMoves(solution);

      if (!moves.length) {
        toast('Already solved!', 'success');
        setBusy(false);
        return;
      }

      showSteps(moves);
      stepIdx = 0;
      updateStepUI(0, null);
    } catch (e) {
      console.error(e);
      toast('Solver error: ' + (e.message || e), 'error', 4000);
    }
    setBusy(false);
  });

  // ─── Step navigation ──────────────────────────────────────
  els.btnNext.addEventListener('click', async () => {
    if (state.isAnimating || stepIdx >= stepMoves.length) return;
    setBusy(true);
    const m = stepMoves[stepIdx];
    updateStepUI(stepIdx + 1, m);
    await animateMove(m.face, m.turns);
    stepIdx++;
    if (stepIdx >= stepMoves.length) toast('Solved ✓', 'success');
    setBusy(false);
  });

  els.btnPrev.addEventListener('click', async () => {
    if (state.isAnimating || stepIdx <= 0) return;
    setBusy(true);
    stepIdx--;
    const m = stepMoves[stepIdx];
    await animateMove(m.face, m.turns === 2 ? 2 : -m.turns);
    updateStepUI(stepIdx, stepMoves[stepIdx] ?? null);
    setBusy(false);
  });

  // ─── Pattern library ──────────────────────────────────────
  patterns.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = p.name;
    els.patternSelect.appendChild(opt);
  });

  els.patternSelect.addEventListener('change', async () => {
    const idx = els.patternSelect.value;
    if (idx === '' || state.isAnimating) return;

    setBusy(true);
    buildCube(); // Reset first
    const pattern = patterns[idx];
    const moves = parseMoves(pattern.algorithm);
    await playMoves(moves);
    toast(`${pattern.name} applied`, 'success');
    els.patternSelect.value = '';
    setBusy(false);
  });

  // ─── Paint mode ────────────────────────────────────────────
  els.colorPalette.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      els.colorPalette.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.paintColor = parseInt(btn.dataset.color, 16);
    });
  });

  els.btnResetColors.addEventListener('click', () => {
    if (state.isAnimating) return;
    buildCube();
    clearValidation();
    toast('Colors reset', 'success');
  });

  // ─── Theme toggle ─────────────────────────────────────────
  initTheme();
  els.btnTheme.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
  });

  subscribe('theme', (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rubik-theme', theme);
  });

  // ─── Timer ─────────────────────────────────────────────────
  subscribe('timerMs', (ms) => {
    if (state.timerState === 'inspection') {
      els.timerDigits.textContent = Math.ceil(ms / 1000);
      els.timerDigits.className = 'timer-digits inspection';
    } else {
      els.timerDigits.textContent = formatTime(ms);
      els.timerDigits.className = 'timer-digits' + (state.timerState === 'running' ? ' running' : '');
    }
  });

  subscribe('timerHistory', () => {
    renderTimerHistory();
  });

  els.btnTimerScramble.addEventListener('click', async () => {
    if (state.isAnimating) return;
    setBusy(true);
    resetTimer();
    await playMoves(randomScramble(20));
    setBusy(false);
    startInspection();
  });

  // Spacebar for timer
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && state.currentMode === 'timer') {
      e.preventDefault();
      toggleTimer();
    }
  });

  // ─── Mobile bottom sheet ──────────────────────────────────
  initBottomSheet();

  // ─── Solver ready → hide loading ──────────────────────────
  subscribe('solverReady', (ready) => {
    if (ready && els.loadingOverlay) {
      els.loadingOverlay.classList.add('hidden');
      setTimeout(() => els.loadingOverlay.remove(), 500);
    }
  });
}

// ─── Solve handler ──────────────────────────────────────────────
async function handleSolve() {
  if (state.isAnimating) return;
  setBusy(true);
  try {
    await ensureSolverReady();
    const facelets = getFacelets();
    const solution = await solve(facelets);
    const moves = parseMoves(solution);

    if (!moves.length) {
      toast('Already solved!', 'success');
      setBusy(false);
      return;
    }

    showSteps(moves);
    await playMoves(moves, (i, m) => updateStepUI(i + 1, m));
    toast('Solved ✓', 'success');
  } catch (e) {
    console.error(e);
    toast('Solver error: ' + (e.message || e), 'error', 4000);
  }
  setBusy(false);
}

// ─── Validate & Solve (paint mode) ──────────────────────────────
async function handleValidateAndSolve() {
  if (state.isAnimating) return;

  // Step 1: Validate
  const facelets = getFacelets();
  const result = validateCubeState(facelets);

  if (!result.valid) {
    showValidation(result.errors);
    toast('Invalid cube state — fix errors first', 'error', 3000);
    return;
  }

  // Valid — clear warnings and solve
  showValidationSuccess();

  // Step 2: Solve
  setBusy(true);
  try {
    await ensureSolverReady();
    const solution = await solve(facelets);
    const moves = parseMoves(solution);

    if (!moves.length) {
      toast('Already solved!', 'success');
      setBusy(false);
      return;
    }

    // Switch to solve mode to show step UI
    state.currentMode = 'solve';
    showSteps(moves);
    await playMoves(moves, (i, m) => updateStepUI(i + 1, m));
    toast('Solved ✓', 'success');
  } catch (e) {
    console.error(e);
    toast('Solver error: ' + (e.message || e), 'error', 4000);
  }
  setBusy(false);
}

// ─── Validation UI helpers ──────────────────────────────────────
function showValidation(errors) {
  if (!els.validationStatus) return;
  els.validationStatus.hidden = false;
  els.validationIcon.textContent = '✗';
  els.validationIcon.className = 'validation-icon error';
  els.validationTitle.textContent = `${errors.length} issue${errors.length !== 1 ? 's' : ''} found`;
  els.validationTitle.className = 'validation-title error';

  els.validationErrors.innerHTML = '';
  for (const err of errors) {
    const li = document.createElement('li');
    li.textContent = err;
    els.validationErrors.appendChild(li);
  }
}

function showValidationSuccess() {
  if (!els.validationStatus) return;
  els.validationStatus.hidden = false;
  els.validationIcon.textContent = '✓';
  els.validationIcon.className = 'validation-icon success';
  els.validationTitle.textContent = 'Cube state valid';
  els.validationTitle.className = 'validation-title success';
  els.validationErrors.innerHTML = '';
}

function clearValidation() {
  if (!els.validationStatus) return;
  els.validationStatus.hidden = true;
  els.validationErrors.innerHTML = '';
}

// ─── Helpers ────────────────────────────────────────────────────

function setBusy(b) {
  state.isAnimating = b;
  const buttons = [
    els.btnScramble, els.btnReset, els.btnSolve, els.btnStepMode,
    els.btnPrev, els.btnNext, els.btnValidateSolve,
  ];
  buttons.forEach(btn => { if (btn) btn.disabled = b; });
}

export function toast(msg, type = '', ms = 1800) {
  const t = els.toast;
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ` ${type}` : '');
  t.hidden = false;

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { t.hidden = true; }, ms);
}

function showSteps(moves) {
  stepMoves = moves;
  stepIdx = 0;
  els.stepCard.hidden = false;
  els.stepTotal.textContent = moves.length;
  els.stepCurrent.textContent = 0;
  els.stepMove.textContent = '—';
  els.stepProgressBar.style.width = '0%';

  const frag = document.createDocumentFragment();
  moves.forEach((m, i) => {
    const s = document.createElement('span');
    s.textContent = m.token;
    s.dataset.idx = i;
    s.title = `Step ${i + 1}: ${m.token}`;
    s.style.cursor = 'pointer';
    // Clickable step scrubbing
    s.addEventListener('click', () => jumpToStep(i));
    frag.appendChild(s);
  });
  els.movesList.replaceChildren(frag);
}

function hideSteps() {
  if (els.stepCard) els.stepCard.hidden = true;
  stepMoves = [];
  stepIdx = 0;
}

function updateStepUI(current, move) {
  els.stepCurrent.textContent = current;
  els.stepMove.textContent = move ? move.token : '—';
  els.stepProgressBar.style.width = `${(current / stepMoves.length) * 100}%`;

  [...els.movesList.children].forEach((el, i) => {
    el.classList.toggle('active', i === current - 1);
    el.classList.toggle('done', i < current - 1);
  });

  const activeEl = els.movesList.children[current - 1];
  if (activeEl) activeEl.scrollIntoView({ block: 'nearest', inline: 'center' });
}

/**
 * Jump to a specific step (by applying or undoing moves).
 * Only jumps forward from current position.
 */
async function jumpToStep(targetIdx) {
  if (state.isAnimating) return;
  if (targetIdx === stepIdx - 1) return; // Already here

  // Only support jumping forward (simpler, more reliable)
  if (targetIdx >= stepIdx && targetIdx < stepMoves.length) {
    setBusy(true);
    for (let i = stepIdx; i <= targetIdx; i++) {
      const m = stepMoves[i];
      updateStepUI(i + 1, m);
      await animateMove(m.face, m.turns);
    }
    stepIdx = targetIdx + 1;
    if (stepIdx >= stepMoves.length) toast('Solved ✓', 'success');
    setBusy(false);
  }
}

function renderTimerHistory() {
  const container = els.timerHistory;
  if (!container) return;
  container.innerHTML = '';

  if (state.timerHistory.length === 0) return;

  // Show average
  const times = state.timerHistory.map(e => e.time);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;

  const avgDiv = document.createElement('div');
  avgDiv.className = 'timer-avg';
  avgDiv.innerHTML = `<span class="label">Avg (${times.length})</span><span class="time">${formatTime(avg)}</span>`;
  container.appendChild(avgDiv);

  state.timerHistory.forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = 'timer-entry';
    div.innerHTML = `
      <span class="index">#${i + 1}</span>
      <span class="time">${formatTime(entry.time)}</span>
    `;
    container.appendChild(div);
  });
}

function initTheme() {
  const saved = localStorage.getItem('rubik-theme');
  if (saved) {
    state.theme = saved;
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    state.theme = 'light';
  } else {
    state.theme = 'dark';
  }
  document.documentElement.setAttribute('data-theme', state.theme);
}

function initBottomSheet() {
  const panel = els.panel;
  const handle = els.panelHandle;
  if (!handle || !panel) return;

  let startY = 0;
  let startTranslateY = 0;

  handle.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    const style = getComputedStyle(panel);
    const transform = style.transform;
    if (transform && transform !== 'none') {
      const matrix = new DOMMatrix(transform);
      startTranslateY = matrix.m42;
    }
    panel.style.transition = 'none';
  }, { passive: true });

  handle.addEventListener('touchmove', (e) => {
    const dy = e.touches[0].clientY - startY;
    const newY = startTranslateY + dy;
    panel.style.transform = `translateY(${Math.max(0, newY)}px)`;
  }, { passive: true });

  handle.addEventListener('touchend', () => {
    panel.style.transition = '';
    const rect = panel.getBoundingClientRect();
    const threshold = window.innerHeight * 0.4;

    if (rect.top > threshold) {
      panel.classList.remove('expanded');
    } else {
      panel.classList.add('expanded');
    }
    panel.style.transform = '';
  });
}
