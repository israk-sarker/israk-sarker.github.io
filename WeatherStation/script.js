let allData = [];
let labs = {};
let selectedLab = null;
let currentStationData = null; // store real data for the station

let labChart = null;
let tempChart = null;
let humChart = null;
let luxChart = null;

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: { legend: { labels: { color: '#e0e0e0' } } },
  scales: {
    x: { ticks: { color: '#888' }, grid: { color: '#2a2a2a' } },
    y: { ticks: { color: '#888' }, grid: { color: '#2a2a2a' } }
  }
};

const $ = id => document.getElementById(id);

function getBaseUrl() {
  let v = $('ws-ip').value.trim();
  if (!v) v = 'localhost:3000';
  if (!v.startsWith('http')) v = 'http://' + v;
  return v;
}

function setStatus(text, statusType) {
  const badge = $('ws-status-badge');
  badge.textContent = text;
  badge.className = `status-badge ${statusType}`;
}

function showError(msg) {
  const err = $('ws-error-msg');
  err.textContent = msg;
  err.classList.add('visible');
  setTimeout(() => err.classList.remove('visible'), 7000);
}

function hideError() {
  $('ws-error-msg').classList.remove('visible');
}

function formatTimestamp(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (!isNaN(d.getTime())) {
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
  
  // Custom parsing for formats like "26-04-15 12:00:00"
  const m = String(ts).match(/(\d+)-(\d+)-(\d+)\s+(\d+:\d+:\d+)/);
  if (!m) return String(ts);
  const year = m[1].length === 2 ? `20${m[1]}` : m[1];
  return `${year}-${m[2]}-${m[3]} ${m[4]}`;
}

// Ensure keys match what we expect
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
    // Fix JS date parsing if format is YY-MM-DD
    if (newItem.timestamp && typeof newItem.timestamp === 'string') {
        const m = newItem.timestamp.match(/^(\d{2})-(\d{2})-(\d{2})\s+(.*)$/);
        if (m) {
            newItem.timestamp = `20${m[1]}-${m[2]}-${m[3]}T${m[4]}`;
        }
    }
    return newItem;
  });
}

async function connectToServer() {
  let url = getBaseUrl();
  if (url.includes('localhost') && location.protocol === 'file:') {
    url = './data.json';
  } else {
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.endsWith('/data')) url += '/data';
  }

  hideError();
  $('ws-btn-connect').disabled = true;
  setStatus('CONNECTING...', 'offline');

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();

    let fetchedData = Array.isArray(json) ? json : (json.data || []);
    allData = normalizeData(fetchedData);
    if (!allData.length) throw new Error('No data found');

    processData();
    setStatus('ONLINE', 'online');

  } catch (e) {
    if (url === './data.json') {
      setStatus('ERROR', 'offline');
      showError(`Failed to load local data — ${e.message}`);
    } else {
      try {
        const fallbackRes = await fetch('./data.json');
        const fallbackJson = await fallbackRes.json();
        let fallbackArray = Array.isArray(fallbackJson) ? fallbackJson : (fallbackJson.data || fallbackJson);
        allData = normalizeData(fallbackArray);
        processData();
        setStatus('LOCAL DEMO', 'demo');

        if ($('ws-ip').value.trim() !== '') {
          showError(`Cannot connect to ${url} — ${e.message}`);
        }
      } catch (err) {
        setStatus('ERROR', 'offline');
        showError(`Cannot connect to ${url} — ${e.message}`);
      }
    }
  } finally {
    $('ws-btn-connect').disabled = false;
  }
}

function processData() {
  labs = {};
  
  // Sort data by timestamp ascending to ensure charts go left-to-right
  allData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const item of allData) {
    if (!item || !item.position) continue;
    
    // Clean up parenthesis to extract lab group
    let cleanPos = String(item.position).replace(/[()]/g, '').trim(); 
    let lab = "Unknown";
    const dashIdx = cleanPos.indexOf('-');
    if (dashIdx > 0) {
      lab = cleanPos.substring(0, dashIdx); // e.g. "LEN", "LEN4", "LAN1"
    } else {
      const mMatch = cleanPos.match(/^([A-Za-z]+)/);
      if (mMatch) lab = mMatch[1].toUpperCase();
      else lab = cleanPos;
    }
    
    if (!labs[lab]) labs[lab] = {};
    if (!labs[lab][item.position]) labs[lab][item.position] = [];
    
    labs[lab][item.position].push(item);
  }

  $('ws-content-container').classList.add('visible');

  // Build lab selection list
  const labList = $('ws-lab-list');
  labList.innerHTML = '';
  const labNames = Object.keys(labs).sort();

  for (const lab of labNames) {
    const btn = document.createElement('button');
    btn.className = 'lab-btn';
    btn.textContent = lab;
    btn.onclick = () => selectLab(lab);
    labList.appendChild(btn);
  }

  if (labNames.length > 0) {
      selectLab(labNames[0]);
  }
}

