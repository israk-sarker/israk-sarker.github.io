let canvas, ctx, width, height;
let scale = 40; //unita
let offsetX, offsetY;

window.onload = function () {
    canvas = document.querySelector('#graphCanvas');
    ctx = canvas.getContext('2d');
    width = canvas.width;
    height = canvas.height;
    offsetX = width / 2;
    offsetY = height / 2;

    const dButton = document.querySelector('#functionInput')
    dButton.addEventListener('keydown', (e) => {
        if(e.key === 'Enter'){
            drawGraph();
        }
    })
    document.querySelector('#btnDraw').onclick = () => {drawGraph()}
    document.querySelector('#btnZoomIn').onclick = function () { zoom(1.2); };
    document.querySelector('#btnZoomOut').onclick = function () { zoom(0.8); };

    drawGraph();
};

//GRID
function drawGrid() {
    ctx.beginPath();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;

    // linee verticali
    for (var x = offsetX % scale; x < width; x += scale) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }

    // linee orizzontali
    for (var y = offsetY % scale; y < height; y += scale) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }

    ctx.stroke();
}

//ASSI
//ASSI
function drawAxes() {

    ctx.lineWidth = 2;

    // Asse X ROSSO
    ctx.beginPath();
    ctx.strokeStyle = 'red';
    ctx.moveTo(0, offsetY);
    ctx.lineTo(width, offsetY);
    ctx.stroke();

    // Asse Y BLU
    ctx.beginPath();
    ctx.strokeStyle =  'orange';
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, height);
    ctx.stroke();
}

//NORMALIZZAZIONE INPUT
function normalizeInp(input) {

    let expr = input.replaceAll(' ', '');
    expr = input.replaceAll('^', '**');
    expr = expr.replace(/(\d)(x)/g, '$1*$2');
    expr = expr.replace(/(x)(\d)/g, '$1*$2');
    expr = expr.replace(/(\d)\(/g, '$1*(');
    expr = expr.replace(/\)(\d)/g, ')*$1');
    expr = expr.replace(/x\(/g, 'x*(');
    expr = expr.replace(/\)x/g, ')*x');
    expr = expr.replace(/\)\(/g, ')*(');
    expr = expr.replace(/sin/g, 'Math.sin')
    expr = expr.replace(/cos/g, 'Math.cos')
    expr = expr.replace(/tan/g, 'Math.tan')
    expr = expr.replace(/log/g, 'Math.log')
    expr = expr.replace(/sqrt/g, 'Math.sqrt' )

    return expr;
}


//DRAW GRAP
function drawGraph() {

    const rawInput = document.querySelector('#functionInput').value;
    const expr = normalizeInp(rawInput);

    let mathFunction;

    try {
        mathFunction = new Function('x', 'return ' + expr);
    } catch (e) {
        alert("Errore nella formula!");
        return;
    }

    ctx.clearRect(0, 0, width, height);

    drawGrid(); 
    drawAxes();   

    ctx.beginPath();
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;

    for (let px = 0; px < width; px++) {
        let x = (px - offsetX) / scale;
        let y = mathFunction(x);
        let py = offsetY - (y * scale);

        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }

    ctx.stroke();
}

function zoom(factor) {
    scale *= factor;
    drawGraph();
}