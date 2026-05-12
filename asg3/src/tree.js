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

/**
 * drawTree(worldX, worldY, worldZ, tint, scale, rotateY)
 *
 * @param {number}   worldX   - world X position
 * @param {number}   worldY   - world Y position (floor level)
 * @param {number}   worldZ   - world Z position
 * @param {number[]} tint     - [r,g,b,a] multiplier. [1,1,1,1] = no change, [0.5,0.5,0.5,1] = 50% darker
 * @param {number}   scale    - uniform scale factor. 1.0 = normal size
 * @param {number}   rotateY  - rotation around Y axis in degrees
 */
function drawTree(worldX, worldY, worldZ,
                  tint    = [1, 1, 1, 1],
                  scale   = 1.0,
                  rotateY = 0) {

    function mc(color) {
        var c = new Cube();
        c.color      = color;
        c.tint       = tint;
        c.textureNum = -2;
        return c;
    }

    var baseMat = new Matrix4();
    baseMat.setTranslate(worldX, worldY, worldZ);
    baseMat.rotate(rotateY, 0, 1, 0);
    baseMat.scale(scale, scale, scale);

    // ── TRUNK ──────────────────────────────────────────────
    var trunk = mc([.22, .17, .13, 1]);
    trunk.matrix = new Matrix4(baseMat);
    trunk.matrix.rotate(g_treeSway, 0, 0, 1);
    var trunkCords = new Matrix4(trunk.matrix);
    trunk.matrix.scale(.18, 1.4, .18);
    trunk.renderFaster();

    // ── TRUNK UPPER ────────────────────────────────────────
    var trunk2 = mc([.20, .15, .11, 1]);
    trunk2.matrix = new Matrix4(trunkCords);
    trunk2.matrix.translate(0, 1.0, 0);
    trunk2.matrix.rotate(g_treeSway * 0.5, 0, 0, 1);
    trunk2.matrix.rotate(3, 1, 0, 0);
    var trunk2Cords = new Matrix4(trunk2.matrix);
    trunk2.matrix.scale(.13, 1.0, .13);
    trunk2.renderFaster();

    // ── MAIN LEFT BRANCH ───────────────────────────────────
    var lb1 = mc([.20, .15, .11, 1]);
    lb1.matrix = new Matrix4(trunkCords);
    lb1.matrix.translate(0, 0.9, 0);
    lb1.matrix.rotate(-55 + g_branch1Sway, 0, 0, 1);
    lb1.matrix.rotate(20, 1, 0, 0);
    var lb1Cords = new Matrix4(lb1.matrix);
    lb1.matrix.scale(.09, .7, .09);
    lb1.renderFaster();

    // left branch fork 1
    var lb1a = mc([.19, .14, .10, 1]);
    lb1a.matrix = new Matrix4(lb1Cords);
    lb1a.matrix.translate(0, .55, 0);
    lb1a.matrix.rotate(-30 + g_branch2Sway, 0, 0, 1);
    lb1a.matrix.rotate(-15, 1, 0, 0);
    var lb1aCords = new Matrix4(lb1a.matrix);
    lb1a.matrix.scale(.06, .5, .06);
    lb1a.renderFaster();

    // left fork 1 twig
    var lb1at = mc([.18, .13, .09, 1]);
    lb1at.matrix = new Matrix4(lb1aCords);
    lb1at.matrix.translate(0, .4, 0);
    lb1at.matrix.rotate(-20 + g_branch2Sway * 1.2, 0, 0, 1);
    lb1at.matrix.scale(.035, .35, .035);
    lb1at.renderFaster();

    // left branch fork 2
    var lb1b = mc([.19, .14, .10, 1]);
    lb1b.matrix = new Matrix4(lb1Cords);
    lb1b.matrix.translate(0, .45, 0);
    lb1b.matrix.rotate(25 + g_branch1Sway, 0, 0, 1);
    lb1b.matrix.rotate(20, 1, 0, 0);
    var lb1bCords = new Matrix4(lb1b.matrix);
    lb1b.matrix.scale(.055, .45, .055);
    lb1b.renderFaster();

    // left fork 2 twig
    var lb1bt = mc([.18, .13, .09, 1]);
    lb1bt.matrix = new Matrix4(lb1bCords);
    lb1bt.matrix.translate(0, .38, 0);
    lb1bt.matrix.rotate(15 + g_branch1Sway, 0, 0, 1);
    lb1bt.matrix.scale(.03, .3, .03);
    lb1bt.renderFaster();

    // ── MAIN RIGHT BRANCH ──────────────────────────────────
    var rb1 = mc([.20, .15, .11, 1]);
    rb1.matrix = new Matrix4(trunkCords);
    rb1.matrix.translate(0, 0.7, 0);
    rb1.matrix.rotate(50 + g_branch2Sway, 0, 0, 1);
    rb1.matrix.rotate(-25, 1, 0, 0);
    var rb1Cords = new Matrix4(rb1.matrix);
    rb1.matrix.scale(.09, .65, .09);
    rb1.renderFaster();

    // right branch fork 1
    var rb1a = mc([.19, .14, .10, 1]);
    rb1a.matrix = new Matrix4(rb1Cords);
    rb1a.matrix.translate(0, .5, 0);
    rb1a.matrix.rotate(35 + g_branch1Sway, 0, 0, 1);
    rb1a.matrix.rotate(10, 1, 0, 0);
    var rb1aCords = new Matrix4(rb1a.matrix);
    rb1a.matrix.scale(.06, .48, .06);
    rb1a.renderFaster();

    // right fork 1 twig
    var rb1at = mc([.18, .13, .09, 1]);
    rb1at.matrix = new Matrix4(rb1aCords);
    rb1at.matrix.translate(0, .4, 0);
    rb1at.matrix.rotate(25 + g_branch2Sway, 0, 0, 1);
    rb1at.matrix.scale(.035, .32, .035);
    rb1at.renderFaster();

    // right branch fork 2
    var rb1b = mc([.19, .14, .10, 1]);
    rb1b.matrix = new Matrix4(rb1Cords);
    rb1b.matrix.translate(0, .35, 0);
    rb1b.matrix.rotate(-30 + g_branch2Sway, 0, 0, 1);
    rb1b.matrix.rotate(-20, 1, 0, 0);
    var rb1bCords = new Matrix4(rb1b.matrix);
    rb1b.matrix.scale(.055, .4, .055);
    rb1b.renderFaster();

    // right fork 2 twig
    var rb1bt = mc([.18, .13, .09, 1]);
    rb1bt.matrix = new Matrix4(rb1bCords);
    rb1bt.matrix.translate(0, .32, 0);
    rb1bt.matrix.rotate(-20 + g_branch1Sway, 0, 0, 1);
    rb1bt.matrix.scale(.03, .28, .03);
    rb1bt.renderFaster();

    // ── UPPER LEFT BRANCH (from trunk2) ────────────────────
    var ulb = mc([.19, .14, .10, 1]);
    ulb.matrix = new Matrix4(trunk2Cords);
    ulb.matrix.translate(0, .6, 0);
    ulb.matrix.rotate(-45 + g_branch1Sway, 0, 0, 1);
    ulb.matrix.rotate(35, 1, 0, 0);
    var ulbCords = new Matrix4(ulb.matrix);
    ulb.matrix.scale(.07, .55, .07);
    ulb.renderFaster();

    // upper left twig 1
    var ulbt1 = mc([.18, .13, .09, 1]);
    ulbt1.matrix = new Matrix4(ulbCords);
    ulbt1.matrix.translate(0, .45, 0);
    ulbt1.matrix.rotate(-25 + g_branch2Sway, 0, 0, 1);
    ulbt1.matrix.scale(.04, .38, .04);
    ulbt1.renderFaster();

    // upper left twig 2
    var ulbt2 = mc([.18, .13, .09, 1]);
    ulbt2.matrix = new Matrix4(ulbCords);
    ulbt2.matrix.translate(0, .3, 0);
    ulbt2.matrix.rotate(20 + g_branch1Sway, 0, 0, 1);
    ulbt2.matrix.rotate(-30, 1, 0, 0);
    ulbt2.matrix.scale(.035, .3, .035);
    ulbt2.renderFaster();

    // ── UPPER RIGHT BRANCH (from trunk2) ───────────────────
    var urb = mc([.19, .14, .10, 1]);
    urb.matrix = new Matrix4(trunk2Cords);
    urb.matrix.translate(0, .5, 0);
    urb.matrix.rotate(40 + g_branch2Sway, 0, 0, 1);
    urb.matrix.rotate(-30, 1, 0, 0);
    var urbCords = new Matrix4(urb.matrix);
    urb.matrix.scale(.07, .5, .07);
    urb.renderFaster();

    // upper right twig 1
    var urbt1 = mc([.18, .13, .09, 1]);
    urbt1.matrix = new Matrix4(urbCords);
    urbt1.matrix.translate(0, .4, 0);
    urbt1.matrix.rotate(30 + g_branch1Sway, 0, 0, 1);
    urbt1.matrix.scale(.04, .35, .04);
    urbt1.renderFaster();

    // upper right twig 2
    var urbt2 = mc([.18, .13, .09, 1]);
    urbt2.matrix = new Matrix4(urbCords);
    urbt2.matrix.translate(0, .25, 0);
    urbt2.matrix.rotate(-15 + g_branch2Sway, 0, 0, 1);
    urbt2.matrix.rotate(25, 1, 0, 0);
    urbt2.matrix.scale(.033, .28, .033);
    urbt2.renderFaster();

    // ── BACK BRANCH (depth) ────────────────────────────────
    var bb = mc([.20, .15, .11, 1]);
    bb.matrix = new Matrix4(trunkCords);
    bb.matrix.translate(0, 0.6, 0);
    bb.matrix.rotate(-40 + g_branch1Sway * 0.5, 1, 0, 0);
    bb.matrix.rotate(15, 0, 0, 1);
    var bbCords = new Matrix4(bb.matrix);
    bb.matrix.scale(.08, .6, .08);
    bb.renderFaster();

    // back branch twig
    var bbt = mc([.18, .13, .09, 1]);
    bbt.matrix = new Matrix4(bbCords);
    bbt.matrix.translate(0, .5, 0);
    bbt.matrix.rotate(-20 + g_branch2Sway, 1, 0, 0);
    bbt.matrix.scale(.05, .4, .05);
    bbt.renderFaster();

    // ── ROOT FLARES ────────────────────────────────────────
    var root1 = mc([.18, .13, .09, 1]);
    root1.matrix = new Matrix4(baseMat);
    root1.matrix.rotate(40, 0, 0, 1);
    root1.matrix.rotate(20, 1, 0, 0);
    root1.matrix.scale(.06, .35, .06);
    root1.renderFaster();

    var root2 = mc([.18, .13, .09, 1]);
    root2.matrix = new Matrix4(baseMat);
    root2.matrix.rotate(-35, 0, 0, 1);
    root2.matrix.rotate(-30, 1, 0, 0);
    root2.matrix.scale(.06, .32, .06);
    root2.renderFaster();

    var root3 = mc([.18, .13, .09, 1]);
    root3.matrix = new Matrix4(baseMat);
    root3.matrix.rotate(15, 0, 0, 1);
    root3.matrix.rotate(-60, 1, 0, 0);
    root3.matrix.scale(.05, .28, .05);
    root3.renderFaster();
}