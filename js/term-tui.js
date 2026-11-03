/* =========================================================
   HNYZ · 终端风的多窗口终端框架（HNYZ TTY）
   ---------------------------------------------------------
   把首页当成一台真的多路复用终端，而不是一页可以滚的网页：

     · 顶栏    会话名 + 实时时钟，右上角接过原顶栏的按钮区；
     · 窗口条  tmux 式的 0:main ~ 7:join，点编号或按数字键切窗口，
               窗口里的滚动位置各自保留（这是复用器的本分）；
     · 窗口    八个窗口的文案是终端味重写的，不与其它皮肤共用，
               内容全部渲染在框架里——没有「进入板块回纸带」这一步；
     · 命令行  底部一条真的能敲的 shell：help / ls / whoami /
               clear / 窗口名 / gallery / member / projects；
     · 图例栏  lazygit 式的按键提示 + 本次会话的 uptime。

   交互参照了几个高星开源 TUI 的惯例：
     lazygit（~84k★）的底部按键图例、tmux 的窗口条与复用、
     btop（~33k★）的仪表条。几何为零，全是排版。

   只在终端风首页由 js/skins.js 的 syncTerm() 调 HNYZTUI.sync()。
   内页凑不满八个窗口，维持琥珀纸带不动。
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     窗口表：顺序就是阅读顺序，cmd 是命令行里可敲的名字
     --------------------------------------------------------- */
  var WINDOWS = [
    { id: "main",  cmd: "main",  title: "MOTD" },
    { id: "about", cmd: "about", title: "man hnyz(1)" },
    { id: "build", cmd: "build", title: "git log ~/repos" },
    { id: "sched", cmd: "sched", title: "crontab -l" },
    { id: "wall",  cmd: "wall",  title: "ls /srv/wall" },
    { id: "faq",   cmd: "faq",   title: "faq(7)" },
    { id: "msg",   cmd: "msg",   title: "tail -f guestbook.log" },
    { id: "join",  cmd: "join",  title: "ssh newmember@hnyz" }
  ];

  var QQ = "1098931492";
  var MAIL = "483677268@qq.com";

  /* ---------------------------------------------------------
     小工具
     --------------------------------------------------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function pad(n) { return ("0" + n).slice(-2); }

  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionOK() { return !(mq && mq.matches); }

  /* 行构建器：给每一行编个号，入场时按 35ms 错峰打印 */
  var lineIdx = 0;
  function L(html, cls) {
    return '<p class="tty-ln' + (cls ? " " + cls : "") + '" style="--i:' + (lineIdx++) + '">' + html + "</p>";
  }

  /* 仪表条（btop 味）：label + 方条 + 读数 */
  function meter(label, ratio, value, note) {
    var pct = Math.round(ratio * 100);
    return '<div class="tty-meter" style="--i:' + (lineIdx++) + '">' +
      '<span class="tty-meter__label">' + esc(label) + "</span>" +
      '<span class="tty-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
      '<span class="tty-meter__val">' + esc(value) + (note ? ' <em>' + esc(note) + "</em>" : "") + "</span>" +
      "</div>";
  }

  /* ---------------------------------------------------------
     八个窗口的内容。文案是终端风专属的，不与其它皮肤共用。
     --------------------------------------------------------- */
  function paneMain() {
    lineIdx = 0;
    var d = new Date();
    var h = [];
    h.push('<div class="tty-boot t-dim">');
    h.push(L("HNYZ-TTY 6.2.0 (amber) — login: guest"));
    h.push(L("last login: " + d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " · from 教学楼机房"));
    h.push("</div>");
    /* 点阵 banner：17×5 的 LED 屏，一格一个 <i>，
       不用字符画——块字符在不同字体里宽度不稳，点阵永远清晰 */
    var GLYPH = {
      H: ["101", "101", "111", "101", "101"],
      N: ["1001", "1101", "1011", "1001", "1001"],
      Y: ["101", "101", "010", "010", "010"],
      Z: ["1111", "0001", "0010", "1000", "1111"]
    };
    var WORD = ["H", "N", "Y", "Z"];
    var rows = ["", "", "", "", ""];
    WORD.forEach(function (ch, wi) {
      var g = GLYPH[ch];
      for (var r = 0; r < 5; r += 1) {
        rows[r] += (wi ? "0" : "") + g[r];
      }
    });
    var px = rows.map(function (row) {
      var out = "";
      for (var c = 0; c < row.length; c += 1) {
        out += "<i" + (row[c] === "1" ? ' class="on"' : "") + "></i>";
      }
      return out;
    }).join("");
    h.push('<div class="tty-pixel" style="--i:' + (lineIdx++) + '" role="img" aria-label="HNYZ">' + px + "</div>");
    h.push(L('<span class="t-dim">$</span> whoami'));
    h.push(L("衡南一中编程社 · 面向全校的极客技术社团", "t-brt"));
    h.push(L('<span class="t-dim">$</span> cat intro.txt'));
    h.push(L("教学内容以 Arduino 为主线：从点亮第一颗 LED 开始，组队做项目、一起学习，把脑子里的点子变成真正能跑的作品。", "t-mut"));
    h.push('<div class="tty-meters">');
    h.push(meter("常规活动", 2 / 7, "2 次 / 周", "每次 60 分钟"));
    h.push(meter("基础门槛", 0, "0", "零基础友好"));
    h.push(meter("实践方向", 4 / 7, "4", "硬件 / 软件 / 设计 / 组织"));
    h.push("</div>");
    h.push(L('<span class="t-dim">#</span> 零基础友好　<span class="t-dim">#</span> Arduino 主线　<span class="t-dim">#</span> 每周两小时　<span class="t-dim">#</span> 做完比完美更重要', "t-dim"));
    h.push('<div class="tty-contact" style="--i:' + (lineIdx++) + '">');
    h.push('<div class="tty-contact__row"><span class="t-dim">QQ_GROUP</span><b>' + QQ + "</b>" + copyBtn(QQ, "复制群号") + "</div>");
    h.push('<div class="tty-contact__row"><span class="t-dim">EMAIL</span><b>' + MAIL + "</b>" + copyBtn(MAIL, "复制邮箱") + "</div>");
    h.push('<p class="tty-contact__note t-dim">加群请备注「班级 + 姓名」。</p>');
    h.push("</div>");
    h.push(L('<a class="tty-link" href="projects.html">$ cd ../projects</a>　' +
      '<a class="tty-link" href="gallery.html">$ cd ../gallery</a>　' +
      '<a class="tty-link" href="member.html">$ cd ../member</a>'));
    return h.join("");
  }

  function paneAbout() {
    lineIdx = 0;
    var h = [];
    h.push(L('<span class="t-dim">$</span> man hnyz <span class="t-dim">(1)</span>'));
    h.push(L('<b class="t-amb">NAME</b>　　hnyz — 衡南一中编程社 / HNYZ CS CLUB'));
    h.push(L('<b class="t-amb">SYNOPSIS</b>　$ join --class 班级 --name 姓名'));
    h.push(L('<b class="t-amb">DATE</b>　　每周两次 · 每次 60 分钟 · 时间地点见 QQ 群公告'));
    h.push(L('<b class="t-amb">DESCRIPTION</b>'));
    h.push(L("一个把好奇心变成作品的地方。不用先学完什么才能来：从点亮第一颗 LED、读按钮和传感器开始，学数字/模拟输入输出、串口和简单的控制逻辑，再组队完成一个完整的硬件小项目。ESP32 会作为进阶平台接触。", "t-mut tty-indent"));
    h.push(L('<b class="t-amb">CULTURE</b>'));
    h.push(L("1. 做完比完美更重要。", "tty-indent"));
    h.push(L("2. 提问不需要理由，卡住就喊。", "tty-indent"));
    h.push(L("3. 零基础和非技术方向都欢迎——项目还需要设计、文案、测试和组织。", "tty-indent"));
    h.push(L('<b class="t-amb">SEE ALSO</b>　build(1) · sched(5) · join(1)'));
    return h.join("");
  }

  function paneBuild() {
    lineIdx = 0;
    var h = [];
    h.push(L('<span class="t-dim">$</span> git log --oneline <span class="t-dim">~/repos --all</span>'));
    h.push('<div class="tty-repos" data-repos><p class="t-dim" style="--i:' + (lineIdx++) + '">fetching origin/data/repos.json ...</p></div>');
    h.push(L('<a class="tty-link" href="projects.html">$ cd ../projects　<span class="t-dim"># 全部仓库与项目卡片</span></a>'));
    return h.join("");
  }

  function renderRepos(box, data) {
    if (!box) return;
    lineIdx = 0;
    var h = [];
    var repos = data && data.repos ? Object.keys(data.repos).map(function (k) { return data.repos[k]; }) : [];
    if (!repos.length) {
      h.push(L("origin: 没有取到仓库快照，去 projects.html 看实时版。", "t-dim"));
    } else {
      repos.sort(function (a, b) { return String(b.pushed_at || "").localeCompare(String(a.pushed_at || "")); });
      repos.forEach(function (r) {
        var hash = pseudoHash(r.name || r.full_name || "?");
        var desc = r.description ? esc(r.description) : '<span class="t-dim">（还没有描述）</span>';
        h.push(L(
          '<span class="t-dim">*</span> <a class="tty-link" href="' + esc(r.html_url || "#") + '" target="_blank" rel="noopener noreferrer">' + esc(r.name || "") + "</a> " +
          '<span class="t-dim">[' + esc(r.language || "—") + "]</span> " +
          '<span class="t-dim">★' + (r.stargazers_count || 0) + "</span><br>" +
          '<span class="t-mut tty-desc">' + desc + "</span>"
        ));
      });
    }
    box.innerHTML = h.join("");
  }

  function pseudoHash(s) {
    var x = 0x1b873593;
    for (var i = 0; i < s.length; i += 1) { x = ((x ^ s.charCodeAt(i)) * 0x01000193) >>> 0; }
    return ("0000000" + x.toString(16)).slice(-7);
  }

  function paneSched() {
    lineIdx = 0;
    var h = [];
    h.push(L('<span class="t-dim">$</span> crontab -l <span class="t-dim">| grep hnyz</span>'));
    h.push(L('<span class="t-dim"># 每周两次 · 每次 60 min · 时间地点以 QQ 群公告为准，考试周会减量</span>'));
    h.push(L('<b class="t-brt">0 60min * * 2</b>　主题分享 + 结对开发　<span class="t-dim"># 从一个小主题讲起，讲完就动手</span>'));
    h.push(L('<b class="t-brt">0 60min * * 5</b>　自由开发 + 问题排查　<span class="t-dim"># 带项目来，报错现场修</span>'));
    h.push(L('<b class="t-brt">0 60min 1 * *</b>　demo-day --monthly　<span class="t-dim"># 展示这个月做的东西，接受不完美</span>'));
    h.push(L('<span class="t-dim">$</span> breakdown --one-session'));
    h.push('<div class="tty-timeline" style="--i:' + (lineIdx++) + '" aria-label="一次活动 60 分钟的时间分配">' +
      '<i style="width:16.7%" data-k="分享 10’"></i><i style="width:41.6%" data-k="开发 25’"></i>' +
      '<i style="width:25%" data-k="同步 15’"></i><i style="width:16.7%" data-k="答疑 10’"></i></div>' +
      '<p class="tty-timeline__cap t-dim" style="--i:' + (lineIdx++) + '">分享 10’ · 自由开发 25’ · 进度同步 15’ · 提问/结对 10’</p>');
    return h.join("");
  }

  function paneWall() {
    lineIdx = 0;
    var h = [];
    h.push(L('<span class="t-dim">$</span> ls -la <span class="t-dim">/srv/wall</span>'));
    h.push('<div class="tty-wall" style="--i:' + (lineIdx++) + '">');
    h.push('<a class="tty-wall__row" href="https://www.runoob.com/cplusplus/cpp-tutorial.html" target="_blank" rel="noopener noreferrer">' +
      '<span class="t-dim">drwxr-xr-x</span><b class="t-amb">CPP/</b><span>C++ 菜鸟教程</span><span class="tty-wall__host t-dim">runoob.com ↗</span></a>');
    h.push('<a class="tty-wall__row" href="https://www.waveshare.net/wiki/ESP32-S3-DEV-KIT-N8R8" target="_blank" rel="noopener noreferrer">' +
      '<span class="t-dim">drwxr-xr-x</span><b class="t-amb">ESP32/</b><span>微雪 ESP32-S3 Wiki</span><span class="tty-wall__host t-dim">waveshare.net ↗</span></a>');
    h.push("</div>");
    h.push(L('<span class="t-dim"># C++ 基础配合 Arduino 项目一起看；ESP32 统一看微雪的 Wiki。</span>', "t-dim"));
    h.push(L('<span class="t-dim"># 有想推荐给社团的教程、工具或项目，丢进 QQ 群，这面墙会一直补。</span>', "t-dim"));
    return h.join("");
  }

  function paneFaq() {
    lineIdx = 0;
    var h = [];
    h.push(L('<span class="t-dim">$</span> faq --list <span class="t-dim">（点问题展开）</span>'));
    var qa = [
      ["零基础可以加入吗？", "可以。社团里有很多人也是从零开始的。你不需要先学完某门课再来，带着问题和兴趣来就够了。"],
      ["社团主要教什么？", "教学内容以 Arduino 为主线：从点亮 LED、读按钮和传感器开始，学数字/模拟输入输出、串口、简单控制逻辑，再完成一个完整的硬件小项目。ESP32 作为进阶平台接触。"],
      ["需要自己带电脑吗？", "有电脑会更方便，但不是硬性要求。没有电脑也可以先来听分享、参与讨论和设计，之后再决定怎么参与项目。"],
      ["不是技术方向也能加入吗？", "可以。一个项目除了写代码，还需要设计、文案、测试和活动组织。先认领一件小事，再慢慢找到自己擅长的部分。"],
      ["活动时间是什么时候？", "常规活动每周两次，每次一小时：一次主题分享 + 结对开发，一次自由开发 + 问题排查。具体时间地点在 QQ 群公告里，考试周会适当调整。"]
    ];
    qa.forEach(function (p, i) {
      h.push('<details class="tty-faq" style="--i:' + (lineIdx++) + '"' + (i === 0 ? " open" : "") + ">" +
        "<summary><span class='t-dim'>" + pad(i + 1) + " ▸</span> " + esc(p[0]) + "</summary>" +
        "<p>" + esc(p[1]) + "</p></details>");
    });
    return h.join("");
  }

  function paneMsg() {
    lineIdx = 0;
    var h = [];
    h.push(L('<span class="t-dim">$</span> tail -f <span class="t-dim">~/hnyz/guestbook.log</span>'));
    h.push(L("▌ 留言走 GitHub Discussions：公开、不设匿名、没有第三方服务器——删库才会消失。", "t-mut"));
    h.push(L('▌ <span class="t-dim">listening for new messages…</span>'));
    h.push(L('<button type="button" class="tty-btn" data-open-guestbook>打开留言板 →</button>　<span class="t-dim tty-inline-note">需要 JavaScript 与 GitHub 账号</span>'));
    return h.join("");
  }

  function paneJoin() {
    lineIdx = 0;
    var h = [];
    h.push(L('<span class="t-dim">$</span> ssh newmember@hnyz.club'));
    h.push(L("▸ 第一次来不用准备任何东西，直接来坐坐。", "t-mut"));
    h.push('<div class="tty-contact" style="--i:' + (lineIdx++) + '">');
    h.push('<div class="tty-contact__row"><span class="t-dim">QQ 群</span><b class="t-brt">' + QQ + "</b>" + copyBtn(QQ, "复制群号") + "</div>");
    h.push('<div class="tty-contact__row"><span class="t-dim">邮箱</span><b>' + MAIL + "</b>" + copyBtn(MAIL, "复制邮箱") + "</div>");
    h.push('<div class="tty-contact__row"><span class="t-dim">备注</span><span>班级 + 姓名</span></div>');
    h.push('<p class="tty-contact__note t-dim">零基础 OK · 非技术方向 OK · 考试周活动会减量</p>');
    h.push("</div>");
    return h.join("");
  }

  function copyBtn(text, label) {
    return '<button type="button" class="tty-cp" data-copy="' + esc(text) + '">' + esc(label) + "</button>";
  }

  var BUILDERS = {
    main: paneMain, about: paneAbout, build: paneBuild, sched: paneSched,
    wall: paneWall, faq: paneFaq, msg: paneMsg, join: paneJoin
  };

  /* ---------------------------------------------------------
     模块级状态
     --------------------------------------------------------- */
  var root = null;
  var tabsEl = null, bodyEl = null, echoEl = null, inputEl = null;
  var clockEl = null, upEl = null;
  var panes = [];
  var active = 0;
  var built = false;
  var isOpen = false;
  var openedAt = 0;
  var tickTimer = 0;

  var savedActionsParent = null;
  var savedActionsNext = null;

  /* ---------------------------------------------------------
     时钟与 uptime
     --------------------------------------------------------- */
  function fmtUptime(ms) {
    var s = Math.floor(ms / 1000);
    return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
  }

  function tick() {
    if (!isOpen) return;
    var d = new Date();
    if (clockEl) clockEl.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    if (upEl) upEl.textContent = "UP " + fmtUptime(Date.now() - openedAt);
  }

  /* ---------------------------------------------------------
     窗口切换：滚动位置各自保留
     --------------------------------------------------------- */
  function goto(i) {
    if (!built) return;
    var n = WINDOWS.length;
    active = ((i % n) + n) % n;
    panes.forEach(function (p, j) {
      p.hidden = j !== active;
    });
    Array.prototype.forEach.call(tabsEl.children, function (t, j) {
      t.setAttribute("aria-selected", j === active ? "true" : "false");
      t.classList.toggle("is-active", j === active);
    });
    /* 每个窗口自己管焦点，切过去把焦点给面板，键盘立即能用 */
    try { panes[active].focus({ preventScroll: true }); } catch (e) { /* 忽略 */ }
  }

  /* ---------------------------------------------------------
     命令行
     --------------------------------------------------------- */
  function echo(html, isErr) {
    if (!echoEl) return;
    var p = document.createElement("p");
    p.className = "tty-echo__ln" + (isErr ? " is-err" : "");
    p.innerHTML = html;
    echoEl.appendChild(p);
    while (echoEl.children.length > 6) echoEl.removeChild(echoEl.firstChild);
    echoEl.scrollTop = echoEl.scrollHeight;
  }

  function runCommand(raw) {
    var c = String(raw || "").trim();
    echo('<span class="t-dim">guest@hnyz:~$</span> ' + esc(c));
    var k = c.toLowerCase().replace(/\s+/g, "");
    if (!k) return;

    for (var i = 0; i < WINDOWS.length; i += 1) {
      if (k === WINDOWS[i].cmd) { goto(i); return; }
      if (k === String(i)) { goto(i); return; }
    }

    switch (k) {
      case "help":
      case "?":
        echo("可用命令：<br>" +
          "　<span class='t-amb'>main about build sched wall faq msg join</span>　切到对应窗口<br>" +
          "　<span class='t-amb'>0-7</span>　切窗口　<span class='t-amb'>ls</span>　列出窗口<br>" +
          "　<span class='t-amb'>gallery member projects</span>　打开对应页面<br>" +
          "　<span class='t-amb'>whoami clear</span>　我是谁 / 清屏");
        return;
      case "ls":
        echo(WINDOWS.map(function (w, j) { return "<span class='t-dim'>" + j + "</span>:" + w.cmd; }).join("　"));
        return;
      case "whoami":
        echo("guest — 衡南一中编程社的访客。输入 <span class='t-amb'>join</span> 看怎么加入。");
        return;
      case "clear":
        echoEl.innerHTML = "";
        return;
      case "gallery":
        echo("→ opening gallery.html");
        window.setTimeout(function () { window.location.href = "gallery.html"; }, 240);
        return;
      case "member":
      case "members":
        echo("→ opening member.html");
        window.setTimeout(function () { window.location.href = "member.html"; }, 240);
        return;
      case "projects":
      case "repos":
        echo("→ opening projects.html");
        window.setTimeout(function () { window.location.href = "projects.html"; }, 240);
        return;
      default:
        echo("tty: command not found: " + esc(k) + "　<span class='t-dim'>(try: help)</span>", true);
    }
  }

  /* ---------------------------------------------------------
     复制（带老内核回退）
     --------------------------------------------------------- */
  function flash(btn, ok) {
    if (!btn) return;
    var old = btn.getAttribute("data-copy-label") || btn.textContent;
    btn.setAttribute("data-copy-label", old);
    btn.textContent = ok ? "已复制 ✓" : "复制失败";
    btn.classList.add("is-done");
    window.setTimeout(function () {
      btn.textContent = old;
      btn.classList.remove("is-done");
    }, 1400);
  }

  function doCopy(btn) {
    var text = btn.getAttribute("data-copy") || "";
    function legacy() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      flash(btn, ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(btn, true); }, legacy);
    } else {
      legacy();
    }
  }

  /* ---------------------------------------------------------
     事件：根上走一遍委托，切换皮肤拆 DOM 时一起消失
     --------------------------------------------------------- */
  function bindRoot() {
    tabsEl.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-win]");
      if (!b) return;
      goto(parseInt(b.getAttribute("data-win"), 10) || 0);
    });

    bodyEl.addEventListener("click", function (e) {
      var cp = e.target.closest("[data-copy]");
      if (cp) { doCopy(cp); return; }
      if (e.target.closest("[data-open-guestbook]")) {
        close();
        window.setTimeout(function () {
          var el = document.getElementById("guestbook");
          if (!el) return;
          el.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "start" });
        }, 90);
      }
    });

    /* 输入行 */
    var form = root.querySelector(".tty__prompt");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      runCommand(inputEl.value);
      inputEl.value = "";
    });
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { inputEl.blur(); e.stopPropagation(); }
    });
  }

  /* 这些监听绑在 document/window 上，模块加载时只绑一次：
     TUI 是「切走就拆、切回重建」的，绑在 build() 里会一路累积 */
  document.addEventListener("keydown", function (e) {
    if (!isOpen) return;
    if (e.target === inputEl) return; /* 输入行里让 shell 自己处理 */

    var k = e.key;
    if (k >= "0" && k <= "7") { e.preventDefault(); goto(parseInt(k, 10)); return; }
    if (k === ":" || k === "/") { e.preventDefault(); try { inputEl.focus(); } catch (err) { /* 忽略 */ } return; }
    if (k === "?") { e.preventDefault(); runCommand("help"); return; }
    if (k === "Escape") { return; }

    if (k === "j" || k === "ArrowDown") { e.preventDefault(); panes[active].scrollTop += 72; return; }
    if (k === "k" || k === "ArrowUp") { e.preventDefault(); panes[active].scrollTop -= 72; return; }
  });

  window.addEventListener("resize", function () {
    /* 纯 CSS 布局，不需要重算；留着这个空位是为了日后加东西时别忘了 passive */
  }, { passive: true });

  window.addEventListener("hashchange", function () {
    /* 从别处带 #guestbook 这类锚点进来时，让位给真正的页面内容 */
    if (isOpen && window.location.hash) close();
  });

  /* ---------------------------------------------------------
     顶栏按钮：把原顶栏的 .header-actions 整块搬进 TUI，
     关掉时再搬回去——监听器都在元素上，搬家不影响功能
     --------------------------------------------------------- */
  function adoptActions() {
    var ha = document.querySelector(".header-actions");
    if (!ha) return;
    savedActionsParent = ha.parentNode;
    savedActionsNext = ha.nextSibling;
    root.querySelector(".tty__actions").appendChild(ha);
  }

  function returnActions() {
    if (!document.querySelector(".tty") || !savedActionsParent) return;
    var ha = document.querySelector(".header-actions");
    if (ha) {
      try { savedActionsParent.insertBefore(ha, savedActionsNext); } catch (e) { savedActionsParent.appendChild(ha); }
    }
    savedActionsParent = null;
    savedActionsNext = null;
  }

  /* ---------------------------------------------------------
     开 / 关
     --------------------------------------------------------- */
  function open() {
    if (!built) return;
    isOpen = true;
    openedAt = Date.now();
    adoptActions();
    root.classList.add("is-on");
    root.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("tty-on");
    document.body.classList.add("tty-on");
    window.scrollTo(0, 0);
    goto(active);
    tick();
    if (tickTimer) window.clearInterval(tickTimer);
    tickTimer = window.setInterval(tick, 1000);
  }

  function close() {
    isOpen = false;
    if (tickTimer) { window.clearInterval(tickTimer); tickTimer = 0; }
    if (root) {
      root.classList.remove("is-on");
      root.setAttribute("aria-hidden", "true");
    }
    returnActions();
    document.documentElement.classList.remove("tty-on");
    document.body.classList.remove("tty-on");
  }

  /* ---------------------------------------------------------
     构建（只建一次；切走皮肤时拆掉）
     --------------------------------------------------------- */
  function build() {
    var tabs = WINDOWS.map(function (w, i) {
      return '<button type="button" role="tab" data-win="' + i + '" aria-selected="false" tabindex="-1">' +
        '<span class="tty-tab__no">' + i + "</span>" + esc(w.cmd) +
        "</button>";
    }).join("");

    var panesHtml = WINDOWS.map(function (w, i) {
      return '<div class="tty__pane" role="tabpanel" aria-label="' + esc(w.title) + '" tabindex="-1" hidden></div>';
    }).join("");

    root = document.createElement("div");
    root.className = "tty";
    root.setAttribute("role", "application");
    root.setAttribute("aria-label", "HNYZ 终端");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML =
      '<header class="tty__top">' +
      '  <span class="tty__logo" aria-hidden="true">▚</span>' +
      '  <span class="tty__brand">HNYZ<i>//TTY</i></span>' +
      '  <span class="tty__sess">hnyz@club · tty1 · amber</span>' +
      '  <span class="tty__clock" aria-hidden="true"></span>' +
      '  <span class="tty__actions"></span>' +
      "</header>" +
      '<nav class="tty__tabs" role="tablist" aria-label="终端窗口">' + tabs + "</nav>" +
      '<div class="tty__body">' + panesHtml + "</div>" +
      '<div class="tty__echo" aria-live="polite"></div>' +
      '<form class="tty__prompt">' +
      '  <label class="tty__prompt-label" for="tty-cmd-input">guest@hnyz:~$</label>' +
      '  <input id="tty-cmd-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" aria-label="输入命令，help 查看可用命令">' +
      "</form>" +
      '<footer class="tty__legend" aria-hidden="true">' +
      '  <span><kbd>0-7</kbd> 切窗口 · <kbd>↑↓</kbd>/<kbd>j k</kbd> 滚动 · <kbd>:</kbd> 命令 · <kbd>?</kbd> 帮助</span>' +
      '  <span class="tty__up"></span>' +
      "</footer>";

    document.body.appendChild(root);

    tabsEl = root.querySelector(".tty__tabs");
    bodyEl = root.querySelector(".tty__body");
    echoEl = root.querySelector(".tty__echo");
    inputEl = root.querySelector("#tty-cmd-input");
    clockEl = root.querySelector(".tty__clock");
    upEl = root.querySelector(".tty__up");

    panes = Array.prototype.slice.call(bodyEl.querySelectorAll(".tty__pane"));
    panes.forEach(function (p, i) { p.innerHTML = BUILDERS[WINDOWS[i].id](); });

    bindRoot();
    built = true;

    /* 仓库窗口：data/repos.json 是 Actions 每天抓好的快照，直接用 */
    var box = root.querySelector("[data-repos]");
    if (box && window.fetch) {
      window.fetch("data/repos.json?v=20261103g")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { renderRepos(box, d); })
        .catch(function () { renderRepos(box, null); });
    } else if (box) {
      renderRepos(box, null);
    }
  }

  function teardown() {
    close();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null; tabsEl = null; bodyEl = null; echoEl = null; inputEl = null;
    clockEl = null; upEl = null; panes = [];
    built = false;
    active = 0;
  }

  /* ---------------------------------------------------------
     对外：只有 sync 一个口子
     --------------------------------------------------------- */
  function sync(on) {
    /* 只有首页有完整的首屏（section.hero）：内页凑不满八个窗口，
       维持琥珀纸带不动，跟旧环形框架「凑不满就不建」是同一个道理 */
    if (on && !document.querySelector("section.hero")) return;
    if (on) {
      if (!built) build();
      open();
    } else if (built) {
      teardown();
    }
  }

  window.HNYZTUI = { sync: sync, goto: goto, run: runCommand };

  /* 直接带 style=term 打开首页时，skins.js 会调 sync(true)，这里不用抢跑 */
})();
