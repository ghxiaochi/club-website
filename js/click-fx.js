/* =========================================================
   HNYZ · 点击反馈
   ---------------------------------------------------------
   全站任何位置按下鼠标 / 手指，都会在落点炸一圈细环和几颗
   小火星；颜色跟着主题走（浅色蓝、深色青）。
   只用一个固定 canvas，动画结束就停 rAF，不常驻耗电。
   ========================================================= */

(() => {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "click-fx";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let raf = 0;
  let running = false;

  const bursts = [];
  const MAX = 6;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  resize();
  window.addEventListener("resize", resize);

  function palette() {
    return document.documentElement.dataset.theme === "dark"
      ? ["#7dd3fc", "#38bdf8", "#e0f2fe"]
      : ["#2563eb", "#38bdf8", "#93c5fd"];
  }

  function add(x, y) {
    bursts.push({
      x,
      y,
      t: performance.now(),
      seed: Math.random() * Math.PI * 2,
      colors: palette(),
      big: Math.random() < 0.18
    });

    if (bursts.length > MAX) bursts.shift();

    if (!running) {
      running = true;
      raf = window.requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    let alive = 0;

    bursts.forEach((b) => {
      const age = (now - b.t) / 1000;
      const life = 0.8;
      if (age > life) return;

      alive += 1;
      const k = age / life;
      const fade = 1 - k;
      const scale = b.big ? 1.45 : 1;

      /* 外圈：细环迅速扩大 */
      const ring = (9 + k * 38) * scale;
      ctx.beginPath();
      ctx.arc(b.x, b.y, ring, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(0.6, 2.6 * fade);
      ctx.strokeStyle = b.colors[0];
      ctx.globalAlpha = fade * 0.75;
      ctx.stroke();

      /* 内圈：慢半拍的小环 */
      if (k > 0.14) {
        const inner = (2 + (k - 0.14) * 16) * scale;
        ctx.beginPath();
        ctx.arc(b.x, b.y, inner, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(0.4, 1.2 * fade);
        ctx.strokeStyle = b.colors[2];
        ctx.globalAlpha = fade * 0.5;
        ctx.stroke();
      }

      /* 八颗火星，带一点重力 */
      const count = b.big ? 12 : 9;
      for (let i = 0; i < count; i += 1) {
        const angle = b.seed + (i / count) * Math.PI * 2;
        const travel = (12 + k * 72) * (0.75 + ((i * 7) % 5) * 0.09) * scale;
        const px = b.x + Math.cos(angle) * travel;
        const py = b.y + Math.sin(angle) * travel + k * k * 26;
        const r = Math.max(0.5, (3 - k * 2.4) * scale);

        ctx.globalAlpha = fade * 0.9;
        ctx.fillStyle = b.colors[i % b.colors.length];
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      /* 中心亮一下 */
      if (k < 0.22) {
        ctx.globalAlpha = (1 - k / 0.22) * 0.85;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3.4 * scale * (1 - k / 0.22) + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      /* 正中心的小十字，像火花 */
      ctx.globalAlpha = fade * 0.85;
      ctx.strokeStyle = b.colors[2];
      ctx.lineWidth = 1;
      const arm = (5 + k * 10) * scale;
      ctx.beginPath();
      ctx.moveTo(b.x - arm, b.y);
      ctx.lineTo(b.x + arm, b.y);
      ctx.moveTo(b.x, b.y - arm);
      ctx.lineTo(b.x, b.y + arm);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;

    if (alive > 0) {
      raf = window.requestAnimationFrame(frame);
    } else {
      bursts.length = 0;
      running = false;
      ctx.clearRect(0, 0, W, H);
    }
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      /* 主题按钮有自己的圆环 + 圆形转场，不再叠一层 */
      if (event.target && event.target.closest && event.target.closest("[data-theme-toggle]")) return;
      add(event.clientX, event.clientY);
    },
    { passive: true, capture: true }
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) {
      window.cancelAnimationFrame(raf);
      running = false;
      bursts.length = 0;
      ctx.clearRect(0, 0, W, H);
    }
  });
})();
