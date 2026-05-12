// tree.js
// Dead horror-style tree built from Cube segments
// All branches pivot from bottom-center for joint-based animation

// Animation globals
let g_treeSway    = 0;
let g_branch1Sway = 0;
let g_branch2Sway = 0;

function updateTreeAnimation() {
    g_treeSway    = 1.5 * Math.sin(g_seconds * 0.7);
    g_branch1Sway = 2.0 * Math.sin(g_seconds * 0.9 + 0.5);
    g_branch2Sway = 2.5 * Math.sin(g_seconds * 1.1 + 1.2);
}

// ── Reusable cube instance — avoids allocating ~25 Cubes × 15 trees per frame ──
let _treeCube = null;

function _tc(r, g, b, tint) {
    if (!_treeCube) _treeCube = new Cube();
    _treeCube.color      = [r * tint[0], g * tint[1], b * tint[2], tint[3]];
    _treeCube.tint       = [1, 1, 1, 1];
    _treeCube.textureNum = -2;
    _treeCube.uvScale    = 1;
    return _treeCube;
}

/**
 * drawTree(worldX, worldY, worldZ, tint, scale, rotateY)
 *
 * @param {number}   worldX   - world X position
 * @param {number}   worldY   - world Y position (floor level)
 * @param {number}   worldZ   - world Z position
 * @param {number[]} tint     - [r,g,b,a] color multiplier baked into each part's color.
 *                              [1,1,1,1] = no change, [0.5,0.5,0.5,1] = half brightness.
 * @param {number}   scale    - uniform scale factor. 1.0 = normal size
 * @param {number}   rotateY  - rotation around Y axis in degrees
 */
