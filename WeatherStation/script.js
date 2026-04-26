let allData = [];
let labs = {};
let selectedLab = null;

const $ = id => document.getElementById(id);

function getBaseUrl() {
  let v = $('ws-ip').value.trim();
  if (!v) v = 'localhost:3000';
  if (!v.startsWith('http')) v = 'http://' + v;
  return v;
}

function setStatus(text, isError) {
  const txt = $('ws-status-text');
  txt.textContent = text;
  txt.className = 'status-text ' + (isError ? 'status-error' : 'status-success');
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
  const m = ts.match(/(\d+)-(\d+)-(\d+)\s+(\d+:\d+:\d+)/);
  if (!m) return ts;
  return `20${m[1]}-${m[2]}-${m[3]} ${m[4]}`;
}

async function connectToServer() {
  let url = getBaseUrl();
  if (url.includes('localhost') && location.protocol === 'file:') {
    url = './data.json';
  } else {
    url += '/data';
  }

  hideError();
  $('ws-btn-connect').textContent = 'Connecting...';
  $('ws-btn-connect').disabled = true;
  $('ws-status-text').textContent = 'Connecting...';
  $('ws-status-text').className = 'status-text status-connecting';

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();

    allData = Array.isArray(json) ? json : (json.data || []);
    if (!allData.length) throw new Error('No data found');

    parseData();
    setStatus('ONLINE', false);

    // Select first lab by default
    const labNames = Object.keys(labs).sort();
    if (labNames.length > 0) selectLab(labNames[0]);

  } catch (e) {
    if (url === './data.json') {
      setStatus('ERROR', true);
      showError(`Failed to load local data — ${e.message}`);
    } else {
      try {
        const fallbackRes = await fetch('./data.json');
        const fallbackJson = await fallbackRes.json();
        allData = fallbackJson.data || fallbackJson;
        parseData();
        setStatus('OFFLINE (Local Demo)', false);
        $('ws-status-text').className = 'status-text status-demo';

        const labNames = Object.keys(labs).sort();
        if (labNames.length > 0) selectLab(labNames[0]);
      } catch (err) {
        setStatus('ERROR', true);
        showError(`Cannot connect to ${url} — ${e.message}`);
      }
    }
  } finally {
    $('ws-btn-connect').textContent = 'Connect';
    $('ws-btn-connect').disabled = false;
  }
}

function parseData() {
  labs = {};
  for (const item of allData) {
    const m = item.position.match(/^([A-Z]+\d+)-(\d+)$/);
    if (!m) continue;
    const lab = m[1];
    if (!labs[lab]) labs[lab] = [];
    labs[lab].push(item);
  }

  $('ws-content-container').classList.add('visible');

  // Build lab selection list
  const labList = $('ws-lab-list');
  labList.innerHTML = '';
  const labNames = Object.keys(labs).sort();

  for (const lab of labNames) {
    const btn = document.createElement('div');
    btn.className = 'button';
    btn.textContent = `${lab}`;
    btn.onclick = () => selectLab(lab);
    labList.appendChild(btn);
  }
}

function selectLab(lab) {
  selectedLab = lab;

  // Update lab buttons UI to highlight selected
  const buttons = $('ws-lab-list').children;
  for (let btn of buttons) {
    if (btn.textContent === lab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  // Populate Dropdown
  const sel = $('ws-station-select');
  sel.innerHTML = '<option value=""> Select a Station </option>';

  const stations = labs[lab] || [];
  for (const s of stations) {
    const opt = document.createElement('option');
    opt.value = s.position;
    opt.textContent = s.position;
    sel.appendChild(opt);
  }

  // Hide dashboard until a station is specificially selected
  $('ws-dashboard').classList.remove('visible');
  $('ws-timestamp-text').classList.remove('visible');
}

function selectStation() {
  const pos = $('ws-station-select').value;
  if (!pos) {
    $('ws-dashboard').classList.remove('visible');
    $('ws-timestamp-text').classList.remove('visible');
    return;
  }
  const station = allData.find(d => d.position === pos);
  if (station) renderDashboard(station);
}

function renderDashboard(station) {
  $('ws-dashboard').classList.add('visible');
  $('ws-timestamp-text').classList.add('visible');

  $('ws-temp-val').textContent = station.temperature.toFixed(1);
  $('ws-hum-val').textContent = station.humidity.toFixed(1);
  $('ws-lux-val').textContent = station.luminosity;
  $('ws-timestamp').textContent = formatTimestamp(station.timestamp);
}

window.addEventListener('load', () => {
  setTimeout(connectToServer, 500);
});