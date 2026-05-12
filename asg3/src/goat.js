// goat.js



// Goat world position and movement
var g_goatX = 2;
var g_goatZ = 2;
var g_goatAngle = 0;      // facing direction in degrees
var g_goatSpeed = 0.003;  // units per frame, tweak this

// Waypoints — a closed loop path (world coordinates)
// edit these to change the shape of the path
var g_goatWaypoints = [
  [ 2,  2],
  [ 5,  0],
  [ 8,  3],
  [ 6,  7],
  [ 2,  9],
  [-2,  7],
  [-5,  3],
  [-3,  0],
];
var g_goatWaypointIndex = 0;

function updateGoat() {
  var target = g_goatWaypoints[g_goatWaypointIndex];
  var tx = target[0];
  var tz = target[1];

  var dx = tx - g_goatX;
  var dz = tz - g_goatZ;
  var dist = Math.sqrt(dx*dx + dz*dz);

  if (dist < 0.1) {
    // reached waypoint, advance to next (loop back to 0)
    g_goatWaypointIndex = (g_goatWaypointIndex + 1) % g_goatWaypoints.length;
  } else {
    // move toward waypoint
    var speed = g_goatSpeed;
    g_goatX += (dx / dist) * speed;
    g_goatZ += (dz / dist) * speed;

    // face direction of travel
    // atan2 gives angle in radians, convert to degrees
    // subtract 90 because the goat model faces -Z by default
    g_goatAngle = Math.atan2(dx, dz) * (180 / Math.PI);
  }
}



function updateAnimationAngles() {
    g_jawAngle    = 5  * Math.sin(g_seconds * 2) + 10;
    g_bodyAngle   = 1.5 * Math.sin(g_seconds * 3) + 5;
    g_neckAngle   = 5  * Math.sin(g_seconds * 2);
    g_leg1Angle   = 8  * Math.sin(g_seconds * 3 - 45) - 5;
    g_leg2Angle   = 8  * Math.sin(g_seconds * 3 - 45) + 5;
    g_leg3Angle   = 12 * Math.sin(g_seconds * 3) - 5;
    g_leg4Angle   = 12 * Math.sin(g_seconds * 3) + 5;
    g_beard1Angle = 2  * Math.sin(g_seconds * 2);
    g_beard2Angle = 4  * Math.sin(g_seconds * 2);
    g_tail1Angle  = 2  * Math.sin(g_seconds * 3);
    g_tail2Angle  = 4  * Math.sin(g_seconds * 3);
    g_tail3Angle  = 4  * Math.sin(g_seconds * 5);
  }

/**
 * drawGoat(worldX, worldY, worldZ, tint, scale, rotateY)
 *
 * @param {number}   worldX  - world X position
 * @param {number}   worldY  - world Y position
 * @param {number}   worldZ  - world Z position
 * @param {number[]} tint    - [r,g,b,a] color multiplier baked into each part's color.
 *                             [1,1,1,1] = no change, [0.5,0.5,0.5,1] = half brightness.
 * @param {number}   scale   - uniform scale factor. 1.0 = normal size.
 * @param {number}   rotateY - extra rotation around Y axis in degrees, applied before
 *                             the goat's own facing rotation.
 */
