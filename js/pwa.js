/* =========================================================
   HNYZ · Service Worker 注册
   ---------------------------------------------------------
   单独一个文件，五个页面共用。放在 load + 空闲之后注册：
   注册本身要读脚本、开数据库，和首屏抢主线程没有意义。

   除了注册，这里还干两件小事：
     · 新版本装好后弹一条「刷新」提示——不弹的话，用户可能
       一整天都在看旧页面，还以为发版没生效。
     · 断网时弹一条离线提示，让人知道是网络的问题，不是网页坏了。

   调试时想临时关掉：在地址后面加 ?nosw=1。
   想彻底注销（比如测试发版）：
     navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()))
   ========================================================= */

(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  /* 非安全上下文注册会直接抛错，先挡掉 */
  var secure = location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";
  if (!secure) return;

  var disabled = /[?&]nosw=1\b/.test(location.search);

  /* ---------- 一条自己能用的提示条 ---------- */
  var toastEl = null;
  var toastTimer = 0;

  function hideToast() {
    if (!toastEl) return;
    toastEl.classList.remove("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      toastEl = null;
    }, 260);
  }

  function toast(message, actionText, onAction, duration) {
    if (toastEl) {
      if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      toastEl = null;
    }

    toastEl = document.createElement("div");
    toastEl.className = "pwa-toast";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");

    var text = document.createElement("span");
    text.className = "pwa-toast__text";
    text.textContent = message;
    toastEl.appendChild(text);

    if (actionText) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pwa-toast__action";
      btn.textContent = actionText;
      btn.addEventListener("click", function () {
        hideToast();
        onAction();
      });
      toastEl.appendChild(btn);
    }

    document.body.appendChild(toastEl);
    /* 下一帧再加 is-on，过渡才有起点 */
    window.requestAnimationFrame(function () {
      if (toastEl) toastEl.classList.add("is-on");
    });

    toastTimer = window.setTimeout(hideToast, duration || 6000);
  }

  /* ---------- 提示条样式：内联，五套皮肤下都不违和 ---------- */
  function injectStyle() {
    if (document.getElementById("pwa-toast-style")) return;
    var style = document.createElement("style");
    style.id = "pwa-toast-style";
    style.textContent = [
      ".pwa-toast{position:fixed;left:50%;bottom:24px;z-index:9999;",
      "transform:translate(-50%,14px);opacity:0;display:flex;align-items:center;gap:14px;",
      "max-width:min(92vw,520px);padding:12px 16px;border-radius:10px;",
      "background:rgba(12,18,30,.94);color:#e8eefb;font:13px/1.5 " +
      "var(--mono,'SFMono-Regular',Consolas,monospace);",
      "border:1px solid rgba(147,197,253,.28);box-shadow:0 12px 30px rgba(0,0,0,.28);",
      "transition:opacity .22s ease,transform .3s cubic-bezier(.34,1.4,.64,1);",
      "pointer-events:none}",
      ".pwa-toast.is-on{opacity:1;transform:translate(-50%,0);pointer-events:auto}",
      ".pwa-toast__text{flex:1;min-width:0}",
      ".pwa-toast__action{flex:none;padding:6px 12px;border-radius:6px;",
      "border:1px solid rgba(147,197,253,.45);background:rgba(96,165,250,.16);",
      "color:#dbeafe;font:inherit;cursor:pointer}",
      ".pwa-toast__action:hover{background:rgba(96,165,250,.28)}",
      "@media (max-width:420px){.pwa-toast{bottom:14px;padding:10px 12px;font-size:12px}}",
      "@media (prefers-reduced-motion:reduce){.pwa-toast{transition:opacity .12s linear}}"
    ].join("");
    document.head.appendChild(style);
  }

  /* ---------- 版本更新提示 ---------- */
  function watchForUpdate(reg) {
    /* 已经有 SW 在管这个页面，说明不是第一次装：新 SW 装好就是「有新版本」 */
    var hadController = !!navigator.serviceWorker.controller;
    var notified = false;

    function notify() {
      if (notified) return;
      notified = true;
      injectStyle();
      toast("站点有新版本，刷新后生效。", "刷新", function () {
        location.reload();
      }, 10000);
    }

    if (reg.waiting && hadController) notify();

    reg.addEventListener("updatefound", function () {
      var installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", function () {
        /* 有旧版本在跑 + 新版本 activated = 真的更新了 */
        if (installing.state === "activated" && hadController) notify();
      });
    });

    /* skipWaiting 之后控制器会换人，这条是兜底 */
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (hadController) notify();
    });
  }

  /* ---------- 离线提示：只提示一次，别反复打扰 ---------- */
  var offlineNotified = false;
  function watchOnline() {
    window.addEventListener("offline", function () {
      if (offlineNotified) return;
      offlineNotified = true;
      injectStyle();
      toast("已离线，正在用缓存打开页面。", null, null, 4200);
    });
    window.addEventListener("online", function () {
      offlineNotified = false;
    });
  }

  /* 从页面里已有的样式表上摘版本号，注册时拼给 sw.js。
     为什么不直接注册 "sw.js"：
       Cloudflare 会把 sw.js 按 max-age=14400 缓存在边缘节点，
       浏览器发起的更新检查打到的是 CF 的缓存副本，字节没变，
       于是浏览器判定「不需要更新」——哪怕页面上的 ?v= 已经换了，
     SW 还停在上一版，缓存里存的也是上一版的资源。
     实测：发版后 38 秒轮询，缓存键一直停在旧版本，installing 始终 false。
     sw.js 没有自己的版本号可加，就把页面资源的版本号借过来，
     每次发版 URL 跟着变，绕过所有中间缓存。 */
  function assetVersion() {
    var links = document.querySelectorAll('link[rel="stylesheet"][href*="?v="]');
    for (var i = 0; i < links.length; i++) {
      var m = (links[i].getAttribute("href") || "").match(/\?v=([\w.-]+)/);
      if (m) return m[1];
    }
    return "";
  }

  function register() {
    var v = assetVersion();
    var url = v ? "sw.js?v=" + v : "sw.js";

    /* updateViaCache: "none" 管的是 importScripts 那一层（默认 "imports"
       会让 import 的子脚本走 HTTP 缓存）。本站的 sw.js 没有 import，
       所以这一项目前不改变行为，写上是为了以后加子脚本时不会踩坑。

       reg.update() 覆盖另一种情况：标签页一直开着不动、没有新导航，
       浏览器不会自己去查更新，主动问一次能让它尽早换到新版。 */
    navigator.serviceWorker.register(url, { scope: "./", updateViaCache: "none" })
      .then(function (reg) {
        watchForUpdate(reg);
        if (reg && typeof reg.update === "function") {
          reg.update().catch(function () { });
        }
      })
      .catch(function () {
        /* 注册失败不影响页面：离线能力没有，正常浏览照旧 */
      });
  }

  function whenIdle() {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(register, { timeout: 3000 });
    } else {
      window.setTimeout(register, 1500);
    }
  }

  if (!disabled) {
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
  }

  /* 离线提示和 SW 是否可用无关：Safari 私密窗口没有 SW，也断网 */
  watchOnline();
})();
