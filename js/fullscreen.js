/* =========================================================
   全屏开关
   ---------------------------------------------------------
   顶栏右上角的那枚四角按钮。用的是浏览器原生 Fullscreen API，
   不造假全屏（假全屏会和站点的 fixed 元素打架：顶栏、环、光场 iframe）。

   不支持的环境直接把按钮藏掉——iOS Safari 就属于这一类，
   它的全屏只对 <video> 有效，点了没反应比没有按钮更糟。
   ========================================================= */
(function () {
  "use strict";

  var btn = document.querySelector("[data-fullscreen-toggle]");
  if (!btn) return;

  var root = document.documentElement;
  var request = root.requestFullscreen || root.webkitRequestFullscreen ||
    root.mozRequestFullScreen || root.msRequestFullscreen;
  var exit = document.exitFullscreen || document.webkitExitFullscreen ||
    document.mozCancelFullScreen || document.msExitFullscreen;

  if (!request) {
    btn.hidden = true;
    return;
  }

  function current() {
    return document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement || null;
  }

  function sync() {
    var on = !!current();
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "退出全屏" : "全屏显示");
    btn.setAttribute("title", on ? "退出全屏" : "全屏");
  }

  btn.addEventListener("click", function () {
    if (current()) {
      if (exit) {
        try { exit.call(document); } catch (e) { /* 某些内核不给退出，忽略 */ }
      }
      return;
    }
    try {
      var p = request.call(root);
      /* 标准版返回 Promise，被用户拒绝时会 reject */
      if (p && typeof p.catch === "function") {
        p.catch(function () {
          btn.setAttribute("title", "当前浏览器不允许全屏");
        });
      }
    } catch (e) {
      btn.setAttribute("title", "当前浏览器不允许全屏");
    }
  });

  ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"]
    .forEach(function (name) {
      document.addEventListener(name, sync);
    });

  sync();
})();
