/* =========================================================
   HNYZ · 皮肤样式按需加载
   ---------------------------------------------------------
   以前每个页面都把六套皮肤的 CSS 全量挂在 <head> 里，
   其中终端风的 skin-term + term-tui 加起来 45KB，
   光场还有一份——不用这些皮肤的人也在为它们付流量。

   现在：
     · 当前皮肤（localStorage 里存的那套）在 <head> 里同步插入，
       渲染前就位，不会闪一下默认风；
     · 其余皮肤等页面空闲了再预取，用户点「风格」时不至于空窗；
     · 切皮肤时 skins.js 调 HNYZCSS.ensure()，没加载完就补上。
   ========================================================= */
(function () {
  "use strict";

  var V = "?v=20261105g";

  var SKINS = {
    term: ["css/skin-term.css", "css/term-tui.css"],
    halo: ["css/skin-halo.css"]
  };

  function loadedOf(href) {
    var links = document.querySelectorAll("link[data-skin-css]");
    for (var i = 0; i < links.length; i += 1) {
      if (links[i].getAttribute("data-skin-css") === href) return links[i];
    }
    return null;
  }

  function add(href) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href + V;
    link.setAttribute("data-skin-css", href);
    document.head.appendChild(link);
    return link;
  }

  /* 确保某套皮肤的 CSS 已就位；没就位就插进去，加载完再回调 */
  function ensure(name, done) {
    var list = SKINS[name] || [];
    if (!list.length) {
      if (done) done();
      return;
    }

    var pending = list.length;
    function one() {
      pending -= 1;
      if (pending === 0 && done) done();
    }

    list.forEach(function (href) {
      var link = loadedOf(href);
      if (link) {
        if (link.sheet) one();
        else link.addEventListener("load", one);
        return;
      }
      var made = add(href);
      made.addEventListener("load", one);
      made.addEventListener("error", one);
    });
  }

  function stored() {
    try {
      var v = window.localStorage.getItem("hnyz:style");
      return v === "term" || v === "halo" ? v : "";
    } catch (error) {
      return "";
    }
  }

  var saved = stored();
  /* 同步插入：脚本在 <head> 里，浏览器会等这张表加载完再画第一帧 */
  if (saved) ensure(saved);

  /* 只有当鼠标真的移到「风格」按钮上（或键盘聚焦它）时才预热其余皮肤：
     不切皮肤的人一个字节都不用付 */
  function warm() {
    Object.keys(SKINS).forEach(function (name) { ensure(name); });
  }

  function bindWarm() {
    var btn = document.querySelector("[data-style-toggle]");
    if (!btn) return;
    ["pointerenter", "focus", "touchstart"].forEach(function (ev) {
      btn.addEventListener(ev, warm, { once: true, passive: true });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindWarm, { once: true });
  } else {
    bindWarm();
  }

  window.HNYZCSS = { ensure: ensure };
})();
