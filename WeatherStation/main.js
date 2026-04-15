window.onload = () => {
    const canvas = document.getElementById('labCanvas');
    const ctx = canvas.getContext('2d');
    const infoBox = document.getElementById('info-box');

    // Settiamo le dimensioni reali del canvas
    canvas.width = 800;
    canvas.height = 600;

    // Caricamento dati (Mock del tuo JSON)
    async function loadLabData() {
        // In un caso reale: const response = await fetch('data.json');
        // Qui usiamo una generazione logica per l'esempio
        let data = [];
        for (let i = 1; i <= 35; i++) {
            data.push({ pos: `LAP1-${i}`, temp: (20 + Math.random() * 5).toFixed(1), lux: Math.floor(Math.random() * 800) });
            data.push({ pos: `LAP2-${i}`, temp: (20 + Math.random() * 5).toFixed(1), lux: Math.floor(Math.random() * 800) });
        }
        return data;
    }

    function drawDesk(x, y, label, lux) {
        const width = 35;
        const height = 25;

        // Colore basato sulla luminosità (da blu scuro a giallo acceso)
        const intensity = Math.min(lux / 8, 255);
        ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${100})`;

        // Disegno tavolo
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = "#30363d";
        ctx.strokeRect(x, y, width, height);

        // Label postazione
        ctx.fillStyle = "white";
        ctx.font = "10px Poppins";
        ctx.fillText(label.split('-')[1], x + 12, y + 16);

        return { x, y, width, height, label, lux };
    }

    async function init() {
        const labData = await loadLabData();
        const deskRects = [];

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // --- DISEGNO LAP 2 (In alto, file orizzontali) ---
            ctx.fillStyle = "#58a6ff";
            ctx.font = "bold 20px Poppins";
            ctx.fillText("LABORATORIO 2 (Orizzontale)", 50, 40);

            // Fila superiore (1-12)
            for (let i = 0; i < 12; i++) {
                const d = labData.find(item => item.pos === `LAP2-${i + 1}`);
                deskRects.push(drawDesk(50 + (i * 45), 70, `LAP2-${i + 1}`, d.lux));
            }
            // Fila centrale (13-24)
            for (let i = 0; i < 12; i++) {
                const d = labData.find(item => item.pos === `LAP2-${i + 13}`);
                deskRects.push(drawDesk(50 + (i * 45), 110, `LAP2-${i + 13}`, d.lux));
            }
            // Fila inferiore (25-35)
            for (let i = 0; i < 11; i++) {
                const d = labData.find(item => item.pos === `LAP2-${i + 25}`);
                deskRects.push(drawDesk(50 + (i * 45), 150, `LAP2-${i + 25}`, d.lux));
            }

            // --- DISEGNO LAP 1 (In basso, blocchi verticali) ---
            ctx.fillStyle = "#7ee787";
            ctx.fillText("LABORATORIO 1 (Verticale)", 50, 250);

            // Blocco 1 (1-12) - 2 colonne da 6
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 2; c++) {
                    const idx = r * 2 + c + 1;
                    const d = labData.find(item => item.pos === `LAP1-${idx}`);
                    deskRects.push(drawDesk(50 + (c * 40), 280 + (r * 35), `LAP1-${idx}`, d.lux));
                }
            }

            // Blocco 2 (13-24)
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 2; c++) {
                    const idx = 12 + r * 2 + c + 1;
                    const d = labData.find(item => item.pos === `LAP1-${idx}`);
                    deskRects.push(drawDesk(200 + (c * 40), 280 + (r * 35), `LAP1-${idx}`, d.lux));
                }
            }

            // Blocco 3 (25-35)
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 2; c++) {
                    const idx = 24 + r * 2 + c + 1;
                    if (idx > 35) break;
                    const d = labData.find(item => item.pos === `LAP1-${idx}`);
                    deskRects.push(drawDesk(350 + (c * 40), 280 + (r * 35), `LAP1-${idx}`, d.lux));
                }
            }
        }

        render();

        // Interattività Mouse
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Scala le coordinate se il canvas è ridimensionato via CSS
            const x = mouseX * (canvas.width / rect.width);
            const y = mouseY * (canvas.height / rect.height);

            const hoveredDesk = deskRects.find(d =>
                x >= d.x && x <= d.x + d.width &&
                y >= d.y && y <= d.y + d.height
            );

            if (hoveredDesk) {
                const data = labData.find(ld => ld.pos === hoveredDesk.label);
                infoBox.innerHTML = `<strong>${data.pos}</strong> | Temp: ${data.temp}°C | Lux: ${data.lux}`;
            }
        });
    }

    init();
};