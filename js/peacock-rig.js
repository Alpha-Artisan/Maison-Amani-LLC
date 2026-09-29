/* Maison Amani — peacock flight rig.
   One fixed master silhouette (head, crest, neck, body, feet, train) that never
   changes shape; jointed wings (shoulder, elbow, wrist, primaries) posed in 3D
   and projected; a train that follows the body's lift with delay and carries a
   slow travelling wave from rump to tip. Drawn at any time t, so the motion is
   continuous and the loop has no seam. Coordinates are the master's pixel space
   (4200 x 2260, y down). */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2, D2R = Math.PI / 180;

  // ---- rig constants (master pixel space) ----
  var SX = 880, SY = 1062;          // shoulder joint, seated inside the body under the back line
  var U = 650;                      // one rig unit in px (about the body's length)
  var YAW = 14 * D2R, PITCH = 12 * D2R;
  var DOWN = 0.46;                  // share of the beat spent in the power stroke
  var RUMP = 1350, TIP = 3998;      // where the train starts to move, and ends
  var LIFT = 8;                     // whole-body rise, px (about 4% of body height, peak to peak)

  function ease(u) { return (1 - Math.cos(Math.PI * u)) / 2; }       // zero velocity at each reversal
  function wrap(p) { return p - Math.floor(p); }
  function flap(p, top, bot, lag) {
    var q = wrap(p - (lag || 0));
    return q < DOWN ? top + (bot - top) * ease(q / DOWN)
                    : bot + (top - bot) * ease((q - DOWN) / (1 - DOWN));
  }
  function upEnv(p, lag) {
    var q = wrap(p - (lag || 0));
    if (q < DOWN) return 0;
    var s = Math.sin(Math.PI * (q - DOWN) / (1 - DOWN)); return s * s;
  }
  function downEnv(p) {
    var q = wrap(p);
    if (q >= DOWN) return 0;
    var s = Math.sin(Math.PI * q / DOWN); return s * s;
  }
  function bump(p, at, width) { var d = wrap(p - at + 0.5) - 0.5; return Math.exp(-(d * d) / (2 * width * width)); }

  function pose(p) {
    return {
      fa: flap(p, 76, -48, 0) * D2R,                  // arm elevation
      fh: flap(p, 97, -72, 0.07) * D2R,               // hand: the primaries lag the arm, pressed back by the air
      fold: 0.05 + 0.48 * upEnv(p, -0.01) + 0.06 * bump(p, DOWN, 0.03),   // tuck on recovery, brief compression at the bottom
      spread: 1 - 0.58 * upEnv(p, 0.02),
      sweep: 0.12 - 0.19 * downEnv(p) + 0.05 * upEnv(p, 0.03),                   // forward on the power stroke, back on recovery
      twist: (-10 + 26 * upEnv(p)) * D2R
    };
  }
  function lift(p) { return LIFT * Math.cos(TAU * (p - 0.08)); }     // lowest at the top of the stroke, highest after the power stroke

  // ---- projection: rig units (x back, y up, z toward camera) -> px ----
  function proj(x, y, z, dy) {
    var X = x * Math.cos(YAW) - z * Math.sin(YAW);
    var Z = x * Math.sin(YAW) + z * Math.cos(YAW);
    var Y = y * Math.cos(PITCH) - Z * Math.sin(PITCH);
    return [SX + X * U, SY - Y * U + dy];
  }

  // a single feather in the wing plane (c chordwise-back, s spanwise)
  function feather(root, ang, L, W, curl, cap, n) {
    var cen = [], ws = [], x = root[0], y = root[1], step = L / (n - 1);
    for (var k = 0; k < n; k++) {
      var t = k / (n - 1);
      cen.push([x, y]);
      var w;
      if (t < 1 - cap) w = W * (0.45 + 0.55 * Math.min(1, t / 0.35));
      else { var q = (t - (1 - cap)) / cap; w = W * Math.sqrt(Math.max(0, 1 - q * q)); }
      ws.push(w);
      var a = ang + curl * Math.pow(t, 1.4);
      x += step * Math.cos(a); y += step * Math.sin(a);
    }
    var L1 = [], R1 = [];
    for (var i = 0; i < cen.length; i++) {
      var a0 = cen[Math.max(i - 1, 0)], a1 = cen[Math.min(i + 1, cen.length - 1)];
      var dx = a1[0] - a0[0], dy = a1[1] - a0[1], l = Math.hypot(dx, dy) || 1;
      var nx = -dy / l, ny = dx / l, h = ws[i] / 2;
      L1.push([cen[i][0] + nx * h, cen[i][1] + ny * h]);
      R1.push([cen[i][0] - nx * h, cen[i][1] - ny * h]);
    }
    return L1.concat(R1.reverse());
  }

  function wing(ps, side, dy) {
    var fa = ps.fa, fh = ps.fh, fold = ps.fold, spread = ps.spread, tw = ps.twist, sw = ps.sweep;
    var sW = 0.62 * (1 - 0.3 * fold);                 // shoulder -> wrist (upper arm + forearm)
    var cW = -0.05 - 0.07 * fold;                      // the wrist comes forward as the wing folds
    var hand = 0.24 * (1 - 0.35 * fold);
    function liftPt(c, s) {
      var ys, zs, phi, ta;
      if (s < 0) { ys = 0; zs = s; phi = fa; ta = 0; }                       // the root, buried in the body
      else if (s <= sW) { ys = s * Math.sin(fa); zs = s * Math.cos(fa); phi = fa; ta = tw * 0.4 * (s / sW); }
      else {
        ys = sW * Math.sin(fa) + (s - sW) * Math.sin(fh);
        zs = sW * Math.cos(fa) + (s - sW) * Math.cos(fh);
        phi = fh; ta = tw * (0.4 + 0.6 * Math.min((s - sW) / 0.75, 1));
      }
      var ny = -Math.cos(phi), nz = Math.sin(phi);
      var dx = c * Math.cos(ta) + sw * s, ddy = c * Math.sin(ta) * ny, ddz = c * Math.sin(ta) * nz;
      var cn = Math.min(Math.max((c + 0.12) / 0.85, 0), 1);
      var arch = 0.08 * Math.pow(Math.sin(Math.PI * cn), 0.8) + 0.05 * Math.sin(Math.PI * Math.min(s / 1.45, 1));
      ddy += arch * Math.cos(phi); ddz += -arch * Math.sin(phi);
      if (s < 0) { ddy = 0; ddz = 0; }
      return proj(dx, ys + ddy, side * (0.02 + zs + ddz), dy);
    }
    var polys = [];
    function add(pts) { var o = []; for (var i = 0; i < pts.length; i++) o.push(liftPt(pts[i][0], pts[i][1])); polys.push(o); }
    // secondaries and tertials along the forearm
    for (var i = 0; i < 15; i++) {
      var f = i / 14, s = 0.03 + f * (sW - 0.03), c = 0.05 + cW * f;
      var ang = (4 + 16 * f + 8 * fold) * D2R;
      var Lf = 0.42 + 0.1 * Math.sin(Math.PI * Math.min(f * 1.1, 1)) - 0.06 * Math.pow(1 - f, 3);
      add(feather([c, s], ang, Lf, 0.088, -6 * D2R, 0.16, 16));
    }
    // primaries: long, fingered, each keeps its place in the fan
    var lo = (26 + 6 * fold) * D2R, hi = lo + (16 + 62 * spread) * D2R;
    for (var j = 0; j < 11; j++) {
      var g = j / 10, s2 = sW + g * hand, c2 = cW - 0.03 * g;
      var a2 = lo + (hi - lo) * Math.pow(g, 0.9);
      var L2 = 0.58 + 0.24 * Math.sin(Math.PI * (0.2 + 0.62 * g));
      add(feather([c2, s2], a2, L2, 0.08 - 0.018 * g, -(8 + 8 * g) * D2R, 0.2, 18));
    }
    // greater coverts, scalloped over the flight-feather roots
    for (var k = 0; k < 12; k++) {
      var h = k / 11, s3 = 0.05 + h * (sW + hand * 0.6), c3 = 0.02 + cW * Math.min(h * 1.3, 1);
      add(feather([c3, s3], (10 + 30 * h + 10 * fold) * D2R, 0.21 - 0.04 * h, 0.105, 0, 0.3, 10));
    }
    // the arm and lesser coverts
    // it starts inside the body, so the wing always grows out of the shoulder with no gap
    var cov = [[-0.06, -0.12], [-0.03, 0.02], [cW - 0.045, sW * 0.55], [cW - 0.04, sW], [cW - 0.035, sW + hand * 0.95],
               [cW + 0.12, sW + hand * 0.6], [cW + 0.18, sW], [0.2, sW * 0.5], [0.3, 0.02], [0.28, -0.12]];
    add(smoothClosed(cov, 6));
    return polys;
  }
  function smoothClosed(p, n) {   // Catmull-Rom through a closed set of points
    var o = [], N = p.length;
    for (var i = 0; i < N; i++) {
      var p0 = p[(i - 1 + N) % N], p1 = p[i], p2 = p[(i + 1) % N], p3 = p[(i + 2) % N];
      for (var k = 0; k < n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t, q = [];
        for (var d = 0; d < 2; d++)
          q.push(0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3));
        o.push(q);
      }
    }
    return o;
  }

  function Rig(data, opts) {
    opts = opts || {};
    this.data = data;
    this.beatHz = opts.beatHz || 0.6;
    this.box = [40, -60, 4080, 2170];       // everything the bird can reach, wings included (measured 120,24..4000,2092 across the stroke, plus margin)
    this.anchor = [SX, SY + 120];           // a point on the body for placing it in a scene
  }
  // phases: wingbeat, and the train's wave (one per two beats, so it answers the wings and loops with them)
  Rig.prototype.phases = function (t) { var b = t * this.beatHz; return { p: wrap(b), q: wrap(b / 2) }; };

  Rig.prototype.draw = function (ctx, t, color) {
    var ph = this.phases(t), p = ph.p, q = ph.q;
    var dy = lift(p), ps = pose(p), self = this;
    ctx.fillStyle = color || '#000';
    // the far wing, behind the body
    var far = wing(ps, -1, dy);
    for (var i = 0; i < far.length; i++) fillPoly(ctx, far[i]);
    // the master silhouette, with the train bent by its lagging wave
    var cs = this.data.contours;
    ctx.beginPath();
    for (var c = 0; c < cs.length; c++) {
      var a = cs[c], n = a.length / 2, P = new Array(n);
      for (var k = 0; k < n; k++) {
        var x = a[2 * k], y = a[2 * k + 1];
        P[k] = [x, y + dy + trainDy(x, p, q, self.beatHz)];
      }
      smoothPath(ctx, P);
    }
    ctx.fill('evenodd');
    // the near wing, over the body
    var near = wing(ps, 1, dy);
    for (var j = 0; j < near.length; j++) fillPoly(ctx, near[j]);
  };

  function trainDy(x, p, q) {
    if (x <= RUMP) return 0;
    var u = Math.min((x - RUMP) / (TIP - RUMP), 1);
    var w = Math.min((x - RUMP) / 420, 1); w = w * w * (3 - 2 * w);
    // it follows the body's lift late, and more so toward the tips
    var follow = (lift(p - 0.55 * u) - lift(p)) * (1 + 1.4 * u);
    // air on a long light structure: a slow wave travelling rump -> tips
    var wave = 26 * Math.pow(u, 1.4) * Math.sin(TAU * (q - 0.85 * u)) + 7 * Math.pow(u, 2) * Math.sin(TAU * (2 * q - 1.3 * u) + 1.1);
    return w * (follow + wave);
  }
  function fillPoly(ctx, P) { ctx.beginPath(); smoothPath(ctx, P); ctx.fill(); }
  function smoothPath(ctx, P) {
    var n = P.length; if (n < 3) return;
    var m0x = (P[n - 1][0] + P[0][0]) / 2, m0y = (P[n - 1][1] + P[0][1]) / 2;
    ctx.moveTo(m0x, m0y);
    for (var i = 0; i < n; i++) {
      var a = P[i], b = P[(i + 1) % n];
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.closePath();
  }

  root.PeacockRig = Rig;
})(typeof window !== 'undefined' ? window : this);
