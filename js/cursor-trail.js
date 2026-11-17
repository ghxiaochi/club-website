/* =========================================================
   鼠标轨迹：指针走到哪，方块就撒到哪
   ---------------------------------------------------------
   学 GitHub 首页那一层，但按时间而不是按网格：
     · 帧循环里每 STEP_MS 落一个方块：指针越快，两块间距越大；
       指针停住也照样落，在原地冒出来（落点带一点随机散布）；
     · 一次只落一个，不插值、不给邻居补光，方块就是干净的方块；
     · 屏幕上同时最多 MAX 个，超出的把最老的推入快消段；
     · 颜色从 6 个高饱和色里顺序取，相邻两块必然不同色；
     · 终端风与默认皮肤才建画布，轻量档与 reduced-motion 不建。
   ========================================================= */
(function () {
  "use strict";

  var STEP_MS = 15;      /* 落块间隔：间距 = 速度 × 这个值。60Hz 下约等于每帧一块 */
  var LIFE = 1.0;        /* 每块最多活 1 秒（没被顶掉的话） */
  var FADE = 0.45;       /* 生命最后这一段开始淡出 */
  var MAX = 15;          /* 屏幕上同时存在的上限 */
  var KILL_FADE = 0.06;  /* 被顶掉时的剩余寿命：60ms 淡完，几乎看不出多出来的 */
  var JITTER = 13;        /* 原地不动时的落点散布半径，免得全叠在同一个像素 */
  var STILL_MS = 90;     /* 这么久没有新的指针事件就算"停住" */
  var SIZE = 15;         /* 方块边长（桌面） */
  var SIZE_SM = 13;      /* 手机屏窄，方块按比例收一点，不然一格占了 4% 宽 */
  var ALPHA = 0.95;

  /* 6 个色相彼此拉得开，按序取色，相邻两块不会同色。
     深色主题另备一套亮一档的变体：深底上要更亮才浮得出来，
     而页面里同时有白卡片，不能靠加色混合解决 */
  var PALETTE = ["#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b", "#22c55e"];
  var PALETTE_DARK = ["#60a5fa", "#a78bfa", "#f472b6", "#22d3ee", "#fbbf24", "#4ade80"];

  var trail = null;
  var bound = false;
  var colorAt = 0;

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
    var cut = LIFE - KILL_FADE;
    for (var i = 0; i < over; i += 1) {
      if (t.cells[i].age < cut) t.cells[i].age = cut;
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
    var x = px;
    var y = py;
    /* 移动中落点就是指针本身，轨迹才准；停住了才散开，
       否则 15 块全压在同一个像素上，只看到一块在闪色 */
    if (performance.now() - lastMoveAt > STILL_MS) {
      x += (Math.random() - 0.5) * JITTER * 2;
      y += (Math.random() - 0.5) * JITTER * 2;
    }

    t.cells.push({
      x: x,
      y: y,
      age: 0,
      ci: colorAt % PALETTE.length
    });
    colorAt += 1;

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
