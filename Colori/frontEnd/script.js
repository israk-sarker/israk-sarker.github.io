const historyKey = 'israk-color-quiz-history';
let currentColor = { r: 0, g: 0, b: 0 };
let historyVisible = false;
let colorHistory = loadStoredHistory();

function loadStoredHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem(historyKey) || '[]');
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveStoredHistory() {
    try {
        localStorage.setItem(historyKey, JSON.stringify(colorHistory));
        return true;
    } catch {
        return false;
    }
}

function generateRandomColor() {
    currentColor = {
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256)
    };

    const display = document.getElementById('colorDisplay');
    if (display) {
        display.style.backgroundColor = 'rgb(' + currentColor.r + ', ' + currentColor.g + ', ' + currentColor.b + ')';
        display.setAttribute('aria-label', 'Colore casuale RGB ' + currentColor.r + ', ' + currentColor.g + ', ' + currentColor.b);
    }
}

function saveChoice(choice) {
    colorHistory.push({
        id: Date.now() + '-' + Math.random().toString(16).slice(2, 8),
        r: currentColor.r,
        g: currentColor.g,
        b: currentColor.b,
        choice: choice
    });
    const stored = saveStoredHistory();
    const feedback = document.getElementById('choiceFeedback');
    if (feedback) {
        feedback.textContent = stored
            ? 'Risposta salvata: ' + choice + '.'
            : 'Risposta registrata per questa sessione: ' + choice + '.';
    }

    generateRandomColor();
    if (historyVisible) renderHistory();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;

    list.replaceChildren();
    colorHistory.slice().reverse().forEach(item => {
        const entry = document.createElement('li');
        entry.textContent = 'RGB(' + item.r + ', ' + item.g + ', ' + item.b + ') · Risposta: ' + item.choice;
        list.appendChild(entry);
    });

    if (colorHistory.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = 'Non hai ancora registrato risposte.';
        list.appendChild(empty);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    generateRandomColor();

    document.querySelectorAll('[data-choice]').forEach(button => {
        button.addEventListener('click', () => saveChoice(button.dataset.choice));
    });

    const historyButton = document.getElementById('toggleHistoryBtn');
    const historySection = document.getElementById('historySection');
    historyButton?.addEventListener('click', () => {
        historyVisible = !historyVisible;
        historySection.hidden = !historyVisible;
        historyButton.setAttribute('aria-expanded', String(historyVisible));
        historyButton.textContent = historyVisible ? 'Nascondi cronologia' : 'Mostra cronologia';
        if (historyVisible) renderHistory();
    });
});
