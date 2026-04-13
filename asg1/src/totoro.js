function drawCircle(center, radius, segments, xScale = 1.0, yScale = 1.0) {
    let angleStep = 360 / segments;
    for (var angle = 0; angle < 360; angle += angleStep) {
        let pt1 = [center[0] + Math.cos(angle * Math.PI / 180) * radius * xScale,
                   center[1] + Math.sin(angle * Math.PI / 180) * radius * yScale];
        let pt2 = [center[0] + Math.cos((angle + angleStep) * Math.PI / 180) * radius * xScale,
                   center[1] + Math.sin((angle + angleStep) * Math.PI / 180) * radius * yScale];
        drawTriangle([center[0], center[1], pt1[0], pt1[1], pt2[0], pt2[1]]);
    }
}

function drawChevron(center, width, height, notch = 0.3, rotation = 0) {
    let cx = center[0];
    let cy = center[1];
    let r = rotation * Math.PI / 180;

    function rotate(x, y) {
        let dx = x - cx;
        let dy = y - cy;
        return [
            cx + dx * Math.cos(r) - dy * Math.sin(r),
            cy + dx * Math.sin(r) + dy * Math.cos(r)
        ];
    }

    let bl = rotate(cx - width/2, cy - height/2);
    let peak = rotate(cx, cy + height/2);
    let bm = rotate(cx, cy - height/2 + notch);
    let br = rotate(cx + width/2, cy - height/2);

    drawTriangle([bl[0], bl[1], peak[0], peak[1], bm[0], bm[1]]);
    drawTriangle([bm[0], bm[1], peak[0], peak[1], br[0], br[1]]);
}

function drawRectangle(center, width, height) {
    let cx = center[0];
    let cy = center[1];
    let hw = width / 2;  // half width
    let hh = height / 2; // half height

    // triangle 1: top-left, bottom-left, bottom-right
    drawTriangle([
        cx - hw, cy + hh,  // top left
        cx - hw, cy - hh,  // bottom left
        cx + hw, cy - hh   // bottom right
    ]);

    // triangle 2: top-left, bottom-right, top-right
    drawTriangle([
        cx - hw, cy + hh,  // top left
        cx + hw, cy - hh,  // bottom right
        cx + hw, cy + hh   // top right
    ]);
}

// drawChevron([0,0], 0.12, 0.08, 0.04); good size

class Totoro {
    constructor(){
      this.type = 'totoro';
      this.position = [0.0, 0.0, 0.0];
      this.color = [1.0, 1.0, 1.0, 1.0];
      this.size = 5.0;
      this.segments = 10;
    }
  
    render() {
        var xy = this.position;

        //draw feet
        gl.uniform4f(u_FragColor, 0.2, 0.2, 0.2, 1.0);
        drawChevron([-.3,-.85], 0.2, 0.2, 0.1);
        drawTriangle([-.3, -.95, -.35, -.75, -.25, -.75]);
        drawChevron([.3,-.85], 0.2, 0.2, 0.1);
        drawTriangle([.3, -.95, .35, -.75, .25, -.75]);

        //drawChevron([-.35,-.83], 0.2, 0.2, 0.1);

        // draw body - grey
        gl.uniform4f(u_FragColor, 0.4, 0.4, 0.4, 1.0);
        drawCircle([0,-.2], .7, 20, .8);
        drawCircle([0,.0], .6, 20, .8);
        drawCircle([0,-.5], .55, 20, 1, .8);
        drawCircle([0,-.6], .5, 20, 1, .6);
        drawCircle([0,-.65], .52, 20, 1, .5);

        //draw arms
        gl.uniform4f(u_FragColor, 0.4, 0.4, 0.4, 1.0);
        drawCircle([-.4,-.25], .4, 20, .5);
        drawCircle([.4,-.25], .4, 20, .5);
        
        gl.uniform4f(u_FragColor, 0.0, 0.0, 0.0, 1.0);

        drawTriangle([.5, -.1, .55, -.8, .6, -.8]);
        drawTriangle([-.5, -.1, -.55, -.8, -.6, -.8]);


        //draw tummy - lg
        gl.uniform4f(u_FragColor, 0.6, 0.6, 0.6, 1.0);
        drawCircle([0,-.36], .55, 20, .92);

        //draw eyes - black rim
        gl.uniform4f(u_FragColor, 0.0, 0.0, 0.0, 1.0);
        drawCircle([-.2,.4], .05, 20);
        drawCircle([.2,.4], .05, 20);

        //draw eyes - whites
        gl.uniform4f(u_FragColor, 1.0, 1.0, 1.0, 1.0);
        drawCircle([-.2,.4], .04, 20);
        drawCircle([.2,.4], .04, 20);

        //draw eyes - pupils
        gl.uniform4f(u_FragColor, 0.0, 0.0, 0.0, 1.0);
        drawCircle([-.195,.4], .02, 20);
        drawCircle([.195,.4], .02, 20);

        //draw nose
        gl.uniform4f(u_FragColor, 0.0, 0.0, 0.0, 1.0);
        drawCircle([0,.395], .055, 20, 1, .3);
        drawCircle([0,.38], .02, 20, 1, .4);

        //draw blush above nose
        gl.uniform4f(u_FragColor, 0.0, 0.0, 0.0, 1.0);
        drawChevron([0,.42], 0.025, 0.015, 0.00);
        drawChevron([-.03,.42], 0.025, 0.015, 0.00);
        drawChevron([.03,.42], 0.025, 0.015, 0.00);
        drawChevron([-.015,.42], 0.025, 0.015, 0.00);
        drawChevron([.015,.42], 0.025, 0.015, 0.00);

        //draw ears
        gl.uniform4f(u_FragColor, 0.4, 0.4, 0.4, 1.0);
        drawRectangle([0.2, 0.55], 0.05, 0.1);
        drawRectangle([-0.2, 0.55], 0.05, 0.1);
        drawTriangle([0.22, .85, .15, .6, .25, .6]);
        drawTriangle([-0.22, .85, -.15, .6, -.25, .6]);
        drawTriangle([0.22, .55, .15, .6, .25, .6]);
        drawTriangle([-0.22, .55, -.15, .6, -.25, .6]);




        //draw stomach marks
        //layer 1
        drawChevron([-.25,.05], 0.12, 0.08, 0.04);
        drawChevron([.25,.05], 0.12, 0.08, 0.04);
        drawChevron([-.1,.08], 0.15, 0.08, 0.04);
        drawChevron([.1,.08], 0.15, 0.08, 0.04);

        //layer 2
        drawChevron([-.35,-.1], 0.12, 0.08, 0.04);
        drawChevron([.35,-.1], 0.12, 0.08, 0.04);
        drawChevron([0,-.06], 0.18, 0.09, 0.04);
        
        // N
        gl.uniform4f(u_FragColor, 0.3, 0.3, 0.3, 1.0);
        drawChevron([-.2,-.08], 0.15, 0.08, 0.04, 20);
        drawChevron([-.15,-.08], 0.15, 0.08, 0.04, 200);

        // L
        gl.uniform4f(u_FragColor, 0.3, 0.3, 0.3, 1.0);
        drawChevron([.18,-.08], 0.15, 0.08, 0.04, 130);


    }
  }
