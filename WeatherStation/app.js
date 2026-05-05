let allData = [];
let labs = {};
let selectedLab = null;
let currentStationData = null;

let labChartInstance = null;
let historyChartInstances = null;

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const wsIpInput = document.querySelector('#wsIp');
    const wsBtnConnect = document.querySelector('#wsBtnConnect');
    const wsStatusBadge = document.querySelector('#wsStatusBadge');
    const wsErrorMsg = document.querySelector('#wsErrorMsg');

    const wsContentContainer = document.querySelector('#wsContentContainer');
    const wsLabList = document.querySelector('#wsLabList');
    const wsStationSelect = document.querySelector('#wsStationSelect');
    const wsStationCount = document.querySelector('#wsStationCount');
    const wsLabStationCount = document.querySelector('#wsLabStationCount');

    const wsLabOverview = document.querySelector('#wsLabOverview');
    const labOverviewChartCanvas = document.querySelector('#labOverviewChart');

    const wsDashboard = document.querySelector('#wsDashboard');
    const wsTempVal = document.querySelector('#wsTempVal');
    const wsHumVal = document.querySelector('#wsHumVal');
    const wsLuxVal = document.querySelector('#wsLuxVal');
    const wsTimestampText = document.querySelector('#wsTimestampText');
    const wsTimestamp = document.querySelector('#wsTimestamp');

    const wsHistoryPanel = document.querySelector('#wsHistoryPanel');
    const wsDateInput = document.querySelector('#wsDateInput');
    const wsBtnFilter = document.querySelector('#wsBtnFilter');
    const wsBtnClear = document.querySelector('#wsBtnClear');
    const wsBtnCsv = document.querySelector('#wsBtnCsv');
    const wsHistoryIndicator = document.querySelector('#wsHistoryIndicator');

    const tempChartCanvas = document.querySelector('#tempChart');
    const humChartCanvas = document.querySelector('#humChart');
    const luxChartCanvas = document.querySelector('#luxChart');

    // Event Listeners
    wsBtnConnect.addEventListener('click', handleConnect);
    wsStationSelect.addEventListener('change', handleStationSelect);
    wsBtnFilter.addEventListener('click', filterByDate);
    wsBtnClear.addEventListener('click', clearDateFilter);
    wsBtnCsv.addEventListener('click', exportCSV);

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
        if (!v.startsWith('http')) v = 'http://' + v;
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

        wsStationSelect.innerHTML = '<option value=""> Choose a station </option>';
        const stationNames = Object.keys(labs[labName] || {}).sort();
        for (const s of stationNames) {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            wsStationSelect.appendChild(opt);
        }

        wsStationCount.textContent = `${stationNames.length} stations available`;
        wsLabStationCount.textContent = `${stationNames.length} stations`;

        wsDashboard.style.display = 'none';
        wsTimestampText.style.display = 'none';
        wsHistoryPanel.style.display = 'none';

        if (labChartInstance) {
            destroyCharts(labChartInstance);
        }

        if (stationNames.length > 0) {
            wsLabOverview.style.display = 'block';
            labChartInstance = renderLabOverviewChart(labOverviewChartCanvas, labs[labName]);
        } else {
            wsLabOverview.style.display = 'none';
        }
    }

    function handleStationSelect() {
        const pos = wsStationSelect.value;
        if (!pos || !selectedLab || !labs[selectedLab][pos]) {
            wsDashboard.style.display = 'none';
            wsTimestampText.style.display = 'none';
            wsHistoryPanel.style.display = 'none';
            return;
        }

        currentStationData = labs[selectedLab][pos];
        const latestReading = currentStationData[currentStationData.length - 1];

        renderDashboard(latestReading);
        wsDateInput.value = '';
        renderStationHistory(currentStationData);
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

    function renderStationHistory(historyArray, dateFilter = null) {
        wsHistoryPanel.style.display = 'block';

        let dataToRender = historyArray;

        if (dateFilter) {
            dataToRender = dataToRender.filter(d => {
                const dDate = new Date(d.timestamp);
                const localISOTime = dDate.toLocaleDateString('en-CA');
                return localISOTime === dateFilter;
            });
        }

        if (historyChartInstances) {
            destroyCharts(historyChartInstances);
        }

        if (dataToRender.length === 0) {
            wsHistoryIndicator.textContent = 'No data available for the selected timeframe.';
            ['temp', 'hum', 'lux'].forEach(k => {
                document.querySelector(`#stat${k.charAt(0).toUpperCase() + k.slice(1)}Min`).textContent = '--';
                document.querySelector(`#stat${k.charAt(0).toUpperCase() + k.slice(1)}Avg`).textContent = '--';
                document.querySelector(`#stat${k.charAt(0).toUpperCase() + k.slice(1)}Max`).textContent = '--';
            });
            return;
        }

        wsHistoryIndicator.textContent = `Showing ${dataToRender.length} recorded data points.`;

        const temps = dataToRender.map(d => Number(d.temperature));
        const hums = dataToRender.map(d => Number(d.humidity));
        const luxs = dataToRender.map(d => Number(d.luminosity));

        const updateStats = (arr, prefix) => {
            const valid = arr.filter(n => !isNaN(n));
            const capPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);
            if (!valid.length) {
                document.querySelector(`#stat${capPrefix}Min`).textContent = '--';
                document.querySelector(`#stat${capPrefix}Avg`).textContent = '--';
                document.querySelector(`#stat${capPrefix}Max`).textContent = '--';
                return;
            }
            document.querySelector(`#stat${capPrefix}Min`).textContent = Math.min(...valid).toFixed(1);
            document.querySelector(`#stat${capPrefix}Max`).textContent = Math.max(...valid).toFixed(1);
            document.querySelector(`#stat${capPrefix}Avg`).textContent = (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
        };

        updateStats(temps, 'temp');
        updateStats(hums, 'hum');
        updateStats(luxs, 'lux');

        historyChartInstances = renderHistoryCharts({
            tempCanvas: tempChartCanvas,
            humCanvas: humChartCanvas,
            luxCanvas: luxChartCanvas
        }, dataToRender, dateFilter);
    }

    function filterByDate() {
        const dateStr = wsDateInput.value;
        if (!dateStr || !currentStationData) return;
        renderStationHistory(currentStationData, dateStr);
    }

    function clearDateFilter() {
        wsDateInput.value = '';
        if (currentStationData) {
            renderStationHistory(currentStationData);
        }
    }

    function exportCSV() {
        if (!currentStationData || currentStationData.length === 0) return;
        const pos = wsStationSelect.value;

        const headers = "Timestamp,Temperature,Humidity,Luminosity\n";
        const rows = currentStationData.map(d => `${d.timestamp},${d.temperature},${d.humidity},${d.luminosity}`).join("\n");

        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `station_${pos}_history.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
});
