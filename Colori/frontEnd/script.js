let currentColor = { r: 0, g: 0, b: 0 };
let historyVisible = false;

function generateRandomColor() {
    currentColor.r = Math.floor(Math.random() * 256);
    currentColor.g = Math.floor(Math.random() * 256);
    currentColor.b = Math.floor(Math.random() * 256);

    const box = document.getElementById('colorDisplay');
    if (box) {
        box.style.backgroundColor = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;
    }
}

// FETCH POST
async function saveChoice(choice, event) {
    // Rimuoviamo l'id manualmente per lasciare che sia json-server a generarlo, 
    // evitando conflitti o problemi con il formato.
    const dataToSave = {
        r: currentColor.r.toString(),
        g: currentColor.g.toString(),
        b: currentColor.b.toString(),
        y: choice
    };

    console.log("Tentativo di salvataggio:", dataToSave);

    try {
        const response = await fetch('http://localhost:3000/rgby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSave)
        });

        if (response.ok) {
            console.log("Salvataggio riuscito!");
            // Opzionale: un piccolo feedback visuale
            const btn = event.target;
            const originalText = btn.textContent;
            setTimeout(() => btn.textContent = originalText, 1000);

            generateRandomColor(); // Genera un nuovo colore per il prossimo turno

            // Se la cronologia è visibile, aggiornala subito
            if (historyVisible) {
                loadHistory();
            }
        } else {
            const errorText = await response.text();
            console.error("Errore del server:", response.status, errorText);
            alert("Il server ha risposto con un errore: " + response.status);
        }
    } catch (error) {
        console.error("Errore di connessione:", error);
        alert("Impossibile connettersi al server. Assicurati che json-server sia attivo su porta 3000 e che non ci siano blocchi CORS.");
    }
}

async function loadHistory() {
    try {
        const response = await fetch('http://localhost:3000/rgby');
        if (!response.ok) throw new Error("Errore nel recupero dati");

        const data = await response.json();
        const list = document.getElementById('historyList');
        if (!list) return;

        list.innerHTML = ""; // Pulisce la lista

        // Mostriamo gli ultimi inseriti in alto (invertendo l'array)
        const sortedData = [...data].reverse();

        sortedData.forEach(item => {
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