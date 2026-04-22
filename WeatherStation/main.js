/**
 * WeatherStation – main.js
 * State-machine driven dashboard for environmental sensor data.
 * Steps: connect → labs → desks → detail
 */

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');

    // ─── Application State ─────────────────────────────────────
    const state = {
        step: 'connect',       // 'connect' | 'labs' | 'desks' | 'detail'
        ip: 'localhost',
        allData: [],           // raw array of sensor records
        labs: [],              // unique lab tags sorted
        selectedLab: null,
        desks: [],             // desk numbers for selected lab
        selectedDesk: null,
        record: null,          // single record to display
        connected: false,
        error: null,
    };

    // ─── Main Render Dispatcher ────────────────────────────────
    function render() {
        switch (state.step) {
            case 'connect': renderConnect(); break;
            case 'labs':    renderLabs();    break;
            case 'desks':   renderDesks();   break;
            case 'detail':  renderDetail();  break;
        }
    }

    // ─── Helpers ───────────────────────────────────────────────
    /** Normalize API response to always return an array */
    function normalizeData(raw) {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object') {
            return raw.data || raw.dati || Object.values(raw).find(Array.isArray) || [];
        }
        return [];
    }

    /** Read a field from a record, trying multiple key variants */
    function field(record, ...keys) {
        for (const k of keys) {
            if (record[k] !== undefined) return record[k];
        }
        return undefined;
    }

    /** Extract lab tag from position string like "LAN1-5" → "LAN1" */
    function labFromPosition(pos) {
        return pos ? pos.split('-')[0] : '';
    }

    /** Extract desk number from position string "LAN1-5" → 5 */
    function deskFromPosition(pos) {
        if (!pos || !pos.includes('-')) return 0;
        return parseInt(pos.split('-')[1], 10) || 0;
    }

    // ─── Step 1: Connect ───────────────────────────────────────
    function renderConnect() {
        app.innerHTML = `
            <div class="glass-card fade-in">
                <div class="connect-section">
                    <div>
                        <label for="ip-input">Indirizzo IP del Server</label>
                        <div class="connect-row">
                            <input type="text" id="ip-input"
                                   value="${state.ip}"
                                   placeholder="Es. 192.168.4.46 (default: localhost)">
                            <button class="btn btn-primary" id="btn-connect">Connetti</button>
                        </div>
                    </div>
                    <div class="status-bar">
                        <div class="status-dot ${state.connected ? 'connected' : (state.error ? 'error' : '')}"></div>
                        <span id="status-text">${
                            state.error ? state.error :
                            state.connected ? `Connesso a ${state.ip} — ${state.allData.length} record` :
                            'Non connesso'
                        }</span>
                    </div>
                </div>
            </div>
        `;

        const btnConnect = document.getElementById('btn-connect');
        const ipInput = document.getElementById('ip-input');

        btnConnect.addEventListener('click', () => handleConnect(ipInput.value.trim()));
        ipInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConnect(ipInput.value.trim());
            }
        });
    }

    async function handleConnect(ip) {
        state.ip = ip || 'localhost';
        state.error = null;
        state.connected = false;

        // Show loading state
        const btn = document.getElementById('btn-connect');
        const statusText = document.getElementById('status-text');
        const statusDot = document.querySelector('.status-dot');
        if (btn) { btn.disabled = true; btn.textContent = '...'; }
        if (statusText) statusText.textContent = 'Connessione in corso...';
        if (statusDot) { statusDot.className = 'status-dot'; }

        try {
            const response = await fetch(`http://${state.ip}:3000/data`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const raw = await response.json();
            state.allData = normalizeData(raw);

            if (state.allData.length === 0) {
                throw new Error('Nessun dato trovato nel database');
            }

            // Extract unique lab tags
            const labSet = new Set();
            state.allData.forEach(item => {
                const pos = field(item, 'position', 'Position');
                if (pos) labSet.add(labFromPosition(pos));
            });
            state.labs = Array.from(labSet).sort();

            state.connected = true;
            state.step = 'labs';
            render();
        } catch (err) {
            state.error = `Connessione fallita: ${err.message}`;
            state.connected = false;
            render();
        }
    }

    // ─── Step 2: Lab Selection ─────────────────────────────────
    function renderLabs() {
        const labCards = state.labs.map(lab => {
            const count = state.allData.filter(item => {
                const pos = field(item, 'position', 'Position');
                return labFromPosition(pos) === lab;
            }).length;

            return `
                <div class="lab-card" data-lab="${lab}">
                    <div class="lab-icon">🏫</div>
                    <div class="lab-name">${lab}</div>
                    <div class="lab-count">${count} postazion${count === 1 ? 'e' : 'i'}</div>
                </div>
            `;
        }).join('');

        app.innerHTML = `
            <div class="fade-in">
                <div class="breadcrumb">
                    <span class="crumb-link" id="crumb-connect">${state.ip}</span>
                    <span class="separator">›</span>
                    <span>Laboratori</span>
                </div>
                <div class="glass-card">
                    <div class="section-title">Laboratori Disponibili</div>
                    <div class="labs-grid">
                        ${labCards}
                    </div>
                </div>
            </div>
        `;

        // Bind events
        document.getElementById('crumb-connect').addEventListener('click', () => {
            state.step = 'connect';
            render();
        });

        document.querySelectorAll('.lab-card').forEach(card => {
            card.addEventListener('click', () => {
                state.selectedLab = card.dataset.lab;
                // Extract desk numbers for this lab
                const deskSet = new Set();
                state.allData.forEach(item => {
                    const pos = field(item, 'position', 'Position');
                    if (pos && labFromPosition(pos) === state.selectedLab) {
                        deskSet.add(deskFromPosition(pos));
                    }
                });
                state.desks = Array.from(deskSet).sort((a, b) => a - b);
                state.step = 'desks';
                render();
            });
        });
    }

    // ─── Step 3: Desk Selection ────────────────────────────────
    function renderDesks() {
        const chips = state.desks.map(num => {
            return `<div class="desk-chip" data-desk="${num}">${num}</div>`;
        }).join('');

        app.innerHTML = `
            <div class="fade-in">
                <div class="breadcrumb">
                    <span class="crumb-link" id="crumb-connect">${state.ip}</span>
                    <span class="separator">›</span>
                    <span class="crumb-link" id="crumb-labs">Laboratori</span>
                    <span class="separator">›</span>
                    <span>${state.selectedLab}</span>
                </div>
                <div class="glass-card">
                    <div class="section-title">Postazioni in ${state.selectedLab}</div>
                    <div class="desks-grid">
                        ${chips}
                    </div>
                </div>
            </div>
        `;

        // Bind breadcrumb
        document.getElementById('crumb-connect').addEventListener('click', () => {
            state.step = 'connect'; render();
        });
        document.getElementById('crumb-labs').addEventListener('click', () => {
            state.step = 'labs'; render();
        });

        // Bind desk clicks
        document.querySelectorAll('.desk-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const deskNum = parseInt(chip.dataset.desk, 10);
                const targetPos = `${state.selectedLab}-${deskNum}`;
                state.selectedDesk = deskNum;
                state.record = state.allData.find(item => {
                    const pos = (field(item, 'position', 'Position') || '').toUpperCase();
                    return pos === targetPos.toUpperCase();
                });
                state.step = 'detail';
                render();
            });
        });
    }

    // ─── Step 4: Detail Dashboard ──────────────────────────────
    function renderDetail() {
        const data = state.record;
        if (!data) {
            app.innerHTML = `
                <div class="glass-card fade-in">
                    <div class="error-box">Nessun dato trovato per questa postazione.</div>
                </div>`;
            return;
        }

        const temp      = field(data, 'temperature', 'Temperture');
        const humidity   = field(data, 'humidity', 'Humidity ', 'Humidity');
        const luminosity = field(data, 'luminosity', 'Luminosity ', 'Luminosity');
        const timestamp  = field(data, 'timestamp', 'Time stamp ', 'Timestamp');
        const position   = field(data, 'position', 'Position');

        app.innerHTML = `
            <div class="fade-in">
                <div class="breadcrumb">
                    <span class="crumb-link" id="crumb-connect">${state.ip}</span>
                    <span class="separator">›</span>
                    <span class="crumb-link" id="crumb-labs">Laboratori</span>
                    <span class="separator">›</span>
                    <span class="crumb-link" id="crumb-desks">${state.selectedLab}</span>
                    <span class="separator">›</span>
                    <span>Postazione ${state.selectedDesk}</span>
                </div>
                <div class="glass-card">
                    <div class="detail-header">
                        <div class="detail-position">
                            Postazione <span class="highlight">${position}</span>
                        </div>
                        <div class="detail-time">${timestamp || 'N/D'}</div>
                    </div>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-icon">🌡️</div>
                            <div class="metric-label">Temperatura</div>
                            <div class="metric-value">
                                ${temp !== undefined ? temp : '--'}<span class="metric-unit">°C</span>
                            </div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-icon">💧</div>
                            <div class="metric-label">Umidità</div>
                            <div class="metric-value">
                                ${humidity !== undefined ? humidity : '--'}<span class="metric-unit">%</span>
                            </div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-icon">💡</div>
                            <div class="metric-label">Luminosità</div>
                            <div class="metric-value">
                                ${luminosity !== undefined ? luminosity : '--'}<span class="metric-unit"> Lux</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind breadcrumb
        document.getElementById('crumb-connect').addEventListener('click', () => {
            state.step = 'connect'; render();
        });
        document.getElementById('crumb-labs').addEventListener('click', () => {
            state.step = 'labs'; render();
        });
        document.getElementById('crumb-desks').addEventListener('click', () => {
            state.step = 'desks'; render();
        });
    }

    // ─── Boot ──────────────────────────────────────────────────
    render();
});