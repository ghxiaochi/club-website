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

  var V = "?v=20261105u";

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

  /* 主页就是终端：没存过、或者存的是老的 "default"（还没被迁移过），
     都按 term 先把表插进去，首帧就是终端，不会先闪一下蓝白 */
  function stored() {
    try {
      var v = window.localStorage.getItem("hnyz:style");
      if (v === "halo") return "halo";
      if (v === "term") return "term";
      if (!v) return "term";
      if (v === "default" && !window.localStorage.getItem("hnyz:home-term")) return "term";
      return "";
    } catch (error) {
      return "term";
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

  /* ---------------------------------------------------------
     样式自愈
     ---------------------------------------------------------
     发版后 ?v= 全变，若这道连接刚好拉不到新地址（弱网、被拦、
     或 SW 里只剩新版本缓存），浏览器会拿不到任何 CSS：整页退成
     白底黑字的裸 HTML，页头图标、排版全散。这里在 load 之后查一次
     基础变量 --sans 有没有生效——没有就把样式表按「去掉版本号」
     的地址重挂一遍，CDN 上那份文件一直都在。
     --------------------------------------------------------- */
  function rehangCss() {
    var root = document.documentElement;
    /* 挑一个只有 style.css 定义的量：--sans 在终端/黑客皮肤里会被
       各自的表重写，样式表整体没来时它反而可能是有的 */
    var probe = window.getComputedStyle(root).getPropertyValue("--measure");
    if (probe && probe.trim()) return;

    var stamp = Date.now();
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    var added = 0;
    for (var i = 0; i < links.length; i += 1) {
      var href = links[i].getAttribute("href") || "";
      if (!href || /^(https?:)?\/\//.test(href)) continue;
      var base = href.split("#")[0].split("?")[0];
      var fresh = document.createElement("link");
      fresh.rel = "stylesheet";
      fresh.href = base + "?r=" + stamp;
      document.head.appendChild(fresh);
      added += 1;
    }
    if (added) document.documentElement.classList.add("is-css-retry");
  }

  if (document.readyState === "complete") {
    window.setTimeout(rehangCss, 260);
  } else {
    window.addEventListener("load", function () {
      window.setTimeout(rehangCss, 260);
    }, { once: true });
  }

  window.HNYZCSS = { ensure: ensure };
})();
