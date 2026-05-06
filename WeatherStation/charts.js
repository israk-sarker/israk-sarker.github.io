const THEME_COLORS = {
    text: 'rgba(255, 255, 255, 0.85)',
    grid: 'rgba(255, 255, 255, 0.1)',
    temp: '#ff5e62',
    hum: '#00c6ff',
    lux: '#f9d423',
    tempFill: 'rgba(255, 94, 98, 0.2)',
    humFill: 'rgba(0, 198, 255, 0.2)',
    luxFill: 'rgba(249, 212, 35, 0.2)'
};

const CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    plugins: {
        legend: { labels: { color: THEME_COLORS.text, font: { family: 'Inter, sans-serif' } } }
    },
    scales: {
        x: { ticks: { color: THEME_COLORS.text }, grid: { color: THEME_COLORS.grid } },
        y: { ticks: { color: THEME_COLORS.text }, grid: { color: THEME_COLORS.grid } }
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

    for (const s of stationNames) {
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
                { label: 'Temp (°C)', data: temps, backgroundColor: THEME_COLORS.temp, borderRadius: 4 },
                { label: 'Humidity (%)', data: hums, backgroundColor: THEME_COLORS.hum, borderRadius: 4 }
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
            return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return dt.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    });

    const tempChart = new Chart(tempCanvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Temperature (°C)', data: temps, borderColor: THEME_COLORS.temp, backgroundColor: THEME_COLORS.tempFill, fill: true, tension: 0.4 }] },
        options: CHART_OPTIONS
    });

    const humChart = new Chart(humCanvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Humidity (%)', data: hums, borderColor: THEME_COLORS.hum, backgroundColor: THEME_COLORS.humFill, fill: true, tension: 0.4 }] },
        options: CHART_OPTIONS
    });

    const luxChart = new Chart(luxCanvas, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Luminosity (lux)', data: luxs, borderColor: THEME_COLORS.lux, backgroundColor: THEME_COLORS.luxFill, fill: true, tension: 0.4 }] },
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
