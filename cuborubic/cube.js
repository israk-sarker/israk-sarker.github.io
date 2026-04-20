// Rubik 3D — Three.js + motore mosse + solver
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Costanti ────────────────────────────────────────────────────────────────
const FACE_COLORS = { U: 0xffffff, D: 0xffd500, F: 0x009b48, B: 0x0045ad, R: 0xb71234, L: 0xff5800 };
const INNER = 0x111216;
const CUBIE = 0.96;
const STEP = CUBIE + 0.04;        // 1.0
const S_INSET = 0.06;
const S_HALF = CUBIE / 2 + 0.005;  // offset sticker dalla faccia
const S_SIZE = CUBIE - 2 * S_INSET;

// ─── Renderer / scena / camera ───────────────────────────────────────────────
const canvas = document.getElementById('cube-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(5.5, 5.2, 7);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 16;

function resize() {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas.parentElement);
resize();

// ─── Luci ────────────────────────────────────────────────────────────────────
// castShadow rimosso: nessun mesh ha receiveShadow=true, allocava 2048² texture per niente
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

// ─── Render on demand ────────────────────────────────────────────────────────
// Rendiamo solo quando la scena cambia: risparmio CPU/GPU significativo a riposo
let needsRender = true;
const markDirty = () => { needsRender = true; };
controls.addEventListener('change', markDirty);

// ─── Geometrie condivise ─────────────────────────────────────────────────────
// 27 cubies riusano le stesse 4 geometrie → −23 upload GPU + meno GC
const GEO_BASE = new THREE.BoxGeometry(CUBIE, CUBIE, CUBIE);
const GEO_STICKER = {
    x: new THREE.BoxGeometry(0.01, S_SIZE, S_SIZE),
    y: new THREE.BoxGeometry(S_SIZE, 0.01, S_SIZE),
    z: new THREE.BoxGeometry(S_SIZE, S_SIZE, 0.01),
};

// Materiale interno condiviso e immutabile (non viene mai modificato dal paint)
const INNER_MAT = new THREE.MeshStandardMaterial({ color: INNER, roughness: 0.95, metalness: 0 });
INNER_MAT.userData.isProtected = true;

// ─── Costruzione cubo ────────────────────────────────────────────────────────
// Tabella sticker: [faccia, asse, segno, posizione]
// Sostituisce i 6 blocchi if copia-incolla con un unico loop
const STICKER_CFG = [
    ['R', 'x', +1, [S_HALF, 0, 0]],
    ['L', 'x', -1, [-S_HALF, 0, 0]],
    ['U', 'y', +1, [0, S_HALF, 0]],
    ['D', 'y', -1, [0, -S_HALF, 0]],
    ['F', 'z', +1, [0, 0, S_HALF]],
    ['B', 'z', -1, [0, 0, -S_HALF]],
];

function makeCubie(x, y, z) {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(GEO_BASE, INNER_MAT));

    const stickers = [];
    for (const [face, axis, sign, pos] of STICKER_CFG) {
        // mostra lo sticker solo se il cubie si trova sulla faccia esterna
        if ((axis === 'x' && x !== sign) ||
            (axis === 'y' && y !== sign) ||
            (axis === 'z' && z !== sign)) continue;

        // Ogni sticker ha il suo materiale (necessario per il paint indipendente)
        const mat = new THREE.MeshStandardMaterial({ color: FACE_COLORS[face], roughness: 0.35, metalness: 0.15 });
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

const cubeRoot = new THREE.Group();
scene.add(cubeRoot);
let cubies = [];
let allStickerMeshes = []; // array flat per raycast (più veloce del doppio loop)

function buildCube() {
    // Dispose materiali sticker: previene memory leak GPU ad ogni reset
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
    // Ricostruisce la lista flat degli sticker per il raycast
    allStickerMeshes = cubies.flatMap(c => c.userData.stickers.map(s => s.mesh));
    markDirty();
}
buildCube();

// ─── Motore mosse ─────────────────────────────────────────────────────────────
const FACE_AXIS = {
    U: { axis: 'y', layer: +1 }, D: { axis: 'y', layer: -1 },
    R: { axis: 'x', layer: +1 }, L: { axis: 'x', layer: -1 },
    F: { axis: 'z', layer: +1 }, B: { axis: 'z', layer: -1 },
};
const FACE_CW_SIGN = { U: -1, D: +1, R: -1, L: +1, F: -1, B: +1 };

// Vettori asse precalcolati: evita new THREE.Vector3() a ogni animateMove
const AXIS_VEC = {
    x: new THREE.Vector3(1, 0, 0),
    y: new THREE.Vector3(0, 1, 0),
    z: new THREE.Vector3(0, 0, 1),
};

let animating = false;
let speedMs = 320;

function getLayerCubies(face) {
    const { axis, layer } = FACE_AXIS[face];
    return cubies.filter(c => c.userData.logical[axis] === layer);
}

function rotateLogical(c, axis, dir) {
    const { x, y, z } = c.userData.logical;
    if (axis === 'x') c.userData.logical = { x, y: -dir * z, z: dir * y };
    if (axis === 'y') c.userData.logical = { x: dir * z, y, z: -dir * x };
    if (axis === 'z') c.userData.logical = { x: -dir * y, y: dir * x, z };
}

function animateMove(face, turns = 1) {
    return new Promise(resolve => {
        const { axis } = FACE_AXIS[face];
        const sign = FACE_CW_SIGN[face];
        const total = sign * turns * (Math.PI / 2);
        const dur = Math.max(80, speedMs * Math.abs(turns));
        const layer = getLayerCubies(face);
        const ax = AXIS_VEC[axis]; // vettore precalcolato, nessuna allocazione

        const pivot = new THREE.Group();
        cubeRoot.add(pivot);
        layer.forEach(c => pivot.attach(c));

        const start = performance.now();
        function tick(t) {
            const k = Math.min(1, (t - start) / dur);
            const e = 0.5 - 0.5 * Math.cos(Math.PI * k); // ease-in-out
            pivot.setRotationFromAxisAngle(ax, total * e);
            markDirty();
            if (k < 1) { requestAnimationFrame(tick); return; }

            // Snap finale + re-parent
            pivot.setRotationFromAxisAngle(ax, total);
            pivot.updateMatrixWorld(true);
            layer.forEach(c => cubeRoot.attach(c));
            cubeRoot.remove(pivot);

            const logDir = (sign > 0 ? 1 : -1) * turns;
            const steps = Math.abs(logDir);
            const stepDir = Math.sign(logDir);
            for (const c of layer) {
                for (let i = 0; i < steps; i++) rotateLogical(c, axis, stepDir);
                const lg = c.userData.logical;
                c.position.set(lg.x * STEP, lg.y * STEP, lg.z * STEP);
                // Pulizia errori floating-point nella matrice di rotazione
                c.updateMatrix();
                const m = c.matrix.elements;
                for (let i = 0; i < 16; i++) {
                    const r = Math.round(m[i]);
                    m[i] = Math.abs(m[i] - r) < 1e-6 ? r : Math.round(m[i] * 1e6) / 1e6;
                }
                c.matrix.decompose(c.position, c.quaternion, c.scale);
            }
            resolve();
        }
        requestAnimationFrame(tick);
    });
}

function parseMoves(str) {
    if (!str) return [];
    return str.trim().split(/\s+/).map(tok => {
        const face = tok[0];
        if (!FACE_AXIS[face]) return null;
        const turns = tok.endsWith('2') ? 2 : tok.endsWith("'") ? -1 : 1;
        return { face, turns, token: tok };
    }).filter(Boolean);
}

async function playMoves(moves, onStep) {
    for (let i = 0; i < moves.length; i++) {
        if (onStep) onStep(i, moves[i]);
        await animateMove(moves[i].face, moves[i].turns);
    }
}

// ─── Lettura stato cubo → stringa facelet ────────────────────────────────────
// FACE_FRAME unifica FACE_NORMALS e FACE_FRAME (erano dati duplicati)
// n = normale faccia; u = asse "su" della faccia; r = asse "destra" della faccia
const FACE_FRAME = {
    U: { n: [0, 1, 0], u: [0, 0, -1], r: [1, 0, 0] },
    D: { n: [0, -1, 0], u: [0, 0, 1], r: [1, 0, 0] },
    F: { n: [0, 0, 1], u: [0, 1, 0], r: [1, 0, 0] },
    B: { n: [0, 0, -1], u: [0, 1, 0], r: [-1, 0, 0] },
    R: { n: [1, 0, 0], u: [0, 1, 0], r: [0, 0, -1] },
    L: { n: [-1, 0, 0], u: [0, 1, 0], r: [0, 0, 1] },
};

// Tabella RGB precalcolata: evita conversioni hex→RGB ripetute nelle 54 chiamate a closestFaceColor
const FACE_RGB = Object.entries(FACE_COLORS).map(([face, hex]) => ({
    face,
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255,
}));

function closestFaceColor(hex) {
    const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
    let best = 'U', minD = Infinity;
    for (const fc of FACE_RGB) {
        const d = (r - fc.r) ** 2 + (g - fc.g) ** 2 + (b - fc.b) ** 2;
        if (d < minD) { minD = d; best = fc.face; }
    }
    return best;
}

// Vector3 temporanei riutilizzabili: zero allocazioni nel path caldo di getFacelets
const _tmpNormal = new THREE.Vector3();
const _tmpFaceN = new THREE.Vector3();

function getFacelets() {
    // Map logica "x,y,z" → cubie: O(1) per cella invece di O(27) con filter/loop
    const cubieMap = new Map(
        cubies.map(c => {
            const { x, y, z } = c.userData.logical;
            return [`${x},${y},${z}`, c];
        })
    );

    const order = ['U', 'R', 'F', 'D', 'L', 'B'];
    const out = [];

    for (const f of order) {
        const { n, u, r } = FACE_FRAME[f];
        _tmpFaceN.set(n[0], n[1], n[2]); // normale faccia, riusata nel dot product

        for (let row = 1; row >= -1; row--) {
            for (let col = -1; col <= 1; col++) {
                const lx = Math.round(n[0] + u[0] * row + r[0] * col);
                const ly = Math.round(n[1] + u[1] * row + r[1] * col);
                const lz = Math.round(n[2] + u[2] * row + r[2] * col);

                const cubie = cubieMap.get(`${lx},${ly},${lz}`);
                if (!cubie) { out.push('?'); continue; }

                let color = f; // fallback
                cubie.updateWorldMatrix(true, false);
                for (const { mesh, mat } of cubie.userData.stickers) {
                    // Calcola normale world-space dello sticker dopo le rotazioni
                    // (non usiamo faceName statico: non si aggiorna dopo le mosse)
                    _tmpNormal.copy(mesh.position).normalize().transformDirection(cubie.matrixWorld);
                    if (_tmpNormal.dot(_tmpFaceN) > 0.9) {
                        color = closestFaceColor(mat.color.getHex());
                        break;
                    }
                }
                out.push(color);
            }
        }
    }
    return out.join('');
}

// ─── Solver Kociemba ──────────────────────────────────────────────────────────
let kociembaReady = false;
let kociembaInitPromise = null;

function initKociemba() {
    if (kociembaReady) return Promise.resolve();
    if (kociembaInitPromise) return kociembaInitPromise;
    kociembaInitPromise = new Promise((resolve, reject) => {
        if (typeof Cube === 'undefined') {
            reject(new Error('Libreria cubejs non caricata. Controlla la connessione.'));
            return;
        }
        setTimeout(() => {
            try { Cube.initSolver(); kociembaReady = true; resolve(); }
            catch (e) { reject(e); }
        }, 0);
    });
    return kociembaInitPromise;
}

function solveKociemba() {
    const facelets = getFacelets();
    try {
        return parseMoves(Cube.fromString(facelets).solve());
    } catch (e) {
        throw new Error('Stato cubo non valido: ' + e.message + ' (' + facelets + ')');
    }
}

// ─── Scramble ─────────────────────────────────────────────────────────────────
const FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const TURNS = [1, -1, 2];

function tokenFor(face, turns) {
    return turns === 2 ? face + '2' : turns === -1 ? face + "'" : face;
}

function randomScramble(len = 22) {
    const moves = [];
    let lastFace = '', lastAxis = '';
    for (let i = 0; i < len; i++) {
        let f, axis, tries = 0;
        do {
            f = FACES[Math.floor(Math.random() * 6)];
            axis = FACE_AXIS[f].axis;
        } while ((f === lastFace || axis === lastAxis) && ++tries < 10);
        lastFace = f; lastAxis = axis;
        const t = TURNS[Math.floor(Math.random() * 3)];
        moves.push({ face: f, turns: t, token: tokenFor(f, t) });
    }
    return moves;
}

// ─── UI ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const btnScramble = $('btn-scramble');
const btnReset = $('btn-reset');
const btnSolve = $('btn-solve');
const btnStepMode = $('btn-step-mode');
const btnPrev = $('btn-prev');
const btnNext = $('btn-next');
const btnPaintMode = $('btn-paint-mode');
const btnResetColors = $('btn-reset-colors');
const speedInput = $('speed');
const stepCard = $('step-card');
const stepCurrent = $('step-current');
const stepTotal = $('step-total');
const stepMove = $('step-move');
const movesList = $('moves-list');

speedInput.addEventListener('input', e => { speedMs = 1000 - Number(e.target.value); });
speedMs = 1000 - Number(speedInput.value);

// ─── Paint ────────────────────────────────────────────────────────────────────
let paintMode = false;
let selectedColor = 0xffffff;

btnPaintMode.addEventListener('click', () => {
    paintMode = !paintMode;
    btnPaintMode.classList.toggle('active', paintMode);
    toast(paintMode ? 'Modalità paint attiva · clicca sugli sticker' : 'Modalità paint disattivata');
});

document.querySelectorAll('.paint-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.paint-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedColor = parseInt(btn.dataset.color, 16);
    });
});

