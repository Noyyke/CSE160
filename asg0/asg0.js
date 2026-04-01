// DrawTriangle.js (c) 2012 matsuda
function main() {  
  // Retrieve <canvas> element
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  // Get the rendering context for 2DCG
  var ctx = canvas.getContext('2d');

  var rectX = 120;
  var rectY = 10;
  var rectW = 400;
  var rectH = 400;
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
  var v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, 'rgba(255, 0, 0, 1.0)');
}
