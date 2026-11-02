/* =========================================================
   HNYZ · Service Worker 注册
   ---------------------------------------------------------
   单独一个文件，四页共用。放在 load + 空闲之后注册：
   注册本身要读脚本、开数据库，和首屏抢主线程没有意义。

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

  if (/[?&]nosw=1\b/.test(location.search)) return;

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

  if (document.readyState === "complete") whenIdle();
  else window.addEventListener("load", whenIdle, { once: true });
})();
