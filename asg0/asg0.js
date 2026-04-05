// DrawTriangle.js (c) 2012 matsuda
function main() {  
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  // 400×400 black square; bitmap matches drawing area so centering the canvas centers it on the page.
  var rectX = 0;
  var rectY = 100;
  var rectW = 400;
  var rectH = 400;

  canvas.width = rectW;
  canvas.height = rectY + rectH;
  // Match CSS layout size to bitmap (avoids squishing when host CSS uses max-width:100% on canvas)
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';
  canvas.style.maxWidth = 'none';

  var layoutRoot = document.createElement('div');
  layoutRoot.id = 'layoutRoot';
  layoutRoot.style.display = 'block';
  layoutRoot.style.width = canvas.width + 'px';
  document.body.insertBefore(layoutRoot, canvas);
  layoutRoot.appendChild(canvas);

  var ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
  ctx.fillRect(rectX, rectY, rectW, rectH);

  // Center of the rectangle; Vector3 components live in v.elements (see cuon-matrix-cse160.js)
  function drawVector(v, color) {
    var cx = rectX + rectW / 2;
    var cy = rectY + rectH / 2;
    var e = v.elements;
    var scale = 20;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + e[0] * scale, cy - e[1] * scale);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  var currentV1 = null;
  var currentV2 = null;
  var greenVectors = [];
  var greenColor = 'rgba(0, 200, 0, 0.55)';

  function redrawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.fillRect(rectX, rectY, rectW, rectH);

    if (currentV1) {
      drawVector(currentV1, 'rgba(255, 0, 0, 1.0)');
    }
    if (currentV2) {
      drawVector(currentV2, 'rgba(0, 0, 255, 1.0)');
    }
    for (var gi = 0; gi < greenVectors.length; gi++) {
      drawVector(greenVectors[gi], greenColor);
    }
  }

  var vecBlock = document.createElement('div');
  vecBlock.style.display = 'flex';
  vecBlock.style.flexDirection = 'column';
  vecBlock.style.alignItems = 'flex-start';
  vecBlock.style.gap = '10px';
  vecBlock.style.marginTop = '10px';
  vecBlock.style.width = '100%';
  vecBlock.style.boxSizing = 'border-box';
  layoutRoot.appendChild(vecBlock);

  function makeRow() {
    var row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.justifyContent = 'flex-start';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.width = '100%';
    vecBlock.appendChild(row);
    return row;
  }

  var row1 = makeRow();
  row1.appendChild(document.createTextNode('v1: '));
  var xField = document.createElement('input');
  xField.id = 'x';
  xField.type = 'number';
  xField.placeholder = 'x';
  row1.appendChild(xField);
  var yField = document.createElement('input');
  yField.id = 'y';
  yField.type = 'number';
  yField.placeholder = 'y';
  row1.appendChild(yField);

  var row2 = makeRow();
  row2.appendChild(document.createTextNode('v2: '));
  var xField2 = document.createElement('input');
  xField2.id = 'x2';
  xField2.type = 'number';
  xField2.placeholder = 'x';
  row2.appendChild(xField2);
  var yField2 = document.createElement('input');
  yField2.id = 'y2';
  yField2.type = 'number';
  yField2.placeholder = 'y';
  row2.appendChild(yField2);

  var draw = document.createElement('button');
  draw.id = 'draw';
  draw.textContent = 'Draw';
  vecBlock.appendChild(draw);

  draw.addEventListener('click', function() {
    var xVal = parseFloat(xField.value);
    var yVal = parseFloat(yField.value);
    var xVal2 = parseFloat(xField2.value);
    var yVal2 = parseFloat(yField2.value);
    if (isNaN(xVal) || isNaN(yVal) || isNaN(xVal2) || isNaN(yVal2)) {
      return;
    }
    currentV1 = new Vector3([xVal, yVal, 0]);
    currentV2 = new Vector3([xVal2, yVal2, 0]);
    greenVectors = [];
    redrawScene();
  });

  var opsContainer = document.createElement('div');
  opsContainer.style.display = 'flex';
  opsContainer.style.flexDirection = 'column';
  opsContainer.style.alignItems = 'flex-start';
  opsContainer.style.gap = '10px';
  opsContainer.style.marginTop = '16px';
  opsContainer.style.width = '100%';
  opsContainer.style.boxSizing = 'border-box';
  layoutRoot.appendChild(opsContainer);

  var opRow = document.createElement('div');
  opRow.style.display = 'flex';
  opRow.style.flexWrap = 'wrap';
  opRow.style.justifyContent = 'flex-start';
  opRow.style.alignItems = 'center';
  opRow.style.gap = '10px';
  opRow.style.width = '100%';
  opsContainer.appendChild(opRow);

  opRow.appendChild(document.createTextNode('Operation: '));

  var operationSelect = document.createElement('select');
  operationSelect.id = 'operation';
  operationSelect.appendChild(new Option('Add', 'add'));
  operationSelect.appendChild(new Option('Subtract', 'subtract'));
  operationSelect.appendChild(new Option('Multiply', 'multiply'));
  operationSelect.appendChild(new Option('Divide', 'divide'));
  operationSelect.appendChild(new Option('Normalize', 'normalize'));
  operationSelect.appendChild(new Option('Magnitude', 'magnitude'));
  operationSelect.appendChild(new Option('Angle Between', 'angle between'))
  operationSelect.appendChild(new Option('Area', 'area'))
  opRow.appendChild(operationSelect);

  var scalarField = document.createElement('input');
  scalarField.id = 'scalar';
  scalarField.type = 'number';
  scalarField.placeholder = 'Enter scalar';
  opRow.appendChild(scalarField);

  var drawResult = document.createElement('button');
  drawResult.id = 'drawResult';
  drawResult.textContent = 'Draw';
  opsContainer.appendChild(drawResult);

  drawResult.addEventListener('click', function() {
    var op = operationSelect.value;
    var scalar = parseFloat(scalarField.value);
    if (!currentV1 || !currentV2) {
      return;
    }

    if (op === 'add') {
      var sum = new Vector3();
      sum.set(currentV1);
      sum.add(currentV2);
      greenVectors = [sum];
    } else if (op === 'subtract') {
      var diff = new Vector3();
      diff.set(currentV1);
      diff.sub(currentV2);
      greenVectors = [diff];
    } else if (op === 'multiply') {
      if (isNaN(scalar)) {
        return;
      }
      var g1 = new Vector3();
      g1.set(currentV1);
      g1.mul(scalar);
      var g2 = new Vector3();
      g2.set(currentV2);
      g2.mul(scalar);
      greenVectors = [g1, g2];
    } else if (op === 'divide') {
      if (isNaN(scalar) || scalar === 0) {
        return;
      }
      var h1 = new Vector3();
      h1.set(currentV1);
      h1.div(scalar);
      var h2 = new Vector3();
      h2.set(currentV2);
      h2.div(scalar);
      greenVectors = [h1, h2];
    } else if (op === 'normalize') {
      var n1 = new Vector3();
      n1.set(currentV1);
      n1.normalize();
      var n2 = new Vector3();
      n2.set(currentV2);
      n2.normalize();
      greenVectors = [n1, n2];
    } else if (op === 'magnitude') {
      //display magnitudes in f12 console
      // Display magnitudes in f12 console
      console.log("Magnitude of V1:", currentV1.magnitude());
      console.log("Magnitude of V2:", currentV2.magnitude());
      // Optionally, clear greenVectors
      greenVectors = [];

    } else if (op === 'angle between') {
    // Calculate the angle between currentV1 and currentV2 and display it in the f12 console in degrees.
    var dot = Vector3.dot(currentV1, currentV2);
    var mag1 = currentV1.magnitude();
    var mag2 = currentV2.magnitude();
    var cosTheta = dot / (mag1 * mag2);
    // Clamp for numerical stability
    cosTheta = Math.max(-1, Math.min(1, cosTheta));
    var angleRad = Math.acos(cosTheta);
    var angleDeg = angleRad * (180 / Math.PI);
    console.log("Angle between V1 and V2 (degrees):", angleDeg);
    greenVectors = [];

    
    } else if (op === 'area') {
    // Calculate the area of the triangle formed by vectors V1 and V2 and display it in the f12 console
    var crossVec = Vector3.cross(currentV1, currentV2);
    var area = 0.5 * crossVec.magnitude();
    console.log("Area of triangle formed by V1 and V2:", area);
    greenVectors = [];
    }
    redrawScene();
  });



}
