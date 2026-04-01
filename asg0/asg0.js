// DrawTriangle.js (c) 2012 matsuda
function main() {  
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  //400 x 400 rectangle centered horizontally
  var rectX = window.innerWidth / 2 - 200;
  var rectY = 100;
  var rectW = 400;
  var rectH = 400;


  // Bitmap size must fit the rectangle; HTML width/height default (e.g. 400×400) clips anything outside.
  canvas.width = rectX + rectW;
  canvas.height = rectY + rectH;
  // Match CSS layout size to bitmap (avoids squishing when host CSS uses max-width:100% on canvas)
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';
  canvas.style.maxWidth = 'none';

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
  }

  //add fields for input x and y slightly under the canvas centered horizontally
  var container = document.createElement('div');
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  document.body.appendChild(container);
  var label = document.createElement('label');
  label.textContent = 'First Vector';
  container.appendChild(label);
  //add 10px of gap between the label and the input fields
  var gap = document.createElement('div');
  gap.style.height = '10px';
  container.appendChild(gap);
  var xField = document.createElement('input');
  xField.id = 'x';
  xField.type = 'number';
  xField.placeholder = 'Enter x';
  container.appendChild(xField);
  var yField = document.createElement('input');
  yField.id = 'y';
  yField.type = 'number';
  yField.placeholder = 'Enter y';
  container.appendChild(yField);
  //add a button with id draw
  var draw = document.createElement('button');
  draw.id = 'draw';
  draw.textContent = 'Draw';
  container.appendChild(draw);
  
  //Make the button draw the vector when clicked
  draw.addEventListener('click', function() 
  {
    var xVal = parseFloat(xField.value);
    var yVal = parseFloat(yField.value);
    if (isNaN(xVal) || isNaN(yVal)) {
      return;
    }
    currentV1 = new Vector3([xVal, yVal, 0]);
    redrawScene();
  });

  //create another set of input fields and button for the second vector placed under the first set of fields and button with a gap of 10px between them
  var container2 = document.createElement('div');
  container2.style.display = 'flex';
  container2.style.justifyContent = 'center';
  container2.style.alignItems = 'center';
  container2.style.marginTop = '10px';
  document.body.appendChild(container2);
  var xField2 = document.createElement('input');

  //label for the second vector
  var label2 = document.createElement('label');
  label2.textContent = 'Second Vector';
  container2.appendChild(label2);
  //add 10px of gap between the label and the input fields
  var gap2 = document.createElement('div');
  gap2.style.height = '10px';
  container2.appendChild(gap2);

  xField2.id = 'x2';
  xField2.type = 'number';
  xField2.placeholder = 'Enter x';
  container2.appendChild(xField2);
  var yField2 = document.createElement('input');
  yField2.id = 'y2';
  yField2.type = 'number';
  yField2.placeholder = 'Enter y';
  container2.appendChild(yField2);
  var draw2 = document.createElement('button');
  draw2.id = 'draw2';
  draw2.textContent = 'Draw';
  container2.appendChild(draw2);

  //Make the button draw the vector when clicked
  draw2.addEventListener('click', function() {
    var xVal2 = parseFloat(xField2.value);
    var yVal2 = parseFloat(yField2.value);
    if (isNaN(xVal2) || isNaN(yVal2)) {
      return;
    }
    currentV2 = new Vector3([xVal2, yVal2, 0]);
    redrawScene();
  });
}
