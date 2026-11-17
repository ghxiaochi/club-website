/* =========================================================
   鼠标轨迹：沿指针走过的路撒方块
   ---------------------------------------------------------
   学 GitHub 首页那一层，但不铺网格：
     · 每 STEP_MS 落一个方块。时间隔是固定的，手越快两块之间
       的间距就越大，慢下来自然密成一条线；
     · 一次只落一个，不插值、不给邻居补光，方块就是干净的方块；
     · 每块活 1 秒，最后 45% 生命里快速淡出；
     · 颜色从 6 个高饱和色里顺序取，相邻两块必然不同色；
     · 终端风与默认皮肤才建画布，轻量档与 reduced-motion 不建。
   ========================================================= */
(function () {
  "use strict";

  var STEP_MS = 42;   /* 两次落块的最小间隔：间距 = 速度 × 这个值 */
  var MIN_MOVE = 16;  /* 位移不到这个数不落：比方块边长再留一点缝，慢速时不会叠成一条 */
  var LIFE = 1.0;     /* 每块活 1 秒 */
  var FADE = 0.45;    /* 生命最后这一段开始淡出 */
  var SIZE = 15;      /* 方块边长（桌面） */
  var SIZE_SM = 13;   /* 手机屏窄，方块按比例收一点，不然一格占了 4% 宽 */
  var ALPHA = 0.95;

  /* 6 个色相彼此拉得开，按序取色，相邻两块不会同色。
     深色主题另备一套亮一档的变体：深底上要更亮才浮得出来，
     而页面里同时有白卡片，不能靠加色混合解决 */
  var PALETTE = ["#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b", "#22c55e"];
  var PALETTE_DARK = ["#60a5fa", "#a78bfa", "#f472b6", "#22d3ee", "#fbbf24", "#4ade80"];

  var trail = null;
  var bound = false;
  var stampAt = 0;
  var lastX = 0;
  var lastY = 0;
  var colorAt = 0;

  /* 终端风与默认皮肤都开：这两套页面本身就是浅色纸带，方块压得住。
     黑客（代码雨）与光场（iframe 舞台）自己有更强的动效，不叠加 */
  function styleOn() {
    var style = document.documentElement.dataset.style || "default";
    return style === "term" || style === "default";
  }

  function allowed() {
    if (!styleOn()) return false;
    if (document.documentElement.dataset.lite) return false;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return true;
  }

  function build() {
    if (trail) return trail;
    if (!allowed()) return null;

    var cv = document.createElement("canvas");
    cv.className = "tty-trail";
    cv.setAttribute("aria-hidden", "true");
    document.body.appendChild(cv);

    var ctx = cv.getContext("2d");
    if (!ctx) {
      cv.parentNode.removeChild(cv);
      return null;
    }

    trail = {
      cv: cv,
      ctx: ctx,
      cells: [],
      w: 0,
      h: 0,
      size: SIZE,
      raf: 0,
      last: 0
    };

    resize();
    return trail;
  }

  function resize() {
    if (!trail) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth;
    var h = window.innerHeight;

    trail.w = w;
    trail.h = h;
    trail.size = w < 720 ? SIZE_SM : SIZE;
    trail.cv.width = Math.round(w * dpr);
    trail.cv.height = Math.round(h * dpr);
    trail.cv.style.width = w + "px";
    trail.cv.style.height = h + "px";
    trail.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    trail.cells.length = 0;
    trail.ctx.clearRect(0, 0, w, h);
  }

  /* 落一个方块。时间到、并且确实挪了位置才落 ——
     只按时间节流的话，手停在原地也会一直叠 */
  function stamp(x, y) {
    var t = trail;
    if (!t) return;

    var now = performance.now();
    if (now - stampAt < STEP_MS) return;

    var dx = x - lastX;
    var dy = y - lastY;
    if (Math.sqrt(dx * dx + dy * dy) < MIN_MOVE) return;

    stampAt = now;
    lastX = x;
    lastY = y;

    t.cells.push({
      x: x,
      y: y,
      age: 0,
      ci: colorAt % PALETTE.length
    });
    colorAt += 1;

    if (!t.raf) {
      t.last = 0;
      t.raf = window.requestAnimationFrame(paint);
    }
  }

  function paint(now) {
    var t = trail;
    if (!t) return;

    var dt = t.last ? Math.min(0.05, (now - t.last) / 1000) : 0.016;
    t.last = now;

    var ctx = t.ctx;
    var dark = document.documentElement.dataset.theme === "dark";
    var palette = dark ? PALETTE_DARK : PALETTE;

    ctx.clearRect(0, 0, t.w, t.h);
    /* 一律普通叠加。加色（lighter）只要底下是白卡片就等于没画——
       深色主题的页面里白卡片正是主体，所以不能用它 */
    ctx.globalCompositeOperation = "source-over";

    var alive = 0;
    for (var i = t.cells.length - 1; i >= 0; i -= 1) {
      var cell = t.cells[i];
      cell.age += dt;

      if (cell.age >= LIFE) {
        t.cells.splice(i, 1);
        continue;
      }

      alive += 1;

      /* 前 55% 生命保持实色，剩下的快速淡掉 */
      var left = 1 - cell.age / LIFE;
      var a = (left >= FADE ? 1 : left / FADE) * ALPHA;

      ctx.globalAlpha = a;
      ctx.fillStyle = palette[cell.ci];
      ctx.fillRect(cell.x - t.size / 2, cell.y - t.size / 2, t.size, t.size);
    }

    ctx.globalAlpha = 1;

    if (alive) {
      t.raf = window.requestAnimationFrame(paint);
    } else {
      t.raf = 0;
      t.last = 0;
      ctx.clearRect(0, 0, t.w, t.h);
    }
  }

  function start() {
    if (!allowed()) return;
    if (!build()) return;
    resize();
  }

  function stop() {
    if (!trail) return;
    if (trail.raf) {
      window.cancelAnimationFrame(trail.raf);
      trail.raf = 0;
    }
    trail.cells.length = 0;
    trail.last = 0;
    trail.ctx.clearRect(0, 0, trail.w, trail.h);
  }

  function bind() {
    if (bound) return;
    bound = true;

    window.addEventListener("pointermove", function (e) {
      if (!trail) return;
      stamp(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener("pointerdown", function (e) {
      if (!trail) return;
      stamp(e.clientX, e.clientY);
    }, { passive: true });

    /* 触摸滑动的第二条通道。手机上浏览器一接管滚动手势就发
       pointercancel，此后 pointermove 全停（实测一次 0.6 秒的滑动
       只来 2 次 pointermove、1 次 pointercancel，而 touchmove 来 31 次），
       所以只挂 pointermove 的话移动端等于没有轨迹。
       两条路都走 stamp，STEP_MS 的时间闸会把重复的挡掉，不会叠块 */
    function onTouch(e) {
      if (!trail) return;
      var t = e.touches && e.touches[0];
      if (t) stamp(t.clientX, t.clientY);
    }

    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });

    window.addEventListener("resize", resize);

    document.addEventListener("visibilitychange", function () {
      if (!trail) return;
      if (document.hidden && trail.raf) {
        window.cancelAnimationFrame(trail.raf);
        trail.raf = 0;
      }
    });
  }

  function sync() {
    if (allowed()) {
      bind();
      start();
    } else {
      stop();
    }
  }

  document.addEventListener("hnyz:stylechange", sync);
  document.addEventListener("hnyz:lite", sync);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }

  window.HNYZTRAIL = { sync: sync };
})();
