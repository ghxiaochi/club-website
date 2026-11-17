/* =========================================================
   鼠标轨迹：指针走到哪，方块就撒到哪
   ---------------------------------------------------------
   学 GitHub 首页那一层，但按时间而不是按网格：
     · 帧循环里每 STEP_MS 落一个方块：指针越快，两块间距越大；
       指针停住也照样落，落点在一圈半径里均匀撒开，还带一点
       向外的漂移，所以看起来是"一把彩色纸屑撒出去"；
     · 移动中只给垂直方向的小抖动，轨迹是一条有宽度的彩带；
     · 一次只落一个，不插值、不给邻居补光，方块就是干净的方块；
     · 屏幕上同时最多 MAX 个，超出的把最老的推入快消段；
     · 每块的尺寸和寿命都带随机，不会整排一起消失；
     · 颜色从 6 个高饱和色里顺序取，相邻两块必然不同色；
     · 终端风与默认皮肤才建画布，轻量档与 reduced-motion 不建。
   ========================================================= */
(function () {
  "use strict";

  var STEP_MS = 15;      /* 落块间隔：间距 = 速度 × 这个值。60Hz 下约等于每帧一块 */
  var LIFE = 1.0;        /* 每块最多活 1 秒（没被顶掉的话） */
  var LIFE_JITTER = 0.22;/* 寿命随机浮动：别让 15 块整齐地一起消失 */
  var FADE = 0.45;       /* 生命最后这一段开始淡出 */
  var MAX = 15;          /* 屏幕上同时存在的上限 */
  var KILL_FADE = 0.06;  /* 被顶掉时的剩余寿命：60ms 淡完，几乎看不出多出来的 */
  var JITTER = 78;       /* 停住时的落点散布半径：方块像一把撒开的彩纸，不是一坨 */
  var MOVE_JITTER = 15;  /* 移动中的横向抖动：轨迹是一条有宽度的带，不是一条线 */
  var SPREAD = 42;       /* 停住时落点的外扩速度（px/s），云团会慢慢胀开 */
  var STILL_MS = 90;     /* 这么久没有新的指针事件就算"停住" */
  var SIZE = 15;         /* 方块边长（桌面） */
  var SIZE_SM = 13;      /* 手机屏窄，方块按比例收一点，不然一格占了 4% 宽 */
  var SIZE_JITTER = 0.42;/* 单块尺寸浮动比例：有大有小，云才有层次 */
  var ALPHA = 0.95;

  /* 6 个色相彼此拉得开，按序取色，相邻两块不会同色。
     深色主题另备一套亮一档的变体：深底上要更亮才浮得出来，
     而页面里同时有白卡片，不能靠加色混合解决 */
  var PALETTE = ["#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b", "#22c55e"];
  var PALETTE_DARK = ["#60a5fa", "#a78bfa", "#f472b6", "#22d3ee", "#fbbf24", "#4ade80"];

  var trail = null;
  var bound = false;
  var lastCi = -1;

  /* 指针的最后位置与「在不在页面上」。鼠标静止时浏览器不再发
     pointermove，所以生成不能挂在事件上，只能挂在帧循环里读这两个值 */
  var px = 0;
  var py = 0;
  var onPage = false;
  var lastMoveAt = 0;

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
      jitter: JITTER,
      raf: 0,
      last: 0,
      stampAt: 0
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
    /* 手机屏窄，撒开的半径也收一档，不然一朵云占了三分之一屏宽 */
    trail.jitter = w < 720 ? JITTER * 0.62 : JITTER;
    trail.cv.width = Math.round(w * dpr);
    trail.cv.height = Math.round(h * dpr);
    trail.cv.style.width = w + "px";
    trail.cv.style.height = h + "px";
    trail.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    trail.cells.length = 0;
    trail.ctx.clearRect(0, 0, w, h);
  }

  /* 超出上限就把最老的推入快消段，而不是硬删 —— 硬删会出现
     "方块啪一下没了"，推入淡出段则是 60ms 内收干净。
     被推的方块几乎立刻消失，实色块的数量始终是 MAX 个 */
  function trim(t) {
    var over = t.cells.length - MAX;
    if (over <= 0) return;
    for (var i = 0; i < over; i += 1) {
      var c = t.cells[i];
      var cut = c.life - KILL_FADE;
      if (c.age < cut) c.age = cut;
    }
  }

  /* 指针压在 iframe（成员页那个播放器）上时，父页面收不到
     pointermove，位置会卡在边界上一直冒方块。命中测试很便宜，
     每次落块前问一句就够了 */
  function overFrame() {
    var el = document.elementFromPoint(px, py);
    return !!el && el.tagName === "IFRAME";
  }

  function spawn(t) {
    var still = performance.now() - lastMoveAt > STILL_MS;
    var x = px;
    var y = py;
    var vx = 0;
    var vy = 0;

    if (still) {
      /* 停住：按极坐标均匀撒开（半径取开方，圆面上才均布，
         否则全挤在圆心附近）。同时给一点向外的速度，
         方块会从落点继续往外飘几十像素，云团是活的 */
      var ang = Math.random() * Math.PI * 2;
      var rad = Math.sqrt(Math.random()) * t.jitter;
      x += Math.cos(ang) * rad;
      y += Math.sin(ang) * rad;
      var push = SPREAD * (0.35 + Math.random() * 0.9);
      vx = Math.cos(ang) * push;
      vy = Math.sin(ang) * push;
    } else {
      /* 移动中：只给垂直方向的小抖动，轨迹才是一条有宽度的彩带，
         而不是一根用尺子画出来的直线。抖动幅度也随速度走一点，
         快滑时块散得开，慢移时贴着线走 */
      x += (Math.random() - 0.5) * MOVE_JITTER * 2;
      y += (Math.random() - 0.5) * MOVE_JITTER * 2;
    }

    /* 落在屏幕外半个方块很丑（手机贴边停住时尤其明显），
       落点先夹回可视区，留一点边距 */
    var pad = t.size;
    if (x < pad) x = pad; else if (x > t.w - pad) x = t.w - pad;
    if (y < pad) y = pad; else if (y > t.h - pad) y = t.h - pad;

    var life = LIFE * (1 - LIFE_JITTER / 2 + Math.random() * LIFE_JITTER);

    /* 取色不再严格轮换：轮换出来是一条规整的彩虹，太有规律。
       随机取，只保证不跟上一块撞色，跳色才像撒纸屑 */
    var ci = Math.floor(Math.random() * PALETTE.length);
    if (ci === lastCi) ci = (ci + 1 + Math.floor(Math.random() * (PALETTE.length - 1))) % PALETTE.length;
    lastCi = ci;

    t.cells.push({
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      age: 0,
      life: life,
      size: t.size * (1 - SIZE_JITTER / 2 + Math.random() * SIZE_JITTER),
      ci: ci
    });

    trim(t);
  }

  function frame(now) {
    var t = trail;
    if (!t) return;

    var dt = t.last ? Math.min(0.05, (now - t.last) / 1000) : 0.016;
    t.last = now;

    /* 生成放在这里而不是 pointermove 里：鼠标停住时浏览器一个事件
       都不发，挂事件的写法等不到下一块 */
    if (onPage && now - t.stampAt >= STEP_MS) {
      if (overFrame()) {
        onPage = false;
      } else {
        t.stampAt = now;
        spawn(t);
      }
    }

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

      if (cell.age >= cell.life) {
        t.cells.splice(i, 1);
        continue;
      }

      alive += 1;

      /* 前 55% 生命保持实色，剩下的快速淡掉 */
      var left = 1 - cell.age / cell.life;
      var a = (left >= FADE ? 1 : left / FADE) * ALPHA;

      /* 带一点漂移：停住时方块从落点继续往外走，
         看起来是"撒出去"而不是"钉在格子上" */
      var cx = cell.x + cell.vx * cell.age;
      var cy = cell.y + cell.vy * cell.age;
      /* 消散时连尺寸一起收，比只降透明度更像"散掉" */
      var s = cell.size * (0.68 + 0.32 * left);

      ctx.globalAlpha = a;
      ctx.fillStyle = palette[cell.ci];
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    }

    ctx.globalAlpha = 1;

    /* 指针还在页面上就一直转：停住时也要持续冒方块 */
    if (alive || onPage) {
      t.raf = window.requestAnimationFrame(frame);
    } else {
      t.raf = 0;
      t.last = 0;
      ctx.clearRect(0, 0, t.w, t.h);
    }
  }

  function wake() {
    if (!trail) return;
    if (!trail.raf) {
      trail.last = 0;
      trail.raf = window.requestAnimationFrame(frame);
    }
  }

  function start() {
    if (!allowed()) return;
    if (!build()) return;
    resize();
    wake();
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

    function track(e) {
      px = e.clientX;
      py = e.clientY;
      onPage = true;
      lastMoveAt = performance.now();
      wake();
    }

    window.addEventListener("pointermove", track, { passive: true });
    window.addEventListener("pointerdown", track, { passive: true });

    /* 触摸的独立通道：手机上浏览器一接管滚动手势就发 pointercancel，
       此后 pointermove 全停（实测一次 0.6 秒的滑动：pointermove 2 次、
       touchmove 31 次），只挂 pointermove 的话移动端等于没有轨迹 */
    function trackTouch(e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      px = t.clientX;
      py = t.clientY;
      onPage = true;
      lastMoveAt = performance.now();
      wake();
    }

    window.addEventListener("touchstart", trackTouch, { passive: true });
    window.addEventListener("touchmove", trackTouch, { passive: true });

    /* 手指抬起、指针移出窗口：停手。方块按自己的寿命淡完，不再补新块 */
    window.addEventListener("touchend", function (e) {
      if (!e.touches || !e.touches.length) onPage = false;
    }, { passive: true });
    window.addEventListener("touchcancel", function () {
      onPage = false;
    }, { passive: true });

    document.addEventListener("mouseleave", function () {
      onPage = false;
    });

    window.addEventListener("resize", resize);

    document.addEventListener("visibilitychange", function () {
      if (!trail) return;
      if (document.hidden && trail.raf) {
        window.cancelAnimationFrame(trail.raf);
        trail.raf = 0;
      } else if (!document.hidden) {
        onPage = false;   /* 切回来先不冒，等下一次指针事件重新定位 */
        wake();
      }
    });
  }

  function sync() {
    if (allowed()) {
      bind();
      start();
    } else {
      onPage = false;
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
