function formatTimestamp(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    }

    const m = String(ts).match(/(\d+)-(\d+)-(\d+)\s+(\d+:\d+:\d+)/);
    if (!m) return String(ts);
    const year = m[1].length === 2 ? `20${m[1]}` : m[1];
    return `${year}-${m[2]}-${m[3]} ${m[4]}`;
}

function normalizeData(dataArray) {
    if (!Array.isArray(dataArray)) return [];
    return dataArray.map(item => {
        const newItem = {};
        for (let key in item) {
            let cleanKey = key.trim().toLowerCase();
            if (cleanKey === 'temperture') cleanKey = 'temperature';
            if (cleanKey === 'time stamp') cleanKey = 'timestamp';
            newItem[cleanKey] = item[key];
        }
        if (newItem.timestamp && typeof newItem.timestamp === 'string') {
            const m = newItem.timestamp.match(/^(\d{2})-(\d{2})-(\d{2})\s+(.*)$/);
            if (m) {
                newItem.timestamp = `20${m[1]}-${m[2]}-${m[3]}T${m[4]}`;
            }
        }
        return newItem;
    });
}

function processData(allData) {
    const labs = {};
    allData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const item of allData) {
        if (!item || !item.position) continue;

        let cleanPos = String(item.position).replace(/[()]/g, '').trim();
        let lab = "Unknown";
        const dashIdx = cleanPos.indexOf('-');
        if (dashIdx > 0) {
            lab = cleanPos.substring(0, dashIdx);
        } else {
            const mMatch = cleanPos.match(/^([A-Za-z]+)/);
            if (mMatch) lab = mMatch[1].toUpperCase();
            else lab = cleanPos;
        }

        if (!labs[lab]) labs[lab] = {};
        if (!labs[lab][item.position]) labs[lab][item.position] = [];

        labs[lab][item.position].push(item);
    }
    return labs;
}

async function connectToServer(url) {
    let finalUrl = url;
    if (finalUrl.endsWith('/')) finalUrl = finalUrl.slice(0, -1);
    if (!finalUrl.endsWith('/data')) finalUrl += '/data';

    // In a real scenario we might fetch from a server, but here we'll try to fetch the local json for testing
    // if url is localhost or empty, we fallback to local file
    try {
        const isLocal = finalUrl.includes('localhost') || finalUrl === '/data';
        const fetchUrl = isLocal ? '../WeatherStation/data.json' : finalUrl;
        
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();

        let fetchedData = Array.isArray(json) ? json : (json.data || []);
        const allData = normalizeData(fetchedData);
        if (!allData.length) throw new Error('No data found');

        const labs = processData(allData);
        return { allData, labs };
    } catch(err) {
        throw err;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let allData = [];
    let labs = {};
    let selectedLab = null;
    let currentStationData = null;

    const wsIpInput = document.querySelector('#wsIp');
    const wsBtnConnect = document.querySelector('#wsBtnConnect');
    const wsStatusBadge = document.querySelector('#wsStatusBadge');
    const wsErrorMsg = document.querySelector('#wsErrorMsg');

    const wsContentContainer = document.querySelector('#wsContentContainer');
    const wsLabList = document.querySelector('#wsLabList');
    const wsStationSelect = document.querySelector('#wsStationSelect');
    const wsStationCount = document.querySelector('#wsStationCount');

    const wsDashboard = document.querySelector('#wsDashboard');
    const wsTempVal = document.querySelector('#wsTempVal');
    const wsHumVal = document.querySelector('#wsHumVal');
    const wsLuxVal = document.querySelector('#wsLuxVal');
    const wsTimestampText = document.querySelector('#wsTimestampText');
    const wsTimestamp = document.querySelector('#wsTimestamp');

    wsBtnConnect.addEventListener('click', handleConnect);
    wsStationSelect.addEventListener('change', handleStationSelect);

    function setStatus(text, statusType) {
        wsStatusBadge.textContent = text;
        wsStatusBadge.className = `statusBadge ${statusType}`;
    }

    function showError(msg) {
        wsErrorMsg.textContent = msg;
        wsErrorMsg.classList.add('visible');
        setTimeout(() => wsErrorMsg.classList.remove('visible'), 7000);
    }

    function hideError() {
        wsErrorMsg.classList.remove('visible');
    }

    function getBaseUrl() {
        let v = wsIpInput.value.trim();
        if (!v) v = 'localhost:3000';
        if (!v.startsWith('http') && !v.startsWith('/')) v = 'http://' + v;
        return v;
    }

    async function handleConnect() {
        const url = getBaseUrl();
        hideError();
        wsBtnConnect.disabled = true;
        setStatus('CONNECTING...', 'offline');

        try {
            const result = await connectToServer(url);
            allData = result.allData;
            labs = result.labs;

            setStatus('ONLINE', 'online');
            renderLabs();
            wsContentContainer.style.display = 'flex';
        } catch (e) {
            setStatus('ERROR', 'offline');
            showError(`Cannot connect to ${url} — ${e.message}`);
        } finally {
            wsBtnConnect.disabled = false;
        }
    }

    function renderLabs() {
        wsLabList.innerHTML = '';
        const labNames = Object.keys(labs).sort();

        for (const lab of labNames) {
            const btn = document.createElement('button');
            btn.className = 'labBtn';
            btn.textContent = lab;
            btn.addEventListener('click', () => selectLab(lab));
            wsLabList.appendChild(btn);
        }

        if (labNames.length > 0) {
            selectLab(labNames[0]);
        }
    }

    function selectLab(labName) {
        selectedLab = labName;

        const buttons = wsLabList.children;
        for (let btn of buttons) {
            if (btn.textContent === labName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }

        wsStationSelect.innerHTML = '<option value="">— Choose a station —</option>';
        const stationNames = Object.keys(labs[labName] || {}).sort();
        for (const s of stationNames) {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            wsStationSelect.appendChild(opt);
        }

        wsStationCount.textContent = `${stationNames.length} stations`;

        wsDashboard.style.display = 'none';
        wsTimestampText.style.display = 'none';
    }

    function handleStationSelect() {
        const pos = wsStationSelect.value;
        if (!pos || !selectedLab || !labs[selectedLab][pos]) {
            wsDashboard.style.display = 'none';
            wsTimestampText.style.display = 'none';
            return;
        }

        currentStationData = labs[selectedLab][pos];
        const latestReading = currentStationData[currentStationData.length - 1];

        renderDashboard(latestReading);
    }

    function renderDashboard(station) {
        wsDashboard.style.display = 'flex';
        wsTimestampText.style.display = 'block';

        const temp = Number(station.temperature);
        const hum = Number(station.humidity);

        wsTempVal.textContent = !isNaN(temp) ? temp.toFixed(1) : '--';
        wsHumVal.textContent = !isNaN(hum) ? hum.toFixed(1) : '--';
        wsLuxVal.textContent = station.luminosity !== undefined ? station.luminosity : '--';
        wsTimestamp.textContent = formatTimestamp(station.timestamp);
    }
});
