var canvas, ctx, width, height;
var scale = 40; //unita
var offsetX, offsetY;

window.onload = function () {
    canvas = document.querySelector('#graphCanvas');
    ctx = canvas.getContext('2d');
    width = canvas.width;
    height = canvas.height;
    offsetX = width / 2;
    offsetY = height / 2;

    document.querySelector('#btnDraw').onclick = drawGraph;
    document.querySelector('#btnZoomIn').onclick = function () { zoom(1.2); };
    document.querySelector('#btnZoomOut').onclick = function () { zoom(0.8); };

    drawGraph();
};

//GRID
function drawGrid() {
    ctx.beginPath();
    ctx.strokeStyle = '#eee';
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

    // Asse X (orizzontale) → ROSSO
    ctx.beginPath();
    ctx.strokeStyle = '#ff4d4d';
    ctx.moveTo(0, offsetY);
    ctx.lineTo(width, offsetY);
    ctx.stroke();

    // Asse Y (verticale) → BLU
    ctx.beginPath();
    ctx.strokeStyle =  '#ff9f1c';
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, height);
    ctx.stroke();
}

//NORMALIZZAZIONE INPUT
function normalizeInp(input) {

    var expr = input.replace(/\s+/g, '');
    expr = expr.replace(/\^/g, '**');
    expr = expr.replace(/(\d)(x)/g, '$1*$2');
    expr = expr.replace(/(x)(\d)/g, '$1*$2');
    expr = expr.replace(/(\d)\(/g, '$1*(');
    expr = expr.replace(/\)(\d)/g, ')*$1');
    expr = expr.replace(/x\(/g, 'x*(');
    expr = expr.replace(/\)x/g, ')*x');
    expr = expr.replace(/\)\(/g, ')*(');

    return expr;
}


//DRAW GRAP
function drawGraph() {

    const rawInput = document.querySelector('#functionInput').value;
    const expr = normalizeInp(rawInput);

    var mathFunction;

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
    ctx.strokeStyle = '#4aa3ff';
    ctx.lineWidth = 2;

    for (var px = 0; px < width; px++) {
        var x = (px - offsetX) / scale;
        var y = mathFunction(x);
        var py = offsetY - (y * scale);//invertito "-"

        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }

    ctx.stroke();
}

function zoom(factor) {
    scale *= factor;
    drawGraph();
}