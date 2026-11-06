/* =========================================================
   HNYZ · 终端风的四板块工作台（HNYZ TTY）
   ---------------------------------------------------------
   把首页当成一块 12 列的方块矩阵，而不是一页可以滚的网页：

     · 顶栏    品牌 + 会话名 + 实时时钟，右侧是原顶栏的按钮区；
     · 左栏    四个板块（概览 / 关于 / 作品 / 加入），竖排、编号 0-3；
     · 中区    当前板块的方块矩阵：每个方块是一块面板，
               大小按 12 列切（7+5、5+4+3 这类），内容全部落在方块里；
     · 右栏    本板块的方块索引（点一下滚到那块）+ 上下板块 + 会话状态；
     · 底栏    一条真的能敲的 shell，和 dsh 的输入行 / 状态条同构。

   切板块的动效是「旧矩阵缩小淡出、新矩阵从略大缩回并淡入」，
   方块再按顺序错峰浮起，不做整页跳转。

   交互参照 ccch1mneyyy/dsh-TUI 的界面结构：左侧 rail 选会话、
   中间主区、右侧 contextual panel、底部输入行与状态条。
   几何为零，全是排版。

   只在终端风首页由 js/skins.js 的 syncTerm() 调 HNYZTUI.sync()。
   内页维持琥珀纸带不动。
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     四个板块：顺序就是侧栏顺序，cmd 是命令行里能敲的名字
     --------------------------------------------------------- */
  var BLOCKS = [
    { id: "overview", cmd: "overview", en: "OVERVIEW", zh: "概览", title: "launchpad", sub: "社团速览 · 会话入口" },
    { id: "about",    cmd: "about",    en: "ABOUT",    zh: "关于", title: "man hnyz(1)", sub: "这是个什么样的社团" },
    { id: "work",     cmd: "work",     en: "WORK",     zh: "作品", title: "git log ~/repos", sub: "做出来的东西 · 能用的资源" },
    { id: "join",     cmd: "join",     en: "JOIN",     zh: "加入", title: "ssh newmember@hnyz", sub: "怎么来 · 问什么 · 在哪聊" }
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

  /* 行构建器：给每一行编个号，入场时按 34ms 错峰打印 */
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

  function copyBtn(text, label) {
    return '<button type="button" class="tty-cp" data-copy="' + esc(text) + '">' + esc(label) + "</button>";
  }

  /* ---------------------------------------------------------
     形象：dsh-TUI 的 Deepy（42×30 像素鲸鱼）
     原素材是按调色板索引的帧，这里换成 canvas 播放，
     静态首帧仍走 <img>，脚本没跑到也不会留一块空白。
     --------------------------------------------------------- */
  var DEEPY_W = 42;
  var DEEPY_H = 30;
  var DEEPY_SRC = "images/deepy/idle.webp";
  var DEEPY_IDLE = "idle";
  var deepyData = null;
  var deepyLoading = false;
  var deepyWaiters = [];
  var deepyCtx = null;
  var deepyAnim = DEEPY_IDLE;
  var deepyStart = 0;
  var deepyFrame = 0;
  var deepyTimer = 0;
  var deepyNext = 0;
  var deepyCache = {};

  function deepyBox(cell, label, interactive) {
    return '<span class="tty-deepy"' + (cell ? ' style="--cell:' + cell + 'px"' : "") +
      (label ? ' role="img"' + (interactive ? ' tabindex="0"' : "") + ' aria-label="' + esc(label) + '"' : ' aria-hidden="true"') + ">" +
      '<img class="tty-deepy__img" src="' + DEEPY_SRC + '" width="' + DEEPY_W * 4 + '" height="' + DEEPY_H * 4 +
      '" alt="" decoding="async"' + (interactive ? "" : ' loading="lazy"') + ">" +
      (interactive ? '<canvas class="tty-deepy__cv" width="' + DEEPY_W + '" height="' + DEEPY_H + '"></canvas>' : "") +
      "</span>";
  }

  function deepyFrames(anim) {
    if (deepyCache[anim]) return deepyCache[anim];
    if (!deepyData || !deepyData.animations[anim]) return null;
    var pal = deepyData.palette;
    var list = deepyData.animations[anim].map(function (f) {
      var c = document.createElement("canvas");
      c.width = DEEPY_W;
      c.height = DEEPY_H;
      var g = c.getContext("2d");
      for (var y = 0; y < DEEPY_H; y += 1) {
        for (var x = 0; x < DEEPY_W; x += 1) {
          var ch = f.p.charAt(y * DEEPY_W + x);
          if (!ch || ch === ".") continue;
          var hex = pal[ch];
          if (!hex) continue;
          g.fillStyle = hex;
          g.fillRect(x, y, 1, 1);
        }
      }
      return { d: f.d, c: c };
    });
    deepyCache[anim] = list;
    return list;
  }

  function paintDeepy(anim, index) {
    if (!deepyCtx) return;
    var frames = deepyFrames(anim);
    if (!frames || !frames[index]) return;
    deepyCtx.clearRect(0, 0, DEEPY_W, DEEPY_H);
    deepyCtx.drawImage(frames[index].c, 0, 0);
  }

  /* 一帧一帧按原素材的 dur 走；idle 循环，互动动画播完自动回 idle */
  function stepDeepy(now) {
    if (!deepyCtx) return;
    var frames = deepyFrames(deepyAnim) || deepyFrames(DEEPY_IDLE);
    if (!frames) return;
    if (!deepyStart) deepyStart = now;
    var wait = frames[deepyFrame] ? frames[deepyFrame].d : 400;
    if (now - deepyStart >= wait) {
      deepyStart = now;
      deepyFrame += 1;
      if (deepyFrame >= frames.length) {
        deepyFrame = 0;
        if (deepyAnim !== DEEPY_IDLE) {
          deepyAnim = DEEPY_IDLE;
          frames = deepyFrames(DEEPY_IDLE);
        }
      }
      paintDeepy(deepyAnim, deepyFrame);
    }
    /* 待机不能真的一动不动：每 9–16 秒插一段喷水或游动，再回待机 */
    if (deepyAnim === DEEPY_IDLE && now > deepyNext) {
      deepyNext = now + 9000 + Math.random() * 7000;
      playDeepy(Math.random() < 0.55 ? "idle-spout" : "swim");
    }
    deepyTimer = window.requestAnimationFrame(stepDeepy);
  }

  function playDeepy(anim) {
    if (!deepyCtx || !deepyData || !deepyData.animations[anim] || deepyAnim === anim) return;
    deepyAnim = anim;
    deepyFrame = 0;
    deepyStart = 0;
    paintDeepy(anim, 0);
  }

  function loadDeepy() {
    if (deepyData || deepyLoading || !window.fetch) return;
    deepyLoading = true;
    window.fetch("data/deepy.json?v=20261105q")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        deepyData = d;
        deepyWaiters.forEach(function (fn) { fn(d); });
        deepyWaiters = [];
      })
      .catch(function () { deepyWaiters = []; })
      .then(function () { deepyLoading = false; });
  }

  /* 概览方块里那只：静态图先站着，数据到了再换成会动的 canvas */
  function mountDeepy(el) {
    if (!el) return;
    var cv = el.querySelector(".tty-deepy__cv");
    if (!cv || !cv.getContext) return;
    deepyCtx = cv.getContext("2d");
    paintDeepy(DEEPY_IDLE, 0);
    el.classList.add("is-live");

    var start = function () {
      if (!deepyData) {
        deepyWaiters.push(start);
        loadDeepy();
        return;
      }
      if (deepyTimer) return;
      deepyNext = (window.performance ? performance.now() : Date.now()) + 8000;
      deepyTimer = window.requestAnimationFrame(stepDeepy);
    };

    if (motionOK()) {
      /* 首屏先让位给文字，鲸鱼等浏览器闲下来再动 */
      if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 1600 });
      else window.setTimeout(start, 900);
    }

    el.addEventListener("click", function () {
      if (!deepyData) return;
      var pool = ["happy", "poke-left", "poke-right", "idle-spout"];
      playDeepy(pool[Math.floor(Math.random() * pool.length)]);
    });
    el.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      el.click();
    });
  }

  function stopDeepy() {
    if (deepyTimer) { window.cancelAnimationFrame(deepyTimer); deepyTimer = 0; }
    deepyCtx = null;
    deepyNext = 0;
    deepyAnim = DEEPY_IDLE;
    deepyFrame = 0;
    deepyStart = 0;
  }

  var GLYPH = {
    H: ["101", "101", "111", "101", "101"],
    N: ["1001", "1101", "1011", "1001", "1001"],
    Y: ["101", "101", "010", "010", "010"],
    Z: ["1111", "0001", "0010", "1000", "1111"]
  };

  function wordmark() {
    var rows = ["", "", "", "", ""];
    ["H", "N", "Y", "Z"].forEach(function (ch, wi) {
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
    return '<span class="tty-pixel" role="img" aria-label="HNYZ">' + px + "</span>";
  }

  /* ---------------------------------------------------------
     方块：一块面板 = 标题条 + 正文，大小按 12 列切
     body 传函数，是为了让每块内部的行号从 0 重新错峰
     --------------------------------------------------------- */
  var tileSeq = 0;
  function tile(no, name, span, meta, body, cls) {
    lineIdx = 0;
    var ti = tileSeq++;
    return '<section class="tile' + (cls ? " " + cls : "") + '" style="--c:' + span + ";--ti:" + ti +
      '" data-tile="' + no + '" data-name="' + esc(name) + '">' +
      '<header class="tile__hdr">' +
      '<span class="tile__no">' + no + "</span>" +
      '<span class="tile__name">' + esc(name) + "</span>" +
      (meta ? '<span class="tile__meta">' + esc(meta) + "</span>" : "") +
      "</header>" +
      '<div class="tile__bd">' + body() + "</div>" +
      "</section>";
  }

  /* ---------------------------------------------------------
     板块 0 · 概览
     --------------------------------------------------------- */
  function gridOverview() {
    tileSeq = 0;
    var d = new Date();
    var date = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

    return tile("0.1", "launchpad", 7, "42×30", function () {
      var h = [];
      h.push('<div class="tty-hero" style="--i:' + (lineIdx++) + '">' +
        deepyBox(0, "Deepy 像素鲸鱼，点一下它会动", true) + wordmark() + "</div>");
      h.push('<div class="tty-meta" style="--i:' + (lineIdx++) + '">' +
        "<span>hnyz-tty <b>6.4.0</b> · 雾蓝主题 · 访客登录</span>" +
        "<span>~/hnyz · 上次登录 " + date + " · 教学楼机房</span>" +
        "<span>提示：输入 <b>help</b> 看命令，<b>0-3</b> 换板块，<b>[ ]</b> 前后翻</span>" +
        "</div>");
      h.push(L('<span class="t-dim">#</span> 各页入口在 0.4；也可以直接敲 <span class="t-cyn">projects</span> / <span class="t-cyn">gallery</span> / <span class="t-cyn">member</span>', "t-dim"));
      return h.join("");
    }) +

    tile("0.2", "一句话", 5, "intro", function () {
      return '<p class="tty-tag" style="--i:' + (lineIdx++) + '">把想法，<span>写成代码</span>。</p>' +
        L("衡南一中编程社 · 全校学生都能参加", "t-cyn") +
        L("主线是 Arduino 硬件：从点亮第一颗 LED 开始，学接线、写程序、查问题，再组队做一个小装置。零基础也能来。", "t-mut") +
        '<ul class="tty-tags" style="--i:' + (lineIdx++) + '">' +
        "<li><span>01</span>零基础友好</li>" +
        "<li><span>02</span>Arduino 主线</li>" +
        "<li><span>03</span>每周两小时</li>" +
        "<li><span>04</span>做完比完美更重要</li>" +
        "</ul>";
    }) +

    tile("0.3", "节奏", 5, "meters", function () {
      return '<div class="tty-meters">' +
        meter("活动频率", 2 / 7, "每周 2 次") +
        meter("单次时长", 60 / 60, "60 分钟") +
        meter("入门要求", 0, "零基础") +
        meter("项目周期", 5 / 10, "一学期") +
        "</div>";
    }) +

    tile("0.4", "入口", 4, "4 个入口", function () {
      return '<ul class="tty-entries">' +
        '<li><a href="projects.html"><b>projects</b><span>全部仓库与项目卡片</span><i>↗</i></a></li>' +
        '<li><a href="gallery.html"><b>gallery</b><span>活动的照片与作品图</span><i>↗</i></a></li>' +
        '<li><a href="member.html"><b>member</b><span>社团成员与各自的仓库</span><i>↗</i></a></li>' +
        '<li><a href="https://github.com/ghxiaochi" target="_blank" rel="noopener noreferrer"><b>github</b><span>源码、问题讨论与提交记录</span><i>↗</i></a></li>' +
        "</ul>";
    }) +

    tile("0.5", "联系", 3, "contact", function () {
      return '<div class="tty-contact tty-contact--flat">' +
        '<div class="tty-contact__row"><span class="t-dim">QQ 群</span><b>' + QQ + "</b>" + copyBtn(QQ, "复制") + "</div>" +
        '<div class="tty-contact__row"><span class="t-dim">邮箱</span><b>' + MAIL + "</b>" + copyBtn(MAIL, "复制") + "</div>" +
        '<div class="tty-contact__row"><span class="t-dim">位置</span><span>教学楼机房</span></div>' +
        '<p class="tty-contact__note t-dim">加群请备注「班级 + 姓名」。</p>' +
        "</div>";
    });
  }

  /* ---------------------------------------------------------
     板块 1 · 关于
     --------------------------------------------------------- */
  function gridAbout() {
    tileSeq = 0;

    return tile("1.1", "man hnyz", 7, "man 1", function () {
      var h = [];
      h.push(L('<span class="t-dim">$</span> man hnyz <span class="t-dim">(1)</span>'));
      h.push(L('<b class="t-yel">名称</b>　hnyz — 衡南一中编程社 / HNYZ CS CLUB'));
      h.push(L('<b class="t-yel">加入</b>　加 QQ 群，备注「班级 + 姓名」'));
      h.push(L('<b class="t-yel">时间</b>　每周两次，每次 60 分钟；具体见 QQ 群公告'));
      h.push(L('<b class="t-yel">简介</b>'));
      h.push(L("一个把好奇心变成作品的地方。不用先学完什么才能来：从点亮第一颗 LED、读按钮和传感器开始，学数字/模拟输入输出、串口和简单的控制逻辑，再组队完成一个完整的硬件小项目。ESP32 会作为进阶平台接触。", "t-mut tty-indent"));
      h.push(L('<b class="t-yel">另见</b>　右侧「作品」「加入」两栏'));
      return h.join("");
    }) +

    tile("1.2", "文化", 5, "3 条", function () {
      return '<ol class="tty-rules">' +
        '<li><b>做完比完美更重要。</b><span>先跑起来，再改好。</span></li>' +
        '<li><b>提问不需要理由。</b><span>卡住就喊，没人会笑。</span></li>' +
        '<li><b>不是只有写代码。</b><span>设计、文案、测试、组织，都是项目的一部分。</span></li>' +
        "</ol>";
    }) +

    tile("1.3", "课表", 7, "crontab", function () {
      var h = [];
      h.push(L('<span class="t-dim">$</span> crontab -l <span class="t-dim">| grep hnyz</span>'));
      h.push(L('<span class="t-dim"># 每周两次 · 每次 60 分钟 · 时间地点以 QQ 群公告为准，考试周会减量</span>'));
      h.push(L('<b class="t-grn">每周第一次</b>　主题分享 + 结对开发　<span class="t-dim"># 讲一个小主题，讲完就动手</span>'));
      h.push(L('<b class="t-grn">每周第二次</b>　自由开发 + 问题排查　<span class="t-dim"># 带项目来，报错现场修</span>'));
      h.push(L('<b class="t-grn">每月一次　</b>　Demo Day 展示　　　<span class="t-dim"># 展示这个月做的东西</span>'));
      h.push('<div class="tty-timeline" style="--i:' + (lineIdx++) + '" aria-label="一次活动 60 分钟的时间分配">' +
        '<i style="width:16.7%"></i><i style="width:41.6%"></i><i style="width:25%"></i><i style="width:16.7%"></i></div>' +
        '<p class="tty-timeline__cap t-dim" style="--i:' + (lineIdx++) + '">' +
        '<span class="t-cyn">分享 10’</span> · <span class="t-grn">自由开发 25’</span> · <span class="t-yel">进度同步 15’</span> · <span class="t-mgt">提问/结对 10’</span></p>');
      return h.join("");
    }) +

    tile("1.4", "资源墙", 5, "ls -la", function () {
      var h = [];
      h.push('<div class="tty-wall" style="--i:' + (lineIdx++) + '">');
      h.push('<a class="tty-wall__row" href="https://www.runoob.com/cplusplus/cpp-tutorial.html" target="_blank" rel="noopener noreferrer">' +
        '<b class="t-cyn">CPP/</b><span>C++ 菜鸟教程</span><span class="tty-wall__host t-dim">runoob ↗</span></a>');
      h.push('<a class="tty-wall__row" href="https://www.waveshare.net/wiki/ESP32-S3-DEV-KIT-N8R8" target="_blank" rel="noopener noreferrer">' +
        '<b class="t-cyn">ESP32/</b><span>微雪 ESP32-S3 Wiki</span><span class="tty-wall__host t-dim">waveshare ↗</span></a>');
      h.push('<a class="tty-wall__row" href="https://docs.arduino.cc/" target="_blank" rel="noopener noreferrer">' +
        '<b class="t-cyn">ARDUINO/</b><span>官方文档与示例</span><span class="tty-wall__host t-dim">arduino.cc ↗</span></a>');
      h.push('<a class="tty-wall__row" href="https://oshwhub.com/" target="_blank" rel="noopener noreferrer">' +
        '<b class="t-cyn">OSHWHUB/</b><span>立创开源硬件平台</span><span class="tty-wall__host t-dim">oshwhub ↗</span></a>');
      h.push("</div>");
      h.push(L("# C++ 基础配合 Arduino 项目一起看；ESP32 统一看微雪的 Wiki。", "t-dim"));
      h.push(L("# 想推荐教程、工具或项目，丢进 QQ 群，这面墙会一直补。", "t-dim"));
      return h.join("");
    });
  }

  /* ---------------------------------------------------------
     板块 2 · 作品
     --------------------------------------------------------- */
  function gridWork() {
    tileSeq = 0;

    return tile("2.1", "git log", 8, "全部", function () {
      return L('<span class="t-dim">$</span> git log --oneline <span class="t-dim">~/repos --all</span>') +
        '<div class="tty-repos" data-repos><p class="t-dim" style="--i:' + (lineIdx++) + '">正在读取仓库数据…</p></div>';
    }) +

    tile("2.2", "全部项目", 4, "→", function () {
      return '<p class="tty-note">卡片按成员分组，标了语言、star 和最近推送时间。点右上角的刷新按钮，可以跳过每日快照直接问 GitHub。</p>' +
        '<a class="tty-btn tty-btn--block" href="projects.html">全部项目 →</a>';
    }, "tile--spread") +

    tile("2.3", "图集", 4, "→", function () {
      return '<p class="tty-note">活动的照片、作品实物，还有社团的日常。点开看大图，方向键翻页。</p>' +
        '<a class="tty-btn tty-btn--block" href="gallery.html">图集 →</a>';
    }, "tile--spread") +

    tile("2.4", "技术栈", 4, "4 项", function () {
      return '<ul class="tty-stack">' +
        '<li><b>Arduino</b><span>主线平台</span></li>' +
        '<li><b>C++</b><span>配合硬件</span></li>' +
        '<li><b>ESP32</b><span>进阶方向</span></li>' +
        '<li><b>Figma</b><span>界面与海报</span></li>' +
        "</ul>";
    }) +

    tile("2.5", "参与", 4, "3 步", function () {
      return '<ol class="tty-rules tty-rules--tight">' +
        '<li><b>先读代码</b><span>从最近一次提交看起。</span></li>' +
        '<li><b>发现问题就提 issue</b><span>说清复现步骤就够。</span></li>' +
        '<li><b>想动手就来活动</b><span>现场结对，不用预约。</span></li>' +
        "</ol>";
    }, "tile--spread");
  }

  /* ---------------------------------------------------------
     板块 3 · 加入
     --------------------------------------------------------- */
  function gridJoin() {
    tileSeq = 0;

    return tile("3.1", "ssh newmember", 7, "join", function () {
      var h = [];
      h.push(L('<span class="t-dim">$</span> ssh newmember@hnyz.club'));
      h.push(L("▸ 第一次来不用准备任何东西，直接来坐坐。", "t-mut"));
      h.push(L("▸ 带电脑更好，没有也能先听分享、参与设计和讨论。", "t-mut"));
      h.push('<div class="tty-contact" style="--i:' + (lineIdx++) + '">');
      h.push('<div class="tty-contact__row"><span class="t-dim">QQ 群</span><b class="t-cyn">' + QQ + "</b>" + copyBtn(QQ, "复制群号") + "</div>");
      h.push('<div class="tty-contact__row"><span class="t-dim">邮箱</span><b>' + MAIL + "</b>" + copyBtn(MAIL, "复制邮箱") + "</div>");
      h.push('<div class="tty-contact__row"><span class="t-dim">备注</span><span>班级 + 姓名</span></div>');
      h.push('<p class="tty-contact__note t-dim">零基础可以 · 非技术方向也可以 · 考试周活动会减量</p>');
      h.push("</div>");
      return h.join("");
    }) +

    tile("3.2", "faq", 5, "5 问", function () {
      var h = [];
      h.push(L('<span class="t-dim">$</span> faq --list <span class="t-dim">（点问题展开）</span>'));
      var qa = [
        ["零基础可以加入吗？", "可以。社团里很多人也是从零开始的。你不需要先学完某门课再来，带着问题和兴趣来就够了。"],
        ["社团主要教什么？", "以 Arduino 为主线：从点亮 LED、读按钮和传感器开始，学数字/模拟输入输出、串口、简单控制逻辑，再完成一个完整的硬件小项目。ESP32 作为进阶平台接触。"],
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
    }) +

    tile("3.3", "留言", 5, "tail -f", function () {
      var h = [];
      h.push(L('<span class="t-dim">$</span> tail -f <span class="t-dim">~/hnyz/guestbook.log</span>'));
      h.push(L("▌ 留言走 GitHub Discussions：公开、不设匿名、没有第三方服务器——删库才会消失。", "t-mut"));
      h.push(L('▌ <span class="t-dim">正在等待新留言…</span>'));
      h.push(L('<button type="button" class="tty-btn" data-open-guestbook>打开留言板 →</button>　<span class="t-dim tty-inline-note">需要 GitHub 账号；没有就进群说一声</span>'));
      return h.join("");
    }, "tile--spread") +

    tile("3.4", "一句", 7, "motd", function () {
      return '<p class="tty-quote">"不用很厉害才开始，<br>开始了才会很厉害。"</p>' +
        L('<span class="t-dim">#</span> 衡南一中编程社 · 教学楼机房 · 每周两次', "t-dim") +
        '<div class="tty-cta">' +
        '<a class="tty-btn" href="member.html">看看成员</a>' +
        '<a class="tty-btn tty-btn--ghost" href="projects.html">先看作品</a>' +
        '<button type="button" class="tty-btn tty-btn--ghost" data-copy="' + QQ + '">复制群号</button>' +
        "</div>";
    }, "tile--spread");
  }

  var GRIDS = { overview: gridOverview, about: gridAbout, work: gridWork, join: gridJoin };

  /* ---------------------------------------------------------
     仓库数据：本地缓存优先，静态快照兜底
     --------------------------------------------------------- */
  function renderRepos(box, data) {
    if (!box) return;
    lineIdx = 0;
    var h = [];
    var repos = data && data.repos ? Object.keys(data.repos).map(function (k) { return data.repos[k]; }) : [];
    if (!repos.length) {
      h.push(L("没取到仓库数据，去「全部项目」页看实时版。", "t-dim"));
    } else {
      repos.sort(function (a, b) { return String(b.pushed_at || "").localeCompare(String(a.pushed_at || "")); });
      /* 仓库没写 About 时，用 members.js 里的本地简介兜底，别留一行空话 */
      var localDesc = {};
      (window.HNYZ_MEMBERS || []).forEach(function (m) {
        if (m && m.repo && m.desc) localDesc[m.repo] = m.desc;
      });

      repos.forEach(function (r) {
        var raw = String(r.description || "").trim();
        if (/^(没有简介|暂无简介|无|no description\.?|n\/a)$/i.test(raw)) raw = "";
        var desc = raw
          ? esc(raw)
          : (localDesc[r.name] ? esc(localDesc[r.name]) : '<span class="t-dim">（还没有描述）</span>');
        h.push(L(
          '<span class="t-dim">*</span> <a class="tty-link" href="' + esc(r.html_url || "#") + '" target="_blank" rel="noopener noreferrer">' + esc(r.name || "") + "</a> " +
          '<span class="t-mgt">[' + esc(r.language || "—") + "]</span> " +
          '<span class="t-yel">★' + (r.stargazers_count || 0) + "</span><br>" +
          '<span class="t-mut tty-desc">' + desc + "</span>"
        ));
      });
    }
    box.innerHTML = h.join("");
  }

  function readCachedRepos() {
    try {
      var raw = window.localStorage.getItem("hnyz:github-repo-cache:v1");
      var cache = raw ? JSON.parse(raw) : null;
      if (!cache || typeof cache !== "object") return null;
      var repos = {};
      var newest = 0;
      Object.keys(cache).forEach(function (k) {
        var entry = cache[k];
        if (!entry || !entry.data) return;
        repos[k] = entry.data;
        if (entry.savedAt > newest) newest = entry.savedAt;
      });
      return Object.keys(repos).length ? { repos: repos, newest: newest } : null;
    } catch (e) {
      return null;
    }
  }

  /* 先把缓存画出来（有的话），再拿快照比一次时间：
     快照更老就不动，免得把刚刷新过的数据盖回去 */
  function paintRepos(box) {
    if (!box) return;
    var cached = readCachedRepos();
    if (cached) renderRepos(box, { repos: cached.repos });

    window.fetch("data/repos.json?v=20261105q")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (store) {
        if (!store || !store.repos) {
          if (!cached) renderRepos(box, null);
          return;
        }
        var generatedAt = Date.parse(store.generatedAt || "") || 0;
        if (!cached || generatedAt > cached.newest) renderRepos(box, store);
      })
      .catch(function () {
        if (!cached) renderRepos(box, null);
      });
  }

  /* 顶部按钮同步完：作品板块里那份也得换 */
  window.addEventListener("hnyz:repos-synced", function () {
    if (!built) return;
    var box = root && root.querySelector("[data-repos]");
    if (!box) return;
    var cached = readCachedRepos();
    if (cached) renderRepos(box, { repos: cached.repos });
  });

  /* ---------------------------------------------------------
     模块级状态
     --------------------------------------------------------- */
  var root = null;
  var railEl = null, stageEl = null, sideEl = null;
  var stageNoEl = null, stageTtlEl = null, stageSubEl = null, stageStatEl = null;
  var echoEl = null, inputEl = null;
  var clockEl = null, upEl = null;
  var grids = [];
  var sideListEl = null;
  var active = 0;
  var built = false;
  var isOpen = false;
  var openedAt = 0;
  var tickTimer = 0;
  var swapTimer = 0;
  var swapToken = 0;
  var scrollRaf = 0;

  var savedActionsParent = null;
  var savedActionsNext = null;

  /* 时钟与 uptime */
  function fmtUptime(ms) {
    var s = Math.floor(ms / 1000);
    return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
  }

  function tick() {
    if (!isOpen) return;
    var d = new Date();
    if (clockEl) clockEl.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    if (upEl) upEl.textContent = "v6.4.0 · UP " + fmtUptime(Date.now() - openedAt);
  }

  /* ---------------------------------------------------------
     右栏：当前板块的方块索引
     --------------------------------------------------------- */
  function paintSide(index) {
    if (!sideListEl) return;
    var grid = grids[active];
    var items = grid ? grid.querySelectorAll(".tile") : [];
    var frag = [];
    Array.prototype.forEach.call(items, function (el, i) {
      frag.push('<li><button type="button" data-goto-tile="' + i + '"' + (i === (index || 0) ? ' class="is-current"' : "") + ">" +
        '<span class="side-item__no">' + esc(el.getAttribute("data-tile")) + "</span>" +
        '<span class="side-item__name">' + esc(el.getAttribute("data-name")) + "</span>" +
        '<span class="side-item__w">' + esc(el.style.getPropertyValue("--c")) + " 栏</span>" +
        "</button></li>");
    });
    sideListEl.innerHTML = frag.join("");
    if (stageStatEl) stageStatEl.textContent = items.length + " 块 · 12 栏";
  }

  function markSide(index) {
    if (!sideListEl) return;
    Array.prototype.forEach.call(sideListEl.children, function (li, j) {
      var b = li.firstChild;
      if (!b) return;
      b.classList.toggle("is-current", j === index);
    });
  }

  /* 左栏高亮 + 中区标题 + 右栏索引，一次画齐 */
  function paintChrome() {
    var blk = BLOCKS[active];
    if (railEl) {
      Array.prototype.forEach.call(railEl.children, function (b, j) {
        b.classList.toggle("is-active", j === active);
        b.setAttribute("aria-selected", j === active ? "true" : "false");
      });
    }
    if (stageNoEl) stageNoEl.textContent = active + ":" + blk.id;
    if (stageTtlEl) stageTtlEl.textContent = blk.title;
    if (stageSubEl) stageSubEl.textContent = blk.sub;
    paintSide(grids[active] ? nearestTile(grids[active]) : 0);
  }

  function nearestTile(grid) {
    if (!grid) return 0;
    var top = grid.scrollTop + 12;
    var best = 0, bestTop = -1;
    /* 同一行会有几块 offsetTop 相同，取这一行里的第一块 */
    Array.prototype.forEach.call(grid.children, function (el, i) {
      if (el.offsetTop <= top && el.offsetTop > bestTop) {
        bestTop = el.offsetTop;
        best = i;
      }
    });
    return best;
  }

  /* ---------------------------------------------------------
     板块切换：旧矩阵缩小淡出，新矩阵从略大缩回并淡入
     --------------------------------------------------------- */
  function goto(i, opts) {
    if (!built) return;
    var n = BLOCKS.length;
    var next = ((i % n) + n) % n;
    var instant = !!opts && opts.instant;

    if (next === active) {
      /* 首次打开也走这里：把当前板块显示出来并画好两栏 */
      grids[active].hidden = false;
      paintChrome();
      try { grids[active].focus({ preventScroll: true }); } catch (e) { /* 忽略 */ }
      return;
    }

    var from = grids[active];
    var to = grids[next];

    active = next;
    swapToken += 1;
    var token = swapToken;

    paintChrome();

    if (swapTimer) { window.clearTimeout(swapTimer); swapTimer = 0; }

    if (!motionOK() || instant) {
      from.hidden = true;
      from.classList.remove("is-out");
      to.hidden = false;
      to.classList.remove("is-in", "is-fresh");
      to.scrollTop = to.scrollTop || 0;
      markSide(nearestTile(to));
      return;
    }

    /* 旧矩阵：缩小 + 淡出，同时让位给新矩阵 */
    from.classList.add("is-out");
    to.hidden = false;
    to.classList.add("is-in", "is-fresh");
    void to.offsetWidth;

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (token !== swapToken) return;
        to.classList.remove("is-in");
      });
    });

    swapTimer = window.setTimeout(function () {
      if (token !== swapToken) return;
      from.hidden = true;
      from.classList.remove("is-out");
      to.classList.remove("is-fresh");
      markSide(nearestTile(to));
      swapTimer = 0;
    }, 150);

    try { to.focus({ preventScroll: true }); } catch (e) { /* 忽略 */ }
  }

  function step(dir) {
    goto(active + dir);
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
    while (echoEl.children.length > 4) echoEl.removeChild(echoEl.firstChild);
    echoEl.scrollTop = echoEl.scrollHeight;
  }

  var ALIAS = {
    main: "overview", index: "overview", start: "overview",
    man: "about", sched: "about", schedule: "about",
    build: "work", git: "work", repos2: "work",
    ssh: "join", faq: "join", msg: "join", guestbook: "join"
  };

  function runCommand(raw) {
    /* 按 : 聚焦时个别输入法/合成事件会把冒号留在框里，先剥掉 */
    var c = String(raw || "").trim().replace(/^[:/>]+\s*/, "");
    echo('<span class="t-dim">guest@hnyz:~$</span> ' + esc(c));
    var k = c.toLowerCase().replace(/\s+/g, "");
    if (!k) return;

    for (var i = 0; i < BLOCKS.length; i += 1) {
      if (k === BLOCKS[i].cmd) { goto(i); return; }
      if (k === String(i)) { goto(i); return; }
    }
    if (ALIAS[k]) {
      for (var j = 0; j < BLOCKS.length; j += 1) {
        if (BLOCKS[j].id === ALIAS[k]) { goto(j); return; }
      }
    }

    switch (k) {
      case "help":
      case "?":
        echo("可用命令：<br>" +
          "　<span class='t-cyn'>overview about work join</span>　切到对应板块<br>" +
          "　<span class='t-cyn'>0-3</span>　切板块　<span class='t-cyn'>ls</span>　列出板块<br>" +
          "　<span class='t-cyn'>gallery member projects</span>　打开对应页面<br>" +
          "　<span class='t-cyn'>whoami clear</span>　我是谁 / 清屏");
        return;
      case "ls":
        echo(BLOCKS.map(function (b, j) { return "<span class='t-dim'>" + j + "</span>:" + b.cmd; }).join("　"));
        return;
      case "whoami":
        echo("guest — 衡南一中编程社的访客。输入 <span class='t-cyn'>join</span> 看怎么加入。");
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
    /* 左栏板块 */
    railEl.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-block]");
      if (!b) return;
      goto(parseInt(b.getAttribute("data-block"), 10) || 0);
    });

    /* 右栏：方块索引 / 上下板块 */
    sideEl.addEventListener("click", function (e) {
      var t = e.target.closest("button[data-goto-tile]");
      if (t) {
        var grid = grids[active];
        var idx = parseInt(t.getAttribute("data-goto-tile"), 10);
        var el = grid && grid.children[idx];
        if (!el) return;
        grid.scrollTo({ top: Math.max(0, el.offsetTop - 6), behavior: motionOK() ? "smooth" : "auto" });
        markSide(idx);
        /* 内容不满一屏时滚不动，给目标方块闪一下边框，否则点了像没反应 */
        el.classList.add("is-ping");
        window.setTimeout(function () { el.classList.remove("is-ping"); }, 900);
        return;
      }
      var p = e.target.closest("button[data-step]");
      if (p) step(parseInt(p.getAttribute("data-step"), 10) || 1);
    });

    /* 方块内的复制 / 留言板 */
    stageEl.addEventListener("click", function (e) {
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

    /* 滚动时把右栏索引跟着挪（rAF 节流，不逐帧算） */
    stageEl.addEventListener("scroll", function (e) {
      var grid = e.target;
      if (!grid || !grid.classList || !grid.classList.contains("tty-grid")) return;
      if (scrollRaf) return;
      scrollRaf = window.requestAnimationFrame(function () {
        scrollRaf = 0;
        if (grid === grids[active]) markSide(nearestTile(grid));
      });
    }, true);

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

  /* 这些监听绑在 document 上，模块加载时只绑一次：
     TUI 是「切走就拆、切回重建」的，绑在 build() 里会一路累积 */
  document.addEventListener("keydown", function (e) {
    if (!isOpen) return;
    if (e.target === inputEl) return; /* 输入行里让 shell 自己处理 */

    var k = e.key;
    if (k >= "0" && k <= "3") { e.preventDefault(); goto(parseInt(k, 10)); return; }
    if (k === "[" || k === "h" || k === "ArrowLeft") { e.preventDefault(); step(-1); return; }
    if (k === "]" || k === "l" || k === "ArrowRight") { e.preventDefault(); step(1); return; }
    if (k === ":" || k === "/") { e.preventDefault(); try { inputEl.focus(); } catch (err) { /* 忽略 */ } return; }
    if (k === "?") { e.preventDefault(); runCommand("help"); return; }
    if (k === "Escape") { return; }

    var grid = grids[active];
    if (!grid) return;
    if (k === "j" || k === "ArrowDown") { e.preventDefault(); grid.scrollTop += 72; return; }
    if (k === "k" || k === "ArrowUp") { e.preventDefault(); grid.scrollTop -= 72; return; }
  });

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
    goto(active, { instant: true });
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
    var rail = BLOCKS.map(function (b, i) {
      return '<button type="button" role="tab" data-block="' + i + '" aria-selected="false">' +
        '<span class="rail__no">' + i + "</span>" +
        '<span class="rail__txt"><b>' + b.en + "</b><i>" + b.zh + "</i></span>" +
        '<span class="rail__dot" aria-hidden="true"></span>' +
        "</button>";
    }).join("");

    var gridHtml = BLOCKS.map(function (b) {
      return '<div class="tty-grid" role="tabpanel" tabindex="-1" aria-label="' + esc(b.en + " · " + b.zh) + '" hidden>' +
        GRIDS[b.id]() + "</div>";
    }).join("");

    root = document.createElement("div");
    root.className = "tty";
    root.setAttribute("role", "application");
    root.setAttribute("aria-label", "HNYZ 终端");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML =
      '<div class="tty__top">' +
      '  <span class="tty__logo" aria-hidden="true"></span>' +
      '  <span class="tty__brand">HNYZ<i>//TTY</i></span>' +
      '  <span class="tty__sess">hnyz@club · tty1 · <b>雾蓝</b></span>' +
      '  <span class="tty__clock" aria-hidden="true"></span>' +
      '  <span class="tty__actions"></span>' +
      "</div>" +
      '<div class="tty__shell">' +
      '  <nav class="tty__rail" role="tablist" aria-label="板块" aria-orientation="vertical">' + rail + "</nav>" +
      '  <div class="tty__stage">' +
      '    <div class="tty-stage__hdr">' +
      '      <span class="tty-stage__no">0:overview</span>' +
      '      <b class="tty-stage__ttl">launchpad</b>' +
      '      <span class="tty-stage__sub"></span>' +
      '      <span class="tty-stage__stat"></span>' +
      "    </div>" +
      '    <div class="tty-stage__bd">' + gridHtml + "</div>" +
      "  </div>" +
      '  <div class="tty__side" role="group" aria-label="板块索引">' +
      '    <div class="side__hdr"><span>BLOCKS</span><i class="side__hint">点一行滚过去</i></div>' +
      '    <ol class="side__list"></ol>' +
      '    <div class="side__nav">' +
      '      <button type="button" data-step="-1" aria-label="上一个板块">←</button>' +
      '      <span class="side__nav-txt">上一 / 下一</span>' +
      '      <button type="button" data-step="1" aria-label="下一个板块">→</button>' +
      "    </div>" +
      '    <div class="side__meta">' +
      '      <div><span>主题</span><b>雾蓝</b></div>' +
      '      <div><span>布局</span><b>12 栏</b></div>' +
      '      <div><span>板块</span><b>4 个</b></div>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div class="tty__echo" aria-live="polite"></div>' +
      '<form class="tty__prompt">' +
      '  <label class="tty__prompt-label" for="tty-cmd-input">guest@hnyz:~$</label>' +
      '  <input id="tty-cmd-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" aria-label="输入命令，help 查看可用命令">' +
      "</form>" +
      '<footer class="tty__legend" aria-hidden="true">' +
      '  <span class="tty-legend__path"><b>~/hnyz</b> · 4 个板块</span>' +
      '  <span class="tty-legend__keys"><kbd>0-3</kbd> 换板块 · <kbd>[ ]</kbd> 前后 · <kbd>↑↓</kbd>/<kbd>j k</kbd> 滚动 · <kbd>:</kbd> 命令 · <kbd>?</kbd> 帮助</span>' +
      '  <span class="tty__up"></span>' +
      "</footer>";

    document.body.appendChild(root);

    railEl = root.querySelector(".tty__rail");
    stageEl = root.querySelector(".tty__stage");
    sideEl = root.querySelector(".tty__side");
    sideListEl = root.querySelector(".side__list");
    stageNoEl = root.querySelector(".tty-stage__no");
    stageTtlEl = root.querySelector(".tty-stage__ttl");
    stageSubEl = root.querySelector(".tty-stage__sub");
    stageStatEl = root.querySelector(".tty-stage__stat");
    echoEl = root.querySelector(".tty__echo");
    inputEl = root.querySelector("#tty-cmd-input");
    clockEl = root.querySelector(".tty__clock");
    upEl = root.querySelector(".tty__up");

    grids = Array.prototype.slice.call(root.querySelectorAll(".tty-grid"));

    /* 顶栏的小鲸鱼：Deepy 的首帧，1px 一格刚好压在 46px 的顶栏里 */
    var logoEl = root.querySelector(".tty__logo");
    if (logoEl) logoEl.innerHTML = deepyBox(1, "", false);

    /* 概览那块：等方块都插好再挂 canvas */
    mountDeepy(root.querySelector(".tty-grid .tty-deepy"));

    bindRoot();
    built = true;

    /* 作品板块：本地缓存优先，静态快照兜底 */
    var box = root.querySelector("[data-repos]");
    if (box && window.fetch) {
      paintRepos(box);
    } else if (box) {
      renderRepos(box, null);
    }
  }

  function teardown() {
    close();
    stopDeepy();
    if (swapTimer) { window.clearTimeout(swapTimer); swapTimer = 0; }
    swapToken += 1;
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null; railEl = null; stageEl = null; sideEl = null;
    echoEl = null; inputEl = null; clockEl = null; upEl = null;
    sideListEl = null; grids = [];
    built = false;
    active = 0;
  }

  /* ---------------------------------------------------------
     对外：只有 sync 一个口子
     --------------------------------------------------------- */
  function sync(on) {
    /* 只有首页有完整的首屏（section.hero）：内页凑不满四个板块，
       维持琥珀纸带不动 */
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
