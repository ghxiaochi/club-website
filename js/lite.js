/* =========================================================
   HNYZ · 轻量模式
   ---------------------------------------------------------
   给低性能设备（老手机、学校的旧电脑、开了省流量的浏览器）一个开关：
   关掉所有非必要的动画、模糊和 canvas 特效，只留下内容本身。

   电脑上额外关掉的东西：跟着鼠标走的光晕、项目卡的 3D 倾斜、
   桌面专属的背景图标与跑马灯、首屏那层粒子画布；画布的像素比也降到 1，
   4K 屏少画四分之三的像素。

   什么时候会开：
     1. 手动点顶栏那根羽毛；
     2. 上次开过，这次照旧（localStorage 的 hnyz:lite）；
     3. 第一次来、又检测到设备吃力（Save-Data、2G、内存 ≤2G、
        核心 ≤2 个），自动开一次，右下角说一句，随时能关。

   切换不刷新页面：
     CSS 立刻生效；canvas 模块监听 hnyz:lite 事件，自己停。
   这样点一下就能看出差别，不用等整页重载。
   ========================================================= */

(function () {
  "use strict";

  var KEY = "hnyz:lite";
  var AUTO_KEY = "hnyz:lite:auto";
  var root = document.documentElement;

  function read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function write(key, value) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (error) {
      /* 隐私模式下存不住，本次会话仍然照常生效 */
    }
  }

  function isOn() {
    return root.dataset.lite === "1";
  }

  /* ---------- 右下角一句话 ---------- */
  var toastTimer = 0;
  function toast(text) {
    if (!document.body) return;
    var el = document.querySelector(".lite-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "lite-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = text;
    /* 同一个元素连续提示时也能淡入 */
    void el.offsetWidth;
    el.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.classList.remove("is-on");
    }, 4200);
  }

  /* ---------- 按钮状态 ---------- */
  function syncButtons() {
    var on = isOn();
    var buttons = document.querySelectorAll("[data-lite-toggle]");
    for (var i = 0; i < buttons.length; i += 1) {
      var btn = buttons[i];
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "关闭轻量模式" : "开启轻量模式（适合低性能设备）");
      btn.setAttribute("title", on ? "轻量模式：已开启 · 点击关闭（Shift+L）" : "轻量模式：关闭 · 点击开启（Shift+L）");
      btn.classList.toggle("is-on", on);
    }
  }

  /* ---------- 开关 ---------- */
  function set(on, options) {
    if (on) root.dataset.lite = "1";
    else delete root.dataset.lite;

    write(KEY, on ? "1" : "0");
    write(AUTO_KEY, options && options.auto ? "1" : null);

    syncButtons();
    /* 派发在 document 上：各模块都监听 document，
       从 window 发出去的事件不会往下冒泡，收不到 */
    document.dispatchEvent(new CustomEvent("hnyz:lite", { detail: { on: on } }));
  }

  /* 首次访问 + 设备吃力：自动开一次。
     head 里的预置脚本已经挂上了 data-lite，这里只补存储和提示。
     用户关过之后写的是 "0"，不会再自动开。 */
  function maybeAuto() {
    if (read(KEY) !== null) return;
    if (!isOn()) return;

    write(KEY, "1");
    write(AUTO_KEY, "1");

    /* 系统里开了「减少动效」的人，别再说「设备吃力」——
       这不是性能问题，是偏好，照着做就行，也不用弹提示打扰 */
    var quiet = false;
    try {
      quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (error) { /* 老内核 */ }

    if (quiet) return;

    window.setTimeout(function () {
      if (isOn()) toast("设备有点吃力，已开启轻量模式，右上角那根羽毛可以关掉。");
    }, 2600);
  }

  /* 电脑上加一个快捷键：Shift+L。
     输入框里按 L 不算，别把留言板写成“轻量模式”。 */
  function onKey(event) {
    if (!event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "L" && event.key !== "l") return;

    var el = event.target;
    var tag = el && el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select" || (el && el.isContentEditable)) return;

    event.preventDefault();
    var next = !isOn();
    set(next, { auto: false });
    toast(next ? "轻量模式：动画、模糊、阴影和粒子都关了" : "已恢复完整效果");
  }

  function bind() {
    syncButtons();

    document.addEventListener("keydown", onKey);

    document.addEventListener("click", function (event) {
      var btn = event.target.closest ? event.target.closest("[data-lite-toggle]") : null;
      if (!btn) return;
      event.preventDefault();
      var next = !isOn();
      set(next, { auto: false });
      toast(next ? "轻量模式：动画、模糊、阴影和粒子都关了" : "已恢复完整效果");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }

  maybeAuto();

  window.HNYZ_LITE = {
    isOn: isOn,
    set: set,
    toggle: function () { set(!isOn(), { auto: false }); }
  };
})();
