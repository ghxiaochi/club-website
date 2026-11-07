/* =========================================================
   HNYZ · 轻量模式 / 极简模式
   ---------------------------------------------------------
   两档减法，按设备能不能扛分开：

     轻量（data-lite="1"）—— 老手机、学校旧电脑、开了省流量的浏览器
       关掉所有非必要的动画、模糊和 canvas 特效，只留下内容本身。
       电脑上额外关掉鼠标光晕、卡片 3D 倾斜、桌面背景图标与跑马灯，
       画布像素比也降到 1。

     极简（data-lite="2"）—— 超低端：十年前的上网本、2G 网络、
       只剩 512MB 内存的机器
       在轻量之上再砍掉「图」这一整层：项目封面、成员立绘、图集缩略图、
       头像、首屏角色画布一律不请求（省下几百 KB 到几 MB），
       字体退回系统栈，渐变、圆角、阴影、描边全部拍平成纸面。
       页面退化成一份能读、能点的纯文字文档。

   怎么开：
     1. 点顶栏那根羽毛 → 轻量；
     2. 长按那根羽毛 650ms → 极简（再长按一次退出）；
     3. 上次开过，这次照旧（localStorage 的 hnyz:lite 存 1 或 2）；
     4. 第一次来、设备又明显吃力（Save-Data、2G、内存 ≤2G、核心 ≤2）
        自动开一次轻量，右下角说一句，随时能关。

   切换不刷新页面：
     CSS 立刻生效；canvas 模块监听 hnyz:lite 事件，自己停。
   ========================================================= */

