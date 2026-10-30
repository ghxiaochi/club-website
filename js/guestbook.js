/* =========================================================
   HNYZ · 留言板（giscus）
   ---------------------------------------------------------
   留言存在仓库的 GitHub Discussions 里，没有后端、没有数据库。
   这个文件负责三件事：

   1. 滚动到附近才插 giscus 的 script —— 首屏不为它付任何代价；
   2. 把整站的皮肤/主题翻译成 giscus 的主题，切一次跟一次；
   3. 配置没填、或者 GitHub 连不上时，给一块说人话的说明，
      而不是一个白色的空 iframe。

   配置在 CONFIG 里，已接线（2026-10-30）。category / categoryId 之后如果
   要换分类，去 https://giscus.app/zh-CN 重新生成再抄进来即可；
   两个值被清空时，留言板自动退回「装修中」状态，线上不会报错。
   ========================================================= */

(function () {
  "use strict";

  var body = document.querySelector("[data-guestbook-body]");
  if (!body) return;

  var stateEl = document.querySelector("[data-guestbook-state]");
  var root = document.documentElement;

  var CONFIG = {
    repo: "ghxiaochi/club-website",
    /* 仓库的 node_id，公开信息，可以在 api.github.com/repos/… 里查到 */
    repoId: "R_kgDOVVfRIw",
    /* 分类用 General：giscus 会在里面按 pathname 建 discussion。
       换成别的分类要一起去 giscus.app 重新生成 category-id */
    category: "General",
    categoryId: "DIC_kwDOVVfRI84DKAf-",
    /* 用 pathname 而不是 title：站点有三套文案，同一个区块的标题
       在极简 / 黑客风下是不一样的。按 title 映射的话，同一个人换个皮肤
       再留言，就会开出第二个 discussion，评论被劈成两半。 */
    mapping: "pathname",
    strict: "0",
    reactions: "1",
    /* bottom：先看已有的留言，再写自己的。新站没人留言时也不显得空 */
    inputPosition: "bottom",
    lang: "zh-CN"
  };

  var loaded = false;
  var alive = false;
  var timer = 0;

  function setState(text, live) {
    if (!stateEl) return;
    stateEl.textContent = text;
    stateEl.setAttribute("data-live", live ? "on" : "off");
  }

  /* ---------- 主题：整站风格 → giscus 内置主题 ---------- */
  function themeName() {
    var style = root.dataset.style || "default";
    var dark = root.dataset.theme === "dark";

    /* 黑客风没有白天，直接用对比度最高的那套 */
    if (style === "hacker") return "dark_high_contrast";
    /* 蓝白科技风的深色模式偏藏蓝，dark_dimmed 最接近 */
    if (style === "default") return dark ? "dark_dimmed" : "light";
    /* 极简、棍木：只有黑白两档 */
    return dark ? "dark" : "light";
  }

  function pushTheme() {
    var frame = body.querySelector("iframe.giscus-frame");
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage(
        { giscus: { setConfig: { theme: themeName() } } },
        "https://giscus.app"
      );
    } catch (error) {
      /* 跨域失败就算了，下次切换再试 */
    }
  }

  /* dataset 的改动全部经过这里：
     主题按钮、皮肤面板、系统深浅色跟随，最后都落到这两个属性上 */
  var observer = new MutationObserver(pushTheme);
  observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-style"] });

  /* giscus 会往父窗口发两类消息：
       { giscus: { resizeHeight } }  —— 正常渲染，顺手当作「活了」的信号
       { giscus: { error } }         —— 仓库没装 App、分类 ID 不对之类
     第二种如果不管，访客会在白框里看到一行英文报错，所以接住它换成人话。 */
  window.addEventListener("message", function (event) {
    if (event.origin !== "https://giscus.app") return;
    if (!event.data || !event.data.giscus) return;

    var payload = event.data.giscus;

    if (payload.error) {
      if (alive) return;
      alive = true;
      window.clearTimeout(timer);
      renderUnavailable(payload.error);
      return;
    }

    if (alive) return;
    alive = true;
    window.clearTimeout(timer);
    setState("connected", true);

    var tip = body.querySelector("[data-guestbook-loading]");
    if (tip) tip.remove();

    /* 标记一下：CSS 靠它把外框的 padding 收掉，
       让 iframe 贴住边框——不然白底 iframe 外面套一圈面板色，
       看起来像贴在纸上的一张白纸 */
    body.setAttribute("data-connected", "1");

    pushTheme();
  });

  /* ---------- 未配置 ----------
     访客看到的只是一句「还在装修」，不要把一个没配完的面板摊开给人看；
     三步操作只在 ?debug=1 时出现，给自己留一条不用翻代码的路。 */
  function renderSetup() {
    setState("standby", false);

    var steps = [
      "<ol>",
      "<li>仓库 <code>Settings → General → Features</code> 打开 <code>Discussions</code></li>",
      "<li>给仓库装上 <code>giscus</code> App（github.com/apps/giscus）</li>",
      "<li>去 <code>giscus.app</code> 填仓库名，把生成的 <code>category</code> 与 <code>category-id</code> 抄进 <code>js/guestbook.js</code></li>",
      "</ol>"
    ].join("");

    var debug = /[?&]debug=1\b/.test(location.search);

    body.innerHTML = [
      '<div class="guestbook__setup">',
      "<p>$ // 留言板还在装修，先把话留在群里</p>",
      '<p class="guestbook__setup-note">QQ 群 1098931492 &nbsp;·&nbsp; 群文件和聊天记录都不会过期</p>',
      debug ? steps : "",
      "</div>"
    ].join("");
  }

  /* ---------- 加载失败 ----------
     两种失败对访客是同一件事：留言板现在用不了。
     所以只给一句人话 + 一个能说话的地方；
     具体原因（网络、App 没装、分类 ID 不对）留在 ?debug=1 下给维护者看。 */
  function renderUnavailable(reason) {
    setState("offline", false);

    body.textContent = "";

    var note = document.createElement("p");
    note.className = "guestbook__fallback";
    note.innerHTML = [
      "$ // 留言板暂时连不上<br>",
      "// 想说话可以直接来群里：<strong>1098931492</strong><br>",
      '// 或者 <a href="https://github.com/ghxiaochi/club-website/discussions" ',
      'target="_blank" rel="noopener">去 Discussions 直接开一条</a>'
    ].join("");
    body.appendChild(note);

    if (reason && /[?&]debug=1\b/.test(location.search)) {
      var debugEl = document.createElement("p");
      debugEl.className = "guestbook__debug";
      debugEl.textContent = "// " + reason;
      body.appendChild(debugEl);
    }
  }

  /* ---------- 真正插 script ---------- */
  function render() {
    if (loaded) return;
    loaded = true;

    if (!CONFIG.category || !CONFIG.categoryId) {
      renderSetup();
      return;
    }

    setState("connecting", false);

    var script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", CONFIG.repo);
    script.setAttribute("data-repo-id", CONFIG.repoId);
    script.setAttribute("data-category", CONFIG.category);
    script.setAttribute("data-category-id", CONFIG.categoryId);
    script.setAttribute("data-mapping", CONFIG.mapping);
    script.setAttribute("data-strict", CONFIG.strict);
    script.setAttribute("data-reactions-enabled", CONFIG.reactions);
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", CONFIG.inputPosition);
    script.setAttribute("data-theme", themeName());
    script.setAttribute("data-lang", CONFIG.lang);
    script.setAttribute("data-loading", "lazy");

    script.addEventListener("error", function () { renderUnavailable("client.js 加载失败"); });

    /* 15 秒还没等到 giscus 的消息：多半是网络到不了，
       与其让用户盯着一块空白，不如把话说开 */
    timer = window.setTimeout(function () {
      if (!alive && body.querySelector("iframe.giscus-frame")) renderUnavailable("15 秒内没有收到 giscus 的响应");
    }, 15000);

    /* 别急着清空：giscus 的 iframe 要等 client.js 拉回来才注入，
       弱网下这段时间面板是空的，看起来像坏了。留一行 tail 顶着，
       收到成功消息再抹掉。 */
    body.innerHTML = [
      '<p class="guestbook__loading" data-guestbook-loading>',
      "<span>$ tail -f ~/hnyz/guestbook.log</span>",
      '<span class="guestbook__caret" aria-hidden="true"></span>',
      "</p>"
    ].join("");
    body.appendChild(script);
  }

  /* 滚动到 500px 以内再加载：giscus 要拉一个 100KB 的 iframe，
     没必要让它跟首屏的字体、封面抢带宽 */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        io.disconnect();
        render();
      }
    }, { rootMargin: "500px 0px" });
    io.observe(body);
  } else {
    render();
  }

  /* 从别的页面带 #guestbook 跳过来时，锚点会直接把这里滚进视口，
     IntersectionObserver 自然会触发，不用额外处理 */
})();
