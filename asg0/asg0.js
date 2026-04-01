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

  // Draw a blue rectangle
  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; // Set color to black
  ctx.fillRect(120, 10, 150, 150);        // Fill a rectangle with the color

  // Using cuon-matrix-cse160.js create a function DrawVector
  // DrawVector(v, color) that draws a vector originating at the center of the rectangle and extending to the right using cuon-matrix-cse160.js
  function drawVector(v, color) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(v[0], v[1]);
    ctx.lineTo(v[0], v[1]);
    ctx.lineTo(0, 0);
    ctx.closePath();
  }
  //vector v1 with z coordinate 0
  var v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, 'rgba(255, 0, 0, 1.0)');
}
