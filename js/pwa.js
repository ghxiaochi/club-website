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

  function register() {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {
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
