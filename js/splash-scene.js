/* =========================================================
   HNYZ · 角色卡背景（Animdustry splash 复刻）
   ---------------------------------------------------------
   游戏里每个角色的「主页」背景不是一张图，而是 unit.draw
   现场画出来的一层层图案（src/units.nim）+ 一层 bloom 粒子
   （src/patterns.nim）：

     patStripes / patSpin / patShapeBack   —— 底色与几何底纹
     fillPoly + poly                        —— 中间的大多边形
     patTriSquare / patSpikes               —— 一圈三角形 / 放射短线
     patLines                               —— 会轻轻漂的小线段
     patCircles / patSquares / patMissiles  —— bloom 里的漂浮粒子
     patRadTris / patFallSquares / patFlame —— 另外几种粒子

   这里按同样的顺序重画一遍：静态层烘到离屏 canvas，
   会动的粒子每帧用缓存好的光斑贴图画，保证手机上也能跑。
   ========================================================= */

(() => {
  "use strict";

  const canvas = document.querySelector("[data-splash-scene]");
  const splash = document.querySelector("[data-char-splash]");
  if (!canvas || !splash) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -------------------------------------------------------
     一、每个角色的画法（参数取自 src/units.nim）
     r1 / r2 / dist 等都是相对屏幕高度的比例
     ------------------------------------------------------- */
  const SCENES = {
    alpha: {
      c1: "#b25840", c2: "#c07659", accent: "#ffd37f", wash: 0.15,
      bg: { type: "stripes", angle: 135 },
      poly: { sides: 3, r1: 0.17, r2: 0.43, rot: -90 },
      lines: { color: "#ffd37f", n: 24, angle: -45 },
      grad: { color: "#ffd37f", alpha: 0.5 },
      bloom: { type: "squares", color: "#ffd37f", n: 64 }
    },
    mono: {
      c1: "#235e62", c2: "#3a8a72", accent: "#84f490", wash: 0.04,
      bg: { type: "stripes", angle: 135 },
      poly: { sides: 4, r1: 0.2, r2: 0.5, rot: 90 },
      lines: { color: "#84f490", n: 26, angle: -45 },
      grad: { color: "#84f490", alpha: 0.72 },
      bloom: { type: "circles", color: "#84f490", n: 92 }
    },
    oct: {
      c1: "#235e62", c2: "#3a8a72", accent: "#84f490", wash: 0.04,
      bg: { type: "stripes", angle: 135 },
      poly: { sides: 8, r1: 0.18, r2: 0.42, rot: 0 },
      spikes: [{ n: 8, offset: 0.42, len: 0.06 }],
      tri: { n: 8, dist: 0.46, size: 0.05, rot: 0 },
      lines: { color: "#84f490", n: 26, angle: -45 },
      grad: { color: "#84f490", alpha: 0.7 },
      bloom: { type: "circles", color: "#84f490", n: 104, seed: 5 }
    },
    crawler: {
      c1: "#665c9f", c2: "#bf92f8", accent: "#edadff", wash: 0.07,
      bg: { type: "spin", blades: 20 },
      poly: { sides: 3, r1: 0.16, r2: 0.42, rot: -90 },
      spikes: [{ n: 12, offset: 0.4, len: 0.07 }],
      grad: { color: "#665c9f", alpha: 0.8 },
      bloom: { type: "radTris", color: "#edadff", n: 92, seed: 7 }
    },
    zenith: {
      c1: "#c45b4d", c2: "#ffa664", accent: "#ffd37f", wash: 0.17,
      bg: { type: "shapeBack", sides: 4, spacing: 0.095, rot: 90 },
      poly: { sides: 3, r1: 0.2, r2: 0.54, rot: -90 },
      tri: { n: 3, dist: 0.4, size: 0.085, rot: -30 },
      lines: { color: "#ffd37f", n: 24, angle: -45 },
      grad: { color: "#ffa664", alpha: 0.66 },
      bloom: { type: "missiles", color: "#d06b53", n: 68, seed: 2 },
      decor: ["chips", "controller"]
    },
    quad: {
      c1: "#235e62", c2: "#3a8a72", accent: "#84f490", wash: 0.04,
      bg: { type: "spin", blades: 16 },
      poly: { sides: 4, r1: 0.15, r2: 0.4, rot: 90 },
      tri: { n: 4, dist: 0.44, size: 0.055, rot: 45 },
      lines: { color: "#c7ffb7", n: 34, angle: -45 },
      grad: { color: "#c7ffb7", alpha: 0.62 },
      bloom: { type: "fallSquares", color: "#84f490", color2: "#c7ffb7", n: 80 }
    },
    oxynoe: {
      c1: "#235e62", c2: "#3a8a72", accent: "#84f490", wash: 0.04,
      bg: { type: "stripes", angle: 135 },
      poly: { sides: 4, r1: 0.18, r2: 0.42, rot: 90 },
      spikes: [
        { n: 12, offset: 0.44, len: 0.05 },
        { n: 24, offset: 0.5, len: 0.04 }
      ],
      lines: { color: "#c7ffb7", n: 22, angle: -45 },
      grad: { color: "#c7ffb7", alpha: 0.7 },
      bloom: { type: "flame", color: "#84f490", color2: "#c7ffb7", n: 110 }
    },
    sei: {
      c1: "#ffa664", c2: "#ffcb82", accent: "#ffd37f", wash: 0.13,
      bg: { type: "stripes", angle: 45 },
      poly: { sides: 4, r1: 0.18, r2: 0.5, rot: 0 },
      tri: { n: 4, dist: 0.46, size: 0.075, rot: 45 },
      lines: { color: "#ffd37f", n: 26, angle: 135 },
      grad: { color: "#d06b53", alpha: 0.55 },
      bloom: { type: "circles", color: "#d06b53", n: 96, seed: 1 }
    }
  };

  /* -------------------------------------------------------
     二、小工具
     ------------------------------------------------------- */
  function rgba(hex, alpha) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /* 和 Nim 的 initRand 一样，同一个 seed 每次位置都一样 */
  function rng(seed) {
    let a = seed >>> 0;
    return function random() {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function polyPath(g, cx, cy, sides, radius, rot) {
    g.beginPath();
    for (let i = 0; i < sides; i += 1) {
      const a = rot + (i / sides) * Math.PI * 2;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
  }

  function wrap(value, min, max) {
    const span = max - min;
    return min + ((((value - min) % span) + span) % span);
  }

  /* -------------------------------------------------------
     三、静态层（和游戏画出底纹的顺序一致）
     ------------------------------------------------------- */
  let W = 0;
  let H = 0;
  let dpr = 1;
  let CX = 0;
  let CY = 0;
  let base = null;
  let cfg = SCENES.zenith;
  let sprites = null;
  let lines = [];
  let parts = [];
  let raf = 0;
  let startTime = 0;
  let running = false;
  let visible = false;

  function drawStripes(g, c1, c2, angle) {
    g.fillStyle = c1;
    g.fillRect(0, 0, W, H);

    const sw = 0.105 * H;
    const diag = Math.hypot(W, H) * 1.6;
    const n = Math.ceil(diag / sw) + 2;

    g.save();
    g.translate(W / 2, H / 2);
    g.rotate((angle * Math.PI) / 180);
    g.fillStyle = c2;
    for (let i = -n; i <= n; i += 2) {
      g.fillRect(i * sw - sw / 2, -diag / 2, sw, diag);
    }
    g.restore();
  }

  /* patSpin：整屏的扇形叶片，单双数交替两种颜色 */
  function drawSpin(g, c1, c2, blades) {
    const r = Math.hypot(W, H);
    const step = (Math.PI * 2) / blades;
    for (let i = 0; i < blades; i += 1) {
      g.beginPath();
      g.moveTo(W / 2, H / 2);
      g.arc(W / 2, H / 2, r, i * step, (i + 1) * step);
      g.closePath();
      g.fillStyle = i % 2 === 0 ? c1 : c2;
      g.fill();
    }
  }

  /* patShapeBack：一圈套一圈的粗描边多边形，像游戏里那些菱形光带 */
  function drawShapeBack(g, c1, c2, sides, spacing, rot) {
    const sp = spacing * H;
    const maxR = Math.hypot(W, H) / 2 + sp * 2;
    const count = Math.ceil(maxR / sp);

    g.save();
    g.lineJoin = "round";
    g.miterLimit = 2;
    for (let i = count; i >= 1; i -= 1) {
      polyPath(g, CX, CY, sides, (i + 0.5) * sp, rot);
      g.lineWidth = sp;
      g.strokeStyle = i % 2 === 0 ? c2 : c1;
      g.stroke();
    }
    g.restore();

    g.fillStyle = c1;
    polyPath(g, CX, CY, sides, sp, rot);
    g.fill();
  }

  function buildBase() {
    base = document.createElement("canvas");
    base.width = Math.max(1, Math.round(W * dpr));
    base.height = Math.max(1, Math.round(H * dpr));
    const g = base.getContext("2d");
    g.scale(dpr, dpr);

    const c = cfg;
    CX = W / 2;
    CY = H * 0.52;

    g.fillStyle = c.c1;
    g.fillRect(0, 0, W, H);

    if (c.bg.type === "stripes") {
      drawStripes(g, c.c1, c.c2, c.bg.angle);
    } else if (c.bg.type === "spin") {
      drawSpin(g, c.c1, c.c2, c.bg.blades);
    } else if (c.bg.type === "shapeBack") {
      drawShapeBack(g, c.c1, c.c2, c.bg.sides, c.bg.spacing, (c.bg.rot * Math.PI) / 180);
    }

    /* 底部往上的一层染色，游戏里是 patVertGradient */
    if (c.grad) {
      const grad = g.createLinearGradient(0, H * 1.02, 0, H * 0.18);
      grad.addColorStop(0, rgba(c.grad.color, c.grad.alpha));
      grad.addColorStop(1, rgba(c.grad.color, 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
    }

    /* 角色背后的一团柔光，别让人物陷进底纹里 */
    const glow = g.createRadialGradient(CX, CY - H * 0.04, 0, CX, CY - H * 0.04, H * 0.62);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    glow.addColorStop(0.42, rgba(c.accent, 0.12));
    glow.addColorStop(1, rgba(c.accent, 0));
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);

    /* 一层斜向的薄光：底纹不再是一块平色，气泡浮在上面更有空间感 */
    const sweep = g.createLinearGradient(0, 0, W * 0.9, H);
    sweep.addColorStop(0, "rgba(255, 255, 255, 0.055)");
    sweep.addColorStop(0.42, "rgba(255, 255, 255, 0)");
    sweep.addColorStop(1, "rgba(16, 16, 30, 0.07)");
    g.fillStyle = sweep;
    g.fillRect(0, 0, W, H);

    /* 中间的大多边形：先填一层淡的，再描一圈粗边 */
    if (c.poly) {
      const rot = (c.poly.rot * Math.PI) / 180;
      g.fillStyle = rgba(c.accent, 0.22);
      polyPath(g, CX, CY, c.poly.sides, c.poly.r1 * H, rot);
      g.fill();

      g.strokeStyle = rgba(c.accent, 0.95);
      g.lineWidth = Math.max(4, 0.018 * H);
      g.lineJoin = "miter";
      polyPath(g, CX, CY, c.poly.sides, c.poly.r2 * H, rot);
      g.stroke();
    }

    /* patTriSquare：绕中心一圈的小三角 */
    if (c.tri) {
      const baseRot = (c.tri.rot * Math.PI) / 180;
      for (let i = 0; i < c.tri.n; i += 1) {
        const a = baseRot + (i / c.tri.n) * Math.PI * 2;
        const x = CX + Math.cos(a) * c.tri.dist * H;
        const y = CY + Math.sin(a) * c.tri.dist * H;
        g.fillStyle = rgba(c.accent, 0.8);
        polyPath(g, x, y, 3, c.tri.size * H, a);
        g.fill();
      }
    }

    /* patSpikes：外圈放射状短线 */
    if (c.spikes) {
      c.spikes.forEach((spike) => {
        g.strokeStyle = rgba(c.accent, 0.9);
        g.lineWidth = Math.max(2, 0.006 * H);
        g.lineCap = "round";
        for (let i = 0; i < spike.n; i += 1) {
          const a = (i / spike.n) * Math.PI * 2;
          g.beginPath();
          g.moveTo(CX + Math.cos(a) * spike.offset * H, CY + Math.sin(a) * spike.offset * H);
          g.lineTo(
            CX + Math.cos(a) * (spike.offset + spike.len) * H,
            CY + Math.sin(a) * (spike.offset + spike.len) * H
          );
          g.stroke();
        }
      });
    }

    /* 整体提一点亮，模拟游戏里的 bloom 泛光 */
    g.fillStyle = `rgba(255, 240, 220, ${c.wash == null ? 0.1 : c.wash})`;
    g.fillRect(0, 0, W, H);

    /* 四角压一点点暗，白字更稳 */
    const vig = g.createRadialGradient(W / 2, H * 0.5, H * 0.2, W / 2, H * 0.5, Math.hypot(W, H) * 0.62);
    vig.addColorStop(0, "rgba(20, 18, 34, 0)");
    vig.addColorStop(1, "rgba(20, 18, 34, 0.2)");
    g.fillStyle = vig;
    g.fillRect(0, 0, W, H);
  }

  /* -------------------------------------------------------
     四、光斑贴图
     ------------------------------------------------------- */
  function makeBlob(color) {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255, 253, 246, 1)");
    grad.addColorStop(0.62, "rgba(255, 248, 232, 0.98)");
    grad.addColorStop(0.84, rgba(color, 0.78));
    grad.addColorStop(0.94, rgba(color, 0.22));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function buildSprites() {
    sprites = { white: makeBlob("#fff1d6"), bubbles: new Map() };
  }

  /* 气泡贴图：亮心 + 一圈更亮的边 + 左上高光。
     比纯柔光多一圈轮廓，在深色底纹上更清楚，也更像游戏 bloom
     里那些一颗颗浮着的光泡。 */
  function makeBubble(color) {
    if (sprites.bubbles.has(color)) return sprites.bubbles.get(color);

    const size = 192;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");
    const cx = size / 2;
    const r = size / 2;

    /* 外圈柔光，让气泡和背景之间有过渡 */
    const halo = g.createRadialGradient(cx, cx, r * 0.45, cx, cx, r);
    halo.addColorStop(0, rgba(color, 0));
    halo.addColorStop(0.58, rgba(color, 0.05));
    halo.addColorStop(0.8, rgba(color, 0.16));
    halo.addColorStop(0.92, rgba(color, 0.08));
    halo.addColorStop(1, rgba(color, 0));
    g.fillStyle = halo;
    g.fillRect(0, 0, size, size);

    /* 亮心偏白，越靠边越带角色色 */
    const body = g.createRadialGradient(cx, cx, 0, cx, cx, r * 0.9);
    body.addColorStop(0, "rgba(255, 253, 246, 0.96)");
    body.addColorStop(0.46, "rgba(255, 250, 236, 0.78)");
    body.addColorStop(0.7, rgba(color, 0.4));
    body.addColorStop(0.84, "rgba(255, 255, 255, 0.72)");
    body.addColorStop(0.92, rgba(color, 0.32));
    body.addColorStop(1, rgba(color, 0));
    g.fillStyle = body;
    g.fillRect(0, 0, size, size);

    /* 细亮边：气泡的「壳」 */
    g.strokeStyle = "rgba(255, 255, 255, 0.2)";
    g.lineWidth = Math.max(1, size * 0.009);
    g.beginPath();
    g.arc(cx, cx, r * 0.81, 0, Math.PI * 2);
    g.stroke();

    /* 左上高光 */
    const spec = g.createRadialGradient(cx - r * 0.3, cx - r * 0.32, 0, cx - r * 0.3, cx - r * 0.32, r * 0.2);
    spec.addColorStop(0, "rgba(255, 255, 255, 0.55)");
    spec.addColorStop(1, "rgba(255, 255, 255, 0)");
    g.fillStyle = spec;
    g.fillRect(0, 0, size, size);

    sprites.bubbles.set(color, c);
    return c;
  }

  /* -------------------------------------------------------
     五、会动的层
     ------------------------------------------------------- */
  function buildParticles() {
    const c = cfg;
    const rand = rng((c.bloom && c.bloom.seed) || 1);
    const scale = W < 720 ? 0.66 : 1;
    const count = Math.round(c.bloom.n * scale);

    lines = [];
    if (c.lines) {
      for (let i = 0; i < c.lines.n; i += 1) {
        lines.push({
          x: (rand() - 0.5) * W * 0.92,
          y: (rand() - 0.5) * H * 0.92,
          len: (0.035 + rand() * 0.055) * H,
          mag: (0.006 + rand() * 0.014) * H,
          speed: 0.5 + rand() * 0.7,
          phase: rand() * Math.PI * 2
        });
      }
    }

    parts = [];
    for (let i = 0; i < count; i += 1) {
      const isMissile = c.bloom.type === "missiles";
      const angle = isMissile ? 0.68 + rand() * 0.5 : rand() * Math.PI * 2;
      const speed = (isMissile ? 0.014 + rand() * 0.016 : 0.008 + rand() * 0.02) * H;
      const size = (0.008 + Math.pow(rand(), 1.6) * 0.032) * H;
      parts.push({
        x: rand() * W,
        y: rand() * H,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: size,
        rot: rand() * Math.PI * 2,
        spin: (rand() - 0.5) * 0.9,
        alpha: 0.45 + rand() * 0.4,
        phase: rand() * Math.PI * 2,
        pulse: 0.6 + rand() * 1.3,
        life: rand(),
        len: 15 + rand() * 19,
        /* 远近层次：鼠标视差时，大颗粒走得稍快一点 */
        depth: 0.3 + rand() * 0.9
      });
    }
  }

  function drawLines(g, t) {
    if (!lines.length) return;
    const c = cfg.lines;
    const a = (c.angle * Math.PI) / 180;

    const points = lines.map((line) => {
      const ox = Math.sin(t * line.speed + line.phase) * line.mag;
      const oy = Math.cos(t * line.speed * 0.8 + line.phase * 1.7) * line.mag;
      return {
        x: W / 2 + line.x + ox,
        y: H / 2 + line.y + oy,
        len: line.len
      };
    });

    g.lineCap = "round";

    /* 先铺一层宽的淡光，再压一根细亮线，线条也有 bloom */
    g.strokeStyle = rgba(c.color, 0.22);
    g.lineWidth = Math.max(5, 0.018 * H);
    points.forEach((point) => {
      g.beginPath();
      g.moveTo(point.x - Math.cos(a) * point.len * 0.5, point.y - Math.sin(a) * point.len * 0.5);
      g.lineTo(point.x + Math.cos(a) * point.len * 0.5, point.y + Math.sin(a) * point.len * 0.5);
      g.stroke();
    });

    g.strokeStyle = rgba(c.color, 0.85);
    g.lineWidth = Math.max(2, 0.006 * H);
    points.forEach((point) => {
      g.beginPath();
      g.moveTo(point.x - Math.cos(a) * point.len * 0.5, point.y - Math.sin(a) * point.len * 0.5);
      g.lineTo(point.x + Math.cos(a) * point.len * 0.5, point.y + Math.sin(a) * point.len * 0.5);
      g.stroke();
    });
  }

  function drawParticles(g, t) {
    const c = cfg.bloom;
    const pad = H * 0.2;
    const layer = sprites.white;
    const bubble = makeBubble(c.color);

    parts.forEach((p) => {
      const type = c.type;
      /* 远近不同的颗粒，鼠标视差时错开一点，背景更有厚度 */
      const depthX = px * (p.depth - 0.6) * 0.9;
      const depthY = py * (p.depth - 0.6) * 0.9;

      if (type === "fallSquares" || type === "flame") {
        const cycle = (p.life + t / p.len) % 1;

        if (type === "fallSquares") {
          const y = -pad + cycle * (H + pad * 2);
          const x = p.x + Math.sin(t * 0.4 + p.phase) * H * 0.02;
          const fade = Math.sin(cycle * Math.PI);
          g.globalAlpha = p.alpha * 0.9 * fade;
          g.fillStyle = p.life > 0.5 ? c.color2 : c.color;
          g.save();
          g.translate(x, y);
          g.rotate(p.rot + t * p.spin);
          g.fillRect(-p.r * 0.5, -p.r * 0.5, p.r, p.r);
          g.restore();
        } else {
          const y = H + pad - cycle * (H + pad * 2);
          const x = p.x + Math.sin(t * 0.9 + p.phase) * H * 0.03;
          const r = p.r * (1 - cycle * 0.75) * 1.1;
          const fade = Math.sin(cycle * Math.PI * 0.9);
          g.globalAlpha = p.alpha * fade;
          g.drawImage(makeBubble(p.life > 0.5 ? c.color2 : c.color), x - r, y - r, r * 2, r * 2);
        }
        return;
      }

      const x = wrap(p.x + p.vx * t, -pad, W + pad) + depthX;
      const y = wrap(p.y + p.vy * t, -pad, H + pad) + depthY;

      if (type === "squares") {
        const s = p.r * (1 + Math.sin(t * p.pulse + p.phase) * 0.22);
        g.globalAlpha = p.alpha * 0.75;
        g.fillStyle = c.color;
        g.save();
        g.translate(x, y);
        g.rotate(p.rot + Math.PI / 4);
        g.fillRect(-s * 0.5, -s * 0.5, s, s);
        g.restore();
        g.globalAlpha = p.alpha * 0.4;
        g.drawImage(layer, x - s, y - s, s * 2, s * 2);
        return;
      }

      if (type === "missiles") {
        /* 一串由大到小的圆，斜着飞，像游戏里的导弹尾迹 */
        const dir = Math.atan2(p.vy, p.vx) + Math.PI;
        g.globalAlpha = p.alpha * 0.9;
        for (let k = 0; k < 4; k += 1) {
          const tail = k * p.r * 0.3;
          const rr = p.r * (1 - k * 0.18);
          g.drawImage(
            layer,
            x - Math.cos(dir) * tail - rr,
            y - Math.sin(dir) * tail - rr,
            rr * 2,
            rr * 2
          );
        }
        return;
      }

      if (type === "radTris") {
        const a = Math.atan2(y - CY, x - CX);
        const s = p.r * 1.5;
        g.globalAlpha = p.alpha * 0.8;
        g.fillStyle = c.color;
        g.save();
        g.translate(x, y);
        g.rotate(a + Math.PI / 2);
        g.beginPath();
        g.moveTo(0, -s);
        g.lineTo(s * 0.86, s * 0.6);
        g.lineTo(-s * 0.86, s * 0.6);
        g.closePath();
        g.fill();
        g.restore();
        g.globalAlpha = p.alpha * 0.35;
        g.drawImage(layer, x - s, y - s, s * 2, s * 2);
        return;
      }

      /* 默认：patCircles 的圆形气泡 */
      const pulse = 1 + Math.sin(t * p.pulse + p.phase) * 0.12;
      const r = p.r * pulse * 1.1;
      g.globalAlpha = Math.min(1, p.alpha * 0.98);
      g.drawImage(bubble, x - r, y - r, r * 2, r * 2);
    });

    g.globalAlpha = 1;
  }

  /* 开场那一下：白色冲击波 */
  function drawBurst(g, k) {
    const r = (0.1 + k * 1.5) * H;
    g.globalAlpha = (1 - k) * 0.35;
    g.strokeStyle = "#ffffff";
    g.lineWidth = Math.max(2, (1 - k) * 0.02 * H);
    g.beginPath();
    g.arc(CX, CY, r, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }

  /* -------------------------------------------------------
     六、主循环
     ------------------------------------------------------- */
  let burstStart = -1;
  let px = 0;
  let py = 0;

  function frame(now) {
    if (!running) return;

    const t = (now - startTime) / 1000;

    /* 鼠标视差，缓动跟进 */
    px += (parallax.x - px) * 0.08;
    py += (parallax.y - py) * 0.08;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(px, py);

    if (base) ctx.drawImage(base, 0, 0, W, H);

    ctx.globalCompositeOperation = "lighter";
    drawParticles(ctx, t);
    ctx.globalCompositeOperation = "source-over";

    drawLines(ctx, t);

    if (burstStart >= 0) {
      const k = (now - burstStart) / 900;
      if (k >= 1) burstStart = -1;
      else drawBurst(ctx, k);
    }

    ctx.restore();

    raf = window.requestAnimationFrame(frame);
  }

  /* -------------------------------------------------------
     七、对外接口
     ------------------------------------------------------- */
  const parallax = { x: 0, y: 0 };

  function measure() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width || window.innerWidth);
    H = Math.max(1, rect.height || window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  function start() {
    measure();
    buildBase();
    buildSprites();
    buildParticles();
    startTime = performance.now();
    burstStart = performance.now();

    if (reduce) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(base, 0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      drawParticles(ctx, 0);
      ctx.globalCompositeOperation = "source-over";
      drawLines(ctx, 0);
      return;
    }

    if (!running) {
      running = true;
      raf = window.requestAnimationFrame(frame);
    }
  }

  function stop() {
    running = false;
    window.cancelAnimationFrame(raf);
  }

  const api = {
    show(id) {
      cfg = SCENES[id] || SCENES.zenith;
      visible = true;
      parallax.x = 0;
      parallax.y = 0;
      px = 0;
      py = 0;
      start();
    },
    hide() {
      visible = false;
      stop();
    },
    resize() {
      if (!visible) return;
      start();
    }
  };

  window.HNYZ_SPLASH_SCENE = api;

  /* 鼠标 / 手指在角色卡里移动时，背景轻轻跟着偏一点 */
  splash.addEventListener("pointermove", (event) => {
    if (reduce || !visible) return;
    const nx = (event.clientX / window.innerWidth - 0.5) * 2;
    const ny = (event.clientY / window.innerHeight - 0.5) * 2;
    parallax.x = nx * H * 0.018;
    parallax.y = ny * H * 0.014;
    splash.style.setProperty("--par-x", `${nx.toFixed(3)}`);
    splash.style.setProperty("--par-y", `${ny.toFixed(3)}`);
  }, { passive: true });

  splash.addEventListener("pointerleave", () => {
    parallax.x = 0;
    parallax.y = 0;
    splash.style.setProperty("--par-x", "0");
    splash.style.setProperty("--par-y", "0");
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => api.resize(), 180);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else if (visible) {
      start();
    }
  });
})();
