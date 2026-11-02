/* =========================================================
   HNYZ · 点击反馈
   ---------------------------------------------------------
   一个很轻的圆环：从落点扩到 30px 左右就消失。
   没有火花、没有闪光，只给点击一个安静的回应。
   平时画布宽高为 0，动画结束就回收，不常驻合成层。
   ========================================================= */

(() => {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "click-fx";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.display = "none";
  canvas.width = 0;
  canvas.height = 0;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const LIFE = 0.46;
  const MAX = 4;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let raf = 0;
  let running = false;

  const bursts = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  function ensureCanvas() {
    if (!canvas.width) {
      resize();
      canvas.style.display = "block";
    }
  }

  function restCanvas() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
    canvas.style.display = "none";
  }

  function color() {
    return document.documentElement.dataset.theme === "dark"
      ? "125, 211, 252"
      : "37, 99, 235";
  }

  function add(x, y) {
    ensureCanvas();
    bursts.push({ x, y, t: performance.now(), rgb: color() });
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
      const k = (now - b.t) / 1000 / LIFE;
      if (k >= 1) return;

      alive += 1;

      /* 一圈很细的线，扩到 30px 就淡掉 */
      const radius = 5 + k * 30;
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.lineWidth = 1.4 * (1 - k) + 0.3;
      ctx.strokeStyle = `rgba(${b.rgb}, ${0.5 * (1 - k)})`;
      ctx.stroke();
    });

    if (alive > 0) {
      raf = window.requestAnimationFrame(frame);
    } else {
      bursts.length = 0;
      running = false;
      restCanvas();
    }
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.target && event.target.closest && event.target.closest("[data-theme-toggle]")) return;
      add(event.clientX, event.clientY);
    },
    { passive: true, capture: true }
  );

  window.addEventListener("resize", () => {
    if (canvas.width) resize();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden || !running) return;
    window.cancelAnimationFrame(raf);
    running = false;
    bursts.length = 0;
    restCanvas();
  });
})();
