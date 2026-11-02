/* =========================================================
   HNYZ · 黑客风的代码雨
   ---------------------------------------------------------
   只在 hacker 皮肤下启动：
     - 全屏 fixed 画布，压在内容之下、页面背景之上
     - 每列一串字符沿着一格一格往下走（不是连续拖动），
       字落在格子里才清晰；用 destination-out 逐帧擦淡，
       所以背景仍是透明的，不会盖住正文
     - 三档景深：远列细、暗、慢，近列粗、亮、快，
       叠起来才有雨幕的层次，而不是一排同样的字
     - 近列的字符带一点辉光，像刚被解码出来
     - 限制到 30fps，页面不可见 / 减少动效 / 切走皮肤就停
   ========================================================= */

(() => {
  "use strict";

  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const CHARS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789<>[]{}#$*+-=/\\|";
  const FONT = 15;
  const COL_W = 14;
  const FRAME_MS = 1000 / 30;
  /* 每帧擦掉的比例：越小尾巴越长 */
  const FADE = 0.105;

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

  function randomChar() {
    return CHARS[(Math.random() * CHARS.length) | 0];
  }

  function resetColumn(col, atTop) {
    /* depth 0 = 远景，1 = 贴脸。远景细、暗、慢 */
    col.depth = Math.random();
    col.size = 13 + col.depth * 5;
    col.lh = col.size * 1.04;
    col.speed = (98 + Math.random() * 104) * (0.55 + col.depth * 0.85);
    col.glow = col.depth > 0.5;
    col.y = atTop ? -60 - Math.random() * H * 0.8 : -Math.random() * H * 1.4;
    col.cell = Math.floor(col.y / col.lh);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(16, Math.round(W / COL_W));
    columns = Array.from({ length: count }, (_, i) => {
      const col = { x: i * COL_W + (Math.random() * 3 - 1.5) };
      resetColumn(col, false);
      return col;
    });
  }

  function draw(dt) {
    /* 先把上一帧淡掉一点，字符就有了拖尾 */
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0, 0, 0, ${FADE})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";

    const light = root.dataset.theme === "light";
    const ink = light ? [9, 116, 58] : [70, 255, 148];
    const head = light ? [4, 46, 24] : [232, 255, 242];

    ctx.textBaseline = "top";

    columns.forEach((col) => {
      col.y += col.speed * dt;

      /* 只在新跨过一格时落一个字：字卡在格子里才不糊 */
      const nextCell = Math.floor(col.y / col.lh);
      if (nextCell === col.cell) return;

      /* 越近的字越白、越实 */
      const t = Math.pow(col.depth, 1.7);
      const r = Math.round(ink[0] + (head[0] - ink[0]) * t);
      const g = Math.round(ink[1] + (head[1] - ink[1]) * t);
      const b = Math.round(ink[2] + (head[2] - ink[2]) * t);

      ctx.font = `${col.size.toFixed(1)}px "JetBrains Mono", "Cascadia Mono", Consolas, monospace`;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.5 + col.depth * 0.46).toFixed(2)})`;

      if (col.glow) {
        ctx.shadowColor = light ? "rgba(9, 143, 74, 0.5)" : "rgba(57, 255, 136, 0.7)";
        ctx.shadowBlur = 8 + col.depth * 6;
      }

      /* 一帧跨了几格就补几个字，避免高速列断成虚线 */
      let cell = col.cell;
      while (cell < nextCell) {
        cell += 1;
        ctx.fillText(randomChar(), col.x, cell * col.lh);
      }

      ctx.shadowBlur = 0;
      col.cell = nextCell;

      if (col.cell * col.lh > H + 60) resetColumn(col, true);
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