function drawGoat(worldX, worldY, worldZ,
                  tint    = [1, 1, 1, 1],
                  scale   = 1.0,
                  rotateY = 0) {

    // Helper: multiply a base color by the tint so solid-color (-2) cubes
    // are affected. (Tint uniforms are ignored when u_whichTexture == -2.)
    function tc(r, g, b, a) {
      return [r * tint[0], g * tint[1], b * tint[2], a * tint[3]];
    }

    var baseMat = new Matrix4();
    baseMat.setTranslate(worldX, worldY, worldZ);
    baseMat.rotate(rotateY, 0, 1, 0);
    baseMat.rotate(g_goatAngle + 135, 0, 1, 0);  // face direction of travel
    baseMat.scale(scale, scale, scale);

    // Body
    var body = new Cube();
    body.color = tc(.85, .85, .85, 1);
    body.textureNum = -2;
    body.matrix = new Matrix4(baseMat);
    body.matrix.translate(0.1, -0.3, 0.2);
    body.matrix.rotate(45, 0, 1, 0);
    body.matrix.rotate(-5, 1, 0, 0);
    body.matrix.rotate(g_bodyAngle, 1, 0, 0);
    var bodyCordsMat = new Matrix4(body.matrix);
    body.matrix.scale(.5, .55, .85);
    body.renderFaster();
  
    // Neck
    var neck1 = new Cube();
    neck1.color = tc(.9, .9, .9, 1);
    neck1.textureNum = -2;
    neck1.matrix = new Matrix4(bodyCordsMat);
    neck1.matrix.translate(0, .6, -.3);
    neck1.matrix.rotate(180, 1, 0, 0);
    neck1.matrix.rotate(30, 1, 0, 0);
    neck1.matrix.rotate(g_neckAngle, 1, 0, 0);
    var neck1CordsMat = new Matrix4(neck1.matrix);
    neck1.matrix.scale(.35, .35, .5);
    neck1.renderFaster();
  
    // Head
    var head = new Cube();
    head.color = tc(.9, .9, .9, 1);
    head.textureNum = -2;
    head.matrix = new Matrix4(neck1CordsMat);
    head.matrix.translate(0, .13, .14);
    head.matrix.rotate(50, 1, 0, 0);
    var headCordsMat = new Matrix4(head.matrix);
    head.matrix.scale(.351, .351, .351);
    head.renderFaster();
  
    // Eye outer
    var eye1 = new Cube();
    eye1.color = tc(.05, .05, .05, 1);
    eye1.textureNum = -2;
    eye1.matrix = new Matrix4(headCordsMat);
    eye1.matrix.translate(0, .13, .07);
    var eye1CordsMat = new Matrix4(eye1.matrix);
    eye1.matrix.scale(.355, .185, .15);
    eye1.renderFaster();
  
    // Eye inner
    var eye2 = new Cube();
    eye2.color = tc(.45, .05, .05, 1);
    eye2.textureNum = -2;
    eye2.matrix = new Matrix4(eye1CordsMat);
    eye2.matrix.translate(0, .02, 0);
    eye2.matrix.scale(.3551, .145, .07);
    eye2.renderFaster();

    // eye slit
    var eye3 = new Cube();
    eye3.color = tc(.05, .05, .05, 1);
    eye3.textureNum = -2;
    eye3.matrix = new Matrix4(eye1CordsMat);
    eye3.matrix.translate(0, 0.07, 0);
    eye3.matrix.scale(.3552, .025, .07);
    eye3.renderFaster();
  
    // Ear left
    var ear1 = new Cube();
    ear1.color = tc(.85, .85, .85, 1);
    ear1.textureNum = -2;
    ear1.matrix = new Matrix4(headCordsMat);
    ear1.matrix.translate(.155, .08, .08);
    ear1.matrix.rotate(45, 1, 0, 0);
    ear1.matrix.rotate(180, 1, 0, 0);
    ear1.matrix.rotate(-5, 0, 0, 1);
    ear1.matrix.scale(.06, .17, .12);
    ear1.renderFaster();
  
    // Ear right
    var ear2 = new Cube();
    ear2.color = tc(.85, .85, .85, 1);
    ear2.textureNum = -2;
    ear2.matrix = new Matrix4(headCordsMat);
    ear2.matrix.translate(-.155, .08, .08);
    ear2.matrix.rotate(45, 1, 0, 0);
    ear2.matrix.rotate(180, 1, 0, 0);
    ear2.matrix.rotate(5, 0, 0, 1);
    ear2.matrix.scale(.06, .17, .12);
    ear2.renderFaster();
  
    // Jaw bottom
    var mouth1 = new Cube();
    mouth1.color = tc(.8, .8, .8, 1);
    mouth1.textureNum = -2;
    mouth1.matrix = new Matrix4(headCordsMat);
    mouth1.matrix.translate(0, .3, -.1);
    mouth1.matrix.rotate(-g_jawAngle, 1, 0, 0);
    var mouth1CordsMat = new Matrix4(mouth1.matrix);
    mouth1.matrix.scale(.2, .3, .1);
    mouth1.renderFaster();
  
    // Jaw bottom inner
    var mouth2 = new Cube();
    mouth2.color = tc(.7, .2, .3, 1);
    mouth2.textureNum = -2;
    mouth2.matrix = new Matrix4(mouth1CordsMat);
    mouth2.matrix.translate(0, 0, 0.02);
    mouth2.matrix.scale(.17, .27, .07);
    mouth2.renderFaster();
  
    // Jaw top
    var mouth3 = new Cube();
    mouth3.color = tc(.8, .8, .8, 1);
    mouth3.textureNum = -2;
    mouth3.matrix = new Matrix4(headCordsMat);
    mouth3.matrix.translate(0, .3, .05);
    var mouth3CordsMat = new Matrix4(mouth3.matrix);
    mouth3.matrix.scale(.25, .3, .2);
    mouth3.renderFaster();
  
    // Jaw top inner
    var mouth4 = new Cube();
    mouth4.color = tc(.7, .2, .3, 1);
    mouth4.textureNum = -2;
    mouth4.matrix = new Matrix4(mouth3CordsMat);
    mouth4.matrix.translate(0, 0, -0.0401);
    mouth4.matrix.scale(.18, .26, .12);
    mouth4.renderFaster();
  
    // Beard 1
    var beard1 = new Cube();
    beard1.color = tc(.8, .8, .8, 1);
    beard1.textureNum = -2;
    beard1.matrix = new Matrix4(mouth1CordsMat);
    beard1.matrix.translate(0, .2, 0);
    beard1.matrix.rotate(g_jawAngle, 1, 0, 0);
    beard1.matrix.rotate(g_beard1Angle, 1, 0, 0);
    beard1.matrix.rotate(-90, 1, 0, 0);
    beard1.matrix.rotate(-8, 1, 0, 0);
    var beard1CordsMat = new Matrix4(beard1.matrix);
    beard1.matrix.scale(.13, .15, .1);
    beard1.renderFaster();
  
    // Beard 2
    var beard2 = new Cube();
    beard2.color = tc(.8, .8, .8, 1);
    beard2.textureNum = -2;
    beard2.matrix = new Matrix4(beard1CordsMat);
    beard2.matrix.translate(0, .1, 0);
    beard2.matrix.rotate(g_jawAngle / 3, 1, 0, 0);
    beard2.matrix.rotate(g_beard2Angle, 1, 0, 0);
    beard2.matrix.rotate(-10, 1, 0, 0);
    beard2.matrix.scale(.08, .14, .06);
    beard2.renderFaster();
  
    // Nose
    var nose = new Cube();
    nose.color = tc(.5, .5, .5, 1);
    nose.textureNum = -2;
    nose.matrix = new Matrix4(mouth3CordsMat);
    nose.matrix.translate(0, .23, .065);
    var noseCordsMat = new Matrix4(nose.matrix);
    nose.matrix.scale(.251, .08, .08);
    nose.renderFaster();
  
    // Nostril 1
    var nostril1 = new Cube();
    nostril1.color = tc(.1, .1, .1, 1);
    nostril1.textureNum = -2;
    nostril1.matrix = new Matrix4(noseCordsMat);
    nostril1.matrix.translate(.1, .05, 0);
    nostril1.matrix.scale(.03, .03001, .06);
    nostril1.renderFaster();
  
    // Nostril 2
    var nostril2 = new Cube();
    nostril2.color = tc(.1, .1, .1, 1);
    nostril2.textureNum = -2;
    nostril2.matrix = new Matrix4(noseCordsMat);
    nostril2.matrix.translate(-.1, .05, 0);
    nostril2.matrix.scale(.03, .03001, .06);
    nostril2.renderFaster();
  
    // Left horn 1
    var lh1 = new Cube();
    lh1.color = tc(.4, .4, .4, 1);
    lh1.textureNum = -2;
    lh1.matrix = new Matrix4(headCordsMat);
    lh1.matrix.translate(0.05, 0.15, .1);
    lh1.matrix.rotate(-90, 0, 1, 0);
    lh1.matrix.rotate(-90, 0, 0, 1);
    lh1.matrix.rotate(-15, 1, 0, 0);
    var lh1Cords = new Matrix4(lh1.matrix);
    lh1.matrix.scale(.25, .2, .17);
    lh1.renderFaster();
  
    var lh2 = new Cube();
    lh2.color = tc(.4, .4, .4, 1);
    lh2.textureNum = -2;
    lh2.matrix = new Matrix4(lh1Cords);
    lh2.matrix.translate(0, 0.14, 0);
    lh2.matrix.rotate(5, 0, 1, 0);
    lh2.matrix.rotate(-15, 0, 0, 1);
    lh2.matrix.rotate(-5, 1, 0, 0);
    var lh2Cords = new Matrix4(lh2.matrix);
    lh2.matrix.scale(.2, .15, .12);
    lh2.renderFaster();
  
    var lh3 = new Cube();
    lh3.color = tc(.4, .4, .4, 1);
    lh3.textureNum = -2;
    lh3.matrix = new Matrix4(lh2Cords);
    lh3.matrix.translate(0, 0.1, 0);
    lh3.matrix.rotate(5, 0, 1, 0);
    lh3.matrix.rotate(-25, 0, 0, 1);
    lh3.matrix.rotate(5, 1, 0, 0);
    var lh3Cords = new Matrix4(lh3.matrix);
    lh3.matrix.scale(.15, .18, .08);
    lh3.renderFaster();
  
    var lh4 = new Cube();
    lh4.color = tc(.4, .4, .4, 1);
    lh4.textureNum = -2;
    lh4.matrix = new Matrix4(lh3Cords);
    lh4.matrix.translate(0, 0.1, 0);
    lh4.matrix.rotate(5, 0, 1, 0);
    lh4.matrix.rotate(-20, 0, 0, 1);
    lh4.matrix.rotate(5, 1, 0, 0);
    lh4.matrix.scale(.1, .2, .04);
    lh4.renderFaster();
  
    // Right horn 1
    var rh1 = new Cube();
    rh1.color = tc(.4, .4, .4, 1);
    rh1.textureNum = -2;
    rh1.matrix = new Matrix4(headCordsMat);
    rh1.matrix.translate(-0.05, 0.15, .1);
    rh1.matrix.rotate(-90, 0, 1, 0);
    rh1.matrix.rotate(-90, 0, 0, 1);
    rh1.matrix.rotate(15, 1, 0, 0);
    var rh1Cords = new Matrix4(rh1.matrix);
    rh1.matrix.scale(.25, .2, .17);
    rh1.renderFaster();
  
    var rh2 = new Cube();
    rh2.color = tc(.4, .4, .4, 1);
    rh2.textureNum = -2;
    rh2.matrix = new Matrix4(rh1Cords);
    rh2.matrix.translate(0, 0.14, 0);
    rh2.matrix.rotate(-5, 0, 1, 0);
    rh2.matrix.rotate(-15, 0, 0, 1);
    rh2.matrix.rotate(5, 1, 0, 0);
    var rh2Cords = new Matrix4(rh2.matrix);
    rh2.matrix.scale(.2, .15, .12);
    rh2.renderFaster();
  
    var rh3 = new Cube();
    rh3.color = tc(.4, .4, .4, 1);
    rh3.textureNum = -2;
    rh3.matrix = new Matrix4(rh2Cords);
    rh3.matrix.translate(0, 0.1, 0);
    rh3.matrix.rotate(-5, 0, 1, 0);
    rh3.matrix.rotate(-25, 0, 0, 1);
    rh3.matrix.rotate(-5, 1, 0, 0);
    var rh3Cords = new Matrix4(rh3.matrix);
    rh3.matrix.scale(.15, .18, .08);
    rh3.renderFaster();
  
    var rh4 = new Cube();
    rh4.color = tc(.4, .4, .4, 1);
    rh4.textureNum = -2;
    rh4.matrix = new Matrix4(rh3Cords);
    rh4.matrix.translate(0, 0.1, 0);
    rh4.matrix.rotate(-5, 0, 1, 0);
    rh4.matrix.rotate(-20, 0, 0, 1);
    rh4.matrix.rotate(-5, 1, 0, 0);
    rh4.matrix.scale(.1, .2, .04);
    rh4.renderFaster();
  
    // Leg 1 - Back Left
    var leg1 = new Cube();
    leg1.color = tc(.9, .9, .9, 1);
    leg1.textureNum = -2;
    leg1.matrix = new Matrix4(bodyCordsMat);
    leg1.matrix.translate(.18, .3, .25);
    leg1.matrix.rotate(180, 1, 0, 0);
    leg1.matrix.rotate(-10, 0, 0, 1);
    leg1.matrix.rotate(-10, 1, 0, 0);
    leg1.matrix.rotate(180, 0, 1, 0);
    leg1.matrix.rotate(g_leg1Angle, 1, 0, 0);
    var leg1Cords = new Matrix4(leg1.matrix);
    leg1.matrix.scale(.18, .7, .18);
    leg1.renderFaster();
  
    var hoof1 = new Cube();
    hoof1.color = tc(.5, .55, .5, 1);
    hoof1.textureNum = -2;
    hoof1.matrix = new Matrix4(leg1Cords);
    hoof1.matrix.translate(0, .61, 0);
    hoof1.matrix.scale(.19, .1, .19);
    hoof1.renderFaster();
  
    // Leg 2 - Back Right
    var leg2 = new Cube();
    leg2.color = tc(.9, .9, .9, 1);
    leg2.textureNum = -2;
    leg2.matrix = new Matrix4(bodyCordsMat);
    leg2.matrix.translate(-.18, .3, .25);
    leg2.matrix.rotate(180, 1, 0, 0);
    leg2.matrix.rotate(10, 0, 0, 1);
    leg2.matrix.rotate(-10, 1, 0, 0);
    leg2.matrix.rotate(g_leg2Angle, 1, 0, 0);
    var leg2Cords = new Matrix4(leg2.matrix);
    leg2.matrix.scale(.18, .7, .18);
    leg2.renderFaster();
  
    var hoof2 = new Cube();
    hoof2.color = tc(.5, .55, .5, 1);
    hoof2.textureNum = -2;
    hoof2.matrix = new Matrix4(leg2Cords);
    hoof2.matrix.translate(0, .61, 0);
    hoof2.matrix.scale(.19, .1, .19);
    hoof2.renderFaster();
  
    // Leg 3 - Front Left
    var leg3 = new Cube();
    leg3.color = tc(.9, .9, .9, 1);
    leg3.textureNum = -2;
    leg3.matrix = new Matrix4(bodyCordsMat);
    leg3.matrix.translate(.15, .3, -.3);
    leg3.matrix.rotate(180, 1, 0, 0);
    leg3.matrix.rotate(-10, 0, 0, 1);
    leg3.matrix.rotate(10, 1, 0, 0);
    leg3.matrix.rotate(180, 0, 1, 0);
    leg3.matrix.rotate(g_leg3Angle, 1, 0, 0);
    var leg3Cords = new Matrix4(leg3.matrix);
    leg3.matrix.scale(.2, .7, .2);
    leg3.renderFaster();
  
    var hoof3 = new Cube();
    hoof3.color = tc(.5, .55, .5, 1);
    hoof3.textureNum = -2;
    hoof3.matrix = new Matrix4(leg3Cords);
    hoof3.matrix.translate(0, .61, 0);
    var hoof3Cords = new Matrix4(hoof3.matrix);
    hoof3.matrix.scale(.21, .1, .21);
    hoof3.renderFaster();
  
    var toe1 = new Cube();
    toe1.color = tc(.5, .55, .5, 1);
    toe1.textureNum = -2;
    toe1.matrix = new Matrix4(hoof3Cords);
    toe1.matrix.translate(-0.05, 0.03, -0.08);
    toe1.matrix.scale(.09, .07, .1);
    toe1.renderFaster();
  
    var toe2 = new Cube();
    toe2.color = tc(.5, .55, .5, 1);
    toe2.textureNum = -2;
    toe2.matrix = new Matrix4(hoof3Cords);
    toe2.matrix.translate(0.05, 0.03, -0.08);
    toe2.matrix.scale(.09, .07, .1);
    toe2.renderFaster();
  
    // Leg 4 - Front Right
    var leg4 = new Cube();
    leg4.color = tc(.9, .9, .9, 1);
    leg4.textureNum = -2;
    leg4.matrix = new Matrix4(bodyCordsMat);
    leg4.matrix.translate(-.15, .3, -.3);
    leg4.matrix.rotate(180, 1, 0, 0);
    leg4.matrix.rotate(10, 0, 0, 1);
    leg4.matrix.rotate(10, 1, 0, 0);
    leg4.matrix.rotate(g_leg4Angle, 1, 0, 0);
    var leg4Cords = new Matrix4(leg4.matrix);
    leg4.matrix.scale(.2, .7, .2);
    leg4.renderFaster();
  
    var hoof4 = new Cube();
    hoof4.color = tc(.5, .55, .5, 1);
    hoof4.textureNum = -2;
    hoof4.matrix = new Matrix4(leg4Cords);
    hoof4.matrix.translate(0, .61, 0);
    var hoof4Cords = new Matrix4(hoof4.matrix);
    hoof4.matrix.scale(.21, .1, .21);
    hoof4.renderFaster();
  
    var toe3 = new Cube();
    toe3.color = tc(.5, .55, .5, 1);
    toe3.textureNum = -2;
    toe3.matrix = new Matrix4(hoof4Cords);
    toe3.matrix.translate(-0.05, 0.03, 0.08);
    toe3.matrix.scale(.09, .07, .1);
    toe3.renderFaster();
  
    var toe4 = new Cube();
    toe4.color = tc(.5, .55, .5, 1);
    toe4.textureNum = -2;
    toe4.matrix = new Matrix4(hoof4Cords);
    toe4.matrix.translate(0.05, 0.03, 0.08);
    toe4.matrix.scale(.09, .07, .1);
    toe4.renderFaster();
  
    // Spots
    var spot1 = new Cube();
    spot1.color = tc(.4, .4, .4, 1);
    spot1.textureNum = -2;
    spot1.matrix = new Matrix4(bodyCordsMat);
    spot1.matrix.translate(0, .14, 0);
    spot1.matrix.scale(.501, .18, .18);
    spot1.renderFaster();
  
    var spot2 = new Cube();
    spot2.color = tc(.4, .4, .4, 1);
    spot2.textureNum = -2;
    spot2.matrix = new Matrix4(bodyCordsMat);
    spot2.matrix.translate(0, .35, 0.2);
    spot2.matrix.rotate(45, 1, 0, 0);
    spot2.matrix.scale(.501, .15, .15);
    spot2.renderFaster();
  
    var spot3 = new Cube();
    spot3.color = tc(.4, .4, .4, 1);
    spot3.textureNum = -2;
    spot3.matrix = new Matrix4(bodyCordsMat);
    spot3.matrix.translate(0, .33, -0.25);
    spot3.matrix.scale(.501, .12, .12);
    spot3.renderFaster();
  
    // Tail
    var tail1 = new Cube();
    tail1.color = tc(.7, .7, .7, 1);
    tail1.textureNum = -2;
    tail1.matrix = new Matrix4(bodyCordsMat);
    tail1.matrix.translate(0, .45, 0.4);
    tail1.matrix.rotate(90, 1, 0, 0);
    tail1.matrix.rotate(g_tail1Angle, 1, 0, 0);
    var tail1Cords = new Matrix4(tail1.matrix);
    tail1.matrix.scale(.1, .15, .1);
    tail1.renderFaster();
  
    var tail2 = new Cube();
    tail2.color = tc(.7, .7, .7, 1);
    tail2.textureNum = -2;
    tail2.matrix = new Matrix4(tail1Cords);
    tail2.matrix.translate(0, 0.13, 0.01);
    tail2.matrix.rotate(-30, 1, 0, 0);
    tail2.matrix.rotate(g_tail2Angle, 1, 0, 0);
    var tail2Cords = new Matrix4(tail2.matrix);
    tail2.matrix.scale(.07, .15, .07);
    tail2.renderFaster();
  
    // Tail tip
    var tail3 = new Pyramid();
    tail3.color = tc(.7, .7, .7, 1);
    tail3.textureNum = -2;
    tail3.matrix = new Matrix4(tail2Cords);
    tail3.matrix.translate(0, 0.12, 0);
    tail3.matrix.rotate(-20, 1, 0, 0);
    tail3.matrix.rotate(g_tail3Angle, 1, 0, 0);
    tail3.matrix.scale(.07, .15, .07);
    tail3.renderFaster();
  }