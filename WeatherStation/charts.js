const CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    plugins: { legend: { labels: { color: '#ffffff' } } },
    scales: {
        x: { ticks: { color: '#ffffff' }, grid: { color: '#ffffff' } },
        y: { ticks: { color: '#ffffff' }, grid: { color: '#ffffff' } }
    }
};

function renderLabOverviewChart(canvas, stationsMap) {
    const stationNames = Object.keys(stationsMap);
    
    if (stationNames.length === 0) {
        return null;
    }
    
    const labels = [];
    const temps = [];
    const hums = [];

    for(const s of stationNames) {
        labels.push(s);
        const readings = stationsMap[s];
        const latest = readings[readings.length - 1]; 
        temps.push(Number(latest.temperature) || 0);
        hums.push(Number(latest.humidity) || 0);
    }

    return new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Temp (°C)', data: temps, backgroundColor: '#0000ff' },
                { label: 'Humidity (%)', data: hums, backgroundColor: '#ff0000' }
            ]
        },
        options: CHART_OPTIONS
    });
}

function renderHistoryCharts(canvases, dataToRender, dateFilter = null) {
    const { tempCanvas, humCanvas, luxCanvas } = canvases;

    const temps = dataToRender.map(d => Number(d.temperature));
    const hums = dataToRender.map(d => Number(d.humidity));
    const luxs = dataToRender.map(d => Number(d.luminosity));

    const labels = dataToRender.map(d => {
        const dt = new Date(d.timestamp);
        if (dateFilter) {
            return dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else {
            return dt.toLocaleDateString([], {month:'short', day:'numeric'}) + ' ' + dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    });

    const tempChart = new Chart(tempCanvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Temperature (°C)', data: temps, borderColor: '#0000ff', fill: false, tension: 0.1 }] },
        options: CHART_OPTIONS
    });

    const humChart = new Chart(humCanvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Humidity (%)', data: hums, borderColor: '#ff0000', fill: false, tension: 0.1 }] },
        options: CHART_OPTIONS
    });

    const luxChart = new Chart(luxCanvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Luminosity (lux)', data: luxs, borderColor: '#ffffff', fill: false, tension: 0.1 }] },
        options: CHART_OPTIONS
    });

    return { tempChart, humChart, luxChart };
}

function destroyCharts(chartInstances) {
    if (chartInstances) {
        if (Array.isArray(chartInstances)) {
            chartInstances.forEach(c => c && c.destroy());
        } else if (chartInstances.destroy) {
            chartInstances.destroy();
        } else {
            Object.values(chartInstances).forEach(c => c && c.destroy());
        }
    }
}
