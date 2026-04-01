// DrawTriangle.js (c) 2012 matsuda
function main() {  
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  var rectX = 500;
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

  //add fields for input x and y slightly under the canvas
  var xField = document.createElement('input');
  xField.id = 'x';
  xField.type = 'number';
  xField.placeholder = 'Enter x';
  document.body.appendChild(xField);
  var yField = document.createElement('input');
  yField.id = 'y';
  yField.type = 'number';
  yField.placeholder = 'Enter y';
  document.body.appendChild(yField);
  //add a button with id draw
  var draw = document.createElement('button');
  draw.id = 'draw';
  draw.textContent = 'Draw';
  document.body.appendChild(draw);
  


  //var v1 = new Vector3([2.25, 2.25, 0]);
  //drawVector(v1, 'rgba(255, 0, 0, 1.0)');
}
