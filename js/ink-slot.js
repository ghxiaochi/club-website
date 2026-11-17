/* =========================================================
   染色区：一片挂在视口右边的小墨槽
   ---------------------------------------------------------
   默认整站没有轨迹。指针从这条墨槽上划过（或点一下、
   键盘聚焦一下），就算「蘸了墨」，之后指针走过的地方才会
   留下彩色方块；墨水按秒消耗，用完就回到没有轨迹的状态，
   回来再蘸一次。

   为什么挂在右边：左下角是桌宠、右下角是校徽，四个角都
   占着；一条竖槽离右边缘留 10px 缝浮着，不压正文，任何页面
   任何皮肤都在同一个位置。

   触屏（手机、平板、触摸本）同样显示这条槽，也默认没有墨：
   手指点一下、或者从槽上划过去，才算蘸上，跟桌面一个规则。
   计时只在手指真的在屏幕上动的时候走；手指一抬就停住 ——
   墨水是用来画画的，不该在没人用的时候自己流干。

   整块东西不带文字提示，也不自己晃、不自己呼吸：空着的时候
   六格留着六色的淡影，每 6 秒从第一格到第六格依次亮一遍再退回去，
   全满后静止三秒多，用状态本身说话。
   ========================================================= */
(function () {
  "use strict";

  var INK_MS = 12000;      /* 一槽墨能烧 12 秒 */
  var IDLE_MS = 260;       /* 触屏上停手这么久就暂停计时 */
  var STORE = "hnyz:ink";  /* sessionStorage：换页时把剩下的墨带过去 */
  var COLORS = ["#4493f8", "#a371f7", "#db61a2", "#3fb950", "#f0883e", "#39c5cf"];

  var left = 0;            /* 剩余毫秒 */
  var touchMode = false;   /* 触屏：手指没碰屏幕时不计时 */
  var lastAct = 0;         /* 上一次触摸/点击/滚动的时刻 */
  var el = null;
  var wells = [];
  var gaugeFill = null;
  var raf = 0;
  var lastTs = 0;
  var shownPct = -1;
  var shownLit = -1;     /* 上一帧亮着几格：只在格数变化时动 DOM */
  var shownArmed = null; /* 上一帧是否蘸着墨 */
  var listening = [];

  function now() { return Date.now(); }

  /* 手指有没有落在槽上（含 10px 热区，触摸本来就没那么准） */
  function inSlot(x, y) {
    if (!el || !isFinite(x) || !isFinite(y)) return false;
    var r = el.getBoundingClientRect();
    return x >= r.left - 10 && x <= r.right + 10 &&
           y >= r.top - 10 && y <= r.bottom + 10;
  }

  function isTouch() {
    var mq = window.matchMedia;
    if (!mq) return false;
    /* 只看输入方式，不看宽度：横过来的手机、平板、
       触摸本都可能宽过 720，也不该让墨自己往下烧 */
    return mq("(hover: none) and (pointer: coarse)").matches;
  }

  function readStore() {
    try {
      var raw = window.sessionStorage.getItem(STORE);
      if (!raw) return 0;
      var parts = raw.split("|");
      var val = parseFloat(parts[0]) || 0;
      var at = parseFloat(parts[1]) || 0;
      if (!val || !at) return 0;
      var gone = now() - at;
      if (gone < 0 || gone >= val) return 0;
      return val - gone;
    } catch (e) {
      return 0;
    }
  }

  function writeStore() {
    try {
      window.sessionStorage.setItem(STORE, Math.round(left) + "|" + now());
    } catch (e) { /* 无痕模式里写不进去也不影响本次会话 */ }
  }

  function render() {
    if (!el) return;
    var ratio = left > 0 ? Math.max(0, Math.min(1, left / INK_MS)) : 0;

    var armed = ratio > 0;
    if (armed !== shownArmed) {
      shownArmed = armed;
      el.classList.toggle("is-armed", armed);
    }

    /* 六个槽对应六种颜色：亮着的槽数 = 还剩几成墨，
       一眼就能看出「快没了」而不是只靠一条细进度。
       一帧一帧地改 class 很浪费，格数没变就整段跳过 */
    var lit = Math.ceil(ratio * wells.length - 0.001);
    if (lit !== shownLit) {
      shownLit = lit;
      for (var i = 0; i < wells.length; i += 1) {
        wells[i].classList.toggle("is-lit", i < lit);
      }
    }

    /* 余量条只在百分比真的变了才写，避免每帧都动一次 DOM */
    var pct = Math.round(ratio * 100);
    if (pct !== shownPct) {
      shownPct = pct;
      if (gaugeFill) gaugeFill.style.transform = "scaleY(" + ratio.toFixed(3) + ")";
    }
  }

  function notify() {
    for (var i = 0; i < listening.length; i += 1) {
      try { listening[i](left); } catch (e) { /* 订阅者自己出错不该拖垮墨槽 */ }
    }
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min(120, ts - lastTs);
    lastTs = ts;

    /* 触屏上手一停就待机：不扣墨、也不再逐帧跑 */
    var idle = touchMode && (now() - lastAct) > IDLE_MS;

    if (left > 0 && !idle) {
      left = Math.max(0, left - dt);
      render();
      if (left === 0) {
        writeStore();
        notify();
      }
    }
    raf = left > 0 && !idle ? window.requestAnimationFrame(loop) : 0;
  }

  function burn() {
    if (raf) return;
    lastTs = 0;
    raf = window.requestAnimationFrame(loop);
  }

  function charge(e) {
    if (!el) return;
    /* 划过、点击、聚焦都算蘸墨；还没蘸满就一直补 */
    var was = left;
    left = INK_MS;
    lastAct = now();
    shownPct = -1;
    shownLit = -1;
    render();
    writeStore();
    burn();

    if (was < INK_MS * 0.5) {
      el.classList.remove("is-dip");
      void el.offsetWidth;
      el.classList.add("is-dip");
      window.setTimeout(function () { el.classList.remove("is-dip"); }, 620);
    }

    if (e && e.type === "pointerdown") {
      /* 点一下只是蘸墨，别把页面滚走 */
      if (e.preventDefault) e.preventDefault();
    }
    notify();
  }

  /* 轻量档与「减少动效」的机器上，轨迹本来就不建，
     墨槽也一起收掉——留着只会让人以为东西坏了 */
  function off() {
    if (document.documentElement.dataset.lite) return true;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    return false;
  }

  function build() {
    if (el) return el;
    if (!document.body) return null;
    if (off()) return null;

    el = document.createElement("button");
    el.type = "button";
    el.className = "ink-slot";
    el.setAttribute("data-ink-slot", "");
    el.setAttribute("aria-label", "染色区：划过或点一下蘸墨，之后指针会留下彩色方块，墨水约 12 秒用完");

    var wellBox = document.createElement("span");
    wellBox.className = "ink-slot__wells";
    wellBox.setAttribute("aria-hidden", "true");
    for (var i = 0; i < COLORS.length; i += 1) {
      var w = document.createElement("i");
      w.style.setProperty("--c", COLORS[i]);
      wellBox.appendChild(w);
      wells.push(w);
    }
    el.appendChild(wellBox);

    var label = document.createElement("span");
    label.className = "ink-slot__label";
    label.setAttribute("aria-hidden", "true");
    label.textContent = "INK";
    el.appendChild(label);

    var gauge = document.createElement("span");
    gauge.className = "ink-slot__gauge";
    gauge.setAttribute("aria-hidden", "true");
    gaugeFill = document.createElement("b");
    gauge.appendChild(gaugeFill);
    el.appendChild(gauge);

    document.body.appendChild(el);

    el.addEventListener("pointerenter", charge);
    el.addEventListener("pointerdown", charge);
    el.addEventListener("focus", charge);

    /* 不管鼠标还是手指，进来都是「没有墨」；
       手机上没地方悬停，但槽就在那儿，点一下就能蘸 */
    touchMode = isTouch();
    document.documentElement.classList.toggle("is-touch", touchMode);
    lastAct = now() - IDLE_MS;
    left = readStore();

    shownPct = -1;
    shownLit = -1;
    render();
    if (left > 0) burn();
    return el;
  }

  /* 输入方式变了（接上鼠标 / 拔掉键盘）就重新判一次；
     没变就什么都不动 —— 手机上地址栏一收也会发 resize，
     不能借这个把计时接上 */
  function sync() {
    var touch = isTouch();
    if (touch === touchMode) return;
    touchMode = touch;
    document.documentElement.classList.toggle("is-touch", touchMode);
    lastAct = now() - IDLE_MS;
    shownPct = -1;
    shownLit = -1;
    render();
    if (left > 0) burn();
  }

  function active() {
    return left > 0;
  }

  function remaining() {
    return left;
  }

  function onTick(fn) {
    if (typeof fn === "function") listening.push(fn);
  }

  function boot() {
    /* 触屏标记挂在 <html> 上，方便别处按输入方式调整（样式里用 .is-touch） */
    document.documentElement.classList.toggle("is-touch", isTouch());
    build();
    sync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener("resize", sync, { passive: true });
  window.addEventListener("orientationchange", sync, { passive: true });

  /* 只有触屏才走这条：手指落下、拖动、页面滚动都算「人在用」，
     一停手就暂停；桌面鼠标不参与，桌面的墨还是按真实时间流走 */
  function markAct(e) {
    if (!touchMode) return;

    /* 手指抬起来就立刻待机：不等那点收尾余量，
       松手之后一滴都不再扣 */
    if (e && (e.type === "pointerup" || e.type === "pointercancel" || e.type === "touchend" || e.type === "touchcancel")) {
      lastAct = now() - IDLE_MS;
      return;
    }

    lastAct = now();

    /* 手指从槽上划过去也算蘸墨。触摸不会给外来的 pointerenter，
       只能自己拿坐标问一句 —— 没墨的时候才问，平时零开销 */
    if (e && e.type === "touchmove" && left < INK_MS) {
      var t = e.touches && e.touches[0];
      if (t && inSlot(t.clientX, t.clientY)) {
        charge();
        return;
      }
    }
    if (left > 0 && !raf) burn();
  }
  window.addEventListener("pointerdown", markAct, { passive: true });
  window.addEventListener("pointermove", markAct, { passive: true });
  window.addEventListener("touchstart", markAct, { passive: true });
  window.addEventListener("touchmove", markAct, { passive: true });
  window.addEventListener("touchend", markAct, { passive: true });
  window.addEventListener("touchcancel", markAct, { passive: true });
  window.addEventListener("pointerup", markAct, { passive: true });
  window.addEventListener("pointercancel", markAct, { passive: true });
  window.addEventListener("scroll", markAct, { passive: true });

  window.HNYZINK = {
    active: active,
    remaining: remaining,
    charge: function () { charge(); },
    onTick: onTick
  };
})();
