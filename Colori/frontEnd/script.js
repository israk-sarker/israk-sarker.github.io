let currentColor = { r: 0, g: 0, b: 0 };
let historyVisible = false;

function generateRandomColor() {
    currentColor.r = Math.floor(Math.random() * 256);
    currentColor.g = Math.floor(Math.random() * 256);
    currentColor.b = Math.floor(Math.random() * 256);
    
    const box = document.getElementById('colorDisplay');
    box.style.backgroundColor = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;
}

// FETCH POST
async function saveChoice(choice) {
    const dataToSave = {
        id: Date.now().toString(), 
        r: currentColor.r.toString(),
        g: currentColor.g.toString(),
        b: currentColor.b.toString(),
        y: choice
    };

    try {
        const response = await fetch('http://localhost:3000/rgby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSave)
        });

        if (response.ok) {
            generateRandomColor(); // Genera un nuovo colore per il prossimo turno
        }
    } catch (error) {
        console.error("Errore nel salvataggio:", error);
    }
}

async function loadHistory() {
    try {
        const response = await fetch('http://localhost:3000/rgby');
        const data = await response.json();
        
        const list = document.getElementById('historyList');
        list.innerHTML = ""; // Pulisce la lista
        
        data.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `ID: ${item.id} - RGB(${item.r},${item.g},${item.b}) -> Scelta: ${item.y}`;
            list.appendChild(li);
        });
    } catch (error) {
        console.error("Errore nel recupero dati:", error);
    }
}

// Avvia il primo colore all'apertura
generateRandomColor();

function toggleHistory() {
    const historySection = document.getElementById('historySection');
    const btn = document.getElementById('toggleHistoryBtn');
    
    historyVisible = !historyVisible;
    
    if (historyVisible) {
        loadHistory();
        historySection.classList.add('show');
        btn.textContent = 'Nascondi Cronologia';
    } else {
        historySection.classList.remove('show');
        btn.textContent = 'Mostra Cronologia';
    }
}