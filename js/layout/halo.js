/* =========================================================
   HNYZ · 舞台光场（HALO）
   ---------------------------------------------------------
   中心一圈编织环，环上挂着节拍块，环外是分层向外迸发的光束。
   纯 Canvas 2D、无依赖，配色全部从 --ck-accent / --ck-accent-2 读，
   所以每套皮肤的光场颜色会跟着皮肤走。

   版式参考 HALOFLUX by Ryder191（PolyForm Noncommercial 1.0.0），
   实现与图形为本项目自写。
   ========================================================= */
(function () {
  "use strict";

  var canvas = document.querySelector("[data-ck-halo]");
  if (!canvas) return;

  var ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var dpr = 1;
  var W = 0;
  var H = 0;
  var CX = 0;
  var CY = 0;
  var R = 0;

  var accent = "#7fb3ff";
  var accent2 = "#98e0cf";
  var soft = "rgba(127,179,255,0.5)";

  /* 节拍：不均匀。三个不同周期的正弦叠起来，让环的转速
     时快时慢，偶尔停顿一下 —— 匀速旋转看着像风扇，不像仪器。 */
  var clock = {
    t: 0,
    beat: 0,
    phase: 0,
    punch: 0
  };

  var beams = [];
  var ticks = [];
  var blocks = [];
  var waves = [];
  var running = false;
  var raf = 0;
  var last = 0;
  var visible = true;

  function rand(seed) {
    /* 固定序列，保证每次刷新形态一致（不然像抽奖） */
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function readColors() {
    /* --ck-accent 定义在 .ck 上，直接读 <html> 拿不到 */
    var cs = getComputedStyle(canvas.parentElement || canvas);
    var a = cs.getPropertyValue("--ck-accent").trim();
    var b = cs.getPropertyValue("--ck-accent-2").trim();
    if (a) accent = a;
    if (b) accent2 = b;
    soft = hexToRgba(accent, 0.55);
  }

  function hexToRgba(hex, alpha) {
    var h = (hex || "").replace("#", "");
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length !== 6) return "rgba(127,179,255," + alpha + ")";
    var n = parseInt(h, 16);
    return (
      "rgba(" +
      ((n >> 16) & 255) +
      "," +
      ((n >> 8) & 255) +
      "," +
      (n & 255) +
      "," +
      alpha +
      ")"
    );
  }

  function baseRadius() {
    return Math.max(56, Math.min(W, H) * 0.26);
  }

  function build() {
    R = baseRadius();
    var count = W < 640 ? 34 : W < 1100 ? 48 : 62;

    beams.length = 0;
    for (var i = 0; i < count; i += 1) {
      var a = (i / count) * Math.PI * 2 + rand(i) * 0.09;
      beams.push({
        angle: a,
        len: 0.24 + rand(i + 11) * 0.92,
        width: 0.6 + rand(i + 23) * 1.7,
        speed: 0.18 + rand(i + 31) * 0.5,
        phase: rand(i + 43) * Math.PI * 2,
        layer: i % 3
      });
    }

    ticks.length = 0;
    var tn = count * 2;
    for (var j = 0; j < tn; j += 1) {
      ticks.push({
        angle: (j / tn) * Math.PI * 2,
        major: j % 4 === 0,
        w: j % 4 === 0 ? 1.4 : 0.7,
        len: j % 4 === 0 ? 7 : 3.5
      });
    }

    blocks.length = 0;
    var bn = W < 700 ? 8 : 12;
    for (var k = 0; k < bn; k += 1) {
      blocks.push({
        angle: (k / bn) * Math.PI * 2,
        size: 3 + Math.round(rand(k + 7) * 3),
        hold: rand(k + 17),
        kind: k % 3
      });
    }

    waves.length = 0;
    for (var m = 0; m < 3; m += 1) {
      waves.push({
        amp: 4 + rand(m + 3) * 9,
        freq: 5 + Math.floor(rand(m + 9) * 4),
        speed: 0.35 + rand(m + 5) * 0.5,
        phase: rand(m + 13) * 6.28
      });
    }
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* 环偏右：左边留给标题和正文，别让光压着字 */
    CX = W < 720 ? W * 0.5 : W * 0.62;
    CY = H * 0.42;
    build();
    draw(0);
  }

  /* ---------- 绘制 ---------- */

  function drawBackdrop() {
    var g = ctx.createRadialGradient(CX, CY, R * 0.1, CX, CY, R * 3.4);
    g.addColorStop(0, hexToRgba(accent, 0.17));
    g.addColorStop(0.34, hexToRgba(accent, 0.055));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBeams(punch) {
    var i;
    var n = beams.length;

    for (i = 0; i < n; i += 1) {
      var b = beams[i];
      var flick = 0.55 + 0.45 * Math.sin(clock.t * b.speed + b.phase);
      var len = R * (0.22 + b.len * (0.62 + punch * 0.38) * flick);
      var r0 = R * 1.02;
      var r1 = r0 + len;

      var x0 = CX + Math.cos(b.angle) * r0;
      var y0 = CY + Math.sin(b.angle) * r0;
      var x1 = CX + Math.cos(b.angle) * r1;
      var y1 = CY + Math.sin(b.angle) * r1;

      var g = ctx.createLinearGradient(x0, y0, x1, y1);
      var a = b.layer === 1 ? 0.52 : 0.3;
      g.addColorStop(0, hexToRgba(b.layer === 2 ? accent2 : accent, a * flick));
      g.addColorStop(0.45, hexToRgba(accent, a * 0.32 * flick));
      g.addColorStop(1, "rgba(0,0,0,0)");

      ctx.strokeStyle = g;
      ctx.lineWidth = b.width;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }

  function drawRing() {
    var i;

    /* 三层同心圆 */
    for (i = 0; i < 3; i += 1) {
      var rr = R * (1 - i * 0.075);
      ctx.strokeStyle = hexToRgba(accent, i === 0 ? 0.72 : 0.26);
      ctx.lineWidth = i === 0 ? 1.3 : 0.8;
      ctx.beginPath();
      ctx.arc(CX, CY, rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* 刻度 */
    for (i = 0; i < ticks.length; i += 1) {
      var tk = ticks[i];
      var r0 = R * 0.9;
      var r1 = r0 - tk.len;
      ctx.strokeStyle = hexToRgba(
        accent,
        tk.major ? 0.78 : 0.34
      );
      ctx.lineWidth = tk.w;
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(tk.angle) * r0, CY + Math.sin(tk.angle) * r0);
      ctx.lineTo(CX + Math.cos(tk.angle) * r1, CY + Math.sin(tk.angle) * r1);
      ctx.stroke();
    }
  }

  /* 编织：三条绕环的正弦，相位彼此错开，互相穿插 */
  function drawWeave() {
    var w;
    for (w = 0; w < waves.length; w += 1) {
      var wv = waves[w];
      ctx.strokeStyle = hexToRgba(w === 1 ? accent2 : accent, 0.46 - w * 0.09);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (var a = 0; a <= 360; a += 4) {
        var rad = (a * Math.PI) / 180;
        var off =
          Math.sin(rad * wv.freq + clock.phase * wv.speed + wv.phase) * wv.amp;
        var rr = R * 0.72 + off;
        var x = CX + Math.cos(rad) * rr;
        var y = CY + Math.sin(rad) * rr;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  /* 环上的数据块：随节拍跳，像仪器上的采样点 */
  function drawBlocks(punch) {
    for (var i = 0; i < blocks.length; i += 1) {
      var b = blocks[i];
      var live = (clock.beat + b.hold) % 4 < 2.2;
      var ang = b.angle + clock.phase * 0.16;
      var rr = R * (1.06 + (live ? punch * 0.03 : 0));
      var x = CX + Math.cos(ang) * rr;
      var y = CY + Math.sin(ang) * rr;
      var s = b.size;

      ctx.fillStyle = live
        ? hexToRgba(b.kind === 2 ? accent2 : accent, 0.9)
        : hexToRgba("#ffffff", 0.14);
      ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
    }
  }

  function drawCore(punch) {
    var r = R * (0.42 + punch * 0.03);
    var g = ctx.createRadialGradient(CX, CY, 0, CX, CY, r);
    g.addColorStop(0, hexToRgba(accent, 0.3));
    g.addColorStop(0.55, hexToRgba(accent, 0.08));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.fill();

    /* 中心一条极细的十字准星 */
    ctx.strokeStyle = hexToRgba(accent, 0.22);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(CX - r * 0.5, CY);
    ctx.lineTo(CX + r * 0.5, CY);
    ctx.moveTo(CX, CY - r * 0.5);
    ctx.lineTo(CX, CY + r * 0.5);
    ctx.stroke();
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);

    /* 非匀速节拍：相位累积 + 一次「停顿」 */
    var speed = 0.9 + Math.sin(clock.t * 0.47) * 0.55 + Math.sin(clock.t * 1.31) * 0.22;
    if (speed < 0.18) speed = 0.18;
    clock.phase += dt * speed;
    clock.t += dt;
    clock.beat = (clock.beat + dt * (1.4 + Math.sin(clock.t * 0.9) * 0.6)) % 8;
    clock.punch = Math.max(0, clock.punch - dt * 1.4);

    var punch = 0.5 + Math.sin(clock.beat * Math.PI) * 0.5;

    drawBackdrop();
    drawBeams(punch);
    drawRing();
    drawWeave();
    drawBlocks(punch);
    drawCore(punch);
  }

  function loop(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    draw(dt);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduce.matches || !visible) return;
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
    ro = new ResizeObserver(function () {
      resize();
    });
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
    draw(0.016);
  });

  readColors();
  resize();
  start();

  window.HNYZ_HALO = {
    stop: stop,
    start: start,
    color: function () {
      return { accent: accent, accent2: accent2, soft: soft };
    }
  };
})();
