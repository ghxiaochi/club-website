/* =========================================================
   HNYZ · 全屏舞台引擎（HALOFLUX）
   ---------------------------------------------------------
   一个全屏、节拍驱动的科幻数据可视化，四个系统由同一个
   节拍环境变量驱动：

     1. 节拍时钟   不均匀的 1/8 拍序列，不是等分网格
     2. 编织核心   两千多条二次贝塞尔在圆内交织，跑着光点
     3. 数据环带   环上切出几十个微型面板，随拍步进旋转
     4. 外层光束   五层楔形线束 + 宽光带 + 根部闪光，向画外迸发

   节拍打在每个系统上：核心分层闪烁、环带急停、光束以波的
   形式沿圆周传播、环内成组光束扫过。

   版式参考 HALOFLUX by Ryder191（PolyForm Noncommercial 1.0.0）。
   算法与绘制为本项目自写，未复制其源码。
   ========================================================= */
(function () {
  "use strict";

  var canvas = document.querySelector("[data-ck-halo]");
  if (!canvas) return;
  var ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  var TAU = Math.PI * 2;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- 小工具 ---------- */
  var rnd = Math.random;
  function rr(a, b) { return a + rnd() * (b - a); }
  function pick(a) { return a[(rnd() * a.length) | 0]; }
  function gauss() { return (rnd() + rnd() + rnd() - 1.5) / 1.5; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function normA(a) { return ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; }
  function easeIO(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeSnap(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function mix(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t)
    ];
  }

  var MONO = '"JetBrains Mono", "SF Mono", Consolas, monospace';

  /* ---------- 调色板 ----------
     全部从皮肤变量读。INK 是前景色，浅色皮肤下自动翻成深色，
     否则白线在米白底上会整个消失。 */
  var pal = { a: [127, 179, 255], b: [152, 224, 207], bg: [8, 9, 11] };
  var INK = [232, 236, 244];

  function parseColor(str, fallback) {
    var s = (str || "").trim();
    if (!s) return fallback;
    var m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      var h = m[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    m = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
    if (m) return [+m[1] | 0, +m[2] | 0, +m[3] | 0];
    return fallback;
  }

  var isLight = false;

  function readColors() {
    var host = canvas.parentElement || canvas;
    var cs = getComputedStyle(host);
    pal.a = parseColor(cs.getPropertyValue("--ck-accent"), pal.a);
    pal.b = parseColor(cs.getPropertyValue("--ck-accent-2"), pal.b);
    pal.bg = parseColor(cs.getPropertyValue("--ck-bg"), pal.bg);

    var lum = 0.299 * pal.bg[0] + 0.587 * pal.bg[1] + 0.114 * pal.bg[2];
    isLight = lum > 140;
    INK = isLight ? [14, 15, 18] : [232, 236, 244];
  }

  /* ---------- 尺寸 ---------- */
  var dpr = 1;
  var W = 0, H = 0, cx = 0, cy = 0;
  var R = 0, RO = 0, RMAX = 0, BAND = 0;

  var CFG = { tempo: 1, web: 1, ring: 1, beam: 1, cam: 1, glow: 1 };
  var dprCap = 1.5;

  /* ---------- 节拍 ----------
     PATTERN 单位是 1/8 拍。序列刻意不规则：有连续两下重拍，
     也有长到 4 个单位的拖尾 —— 等分节拍像节拍器，不像心跳。 */
  var PATTERN = [2, 1, 1, 2, 2, 3, 1, 1, 1, 4];
  var beat = { t: 0.35, i: 0, since: 9, n: 0, env: 0 };
  var clock = 0;
  var waveTable = new Float32Array(96);

  function updateBeat(dt) {
    beat.t -= dt;
    beat.since += dt;
    if (beat.t <= 0) {
      beat.t += PATTERN[beat.i++ % PATTERN.length] * 0.225 / CFG.tempo;
      beat.since = 0;
      beat.n += 1;
      onBeat();
    }
    beat.env = Math.exp(-beat.since * 4.2);
  }

  function onBeat() {
    ringStep();

    var n = Math.round((beat.n % 4 === 0 ? 3.4 : 1.1) * rr(0.65, 1.4));
    for (var i = 0; i < n; i += 1) spawnComet();

    layerEnv[(rnd() * 3) | 0] = 1;
    if (beat.n % 4 === 0) {
      layerEnv = layerEnv.map(function () { return rr(0.55, 1); });
    }

    /* 环外：一道波从圆周某一侧出发，绕一整圈 */
    var dir = rnd() < 0.5 ? 1 : -1;
    var big = beat.n % 8 === 0;
    pulses.push({
      c: dir > 0 ? -Math.PI * 0.5 : Math.PI * 0.5,
      v: dir * rr(0.75, 1.7) * (big ? 0.7 : 1),
      w: big ? rr(0.3, 0.5) : rr(0.07, 0.2),
      amp: big ? 1.1 : rr(0.45, 0.85),
      life: rr(1.2, 2.0),
      L: 0
    });
    for (var p = 0; p < pulses.length; p += 1) {
      if (!pulses[p].L) pulses[p].L = pulses[p].life;
    }

    /* 环带面板：每拍灭掉几块、点亮几块 */
    if (slots.length) {
      for (var a = 0; a < Math.round(4 * CFG.ring); a += 1) pick(slots).cv = null;
      for (var b = 0; b < 2; b += 1) pick(slots).flash = rr(0.3, 0.75);
    }
  }

  /* 每帧把波算成一张 96 格的表，画上千条线时只查表 */
  function buildWaveTable() {
    for (var i = 0; i < 96; i += 1) {
      var a = (i / 96) * TAU;
      var g = 0;
      for (var k = 0; k < pulses.length; k += 1) {
        var p = pulses[k];
        var d = normA(a - p.c);
        if (Math.abs(d) < p.w) {
          var q = 1 - Math.abs(d) / p.w;
          g += p.amp * q * q * clamp(p.L / p.life, 0, 1);
        }
      }
      waveTable[i] = g;
    }
  }

  function waveAt(a) {
    var i = ((a / TAU) * 96) | 0;
    return waveTable[i & 95];
  }

  /* 三角函数查表：每帧要算两千多次，直接查比调 Math 快 */
  var SIN = new Float32Array(1024);
  var COS = new Float32Array(1024);
  (function () {
    for (var i = 0; i < 1024; i += 1) {
      SIN[i] = Math.sin((i / 1024) * TAU);
      COS[i] = Math.cos((i / 1024) * TAU);
    }
  })();
  function lsin(a) { return SIN[((a * 162.97466) | 0) & 1023]; }
  function lcos(a) { return COS[((a * 162.97466) | 0) & 1023]; }

  /* ---------- 环的步进旋转 ----------
     不是匀速转。三种动作：大幅快转、急停、微推。急停会让面板
     像齿轮一样「咔」地卡住，这是环看起来像仪器的关键。 */
  var ringRot = 0;
  var rot = { from: 0, to: 0, t: 1, dur: 1, hold: 0, ease: easeIO };

  function ringStep() {
    var r = rnd(), d, dur, e;
    if (r < 0.2) { d = rr(0.9, 2.0); dur = rr(0.65, 1.0); e = easeIO; }
    else if (r < 0.62) { d = rr(0.12, 0.46); dur = rr(0.16, 0.34); e = easeSnap; }
    else { d = rr(0.04, 0.17); dur = rr(0.3, 0.55); e = easeIO; }
    if (rnd() < 0.07) d *= -0.5;
    rot.from = ringRot;
    rot.to = ringRot + d;
    rot.t = 0;
    rot.dur = dur;
    rot.ease = e;
    rot.hold = rr(0.04, 0.4);
  }

  function updateRing(dt) {
    if (rot.t < rot.dur) {
      rot.t += dt;
      ringRot = rot.from + (rot.to - rot.from) * rot.ease(clamp(rot.t / rot.dur, 0, 1));
    } else {
      rot.hold -= dt;
      ringRot += 0.014 * dt;
    }
  }

  /* ---------- 离屏画布 ---------- */
  function offscreen(w, h, d) {
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w * d));
    c.height = Math.max(1, Math.ceil(h * d));
    c.g = c.getContext("2d");
    c.g.setTransform(d, 0, 0, d, 0, 0);
    c.w = w;
    c.h = h;
    return c;
  }

  /* ---------- 编织核心 ---------- */
  var webBase = null;
  var webLayers = [];
  var coreGlow = null;
  var layerEnv = [0, 0, 0];
  var curves = [];
  var runners = [];

  function buildWeb() {
    var size = Math.ceil(2 * R) + 8;
    var d = Math.min(dpr, 0.85);
    webBase = offscreen(size, size, d);
    webLayers = [0, 1, 2].map(function () { return offscreen(size, size, d); });

    var all = [webBase].concat(webLayers);
    for (var i = 0; i < all.length; i += 1) all[i].g.translate(size / 2, size / 2);

    var b = webBase.g;
    var g0 = b.createRadialGradient(0, 0, R * 0.08, 0, 0, R);
    g0.addColorStop(0, rgba(mix(pal.bg, pal.a, 0.07), 1));
    g0.addColorStop(0.7, rgba(pal.bg, 1));
    g0.addColorStop(1, rgba(pal.bg, 1));
    b.fillStyle = g0;
    b.beginPath();
    b.arc(0, 0, R, 0, TAU);
    b.fill();

    /* 所有线关在环里，不溢出到环带 */
    for (var c = 0; c < all.length; c += 1) {
      all[c].g.save();
      all[c].g.beginPath();
      all[c].g.arc(0, 0, R - 0.5, 0, TAU);
      all[c].g.clip();
    }

    curves = [];
    /* 纸白皮肤下同密度的线会糊成一片灰雾，减到四成刚好 */
    var N = Math.min(4200, Math.round((1600 + (W * H) / 900) * CFG.web * (isLight ? 0.42 : 1)));

    for (var k = 0; k < N; k += 1) {
      var a1 = rnd() * TAU;
      var a2 = a1 + rr(0.7, Math.PI * 1.6);
      var p0 = { x: Math.cos(a1) * R, y: Math.sin(a1) * R };
      var p1 = { x: Math.cos(a2) * R, y: Math.sin(a2) * R };
      var cr = Math.sqrt(rnd()) * R * 0.92;
      var ca = rnd() * TAU;
      var cp = { x: Math.cos(ca) * cr, y: Math.sin(ca) * cr };
      curves.push({ p0: p0, c: cp, p1: p1 });

      /* 七成进主图，三成分三层，等着被节拍点亮 */
      var isBase = rnd() < 0.7;
      var layer = isBase ? -1 : (rnd() * 3) | 0;
      var g2 = layer < 0 ? b : webLayers[layer].g;

      var al = (isBase ? 0.03 + Math.pow(rnd(), 2.6) * 0.3 : 0.06 + Math.pow(rnd(), 2) * 0.34) * CFG.glow;
      var pickK = rnd();
      if (pickK < 0.05) g2.strokeStyle = rgba(pal.b, al);
      else if (pickK < 0.1) g2.strokeStyle = rgba(mix(pal.a, pal.b, 0.4), al);
      else g2.strokeStyle = rgba(INK, al);

      g2.lineWidth = rr(0.22, 0.72);
      g2.beginPath();
      g2.moveTo(p0.x, p0.y);
      g2.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y);
      g2.stroke();
    }

    /* 中心加密：短曲线只落在内圈，堆出「核」的密度 */
    var dense = Math.round(700 * CFG.web);
    for (var d0 = 0; d0 < dense; d0 += 1) {
      var dA1 = rnd() * TAU;
      var dA2 = dA1 + rr(0.4, Math.PI);
      var dR = R * 0.5;
      var dp0 = { x: Math.cos(dA1) * dR, y: Math.sin(dA1) * dR };
      var dp1 = { x: Math.cos(dA2) * dR, y: Math.sin(dA2) * dR };
      var dc = { x: gauss() * R * 0.22, y: gauss() * R * 0.22 };
      b.strokeStyle = rgba(INK, 0.03 + Math.pow(rnd(), 2) * 0.2);
      b.lineWidth = rr(0.2, 0.55);
      b.beginPath();
      b.moveTo(dp0.x, dp0.y);
      b.quadraticCurveTo(dc.x, dc.y, dp1.x, dp1.y);
      b.stroke();
    }

    /* 节点：小圆环 + 编号，让核心像一张被测量的图 */
    var nb = webBase.g;
    nb.font = "6px " + MONO;
    nb.textBaseline = "middle";
    for (var m = 0; m < 56; m += 1) {
      var rad = Math.sqrt(rnd()) * R * 0.9;
      var ang = rnd() * TAU;
      var px = Math.cos(ang) * rad;
      var py = Math.sin(ang) * rad;
      var s = rr(2, 4.2);
      nb.strokeStyle = rgba(INK, rr(0.3, 0.75));
      nb.lineWidth = 0.75;
      nb.beginPath();
      nb.arc(px, py, s, 0, TAU);
      nb.stroke();
      if (rnd() < 0.35) {
        nb.beginPath();
        nb.arc(px + s * 2.4, py, s * 0.75, 0, TAU);
        nb.stroke();
      }
      if (rnd() < 0.3) {
        nb.fillStyle = rgba(INK, 0.42);
        nb.fillText("n" + ((rnd() * 99) | 0), px + 7, py);
      }
    }

    /* 几段由小圆点串起来的弧 */
    for (var q = 0; q < 3; q += 1) {
      var qr = R * rr(0.42, 0.86);
      var qa = rr(0, TAU);
      var cnt = 20 + ((rnd() * 14) | 0);
      nb.strokeStyle = rgba(INK, 0.38);
      nb.lineWidth = 0.7;
      for (var w = 0; w < cnt; w += 1) {
        var wa = qa + w * 0.021;
        nb.beginPath();
        nb.arc(Math.cos(wa) * qr, Math.sin(wa) * qr, 2, 0, TAU);
        nb.stroke();
      }
    }

    for (var z = 0; z < all.length; z += 1) all[z].g.restore();

    /* 闪光层做一次径向淡出，中心密、边缘稀，才像"核心"而不是一团麻 */
    for (var z2 = 0; z2 < webLayers.length; z2 += 1) {
      var c2 = webLayers[z2];
      c2.g.globalCompositeOperation = "destination-in";
      var mg = c2.g.createRadialGradient(0, 0, 0, 0, 0, R);
      mg.addColorStop(0, "rgba(0,0,0,1)");
      mg.addColorStop(0.55, "rgba(0,0,0,.8)");
      mg.addColorStop(1, "rgba(0,0,0,.3)");
      c2.g.fillStyle = mg;
      c2.g.fillRect(-size / 2, -size / 2, size, size);
      c2.g.globalCompositeOperation = "source-over";
    }

    /* 核心柔光：预渲染一张，比 shadowBlur 便宜得多 */
    coreGlow = offscreen(size, size, 0.5);
    var cg = coreGlow.g;
    var gr = cg.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, R);
    gr.addColorStop(0, rgba(pal.a, 0.3));
    gr.addColorStop(0.22, rgba(pal.a, 0.13));
    gr.addColorStop(0.6, rgba(pal.a, 0.04));
    gr.addColorStop(1, rgba(pal.a, 0));
    cg.fillStyle = gr;
    cg.fillRect(0, 0, size, size);

    buildRunners();
  }

  function qpt(cv, t) {
    var u = 1 - t;
    return {
      x: u * u * cv.p0.x + 2 * u * t * cv.c.x + t * t * cv.p1.x,
      y: u * u * cv.p0.y + 2 * u * t * cv.c.y + t * t * cv.p1.y
    };
  }

  function newRunner(init) {
    var cv = pick(curves);
    var t = init ? rnd() : 0;
    var p = qpt(cv, t);
    var k = rnd(), mode, sp;
    if (k < 0.3) { mode = 0; sp = rr(0.15, 0.3); }
    else if (k < 0.62) { mode = 1; sp = rr(0.1, 0.32); }
    else if (k < 0.78) { mode = 0; sp = rr(0.04, 0.09); }
    else if (k < 0.92) { mode = 0; sp = rr(0.5, 0.9); }
    else { mode = 2; sp = rr(0.06, 0.14); }
    return { cv: cv, t: t, sp: sp, mode: mode, x: p.x, y: p.y, hot: rnd() < 0.12 };
  }

  function buildRunners() {
    runners = [];
    var n = Math.min(170, Math.round((70 + (W * H) / 11000) * CFG.web));
    for (var i = 0; i < n; i += 1) runners.push(newRunner(true));
  }

  function drawWeb(dt) {
    var size = webBase.w;
    var half = size / 2;

    ctx.drawImage(webBase, -half, -half, size, size);

    /* 核心柔光压在主图之上，中心才亮得起来 */
    if (coreGlow) {
      ctx.globalAlpha = 0.72 + beat.env * 0.3;
      ctx.drawImage(coreGlow, -half, -half, size, size);
      ctx.globalAlpha = 1;
    }

    /* 三层闪光层随节拍轮流亮起 */
    for (var i = 0; i < 3; i += 1) {
      layerEnv[i] = Math.max(0, layerEnv[i] - dt * 1.9);
      var a = layerEnv[i] * 0.85;
      if (a < 0.04) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(webLayers[i], -half, -half, size, size);
      ctx.globalAlpha = 1;
    }

    /* 沿曲线跑的光点：一部分匀速、一部分随拍冲刺 */
    ctx.lineCap = "round";
    for (var j = 0; j < runners.length; j += 1) {
      var r = runners[j];
      var mul = r.mode === 1 ? 0.35 + beat.env * 1.7
        : r.mode === 2 ? 0.35 + r.t * 2.2
        : 1;
      r.t += dt * r.sp * mul;
      if (r.t > 1) {
        runners[j] = newRunner(false);
        continue;
      }
      var p = qpt(r.cv, r.t);
      var d = Math.hypot(p.x - r.x, p.y - r.y);
      if (d > R * 0.3) { r.x = p.x; r.y = p.y; continue; }

      ctx.strokeStyle = r.hot ? rgba(pal.b, 0.5 + beat.env * 0.45) : rgba(INK, 0.26 + beat.env * 0.34);
      ctx.lineWidth = r.hot ? 1.2 : 0.8;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      r.x = p.x;
      r.y = p.y;
    }
    ctx.lineCap = "butt";
  }

  /* ---------- 圈内成组光束 ----------
     两种形态：贴着环走的同心弧束、从内点收向环缘的收敛束。
     它们不匀速，用 ease-out 冲出去然后停住。 */
  var comets = [];

  function bezPoint(l, t) {
    var u = 1 - t;
    return {
      x: u * u * l.p0.x + 2 * u * t * l.c.x + t * t * l.p1.x,
      y: u * u * l.p0.y + 2 * u * t * l.c.y + t * t * l.p1.y
    };
  }

  function cometPoint(l, t) {
    if (!l.arc) return bezPoint(l, t);
    var r = l.r + (R - 2 - l.r) * t * t;
    var a = l.a0 + l.span * t;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }

  function spawnComet() {
    var lines = [];
    var n = 3 + ((rnd() * 7) | 0);

    if (rnd() < 0.6) {
      /* 同心弧束：一串半径递减的弧，一起向外坠 */
      var rad = R * rr(0.45, 0.88);
      var a0 = rr(-1.1, 1.1);
      var span = rr(0.35, 0.95) * (rnd() < 0.5 ? -1 : 1);
      for (var k = 0; k < n; k += 1) {
        lines.push({ arc: true, r: rad - k * rr(2.2, 4.4), a0: a0 + gauss() * 0.012, span: span });
      }
    } else {
      /* 收敛束：从内部一点散向环缘 */
      var ang = rr(-1.2, 1.2);
      var oa = ang + rr(-1.2, 1.2);
      var orad = R * rr(0.2, 0.7);
      var o = { x: Math.cos(oa) * orad, y: Math.sin(oa) * orad };
      var spread = rr(0.08, 0.26);
      var bend = rr(0.15, 0.45) * (rnd() < 0.5 ? -1 : 1);
      for (var i = 0; i < n; i += 1) {
        var ta = ang + (i / n - 0.5) * spread;
        var p1 = { x: Math.cos(ta) * (R - 2), y: Math.sin(ta) * (R - 2) };
        var p0 = { x: o.x + gauss() * 8, y: o.y + gauss() * 8 };
        var mx = (p0.x + p1.x) / 2;
        var my = (p0.y + p1.y) / 2;
        var dx = p1.x - p0.x;
        var dy = p1.y - p0.y;
        lines.push({
          p0: p0,
          c: { x: mx - dy * bend + gauss() * 6, y: my + dx * bend + gauss() * 6 },
          p1: p1
        });
      }
    }

    comets.push({
      lines: lines,
      t: 0,
      dur: rr(0.42, 0.8),
      win: rr(0.2, 0.34),
      hot: rnd() < 0.2
    });
  }

  function drawComets(dt) {
    for (var i = comets.length - 1; i >= 0; i -= 1) {
      var c = comets[i];
      c.t += dt / c.dur;
      if (c.t - c.win > 1) { comets.splice(i, 1); continue; }

      var t0 = Math.max(0, c.t - c.win);
      var t1 = Math.min(1, c.t);
      if (t1 <= t0) continue;

      var alpha = (1 - clamp(c.t, 0, 1)) * 0.55 + 0.12;
      ctx.strokeStyle = c.hot ? rgba(pal.b, alpha) : rgba(INK, alpha);
      ctx.lineWidth = 0.85;
      ctx.lineCap = "round";

      for (var j = 0; j < c.lines.length; j += 1) {
        var l = c.lines[j];
        ctx.beginPath();
        for (var s = 0; s <= 18; s += 1) {
          var p = cometPoint(l, t0 + (t1 - t0) * (s / 18));
          if (s === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    }
  }

  /* ---------- 环带上的微型数据面板 ----------
     每个 slot 是一张离屏小画布：x 轴朝外（径向）、y 轴朝切向。
     画到环上时整体旋转 slot 角度，绕一圈后文字会跟着翻面 ——
     这正是数据带该有的样子，像唱片标签。 */
  var slots = [];
  var CARD_SRC = [];
  var CARD_KEYS = ["loc", "dt", "ms", "fps", "mem", "kb", "px", "hz", "err", "n", "i", "t"];
  var CARD_BODIES = ["ok", "pass", "read", "emit", "diff", "sync", "load", "run", "0x3f", "L2"];
  var cardNo = 0;

  function collectCards() {
    /* 从页面真实内容取标题，面板才不是纯装饰 */
    var out = [];
    var spots = [
      [".project-card h3, .project-card h2, .project-card__name, .project-card__title", "REPO"],
      [".gallery-item figcaption, .gallery-item h3, .gallery-item__title", "PHOTO"],
      [".member-card h3, .member-card__name, .member-card__title", "MEMBER"],
      [".do-card h3, .do-card h2", "DOC"],
      [".ladder-row .name, .ladder-row__name", "RANK"]
    ];
    for (var i = 0; i < spots.length; i += 1) {
      var nodes = document.querySelectorAll(spots[i][0]);
      for (var j = 0; j < nodes.length && j < 6; j += 1) {
        var t = (nodes[j].textContent || "").replace(/\s+/g, " ").trim();
        if (!t) continue;
        out.push({ tag: spots[i][1], text: t.slice(0, 18) });
      }
    }
    return out;
  }

  function makeCard(slot) {
    var band = BAND;
    var h = Math.max(12, slot.da * ((R + RO) / 2));
    var sc = 1.85;
    var c = offscreen(band, h, sc);
    var g = c.g;

    var fs = clamp(band * 0.042, 3.4, 5.4);
    var pad = 3;

    g.fillStyle = rgba(INK, 0.028);
    g.fillRect(0, 0, band, h);
    g.strokeStyle = rgba(INK, 0.24);
    g.lineWidth = 0.5;
    g.strokeRect(0.25, 0.25, band - 0.5, h - 0.5);

    /* 标题行 */
    g.font = "700 " + fs + "px " + MONO;
    g.fillStyle = rgba(INK, 0.98);
    g.fillText(slot.head, pad, fs + 1);

    g.font = "500 " + (fs * 0.82) + "px " + MONO;
    g.fillStyle = rgba(INK, 0.55);
    g.textAlign = "right";
    g.fillText(slot.no, band - pad, fs + 1);
    g.textAlign = "left";

    g.fillStyle = rgba(pal.a, 0.24);
    g.fillRect(pad, fs + 3, band - pad * 2, 0.4);

    var y0 = fs + 6;
    var bodyH = h - y0 - 2;
    if (bodyH < 4) return c;

    var rows = Math.max(1, Math.floor(bodyH / (fs + 1.8)));

    if (slot.kind === 0) {
      /* 键值行：key / 细进度条 / 数值 */
      g.font = "500 " + (fs * 0.86) + "px " + MONO;
      for (var i = 0; i < rows; i += 1) {
        var y = y0 + i * (fs + 1.9) + fs;
        g.fillStyle = rgba(INK, 0.5);
        g.fillText(CARD_KEYS[(slot.seed + i * 3) % CARD_KEYS.length], pad, y);

        var val = ((slot.seed * 37 + i * 11) % 900) + "." + ((slot.seed + i) % 9);
        g.fillStyle = rgba(INK, 0.95);
        g.textAlign = "right";
        g.fillText(val, band - pad, y);
        g.textAlign = "left";

        var bx = pad + fs * 3.2;
        var bw = band - pad * 2 - fs * 3.2 - fs * 4.4;
        if (bw > 4) {
          g.fillStyle = rgba(INK, 0.12);
          g.fillRect(bx, y + 0.9, bw, 1.1);
          g.fillStyle = rgba(INK, 0.9);
          g.fillRect(bx, y + 0.9, bw * (((slot.seed + i * 7) % 10) / 10), 1.1);
        }
      }
    } else if (slot.kind === 1) {
      /* 条形图 */
      var n = Math.min(rows, 9);
      var bh = bodyH / n;
      for (var b = 0; b < n; b += 1) {
        var by = y0 + b * bh;
        var v = ((slot.seed * 13 + b * 29) % 100) / 100;
        g.fillStyle = rgba(INK, 0.72);
        g.fillRect(pad, by + bh * 0.25, (band - pad * 2) * v, Math.max(1.0, bh * 0.62));
        if (v > 0.82) {
          g.fillStyle = rgba(pal.b, 0.85);
          g.fillRect(band - pad - 1.5, by + bh * 0.25, 1.5, Math.max(0.7, bh * 0.5));
        }
      }
    } else if (slot.kind === 2) {
      /* 折线 */
      g.strokeStyle = rgba(pal.a, 0.8);
      g.lineWidth = 0.55;
      g.beginPath();
      var prev = 0.5;
      for (var s = 0; s <= 26; s += 1) {
        var vx = pad + (band - pad * 2) * (s / 26);
        prev = clamp(prev + (((slot.seed * (s + 3)) % 17) / 17 - 0.5) * 0.34, 0.06, 1);
        var vy = y0 + bodyH - prev * bodyH;
        if (s === 0) g.moveTo(vx, vy);
        else g.lineTo(vx, vy);
      }
      g.stroke();
    } else if (slot.kind === 3) {
      /* 清单 */
      g.font = "500 " + (fs * 0.84) + "px " + MONO;
      for (var k = 0; k < rows; k += 1) {
        var ly = y0 + k * (fs + 1.9) + fs;
        g.fillStyle = rgba(INK, 0.32);
        g.fillText(String(((slot.seed + k) % 90) + 10), pad, ly);
        g.fillStyle = rgba(INK, 0.85);
        g.fillText(CARD_BODIES[(slot.seed + k * 5) % CARD_BODIES.length], pad + fs * 3.4, ly);
      }
    } else if (slot.kind === 5) {
      /* 文本墙：4px 的小字铺满整块，远看就是一条亮带 */
      g.font = "500 " + (fs * 0.74) + "px " + MONO;
      var lineH = fs * 1.28;
      var words = ["ok", "0x", "ms", "L2", "dt", "fps", "id", "px", "kb", "++", "::", "//", "01", "47", "n=", "u*"];
      for (var ty = y0; ty < h - 1; ty += lineH) {
        var tx = pad;
        while (tx < band - pad - 2) {
          var wd = words[(slot.seed + ((tx * 7) | 0) + ((ty * 3) | 0)) % words.length];
          g.fillStyle = rgba(INK, 0.35 + (((slot.seed + tx + ty) % 60) / 100));
          g.fillText(wd, tx, ty + fs * 0.7);
          tx += wd.length * fs * 0.6 + fs * 0.95;
        }
      }
    } else {
      /* 真实内容：页面里的条目标题 */
      g.font = "500 " + (fs * 0.92) + "px " + MONO;
      g.fillStyle = rgba(INK, 0.95);
      g.fillText(slot.label || "—", pad, y0 + fs + 1);
      g.font = "500 " + (fs * 0.8) + "px " + MONO;
      g.fillStyle = rgba(pal.a, 0.6);
      g.fillText(slot.tag, pad, y0 + fs * 2.4 + 2);

      /* 剩下的行用键值补满，避免卡片下半截空着 */
      g.font = "500 " + (fs * 0.82) + "px " + MONO;
      for (var r4 = 0; r4 < rows - 2; r4 += 1) {
        var y4 = y0 + fs * 2.4 + 4 + r4 * (fs + 1.8) + fs;
        if (y4 > h - 1.5) break;
        g.fillStyle = rgba(INK, 0.4);
        g.fillText(CARD_KEYS[(slot.seed + r4 * 3) % CARD_KEYS.length], pad, y4);
        g.fillStyle = rgba(INK, 0.82);
        g.textAlign = "right";
        g.fillText(((slot.seed * 31 + r4 * 7) % 999) + "", band - pad, y4);
        g.textAlign = "left";
      }
    }

    return c;
  }

  function buildSlots() {
    slots = [];
    CARD_SRC = collectCards();
    if (!CARD_SRC.length) {
      CARD_SRC = ["SYSTEM", "STAGE", "INDEX", "CACHE", "QUEUE", "BUS"].map(function (t) {
        return { tag: t, text: t };
      });
    }

    var mid = (R + RO) / 2;
    var target = Math.round(clamp((TAU * mid) / 26, 30, 96) * CFG.ring);
    var step = TAU / target;

    for (var i = 0; i < target; i += 1) {
      var da = step * rr(0.965, 1.0);
      var src = CARD_SRC[i % CARD_SRC.length];
      slots.push({
        a: i * step + step * 0.5,
        da: da,
        head: src.tag,
        no: String((++cardNo % 100)).padStart(2, "0"),
        label: src.text,
        tag: src.tag,
        kind: [0, 1, 2, 5, 5, 3, 4, 5][(i + ((rnd() * 3) | 0)) % 8],
        seed: ((rnd() * 997) | 0) + i,
        cv: null,
        flash: 0
      });
    }

    ringRot = 0;
    rot.from = rot.to = 0;
    rot.t = 1;
    rot.dur = 1;
  }

  function drawRing(dt) {
    var mid = (R + RO) / 2;

    /* 环带底：一条粗圆弧，把面板和背后的光切开 */
    ctx.strokeStyle = rgba(pal.bg, 0.93);
    ctx.lineWidth = BAND;
    ctx.beginPath();
    ctx.arc(0, 0, mid, 0, TAU);
    ctx.stroke();

    /* 面板 */
    /* 环大半在画外，屏幕外的卡片直接跳过 */
    var limX = W * 0.8 + BAND;
    var limY = H * 0.8 + BAND;

    for (var i = 0; i < slots.length; i += 1) {
      var s = slots[i];
      var ang = s.a + ringRot;
      var cxa = lcos(ang) * mid;
      var sya = lsin(ang) * mid;
      if (Math.abs(cxa) > limX || Math.abs(sya) > limY) continue;

      if (!s.cv) s.cv = makeCard(s);
      var h = s.da * mid;

      ctx.save();
      ctx.rotate(ang);
      ctx.translate(R, 0);
      ctx.drawImage(s.cv, 0, -h / 2, BAND, h);

      if (s.flash > 0) {
        s.flash = Math.max(0, s.flash - dt * 3);
        ctx.globalAlpha = s.flash * 0.45;
        ctx.fillStyle = rgba(pal.a, 1);
        ctx.fillRect(0, -h / 2, BAND, h);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    /* 内外缘 */
    ctx.strokeStyle = rgba(INK, 0.85);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = rgba(INK, 0.45);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, RO, 0, TAU);
    ctx.stroke();

    /* 外缘的辉光，让环带像「发着光」而不是贴上去的 */
    var og = ctx.createRadialGradient(0, 0, RO, 0, 0, RO + BAND * 1.6);
    og.addColorStop(0, rgba(INK, 0.1));
    og.addColorStop(0.4, rgba(pal.a, 0.035));
    og.addColorStop(1, rgba(pal.a, 0));
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(0, 0, RO + BAND * 1.6, 0, TAU);
    ctx.arc(0, 0, RO, 0, TAU, true);
    ctx.fill();

    /* 环外刻度 */
    var tn = 96;
    for (var t = 0; t < tn; t += 1) {
      var ang = (t / tn) * TAU + ringRot * 0.2;
      var major = t % 8 === 0;
      var rr0 = RO + 1;
      var rr1 = rr0 + (major ? 7 : 3);
      ctx.strokeStyle = rgba(INK, major ? 0.4 : 0.16);
      ctx.lineWidth = major ? 1 : 0.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * rr0, Math.sin(ang) * rr0);
      ctx.lineTo(Math.cos(ang) * rr1, Math.sin(ang) * rr1);
      ctx.stroke();
    }
  }

  /* ---------- 环外：多层光束 ----------
     五层线束，远层细暗慢、近层粗亮快。每层由若干楔形组成，
     楔内几十条线各有长短轮廓。节拍的波沿圆周传过去，线就一束
     一束地抽长 —— 这是「迸发」感的来源。 */
  var strandLayers = [];
  var hazes = [];
  var flares = [];
  var dashes = [];
  var pulses = [];
  var glowSprite = null;

  function profile(n) {
    var p = [];
    var v = rr(0.4, 1);
    var run = 0;
    for (var i = 0; i < n; i += 1) {
      if (run-- <= 0) {
        v = clamp(v + gauss() * 0.4, 0.2, 1);
        run = 2 + ((rnd() * 5) | 0);
      }
      p.push(clamp(v + gauss() * 0.07, 0.15, 1));
    }
    return p;
  }

  function mkLayer(o) {
    var nb = Math.floor(TAU / o.step);
    var ws = [];
    var left = Math.round(o.lines * CFG.beam);

    while (left > 0) {
      var n = Math.min(left, o.n[0] + ((rnd() * (o.n[1] - o.n[0])) | 0));

      /* 束内每条线的相对位置（-1..1）、角抖动、以及轻微的高度差。
         抖动是预先生成的：每帧随机的话线条会一直闪，看着像噪声。 */
      var tn = [];
      var jit = [];
      var ww = [];
      for (var q = 0; q < n; q += 1) {
        tn.push(n > 1 ? (q / (n - 1)) * 2 - 1 : 0);
        jit.push(gauss() * o.step * 0.4);
        ww.push(rr(0.55, 1.35));
      }

      ws.push({
        i0: (rnd() * nb) | 0,
        n: n,
        tn: tn,
        jit: jit,
        wt: ww,
        spread: rr(0.75, 1.85),
        gap: rnd() < 0.2 ? rr(1.6, 3.8) : 0,
        len: rr(0.22, 0.92),
        prof: profile(n),
        ph: rnd() * TAU,
        lum: rr(0.3, 1),
        lw: rnd() < 0.18 ? rr(1.3, 2.1) : rr(0.55, 1.15)
      });
      left -= n;
    }
    /* 静态方位包络：整圈分 48 格，用几条随机正弦叠出高低。
       没有它，所有束长一样，整圈就成了等距梳齿。 */
    var EN = new Float32Array(48);
    var h = [rr(1, 3), rr(2, 5), rr(3, 6), rr(4, 8)];
    var ph = [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU];
    for (var e = 0; e < 48; e += 1) {
      var ang = (e / 48) * TAU;
      var v = 0.72
        + 0.28 * Math.sin(ang * h[0] + ph[0])
        + 0.2 * Math.sin(ang * h[1] + ph[1])
        + 0.15 * Math.sin(ang * h[2] + ph[2])
        + 0.09 * Math.sin(ang * h[3] + ph[3]);
      EN[e] = clamp(v, 0.34, 1.5);
    }

    return { o: o, ws: ws, off: rnd() * TAU, env: EN };
  }

  /* 查方位包络（环形线性插值，避免 48 个台阶被看出来） */
  function envAt(L, a) {
    var f = (a / TAU) * 48;
    var i0 = f | 0;
    var t = f - i0;
    var v0 = L.env[i0 & 47];
    var v1 = L.env[(i0 + 1) & 47];
    return v0 + (v1 - v0) * t;
  }

  function buildOuter() {
    strandLayers = [
      { step: 0.235, rot: 0.38, lum: 0.26, lw: 0.5, len: 1.9, lines: 980, n: [18, 70], top: 0.2 },
      { step: 0.175, rot: 0.68, lum: 0.5, lw: 0.75, len: 1.72, lines: 860, n: [14, 60], top: 0.3 },
      { step: 0.13, rot: 1.0, lum: 1.15, lw: 1.0, len: 1.62, lines: 780, n: [12, 52], top: 0.36 },
      { step: 0.42, rot: 1.0, lum: 0.85, lw: 1.75, len: 1.35, lines: 150, n: [3, 12], top: 0.34 },
      { step: 0.13, rot: 1.0, lum: 0.8, lw: 0.9, len: 1.55, lines: 680, n: [12, 58], top: 0.32 }
    ].map(mkLayer);
    strandLayers[4].wave = true;

    hazes = [];
    flares = [];
    dashes = [];
    pulses = [];
    bursts = [];

    /* 根部闪光用的光斑，预渲染一次 */
    glowSprite = offscreen(64, 64, 1);
    var gg = glowSprite.g;
    var gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.35, "rgba(230,236,250,.55)");
    gr.addColorStop(1, "rgba(200,210,240,0)");
    gg.fillStyle = gr;
    gg.fillRect(0, 0, 64, 64);

    for (var i = 0; i < 34; i += 1) {
      dashes.push({
        a: rnd() * TAU,
        r: RO + rr(0, Math.max(20, RMAX - RO)),
        len: rr(6, 26),
        sp: rr(30, 120),
        w: rr(0.6, 1.6),
        b: rr(0.18, 0.6)
      });
    }
  }

  function drawStrands() {
    var band = RMAX - RO;

    for (var li = 0; li < strandLayers.length; li += 1) {
      var L = strandLayers[li];
      var o = L.o;

      /* 拆成 6 组：3 个亮度档 × 近/远两段。
         近段亮、远段淡，光束才有「射出去、然后散掉」的方向感 */
      for (var grp = 0; grp < 6; grp += 1) {
        var tier = grp % 3;
        var far = grp >= 3;
        ctx.beginPath();
        var drew = false;

        for (var j = 0; j < L.ws.length; j += 1) {
          var w = L.ws[j];
          if ((w.lum > 0.75 ? 2 : w.lum > 0.5 ? 1 : 0) !== tier) continue;

          var breath = 0.5 + 0.5 * Math.sin(clock * 1.15 + w.ph);
          var gain = 0.72 + breath * 0.5;
          gain *= 0.72 + beat.env * 0.6;
          if (o.wave) gain *= 0.7 + 0.6 * Math.abs(Math.sin(clock * 2.1 + w.ph));

          /* 楔形：环边几乎收成一点，往外越走越开。
             这是「迸发」和「梳齿」的分界——平行线只会像百叶窗 */
          var half = o.step * 0.5 * w.spread;

          for (var k = 0; k < w.n; k += 1) {
            var a = (w.i0 + k) * o.step + k * w.gap + w.jit[k] + L.off + ringRot * o.rot;
            var g2 = gain + waveAt(a) * 1.1;
            var len = band * o.len * w.len * w.prof[k] * w.wt[k]
              * envAt(L, a) * clamp(g2, 0.18, 2.6);
            if (len < 3) continue;

            var r0 = RO + 2;
            var ga = far ? 0.42 : 0;
            var gb = far ? 1 : 0.42;
            var ra = r0 + len * ga;
            var rb = r0 + len * gb;

            /* 张开量随半径线性增长，两段在 0.4len 处自然衔接 */
            var an = a + w.tn[k] * half * ga * 1.45;
            var af = a + w.tn[k] * half * gb * 1.45;

            ctx.moveTo(lcos(an) * ra, lsin(an) * ra);
            ctx.lineTo(lcos(af) * rb, lsin(af) * rb);
            drew = true;
          }
        }

        if (!drew) continue;
        var base = [0.17, 0.4, 0.82][tier] * o.lum;
        var alpha = far ? base * 0.62 : base * 1.35;
        if (isLight) alpha *= 1.75;
        ctx.strokeStyle = li % 2 === 0 ? rgba(INK, alpha) : rgba(mix(pal.a, INK, 0.45), alpha);
        ctx.lineWidth = o.lw * (0.72 + tier * 0.22) * (far ? 1.05 : 1.35);
        ctx.stroke();
      }
    }
  }

  /* ---------- 节拍爆发 ----------
     一记重拍，从环的某一段向外炸开一组锥形短光，
     0.9 秒内冲出去再散掉。整圈均匀的光束之外，
     必须有这种「局部炸开」的东西，才像在迸发。 */
  var bursts = [];

  function drawBurst(dt) {
    if (beat.env > 0.55 && bursts.length < 4 && rnd() < 0.55) {
      var nn = 18 + ((rnd() * 28) | 0);
      var lines = [];
      for (var i = 0; i < nn; i += 1) {
        lines.push({
          t: ((i / (nn - 1)) * 2 - 1) + gauss() * 0.04,
          s: rr(0.35, 1),
          w: rr(0.55, 1.5)
        });
      }
      bursts.push({ a: rnd() * TAU, w: rr(0.1, 0.32), lines: lines, L: 0.9, max: 0.9 });
    }

    for (var b = bursts.length - 1; b >= 0; b -= 1) {
      var B = bursts[b];
      B.L -= dt;
      if (B.L <= 0) { bursts.splice(b, 1); continue; }

      var pr = 1 - B.L / B.max;
      var fade = Math.pow(1 - pr, 1.7);
      var reach = (RMAX - RO) * (0.3 + pr * 0.85);

      ctx.beginPath();
      for (var j = 0; j < B.lines.length; j += 1) {
        var ln = B.lines[j];
        var aa = B.a + ln.t * B.w;
        var ra = RO + 3 + pr * 16 * ln.s;
        var rb = ra + reach * ln.s;
        var ca = lcos(aa);
        var sa = lsin(aa);
        /* 末端稍微甩开一点，直线太硬，像针不像光 */
        ctx.moveTo(ca * ra, sa * ra);
        ctx.lineTo(ca * rb - sa * reach * 0.045 * ln.t, sa * rb + ca * reach * 0.045 * ln.t);
      }
      ctx.strokeStyle = rgba(mix(pal.b, INK, 0.25), 0.55 * fade);
      ctx.lineWidth = 1.15;
      ctx.stroke();
    }
  }

  /* 环外的大范围辉光。没有这层，光束就是黑底上的几根细线；
     有了它，右侧整片是「发光的空气」，线才有穿透感。 */
  function drawAura() {
    var g = ctx.createRadialGradient(0, 0, RO * 0.92, 0, 0, RMAX * 0.72);
    g.addColorStop(0, rgba(pal.a, 0.13 + beat.env * 0.05));
    g.addColorStop(0.22, rgba(pal.a, 0.055));
    g.addColorStop(0.55, rgba(pal.a, 0.016));
    g.addColorStop(1, rgba(pal.a, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, RMAX * 0.72, 0, TAU);
    ctx.fill();
  }

  function drawDashes(dt) {
    for (var i = 0; i < dashes.length; i += 1) {
      var d = dashes[i];
      d.r += d.sp * dt * (0.6 + beat.env * 0.9);
      var maxR = RMAX * 0.98;
      if (d.r > maxR) {
        d.r = RO + rr(2, 20);
        d.a = rnd() * TAU;
      }
      var fade = 1 - clamp((d.r - RO) / (maxR - RO), 0, 1);
      if (fade <= 0.02) continue;
      ctx.strokeStyle = rgba(pal.a, d.b * fade);
      ctx.lineWidth = d.w;
      ctx.beginPath();
      ctx.moveTo(Math.cos(d.a) * d.r, Math.sin(d.a) * d.r);
      ctx.lineTo(Math.cos(d.a) * (d.r + d.len), Math.sin(d.a) * (d.r + d.len));
      ctx.stroke();
    }
  }

  function drawHaze(dt) {
    /* 宽光带：几条很淡的扇区，随节拍换角度、换色调 */
    if (hazes.length < 7 && rnd() < 0.05) {
      hazes.push({
        a: rnd() * TAU,
        w: rr(0.16, 0.62),
        life: rr(2.2, 4.5),
        L: 0,
        tint: (rnd() * 3) | 0,
        rot: rr(-0.16, 0.16)
      });
    }
    for (var i = hazes.length - 1; i >= 0; i -= 1) {
      var h = hazes[i];
      if (!h.L) h.L = h.life;
      h.L -= dt;
      h.a += h.rot * dt;
      if (h.L <= 0) { hazes.splice(i, 1); continue; }

      var k = Math.min(1, h.L / h.life);
      var fade = Math.sin(Math.min(1, (h.life - h.L) / 0.6) * Math.PI * 0.5) * k;
      var col = [mix(pal.a, INK, 0.4), INK, pal.b][h.tint];

      var grd = ctx.createRadialGradient(0, 0, RO * 0.9, 0, 0, RMAX * 0.9);
      grd.addColorStop(0, rgba(col, 0.34 * fade));
      grd.addColorStop(0.4, rgba(col, 0.11 * fade));
      grd.addColorStop(1, rgba(col, 0));

      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, RMAX * 0.9, h.a - h.w, h.a + h.w);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawFlares(dt) {
    if (beat.env > 0.5 && rnd() < 0.45) {
      flares.push({
        a: rnd() * TAU,
        r: RO + rr(-2, 4),
        s: rr(10, 32),
        L: rr(0.18, 0.42),
        max: 0.42
      });
    }
    for (var i = flares.length - 1; i >= 0; i -= 1) {
      var f = flares[i];
      f.L -= dt;
      if (f.L <= 0) { flares.splice(i, 1); continue; }
      var k = f.L / f.max;
      var s = f.s * (1.4 - k * 0.4);
      ctx.globalAlpha = k * 0.7;
      ctx.drawImage(glowSprite, Math.cos(f.a) * f.r - s / 2, Math.sin(f.a) * f.r - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- 相机 ----------
     自动推近 / 拉远。滚动阅读时立刻退回全景并暂停，不跟用户抢。 */
  var cam = { x: 0, y: 0, z: 1 };
  var shots = [];
  var shotI = 0;
  var shotT = 0;
  var camPhase = "hold";
  var camFrom = null;
  var camHold = 0;

  function buildShots() {
    var mid = (R + RO) / 2;
    shots = [
      { x: W / 2, y: H / 2, z: 1, hold: 5.2 },
      { x: cx + Math.cos(-0.5) * mid, y: cy + Math.sin(-0.5) * mid, z: 2.1, hold: 3.4 },
      { x: W / 2, y: H / 2, z: 1, hold: 3.0 },
      { x: cx + Math.cos(0.4) * R * 0.75, y: cy + Math.sin(0.4) * R * 0.75, z: 1.7, hold: 3.2 },
      { x: cx, y: cy, z: 2.4, hold: 2.8 },
      { x: W / 2, y: H / 2, z: 1, hold: 4.2 }
    ];
    shotI = 0;
    shotT = 0;
    camPhase = "hold";
    cam.z = 1;
    cam.x = W / 2;
    cam.y = H / 2;
  }

  function clampCam() {
    var hw = W / (2 * cam.z);
    var hh = H / (2 * cam.z);
    cam.x = Math.max(hw, Math.min(W - hw, cam.x));
    cam.y = Math.max(hh, Math.min(H - hh, cam.y));
  }

  function updateCam(dt) {
    if (!CFG.cam || camHold > 0 || reduce.matches) {
      camHold = Math.max(0, camHold - dt);
      var k = Math.min(1, dt * 3);
      cam.x += (W / 2 - cam.x) * k;
      cam.y += (H / 2 - cam.y) * k;
      cam.z += (1 - cam.z) * k;
      return;
    }
    shotT += dt;
    var cur = shots[shotI];
    var nxt = shots[(shotI + 1) % shots.length];

    if (camPhase === "hold") {
      var kk = shotT / cur.hold;
      cam.x = cur.x;
      cam.y = cur.y + (cur.z > 1 ? Math.sin(Math.min(1, kk) * Math.PI) * 5 : 0);
      cam.z = cur.z * (1 + 0.04 * Math.min(1, kk));
      if (shotT >= cur.hold) {
        camPhase = "move";
        shotT = 0;
        camFrom = { x: cam.x, y: cam.y, z: cam.z };
      }
    } else {
      var dur = 2.0;
      var e = easeIO(Math.min(1, shotT / dur));
      /* 对数插值，推近时速度感才均匀 */
      var lz = Math.log(camFrom.z) + (Math.log(nxt.z) - Math.log(camFrom.z)) * e;
      cam.z = Math.max(1, Math.exp(lz));
      cam.x = camFrom.x + (nxt.x - camFrom.x) * e;
      cam.y = camFrom.y + (nxt.y - camFrom.y) * e;
      if (shotT >= dur) {
        shotI = (shotI + 1) % shots.length;
        camPhase = "hold";
        shotT = 0;
      }
    }
    clampCam();
  }

  function applyCam() {
    var z = cam.z;
    ctx.setTransform(
      dpr * z, 0, 0, dpr * z,
      dpr * (W / 2 - cam.x * z),
      dpr * (H / 2 - cam.y * z)
    );
  }

  /* ---------- 尺寸与重建 ---------- */
  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var small = W < 780;
    /* 环要大到出画：只留一段弧横在画面里，剩下交给环外光束 */
    R = small ? H * 0.58 : Math.max(H * 0.58, W * 0.30);
    BAND = R * 0.2 * clamp(CFG.ring, 0.8, 1.3);
    RO = R + BAND;
    RMAX = Math.hypot(W, H) * 1.05;
    cx = W * (small ? 0.5 : 0.38);
    cy = H * 0.5;

    /* 黑客皮肤的舞台只占左边一列，右半被日志栏压着。
       环按舞台宽度收一号，否则整段弧线都藏到面板底下 */
    if (document.documentElement.dataset.style === "hacker" && !small) {
      R *= 0.78;
      BAND = R * 0.2 * clamp(CFG.ring, 0.8, 1.3);
      RO = R + BAND;
      cx = W * 0.28;
    }

    buildWeb();
    buildSlots();
    buildOuter();
    buildShots();
    draw(0);
  }

  /* ---------- 主循环 ---------- */
  function draw(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    clock += dt;
    buildWaveTable();
    for (var p = pulses.length - 1; p >= 0; p -= 1) {
      var pu = pulses[p];
      pu.L -= dt;
      pu.c += pu.v * dt;
      if (pu.L <= 0) pulses.splice(p, 1);
    }

    /* 背景辉光 */
    var bgGrad = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, RMAX * 0.95);
    bgGrad.addColorStop(0, rgba(pal.a, 0.05 * CFG.glow));
    bgGrad.addColorStop(0.5, rgba(pal.a, 0.016 * CFG.glow));
    bgGrad.addColorStop(1, rgba(pal.a, 0));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    applyCam();
    ctx.translate(cx, cy);

    drawHaze(dt);
    drawAura();
    drawStrands();
    drawBurst(dt);
    drawDashes(dt);

    drawWeb(dt);
    drawComets(dt);
    drawRing(dt);
    drawFlares(dt);

    /* 中心准星：标出"这里是被测量的点" */
    ctx.strokeStyle = rgba(pal.a, 0.22);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-R * 0.14, 0);
    ctx.lineTo(R * 0.14, 0);
    ctx.moveTo(0, -R * 0.14);
    ctx.lineTo(0, R * 0.14);
    ctx.stroke();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* 节拍脉冲：全屏一次极淡的闪 */
    if (beat.env > 0.02) {
      ctx.fillStyle = rgba(pal.a, beat.env * 0.016);
      ctx.fillRect(0, 0, W, H);
    }
  }

  var running = false;
  var raf = 0;
  var last = 0;
  var visible = true;

  var slowN = 0;
  var slowAcc = 0;
  var degraded = 0;

  function loop(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    updateBeat(dt);
    updateRing(dt);
    updateCam(dt);
    draw(dt);

    /* 连续 90 帧偏慢就降一档：先砍光束密度，再砍分辨率。
       宁可少几根线，也不要掉帧。 */
    slowN += 1;
    slowAcc += dt;
    if (slowN >= 90) {
      var avg = slowAcc / slowN;
      slowN = 0;
      slowAcc = 0;
      if (avg > 0.028 && degraded < 2) {
        degraded += 1;
        if (degraded === 1) {
          CFG.beam *= 0.6;
          buildOuter();
        } else {
          dprCap = 1.15;
          resize();
        }
      }
    }

    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running || !visible) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ---------- 生命周期 ---------- */
  var ro = null;
  if ("ResizeObserver" in window) {
    ro = new ResizeObserver(function () { resize(); });
    ro.observe(canvas);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }

  document.addEventListener("visibilitychange", function () {
    visible = !document.hidden;
    if (visible) start();
    else stop();
  });

  if (reduce.addEventListener) {
    reduce.addEventListener("change", function () {
      if (reduce.matches) {
        stop();
        draw(0);
      } else {
        start();
      }
    });
  }

  document.addEventListener("hnyz:stylechange", function () {
    readColors();
    buildWeb();
    buildSlots();
    buildOuter();
    draw(0.016);
  });

  /* 滚动阅读时让位：相机回全景 */
  var view = document.querySelector("[data-ck-view]");
  if (view) {
    view.addEventListener("scroll", function () { camHold = 1.2; }, { passive: true });
  }

  readColors();
  resize();
  if (reduce.matches) draw(0);
  else start();

  window.HNYZ_STAGE = { stop: stop, start: start, cfg: CFG, redraw: function () { draw(0.016); } };
})();
