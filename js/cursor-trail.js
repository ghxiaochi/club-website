/* =========================================================
   鼠标轨迹：指针走到哪，方块就撒到哪
   ---------------------------------------------------------
   学 GitHub 首页那一层，但按时间而不是按网格：
     · 帧循环里按节奏落方块：移动中 70ms 一块，间距 = 速度 × 0.07s，
       指针越快两块隔得越远；停住后换成 190ms 一块的慢节拍；
     · 移动中只沿轨迹法线做几像素的起伏，整条轨迹看得清；
       停住时只在原地小幅抖动，不扩散、不漂移；
     · 一次只落一个，不插值、不给邻居补光，方块就是干净的方块；
     · 屏幕上同时最多 MAX（6）个，到顶先挤掉最老的再放新的，
       数组长度永远 ≤ MAX，画出来就是严格的 6 块；
     · 每块活 0.8 秒，尺寸与寿命都带随机，不会整排一起消失；
     · 颜色取 GitHub Primer 的那六个亮色，随机取、不与上一块撞色；
     · 终端风与默认皮肤才建画布，轻量档与 reduced-motion 不建。
   ========================================================= */
(function () {
  "use strict";

  var STEP_MOVE = 70;    /* 移动中的落块间隔：间距 = 速度 × 这个值，0.07s 时 1200px/s 大约 84px 一块 */
  var STEP_STILL = 190;  /* 停住时的落块间隔：慢半拍，不然一堆方块在原地不停闪 */
  var STEP_JITTER = 0.3; /* 间隔也带随机，别像节拍器一样一下一下 */
  var LIFE = 0.8;        /* 每块活 0.8 秒 */
  var LIFE_JITTER = 0.16;/* 寿命随机浮动：6 块不会整齐地一起消失 */
  var FADE = 0.45;       /* 生命最后这一段开始淡出 */
  var MAX = 6;           /* 屏幕上同时存在的上限 */
  var JITTER = 12;       /* 停住时的原地抖动半径：让 6 块略微错开，不至于严丝合缝叠成一块 */
  var MOVE_JITTER = 4;   /* 移动中的基础起伏，只够让轨迹有呼吸感 */
  var MOVE_MAX = 5;      /* 速度加成上限：再快也只到 ±9px，轨迹始终清晰 */
  var STILL_MS = 120;    /* 这么久没有新的指针事件就算"停住"（要大于落块间隔，否则慢移也会被当成停住） */
  var SIZE = 12;         /* 方块边长（桌面） */
  var SIZE_SM = 10;      /* 手机屏窄，方块按比例收一点，不然一格占了 3% 宽 */
  var SIZE_JITTER = 0.42;/* 单块尺寸浮动比例：有大有小，看起来才不是复制粘贴 */
  var ALPHA = 0.82;

  /* GitHub Primer 的六个亮色：蓝紫粉绿橙青，色相彼此拉得开。
     深色主题另备一套亮一档的变体：深底上要更亮才浮得出来，
     而页面里同时有白卡片，不能靠加色混合解决 */
  var PALETTE = ["#4493f8", "#a371f7", "#db61a2", "#3fb950", "#f0883e", "#39c5cf"];
  var PALETTE_DARK = ["#6cb6ff", "#bf8fff", "#f778ba", "#56d364", "#ffa657", "#56d4dd"];

  var trail = null;
  var bound = false;
  var lastCi = -1;

  /* 指针的最后位置与「在不在页面上」。鼠标静止时浏览器不再发
     pointermove，所以生成不能挂在事件上，只能挂在帧循环里读这两个值 */
  var px = 0;
  var py = 0;
  var onPage = false;
  var lastMoveAt = 0;

  /* 指针速度：移动中的抖动幅度跟着它走（快滑时甩得更开），
     也用它算"垂直于运动方向"那根轴 */
  var mvx = 0;
  var mvy = 0;
  var lastTx = 0;
  var lastTy = 0;
  var lastTt = 0;

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
      nextAt: 0
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

    if (still) {
      /* 停住就只在原地小幅抖一下：不扩散、不往外飘，
         方块就是一个个从光标底下冒出来，位置基本不变 */
      x += (Math.random() - 0.5) * JITTER * 2;
      y += (Math.random() - 0.5) * JITTER * 2;
    } else {
      /* 移动中只沿垂直于运动方向起伏：轨迹有轻微的上下波动，
         但每一块都严格落在路径的那条线上（切向不加偏移），
         所以整条轨迹看得清、不会散成一团 */
      var sp = Math.sqrt(mvx * mvx + mvy * mvy);
      var amp = MOVE_JITTER + Math.min(MOVE_MAX, sp / 140);
      var off = (Math.random() - 0.5) * 2 * amp;

      if (sp > 8) {
        x += (-mvy / sp) * off;
        y += (mvx / sp) * off;
      } else {
        y += off;   /* 方向还没测出来就先只上下抖 */
      }
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

    /* 到顶了先挤掉最老的再放新的：数组长度永远 ≤ MAX，
       画到屏幕上就是严格的 6 块。被挤的那块已经活到 0.74s，
       alpha 只剩 0.16，直接拿掉看不出来（推入快消反而会多画一帧第 9 块） */
    if (t.cells.length >= MAX) t.cells.shift();

    t.cells.push({
      x: x,
      y: y,
      age: 0,
      life: life,
      size: t.size * (1 - SIZE_JITTER / 2 + Math.random() * SIZE_JITTER),
      ci: ci
    });
  }

  function frame(now) {
    var t = trail;
    if (!t) return;

    var dt = t.last ? Math.min(0.05, (now - t.last) / 1000) : 0.016;
    t.last = now;

    /* 生成放在这里而不是 pointermove 里：鼠标停住时浏览器一个事件
       都不发，挂事件的写法等不到下一块 */
    if (onPage && now >= t.nextAt) {
      if (overFrame()) {
        onPage = false;
      } else {
        spawn(t);
        /* 移动中按速度节奏落块，停住就换慢节拍；间隔本身也抖一下，别像节拍器 */
        var step = (now - lastMoveAt > STILL_MS) ? STEP_STILL : STEP_MOVE;
        t.nextAt = now + step * (1 - STEP_JITTER / 2 + Math.random() * STEP_JITTER);
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

      /* 方块不漂移：落点就是它这一辈子的位置，只在原地消失 */
      /* 消散时连尺寸一起收，比只降透明度更像"散掉" */
      var s = cell.size * (0.68 + 0.32 * left);

      ctx.globalAlpha = a;
      ctx.fillStyle = palette[cell.ci];
      ctx.fillRect(cell.x - s / 2, cell.y - s / 2, s, s);
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

    /* 平滑后的指针速度，移动中的抖动幅度要用它 */
    function measure(x, y, now) {
      if (lastTt) {
        var dt = (now - lastTt) / 1000;
        if (dt > 0.001 && dt < 0.25) {
          mvx += ((x - lastTx) / dt - mvx) * 0.4;
          mvy += ((y - lastTy) / dt - mvy) * 0.4;
        } else {
          mvx = 0;
          mvy = 0;
        }
      }
      lastTx = x;
      lastTy = y;
      lastTt = now;
    }

    function track(e) {
      var now = performance.now();
      px = e.clientX;
      py = e.clientY;
      onPage = true;
      lastMoveAt = now;
      measure(px, py, now);
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
      var now = performance.now();
      px = t.clientX;
      py = t.clientY;
      onPage = true;
      lastMoveAt = now;
      measure(px, py, now);
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
