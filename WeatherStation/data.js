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

function processData(allData) {
    const labs = {};

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
    return labs;
}

async function connectToServer(url) {
    let finalUrl = url;
    if (finalUrl.endsWith('/')) finalUrl = finalUrl.slice(0, -1);
    if (!finalUrl.endsWith('/data')) finalUrl += '/data';

    const res = await fetch(finalUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();

    let fetchedData = Array.isArray(json) ? json : (json.data || []);
    const allData = normalizeData(fetchedData);
    if (!allData.length) throw new Error('No data found');

    const labs = processData(allData);
    return { allData, labs };
}