btnResetColors.addEventListener('click', () => {
    if (animating) return;
    buildCube();
    toast('Colori resettati');
});

// Raycast: intersectObjects su array flat è più veloce del doppio loop manuale
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('click', e => {
    if (!paintMode || animating) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(allStickerMeshes);
    if (hits.length) {
        hits[0].object.material.color.setHex(selectedColor);
        markDirty();
    }
});

// ─── Step mode ────────────────────────────────────────────────────────────────
let stepMoves = [], stepIdx = 0;

function setBusy(b) {
    animating = b;
    [btnScramble, btnReset, btnSolve, btnStepMode, btnPrev, btnNext].forEach(x => x.disabled = b);
}

function toast(msg, ms = 1800) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

async function ensureSolverReady() {
    if (!kociembaReady) { toast('Inizializzazione solver…'); await initKociemba(); }
}

btnScramble.addEventListener('click', async () => {
    if (animating) return;
    setBusy(true); hideSteps();
    await playMoves(randomScramble(22));
    setBusy(false);
});

btnReset.addEventListener('click', () => {
    if (animating) return;
    hideSteps(); buildCube();
});

btnSolve.addEventListener('click', async () => {
    if (animating) return;
    setBusy(true);
    try {
        await ensureSolverReady();
        const moves = solveKociemba();
        if (!moves.length) { toast('Già risolto!'); setBusy(false); return; }
        showSteps(moves);
        await playMoves(moves, (i, m) => updateStepUI(i + 1, m));
        toast('Risolto ✓');
    } catch (e) {
        console.error(e);
        toast('Errore solver: ' + (e.message || e), 4000);
    }
    setBusy(false);
});