function drawTree(worldX, worldY, worldZ,
                  tint    = [1, 1, 1, 1],
                  scale   = 1.0,
                  rotateY = 0) {

    var baseMat = new Matrix4();
    baseMat.setTranslate(worldX, worldY, worldZ);
    baseMat.rotate(rotateY, 0, 1, 0);
    baseMat.scale(scale, scale, scale);

    // ── TRUNK ──────────────────────────────────────────────
    var c = _tc(.22, .17, .13, tint);
    c.matrix = new Matrix4(baseMat);
    c.matrix.rotate(g_treeSway, 0, 0, 1);
    var trunkCords = new Matrix4(c.matrix);
    c.matrix.scale(.18, 1.4, .18);
    c.renderFaster();

    // ── TRUNK UPPER ────────────────────────────────────────
    c = _tc(.20, .15, .11, tint);
    c.matrix = new Matrix4(trunkCords);
    c.matrix.translate(0, 1.0, 0);
    c.matrix.rotate(g_treeSway * 0.5, 0, 0, 1);
    c.matrix.rotate(3, 1, 0, 0);
    var trunk2Cords = new Matrix4(c.matrix);
    c.matrix.scale(.13, 1.0, .13);
    c.renderFaster();

    // ── MAIN LEFT BRANCH ───────────────────────────────────
    c = _tc(.20, .15, .11, tint);
    c.matrix = new Matrix4(trunkCords);
    c.matrix.translate(0, 0.9, 0);
    c.matrix.rotate(-55 + g_branch1Sway, 0, 0, 1);
    c.matrix.rotate(20, 1, 0, 0);
    var lb1Cords = new Matrix4(c.matrix);
    c.matrix.scale(.09, .7, .09);
    c.renderFaster();

    // left branch fork 1
    c = _tc(.19, .14, .10, tint);
    c.matrix = new Matrix4(lb1Cords);
    c.matrix.translate(0, .55, 0);
    c.matrix.rotate(-30 + g_branch2Sway, 0, 0, 1);
    c.matrix.rotate(-15, 1, 0, 0);
    var lb1aCords = new Matrix4(c.matrix);
    c.matrix.scale(.06, .5, .06);
    c.renderFaster();

    // left fork 1 twig
    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(lb1aCords);
    c.matrix.translate(0, .4, 0);
    c.matrix.rotate(-20 + g_branch2Sway * 1.2, 0, 0, 1);
    c.matrix.scale(.035, .35, .035);
    c.renderFaster();

    // left branch fork 2
    c = _tc(.19, .14, .10, tint);
    c.matrix = new Matrix4(lb1Cords);
    c.matrix.translate(0, .45, 0);
    c.matrix.rotate(25 + g_branch1Sway, 0, 0, 1);
    c.matrix.rotate(20, 1, 0, 0);
    var lb1bCords = new Matrix4(c.matrix);
    c.matrix.scale(.055, .45, .055);
    c.renderFaster();

    // left fork 2 twig
    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(lb1bCords);
    c.matrix.translate(0, .38, 0);
    c.matrix.rotate(15 + g_branch1Sway, 0, 0, 1);
    c.matrix.scale(.03, .3, .03);
    c.renderFaster();

    // ── MAIN RIGHT BRANCH ──────────────────────────────────
    c = _tc(.20, .15, .11, tint);
    c.matrix = new Matrix4(trunkCords);
    c.matrix.translate(0, 0.7, 0);
    c.matrix.rotate(50 + g_branch2Sway, 0, 0, 1);
    c.matrix.rotate(-25, 1, 0, 0);
    var rb1Cords = new Matrix4(c.matrix);
    c.matrix.scale(.09, .65, .09);
    c.renderFaster();

    // right branch fork 1
    c = _tc(.19, .14, .10, tint);
    c.matrix = new Matrix4(rb1Cords);
    c.matrix.translate(0, .5, 0);
    c.matrix.rotate(35 + g_branch1Sway, 0, 0, 1);
    c.matrix.rotate(10, 1, 0, 0);
    var rb1aCords = new Matrix4(c.matrix);
    c.matrix.scale(.06, .48, .06);
    c.renderFaster();

    // right fork 1 twig
    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(rb1aCords);
    c.matrix.translate(0, .4, 0);
    c.matrix.rotate(25 + g_branch2Sway, 0, 0, 1);
    c.matrix.scale(.035, .32, .035);
    c.renderFaster();

    // right branch fork 2
    c = _tc(.19, .14, .10, tint);
    c.matrix = new Matrix4(rb1Cords);
    c.matrix.translate(0, .35, 0);
    c.matrix.rotate(-30 + g_branch2Sway, 0, 0, 1);
    c.matrix.rotate(-20, 1, 0, 0);
    var rb1bCords = new Matrix4(c.matrix);
    c.matrix.scale(.055, .4, .055);
    c.renderFaster();

    // right fork 2 twig
    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(rb1bCords);
    c.matrix.translate(0, .32, 0);
    c.matrix.rotate(-20 + g_branch1Sway, 0, 0, 1);
    c.matrix.scale(.03, .28, .03);
    c.renderFaster();

    // ── UPPER LEFT BRANCH (from trunk2) ────────────────────
    c = _tc(.19, .14, .10, tint);
    c.matrix = new Matrix4(trunk2Cords);
    c.matrix.translate(0, .6, 0);
    c.matrix.rotate(-45 + g_branch1Sway, 0, 0, 1);
    c.matrix.rotate(35, 1, 0, 0);
    var ulbCords = new Matrix4(c.matrix);
    c.matrix.scale(.07, .55, .07);
    c.renderFaster();

    // upper left twig 1
    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(ulbCords);
    c.matrix.translate(0, .45, 0);
    c.matrix.rotate(-25 + g_branch2Sway, 0, 0, 1);
    c.matrix.scale(.04, .38, .04);
    c.renderFaster();

    // upper left twig 2
    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(ulbCords);
    c.matrix.translate(0, .3, 0);
    c.matrix.rotate(20 + g_branch1Sway, 0, 0, 1);
    c.matrix.rotate(-30, 1, 0, 0);
    c.matrix.scale(.035, .3, .035);
    c.renderFaster();

    // ── UPPER RIGHT BRANCH (from trunk2) ───────────────────
    c = _tc(.19, .14, .10, tint);
    c.matrix = new Matrix4(trunk2Cords);
    c.matrix.translate(0, .5, 0);
    c.matrix.rotate(40 + g_branch2Sway, 0, 0, 1);
    c.matrix.rotate(-30, 1, 0, 0);
    var urbCords = new Matrix4(c.matrix);
    c.matrix.scale(.07, .5, .07);
    c.renderFaster();

    // upper right twig 1
    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(urbCords);
    c.matrix.translate(0, .4, 0);
    c.matrix.rotate(30 + g_branch1Sway, 0, 0, 1);
    c.matrix.scale(.04, .35, .04);
    c.renderFaster();

    // upper right twig 2
    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(urbCords);
    c.matrix.translate(0, .25, 0);
    c.matrix.rotate(-15 + g_branch2Sway, 0, 0, 1);
    c.matrix.rotate(25, 1, 0, 0);
    c.matrix.scale(.033, .28, .033);
    c.renderFaster();

    // ── BACK BRANCH (depth) ────────────────────────────────
    c = _tc(.20, .15, .11, tint);
    c.matrix = new Matrix4(trunkCords);
    c.matrix.translate(0, 0.6, 0);
    c.matrix.rotate(-40 + g_branch1Sway * 0.5, 1, 0, 0);
    c.matrix.rotate(15, 0, 0, 1);
    var bbCords = new Matrix4(c.matrix);
    c.matrix.scale(.08, .6, .08);
    c.renderFaster();

    // back branch twig
    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(bbCords);
    c.matrix.translate(0, .5, 0);
    c.matrix.rotate(-20 + g_branch2Sway, 1, 0, 0);
    c.matrix.scale(.05, .4, .05);
    c.renderFaster();

    // ── ROOT FLARES ────────────────────────────────────────
    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(baseMat);
    c.matrix.rotate(40, 0, 0, 1);
    c.matrix.rotate(20, 1, 0, 0);
    c.matrix.scale(.06, .35, .06);
    c.renderFaster();

    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(baseMat);
    c.matrix.rotate(-35, 0, 0, 1);
    c.matrix.rotate(-30, 1, 0, 0);
    c.matrix.scale(.06, .32, .06);
    c.renderFaster();

    c = _tc(.18, .13, .09, tint);
    c.matrix = new Matrix4(baseMat);
    c.matrix.rotate(15, 0, 0, 1);
    c.matrix.rotate(-60, 1, 0, 0);
    c.matrix.scale(.05, .28, .05);
    c.renderFaster();
}