(function () {
  "use strict";

  var KEY = "hnyz:lite";
  var AUTO_KEY = "hnyz:lite:auto";
  var root = document.documentElement;

  /* 长按多久算「要极简」。太短容易误触，太长像卡住 */
  var HOLD_MS = 650;

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

  /* 0 关 / 1 轻量 / 2 极简 */
  function tier() {
    var v = root.dataset.lite;
    if (v === "2") return 2;
    if (v === "1") return 1;
    return 0;
  }

  function isOn() {
    return tier() > 0;
  }

  function ultra() {
    return tier() === 2;
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
  var LABEL = {
    0: "开启轻量模式（适合低性能设备）",
    1: "关闭轻量模式（长按进入极简模式）",
    2: "退出极简模式"
  };
  var TIP = {
    0: "轻量模式：关闭 · 点击开启 · 长按进入极简（Shift+L）",
    1: "轻量模式：已开启 · 点击关闭 · 长按进入极简（Shift+L）",
    2: "极简模式：已开启 · 点击或长按退出"
  };

  function syncButtons() {
    var t = tier();
    var buttons = document.querySelectorAll("[data-lite-toggle]");
    for (var i = 0; i < buttons.length; i += 1) {
      var btn = buttons[i];
      btn.setAttribute("aria-pressed", t > 0 ? "true" : "false");
      btn.setAttribute("aria-label", LABEL[t]);
      btn.setAttribute("title", TIP[t]);
      btn.setAttribute("data-tier", String(t));
      btn.classList.toggle("is-on", t > 0);
      btn.classList.toggle("is-ultra", t === 2);
    }
  }

  /* 把当前档位告诉 Service Worker 和一片很小的状态缓存。
     SW 装完会串行预热六十多张图、几段音效；极简档的机器不该
     替这些预付流量，所以它在预取前先读这里写的值。 */
  var STATE_CACHE = "hnyz-state";

  function publish(t) {
    try {
      if (window.caches && window.Response) {
        var url = new URL("__hnyz_lite", document.baseURI).href;
        window.caches.open(STATE_CACHE).then(function (store) {
          return store.put(
            url,
            new Response(String(t), { headers: { "content-type": "text/plain" } })
          );
        }).catch(function () { /* 隐私模式或存储满了 */ });
      }
    } catch (error) { /* 老内核 */ }

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "lite", tier: t });
      }
    } catch (error) { /* 没有 SW */ }
  }

  /* 极简档的图片闸门（在各页 <head> 里）把 src 换成了 1×1 占位，
     原地址存在 data-ultra-src。退出极简时按原样放回去，
     静态图（头像、徽章）就不用刷新也能回来。 */
  function restoreImages() {
    var imgs = document.querySelectorAll("img[data-ultra-src]");
    for (var i = 0; i < imgs.length; i += 1) {
      var img = imgs[i];
      var src = img.getAttribute("data-ultra-src");
      img.removeAttribute("data-ultra-src");
      if (src) img.setAttribute("src", src);
    }
  }

  /* ---------- 开关 ---------- */
  function set(next, options) {
    var t = next === true ? 1 : next === false ? 0 : Number(next);
    if (t !== 1 && t !== 2) t = 0;

    var was = tier();

    if (t > 0) root.dataset.lite = String(t);
    else delete root.dataset.lite;

    write(KEY, String(t));
    write(AUTO_KEY, options && options.auto ? "1" : null);

    if (was === 2 && t < 2) restoreImages();
    publish(t);

    syncButtons();
    /* 派发在 document 上：各模块都监听 document，
       从 window 发出去的事件不会往下冒泡，收不到 */
    document.dispatchEvent(
      new CustomEvent("hnyz:lite", { detail: { on: t > 0, tier: t } })
    );
  }

  /* ---------- 首次访问自动开轻量 ---------- */
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

  /* ---------- 长按羽毛 → 极简 ---------- */
  var holdTimer = 0;
  var holdTarget = null;
  /* 这一次按下是不是已经长按生效过？
     长按之后浏览器还会补一个 click，得在抬起时把它吞掉，
     否则刚进极简又被那一下点回关闭。按了多久都能对上，
     不靠定时器猜。 */
  var pressWasLong = false;
  var swallowClick = false;

  function clearHold() {
    if (holdTimer) {
      window.clearTimeout(holdTimer);
      holdTimer = 0;
    }
    if (holdTarget) {
      holdTarget.classList.remove("is-holding");
      holdTarget = null;
    }
  }

  function enterUltra() {
    set(2, { auto: false });
    toast("极简模式：图片、字体和装饰全部关掉，只留文字。再长按羽毛退出。");
  }

  function leaveUltra() {
    set(0, { auto: false });
    toast("已恢复完整效果。项目封面和图集是刷新后才重新载入的。");
  }

  function pressStart(btn) {
    clearHold();
    pressWasLong = false;
    holdTarget = btn;
    btn.classList.add("is-holding");
    holdTimer = window.setTimeout(function () {
      holdTimer = 0;
      pressWasLong = true;
      btn.classList.remove("is-holding");
      holdTarget = null;

      if (tier() === 2) leaveUltra();
      else enterUltra();
    }, HOLD_MS);
  }

  function bindPress() {
    document.addEventListener("pointerdown", function (event) {
      var btn = event.target.closest ? event.target.closest("[data-lite-toggle]") : null;
      if (!btn) return;
      /* 鼠标只认左键；触摸和笔都算 */
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pressStart(btn);
    }, { passive: true });

    /* 不能用 blur：按下按钮会让它拿到焦点，原焦点元素一 blur
       就会把刚点着的长按计时器清掉，长按永远等不到 650ms */
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (type) {
      document.addEventListener(type, clearHold, { passive: true, capture: true });
    });

    /* 抬起时才知道这一下是长按：把紧随其后的 click 标记为吞掉 */
    document.addEventListener("pointerup", function () {
      if (!pressWasLong) return;
      pressWasLong = false;
      swallowClick = true;
      window.setTimeout(function () { swallowClick = false; }, 600);
    }, { passive: true, capture: true });
  }

  /* ---------- 键盘：Shift+L 切轻量，Shift+Alt+L 切极简 ---------- */
  function onKey(event) {
    if (!event.shiftKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "L" && event.key !== "l") return;

    var el = event.target;
    var tag = el && el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select" || (el && el.isContentEditable)) return;

    event.preventDefault();

    if (event.altKey) {
      if (tier() === 2) leaveUltra();
      else enterUltra();
      return;
    }

    var next = isOn() ? 0 : 1;
    set(next, { auto: false });
    toast(next ? "轻量模式：动画、模糊、阴影和粒子都关了" : "已恢复完整效果");
  }

  function bind() {
    syncButtons();
    bindPress();
    document.addEventListener("keydown", onKey);

    document.addEventListener("click", function (event) {
      var btn = event.target.closest ? event.target.closest("[data-lite-toggle]") : null;
      if (!btn) return;
      event.preventDefault();

      if (swallowClick) {
        swallowClick = false;
        return;
      }

      var t = tier();
      /* 极简态点一下就是退出；其余在关/开轻量之间切 */
      var next = t === 0 ? 1 : 0;
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
  /* 首帧就把档位写进去：SW 更新时正好读到 */
  publish(tier());

  /* 首次访问时 SW 还在装，controller 是空的，上面那次消息发不出去；
     等它就绪再补一次，让安装完的预取立刻知道该不该拉图 */
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(function () {
        publish(tier());
      }).catch(function () { /* 没有 SW */ });
    }
  } catch (error) { /* 老内核 */ }

  window.HNYZ_LITE = {
    tier: tier,
    toast: toast,
    isOn: isOn,
    isUltra: ultra,
    set: set,
    toggle: function () { set(isOn() ? 0 : 1, { auto: false }); }
  };
})();