function selectLab(labName) {
  selectedLab = labName;

  // Update lab buttons UI to highlight selected
  const buttons = $('ws-lab-list').children;
  for (let btn of buttons) {
    if (btn.textContent === labName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  // Populate Dropdown
  const sel = $('ws-station-select');
  sel.innerHTML = '<option value="">— Choose a station —</option>';

  const stationNames = Object.keys(labs[labName] || {}).sort();
  for (const s of stationNames) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  }

  $('ws-station-count').textContent = `${stationNames.length} stations available`;
  $('ws-lab-station-count').textContent = `${stationNames.length} stations`;

  // Hide specific panels
  $('ws-dashboard').classList.remove('visible');
  $('ws-timestamp-text').classList.remove('visible');
  $('ws-history-panel').style.display = 'none';

  renderLabOverviewChart(labName);
}

function renderLabOverviewChart(labName) {
  const container = $('ws-lab-overview');
  const canvas = $('labOverviewChart');
  const stationsMap = labs[labName] || {};
  const stationNames = Object.keys(stationsMap);
  
  if (stationNames.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';

  if (labChart) labChart.destroy();
  
  // Get latest reading for each station
  const labels = [];
  const temps = [];
  const hums = [];

  for(const s of stationNames) {
      labels.push(s);
      const readings = stationsMap[s];
      const latest = readings[readings.length - 1]; // sorted ascending
      temps.push(Number(latest.temperature) || 0);
      hums.push(Number(latest.humidity) || 0);
  }

  labChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Temp (°C)', data: temps, backgroundColor: '#7c6aff', borderRadius: 4 },
        { label: 'Humidity (%)', data: hums, backgroundColor: '#22c55e', borderRadius: 4 }
      ]
    },
    options: chartOptions
  });
}

function selectStation() {
  const pos = $('ws-station-select').value;
  if (!pos || !selectedLab || !labs[selectedLab][pos]) {
    $('ws-dashboard').classList.remove('visible');
    $('ws-timestamp-text').classList.remove('visible');
    $('ws-history-panel').style.display = 'none';
    return;
  }

  currentStationData = labs[selectedLab][pos];
  
  const latestReading = currentStationData[currentStationData.length - 1];
  
  renderDashboard(latestReading);
  $('ws-date-input').value = '';
  renderStationHistory(currentStationData);
}

function filterByDate() {
  const dateStr = $('ws-date-input').value;
  if (!dateStr || !currentStationData) return;
  renderStationHistory(currentStationData, dateStr);
}

function clearDateFilter() {
    $('ws-date-input').value = '';
    if (currentStationData) {
        renderStationHistory(currentStationData);
    }
}

function renderStationHistory(historyArray, dateFilter = null) {
  $('ws-history-panel').style.display = 'block';
  
  let dataToRender = historyArray;
  
  if (dateFilter) {
    dataToRender = dataToRender.filter(d => {
      const dDate = new Date(d.timestamp);
      // Fallback for timezone issues if any, just match YYYY-MM-DD local string
      const localISOTime = dDate.toLocaleDateString('en-CA'); // format: YYYY-MM-DD
      return localISOTime === dateFilter;
    });
  }

  if (dataToRender.length === 0) {
     $('ws-history-indicator').textContent = 'No data available for the selected timeframe.';
     if(tempChart) tempChart.destroy();
     if(humChart) humChart.destroy();
     if(luxChart) luxChart.destroy();
     ['temp', 'hum', 'lux'].forEach(k => {
         $(`stat-${k}-min`).textContent = '--';
         $(`stat-${k}-avg`).textContent = '--';
         $(`stat-${k}-max`).textContent = '--';
     });
     return;
  }
  
  $('ws-history-indicator').textContent = `Showing ${dataToRender.length} recorded data points.`;

  const temps = dataToRender.map(d => Number(d.temperature));
  const hums = dataToRender.map(d => Number(d.humidity));
  const luxs = dataToRender.map(d => Number(d.luminosity));

  const updateStats = (arr, prefix) => {
    const valid = arr.filter(n => !isNaN(n));
    if(!valid.length) {
        $(`stat-${prefix}-min`).textContent = '--';
        $(`stat-${prefix}-avg`).textContent = '--';
        $(`stat-${prefix}-max`).textContent = '--';
        return;
    }
    $(`stat-${prefix}-min`).textContent = Math.min(...valid).toFixed(1);
    $(`stat-${prefix}-max`).textContent = Math.max(...valid).toFixed(1);
    $(`stat-${prefix}-avg`).textContent = (valid.reduce((a,b)=>a+b,0)/valid.length).toFixed(1);
  };

  updateStats(temps, 'temp');
  updateStats(hums, 'hum');
  updateStats(luxs, 'lux');

  const labels = dataToRender.map(d => {
    const dt = new Date(d.timestamp);
    if (dateFilter) {
      return dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } else {
      return dt.toLocaleDateString([], {month:'short', day:'numeric'}) + ' ' + dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
  });

  if (tempChart) tempChart.destroy();
  tempChart = new Chart($('tempChart'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Temperature (°C)', data: temps, borderColor: '#7c6aff', backgroundColor: 'rgba(124, 106, 255, 0.1)', fill: true, tension: 0.2, pointRadius: 0, pointHitRadius: 10 }] },
    options: chartOptions
  });

  if (humChart) humChart.destroy();
  humChart = new Chart($('humChart'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Humidity (%)', data: hums, borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', fill: true, tension: 0.2, pointRadius: 0, pointHitRadius: 10 }] },
    options: chartOptions
  });

  if (luxChart) luxChart.destroy();
  luxChart = new Chart($('luxChart'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Luminosity (lux)', data: luxs, borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.2, pointRadius: 0, pointHitRadius: 10 }] },
    options: chartOptions
  });
}

function exportCSV() {
  if (!currentStationData || currentStationData.length === 0) return;
  const pos = $('ws-station-select').value;

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

function renderDashboard(station) {
  $('ws-dashboard').classList.add('visible');
  $('ws-timestamp-text').classList.add('visible');

  const temp = Number(station.temperature);
  const hum = Number(station.humidity);

  $('ws-temp-val').textContent = !isNaN(temp) ? temp.toFixed(1) : '--';
  $('ws-hum-val').textContent = !isNaN(hum) ? hum.toFixed(1) : '--';
  $('ws-lux-val').textContent = station.luminosity !== undefined ? station.luminosity : '--';
  $('ws-timestamp').textContent = formatTimestamp(station.timestamp);
}

window.addEventListener('load', () => {
  setTimeout(connectToServer, 500);
});