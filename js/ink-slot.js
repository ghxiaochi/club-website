/* =========================================================
   染色区：一片挂在视口右边的小墨槽
   ---------------------------------------------------------
   默认整站没有轨迹。指针从这条墨槽上划过（或点一下、
   键盘聚焦一下），就算「蘸了墨」，之后指针走过的地方才会
   留下彩色方块；墨水按秒消耗，用完就回到没有轨迹的状态，
   回来再蘸一次。

   为什么挂在右边：左下角是桌宠、右下角是校徽，四个角都
   占着；一条 34px 宽的竖槽贴着右边缘，不压正文，任何页面
   任何皮肤都在同一个位置。

   移动端不显示这条槽（没有 hover，贴着右边缘还容易跟系统
   的返回手势打架），直接给满墨 —— 手指划过去就有轨迹。
   ========================================================= */
(function () {
  "use strict";

  var INK_MS = 12000;      /* 一槽墨能烧 12 秒 */
  var STORE = "hnyz:ink";  /* sessionStorage：换页时把剩下的墨带过去 */
  var COLORS = ["#4493f8", "#a371f7", "#db61a2", "#3fb950", "#f0883e", "#39c5cf"];

  var left = 0;            /* 剩余毫秒 */
  var freeInk = false;     /* 手机：没有墨槽可蘸，就不烧墨，一直满 */
  var el = null;
  var tipEl = null;
  var wells = [];
  var gaugeFill = null;
  var raf = 0;
  var lastTs = 0;
  var shownPct = -1;
  var shownSec = -1;
  var listening = [];

  function now() { return Date.now(); }

  function isHandset() {
    return window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
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

    el.classList.toggle("is-armed", ratio > 0);

    /* 六个槽对应六种颜色：亮着的槽数 = 还剩几成墨，
       一眼就能看出「快没了」而不是只靠一条细进度 */
    var lit = Math.ceil(ratio * wells.length - 0.001);
    for (var i = 0; i < wells.length; i += 1) {
      wells[i].classList.toggle("is-lit", i < lit);
    }

    var pct = Math.round(ratio * 100);
    if (pct !== shownPct) {
      shownPct = pct;
      el.style.setProperty("--ink-left", String(ratio.toFixed(3)));
      if (gaugeFill) gaugeFill.style.transform = "scaleY(" + ratio.toFixed(3) + ")";
    }

    /* 悬停时的提示：没墨时教怎么用，有墨时直接报还剩几秒 */
    var sec = ratio > 0 ? Math.ceil(left / 1000) : 0;
    if (sec !== shownSec && tipEl) {
      shownSec = sec;
      tipEl.textContent = sec > 0 ? "墨水 " + sec + " 秒" : "划过蘸墨";
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

    if (!freeInk && left > 0) {
      left = Math.max(0, left - dt);
      render();
      if (left === 0) {
        writeStore();
        notify();
      }
    }
    raf = left > 0 && !freeInk ? window.requestAnimationFrame(loop) : 0;
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
    shownPct = -1;
    shownSec = -1;
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
    el.setAttribute("aria-label", "染色区：鼠标划过或点一下蘸墨，之后指针会留下彩色方块，墨水约 12 秒用完");

    tipEl = document.createElement("span");
    tipEl.className = "ink-slot__tip";
    tipEl.textContent = "划过蘸墨";
    el.appendChild(tipEl);

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

    if (isHandset()) {
      freeInk = true;
      left = INK_MS;
    } else {
      left = readStore();
    }

    shownPct = -1;
    render();
    if (left > 0) burn();
    return el;
  }

  /* 横竖屏切换时重新判一次：转到手机上就不烧墨，
     转回桌面就按剩下的墨继续烧 */
  function sync() {
    var handset = isHandset();
    if (handset === freeInk) return;
    freeInk = handset;
    if (freeInk) {
      left = INK_MS;
      shownPct = -1;
      render();
    } else if (left > 0) {
      burn();
    }
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
    build();
    sync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener("resize", sync, { passive: true });

  window.HNYZINK = {
    active: active,
    remaining: remaining,
    charge: function () { charge(); },
    onTick: onTick
  };
})();
