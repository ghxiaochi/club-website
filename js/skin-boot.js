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

  var V = "?v=20261108c";

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
      /* 极致档只留终端主页：不管上次存的是哪套皮肤，首帧就是 term。
         这里同时看 dataset 和 localStorage —— skin-boot 在 <head> 里
         比档位预置脚本先执行，此时 dataset 可能还没写上 */
      var lite = window.localStorage.getItem("hnyz:lite");
      if (document.documentElement.dataset.lite === "2" || lite === "2") return "term";
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
    /* 极致档没有别的皮肤可选，别把另外几套的 CSS 拉下来 */
    if (document.documentElement.dataset.lite === "2") return;
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
     雪碧图体检
     ---------------------------------------------------------
     主题按钮的太阳/月亮是一张 21KB 的 webp（.theme-toggle__flip 的
     背景图）。图没到，按钮里就是一个空白的格子。
     提前探一次，失败就挂 no-sprite，由 <head> 里那段兜底样式
     画一个纯 CSS 的半月顶上——不依赖任何字形，也不会是空白。
     --------------------------------------------------------- */
  function probeSprite() {
    if (document.documentElement.dataset.lite === "2") return;
    try {
      var probe = new Image();
      probe.onerror = function () {
        document.documentElement.classList.add("no-sprite");
      };
      probe.src = "assets/moon-sun-sprite.webp";
    } catch (error) { /* 隐私模式下忽略 */ }
  }
  probeSprite();

  /* ---------------------------------------------------------
     样式自愈
     ---------------------------------------------------------
     发版后 ?v= 全变。若某一条连接没拉到（弱网、被拦、SW 只回了半截），
     后果分两种：
       · 一张都没到 —— 整页白底黑字，谁都看得出坏了；
       · 只少了一两张 —— 更麻烦。页面看着"还能用"，但顶栏按钮退回
         浏览器的灰方块、主题图标是个空格子、首屏 $ 提示挤进正文，
         一眼像是乱码。2026-11 在 360px 的手机上就是这样。
     以前这里只查 --measure（只有 style.css 定义），所以第二种情况
     永远查不出来。现在逐个 <link> 体检：加载失败（error 事件）
     或 sheet 里一条规则都没有，就把这一张按去掉版本号的地址重挂一次。
     重挂的地址带 ?r= 时间戳，SW 的「其余静态资源」那条会 ignoreSearch
     命中缓存里那份，弱网也能顶上。
     --------------------------------------------------------- */
  var DEAD = "data-css-dead";
  var RETRIED = "data-css-retried";
  var HEAL_ROUNDS = 1;

  /* 只有真的加载失败才会触发 error：还在下载中的表不会被误判 */
  document.addEventListener("error", function (event) {
    var node = event.target;
    if (!node || node.tagName !== "LINK" || node.rel !== "stylesheet") return;
    node.setAttribute(DEAD, "1");
    /* 页面早就 load 完了才坏（多半是切皮肤时补的那张）：当场补一次 */
    if (document.readyState === "complete") {
      window.setTimeout(function () { healCss(HEAL_ROUNDS); }, 300);
    }
  }, true);

  function sickLinks() {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    var out = [];
    for (var i = 0; i < links.length; i += 1) {
      var link = links[i];
      var href = link.getAttribute("href") || "";
      if (!href || /^(https?:)?\/\//.test(href)) continue;
      /* 已经重挂过的就不再叠：地址里带 ?r= 的一律跳过 */
      if (href.indexOf("?r=") > -1) continue;
      /* 已经补过一张的表不再重复补：原件留在 DOM 里当备胎，
         第二轮体检时会再看一次，别让它一直被判成"病了" */
      if (link.getAttribute(RETRIED)) continue;
      if (link.getAttribute(DEAD)) { out.push(link); continue; }
      /* 切皮肤时动态补进来的表可能还在路上，sheet 为空也算正常，
         这种只认 error 事件，别在这里误判成没到 */
      if (link.hasAttribute("data-skin-css")) continue;
      var sheet = link.sheet;
      if (!sheet) { out.push(link); continue; }
      /* 读到的是空文件、或一张根本不是样式表的错误页，都算没到 */
      var count = 0;
      try { count = sheet.cssRules ? sheet.cssRules.length : 0; }
      catch (error) { count = 0; }
      if (count === 0) out.push(link);
    }
    return out;
  }

  function healCss(round) {
    var sick = sickLinks();
    if (!sick.length) return;
    var stamp = Date.now();
    /* personal.css 里放着主题图标的雪碧图。它整份没到时，按钮里就是
       一个空格子——顺手把 no-sprite 挂上，让兜底那段画个纯 CSS 半月 */
    for (var k = 0; k < sick.length; k += 1) {
      if ((sick[k].getAttribute("href") || "").indexOf("personal.css") > -1) {
        document.documentElement.classList.add("no-sprite");
      }
    }
    for (var i = 0; i < sick.length; i += 1) {
      var base = (sick[i].getAttribute("href") || "").split("#")[0].split("?")[0];
      if (!base) continue;
      var fresh = document.createElement("link");
      fresh.rel = "stylesheet";
      /* 原本 media="print" 的懒加载表（留言板样式）重挂时直接生效 */
      fresh.media = "all";
      fresh.href = base + "?r=" + stamp;
      document.head.appendChild(fresh);
      sick[i].setAttribute(RETRIED, "1");
    }
    document.documentElement.classList.add("is-css-retry");
    if (round < HEAL_ROUNDS) {
      window.setTimeout(function () { healCss(round + 1); }, 1400);
    }
  }

  function startHeal() {
    window.setTimeout(function () { healCss(0); }, 300);
  }
  if (document.readyState === "complete") startHeal();
  else window.addEventListener("load", startHeal, { once: true });

  window.HNYZCSS = { ensure: ensure };
})();
