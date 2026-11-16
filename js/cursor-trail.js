/* =========================================================
   终端风的鼠标轨迹
   ---------------------------------------------------------
   学 GitHub 首页 hero 底下那层网格：指针滑过的地方亮起一块彩色
   方块，停手后慢慢退掉，留下的就是一条轨迹。

   几条原则：
     · 只有终端风（html[data-style="term"]）才建画布，别的皮肤
       连 canvas 都没有，一个像素都不付；
     · 画布挂在 body 上、z-index 高于 TUI（500），靠混合模式染色：
       终端桌面是米白底，用 multiply 把方块压深；内页纸带是深底，
       用 screen 提亮。字和面板本身不变色；
     · 轻量档、极致档、prefers-reduced-motion 一律不建；
     · 没有方块可退时立刻停 rAF，鼠标停下不烧电。
   ========================================================= */
(function () {
  "use strict";

  var trail = null;
  var bound = false;
  var stampAt = 0;

  /* 终端风与默认皮肤都开：这两套的页面本身就是浅色纸带，方块压得住。
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
      cells: new Map(),
      w: 0,
      h: 0,
      cell: 46,
      cols: 1,
      rows: 1,
      raf: 0,
      last: 0,
      time: 0,
      ghostX: 0,
      ghostY: 0,
      hasGhost: false
    };

    resize();
    return trail;
  }

  function resize() {
    if (!trail) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth;
    var h = window.innerHeight;
    var cell = w < 720 ? 34 : 46;

    trail.w = w;
    trail.h = h;
    trail.cell = cell;
    trail.cols = Math.max(1, Math.ceil(w / cell));
    trail.rows = Math.max(1, Math.ceil(h / cell));
    trail.cv.width = Math.round(w * dpr);
    trail.cv.height = Math.round(h * dpr);
    trail.cv.style.width = w + "px";
    trail.cv.style.height = h + "px";
    trail.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    trail.cells.clear();
    trail.ctx.clearRect(0, 0, w, h);
  }

  /* 点亮一格。同一格重复经过只把亮度顶回去、不叠加，
     否则来回摩擦几下就糊成一团白 */
  function light(gx, gy, strength) {
    var t = trail;
    if (gx < 0 || gy < 0 || gx >= t.cols || gy >= t.rows) return;

    var key = gx + "," + gy;
    var prev = t.cells.get(key);
    if (!prev) {
      t.cells.set(key, { gx: gx, gy: gy, life: strength });
    } else if (prev.life < strength) {
      prev.life = strength;
    }
  }

  /* 从上一处滑到这一处：按半格步长插值。鼠标甩得快时，
     只按落点点灯会漏掉中间一大片，轨迹看着是断的 */
  function move(x, y) {
    var t = trail;
    if (!t) return;

    var c = t.cell;
    var px = t.hasGhost ? t.ghostX : x;
    var py = t.hasGhost ? t.ghostY : y;
    var dx = x - px;
    var dy = y - py;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.min(28, Math.max(1, Math.round(dist / (c * 0.45))));

    for (var i = 1; i <= steps; i += 1) {
      var sx = px + (dx * i) / steps;
      var sy = py + (dy * i) / steps;
      var gx = Math.floor(sx / c);
      var gy = Math.floor(sy / c);
      var near = 1 - (i / steps) * 0.4;

      light(gx, gy, near);
      /* 四邻给一点余晖：只有一条细线太薄，一格宽的轨迹更有块感 */
      light(gx - 1, gy, near * 0.34);
      light(gx + 1, gy, near * 0.34);
      light(gx, gy - 1, near * 0.34);
      light(gx, gy + 1, near * 0.34);
    }

    t.ghostX = x;
    t.ghostY = y;
    t.hasGhost = true;

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
    t.time += dt;

    var ctx = t.ctx;
    var c = t.cell;
    var pad = 2;
    /* 浅色主题是米白底（multiply，方块要深），深夜主题是深底（screen，方块要亮） */
    var dark = document.documentElement.dataset.theme === "dark";
    var lightness = dark ? 66 : 50;
    var alive = 0;

    ctx.clearRect(0, 0, t.w, t.h);

    t.cells.forEach(function (cell, key) {
      cell.life -= dt * 1.05;
      if (cell.life <= 0.02) {
        t.cells.delete(key);
        return;
      }

      alive += 1;

      var a = Math.pow(cell.life, 1.5) * 0.42;
      /* 色相跟着横坐标走：左边青、中间蓝、右边紫品，再叠一点时间上的呼吸 */
      var hue = 190 + (cell.gx / t.cols) * 108 + Math.sin(t.time * 0.8 + cell.gy * 0.35) * 8;

      ctx.fillStyle = "hsla(" + hue.toFixed(1) + ", 76%, " + lightness + "%, " + a.toFixed(3) + ")";
      ctx.fillRect(cell.gx * c + pad, cell.gy * c + pad, c - pad * 2, c - pad * 2);
    });

    if (alive) {
      t.raf = window.requestAnimationFrame(paint);
    } else {
      t.raf = 0;
      t.last = 0;
      t.hasGhost = false;
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
    trail.cells.clear();
    trail.hasGhost = false;
    trail.last = 0;
    trail.ctx.clearRect(0, 0, trail.w, trail.h);
  }

  function bind() {
    if (bound) return;
    bound = true;

    window.addEventListener("pointermove", function (e) {
      if (!trail) return;
      /* 触摸屏上拖动列表会刷得很密，按 40ms 节流 */
      if (e.pointerType === "touch") {
        var now = Date.now();
        if (now - stampAt < 40) return;
        stampAt = now;
      }
      move(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener("pointerdown", function (e) {
      if (!trail) return;
      move(e.clientX, e.clientY);
    }, { passive: true });

    /* 指针离开窗口：下一段从新位置重新起笔，别拉一条横跨屏幕的直线 */
    document.addEventListener("mouseleave", function () {
      if (trail) trail.hasGhost = false;
    });

    window.addEventListener("resize", resize);

    /* 切到后台就别画了 */
    document.addEventListener("visibilitychange", function () {
      if (!trail) return;
      if (document.hidden) {
        if (trail.raf) {
          window.cancelAnimationFrame(trail.raf);
          trail.raf = 0;
        }
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
