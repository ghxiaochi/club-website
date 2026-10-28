/* =========================================================
   HNYZ · 黑客风的数字雨
   ---------------------------------------------------------
   只在 hacker 皮肤下启动：
     - 全屏 fixed 画布，压在内容之下、页面背景之上
     - 每列一串字符往下掉，用 destination-out 逐帧擦淡，
       所以背景仍是透明的，不会盖住正文
     - 限制到 24fps，页面不可见 / 减少动效 / 切走皮肤就停
   ========================================================= */

(() => {
  "use strict";

  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const CHARS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789<>[]{}#$*+-";
  const FONT = 14;
  const FRAME_MS = 1000 / 26;

  const canvas = document.createElement("canvas");
  canvas.className = "matrix-rain";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let columns = [];
  let raf = 0;
  let running = false;
  let last = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(12, Math.round(W / FONT));
    columns = Array.from({ length: count }, (_, i) => ({
      x: i * FONT,
      y: -Math.random() * H,
      speed: 62 + Math.random() * 118,
      size: FONT,
      bright: Math.random() < 0.12
    }));
  }

  function draw(dt) {
    /* 先把上一帧淡掉一点，字符就有了拖尾 */
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0, 0, 0, 0.055)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";

    ctx.font = `${FONT}px "JetBrains Mono", "Cascadia Mono", Consolas, monospace`;
    ctx.textBaseline = "top";

    columns.forEach((col) => {
      const char = CHARS[(Math.random() * CHARS.length) | 0];

      if (col.bright) {
        ctx.fillStyle = "rgba(205, 255, 225, 0.9)";
      } else {
        ctx.fillStyle = "rgba(57, 255, 136, 0.58)";
      }
      ctx.fillText(char, col.x, col.y);

      col.y += col.speed * dt;
      if (col.y > H + 40) {
        col.y = -40 - Math.random() * 240;
        col.speed = 62 + Math.random() * 118;
        col.bright = Math.random() < 0.12;
      }
    });
  }

  function frame(now) {
    if (!running) return;
    raf = window.requestAnimationFrame(frame);

    if (now - last < FRAME_MS) return;
    const dt = Math.min(0.12, (now - last) / 1000);
    last = now;
    draw(dt);
  }

  function start() {
    if (running || reduce.matches) return;
    if (root.dataset.style !== "hacker") return;
    if (document.hidden) return;
    running = true;
    last = 0;
    canvas.classList.add("is-on");
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    window.cancelAnimationFrame(raf);
    canvas.classList.remove("is-on");
    ctx.clearRect(0, 0, W, H);
  }

  function sync() {
    if (root.dataset.style === "hacker" && !reduce.matches && !document.hidden) start();
    else stop();
  }

  document.addEventListener("hnyz:stylechange", () => {
    resize();
    sync();
  });

  document.addEventListener("visibilitychange", sync);
  reduce.addEventListener("change", sync);

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!running) return;
      resize();
    }, 180);
  }, { passive: true });

  resize();
  sync();
})();