btnStepMode.addEventListener('click', async () => {
    if (animating) return;
    setBusy(true);
    try {
        await ensureSolverReady();
        const moves = solveKociemba();
        if (!moves.length) { toast('Già risolto!'); setBusy(false); return; }
        showSteps(moves); stepIdx = 0; updateStepUI(0, null);
    } catch (e) {
        console.error(e);
        toast('Errore solver: ' + (e.message || e), 4000);
    }
    setBusy(false);
});

btnNext.addEventListener('click', async () => {
    if (animating || stepIdx >= stepMoves.length) return;
    setBusy(true);
    const m = stepMoves[stepIdx];
    updateStepUI(stepIdx + 1, m);
    await animateMove(m.face, m.turns);
    stepIdx++;
    if (stepIdx >= stepMoves.length) toast('Risolto ✓');
    setBusy(false);
});

btnPrev.addEventListener('click', async () => {
    if (animating || stepIdx <= 0) return;
    setBusy(true);
    stepIdx--;
    const m = stepMoves[stepIdx];
    await animateMove(m.face, m.turns === 2 ? 2 : -m.turns);
    updateStepUI(stepIdx, stepMoves[stepIdx] ?? null);
    setBusy(false);
});

function showSteps(moves) {
    stepMoves = moves; stepIdx = 0;
    stepCard.hidden = false;
    stepTotal.textContent = moves.length;
    stepCurrent.textContent = 0;
    stepMove.textContent = '—';
    // DocumentFragment: un solo reflow invece di N inserimenti nel DOM
    const frag = document.createDocumentFragment();
    moves.forEach((m, i) => {
        const s = document.createElement('span');
        s.textContent = m.token;
        s.dataset.idx = i;
        if (m.phase) s.title = m.phase;
        frag.appendChild(s);
    });
    movesList.replaceChildren(frag);
}

function hideSteps() {
    stepCard.hidden = true;
    stepMoves = []; stepIdx = 0;
}

function updateStepUI(current, move) {
    stepCurrent.textContent = current;
    stepMove.textContent = move
        ? (move.phase ? `${move.token}  ·  ${move.phase}` : move.token)
        : '—';
    [...movesList.children].forEach((el, i) => {
        el.classList.toggle('active', i === current - 1);
        el.classList.toggle('done', i < current - 1);
    });
    movesList.children[current - 1]?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

// ─── Render loop ──────────────────────────────────────────────────────────────
// controls.update() gira ogni frame (necessario per damping),
// ma renderer.render() solo quando needsRender=true
function loop() {
    controls.update();
    if (needsRender) {
        renderer.render(scene, camera);
        needsRender = false;
    }
    requestAnimationFrame(loop);
}
loop();

// Preinit solver in background
initKociemba();