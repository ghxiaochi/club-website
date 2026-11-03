/* =========================================================
   HNYZ · 终端风的环形框架
   ---------------------------------------------------------
   把「一直往下滚」换成「绕着一个圆转」。

   九个板块等角度挂在同一个圆上，滚轮 / 拖拽 / 方向键都能转；
   停在正上方（12 点）的那块放大、透出摘要，环心写它的读数。
   点「进入板块」就把环收起来、滚到正文那一节。

   几何全在这里算，样式在 css/term-ring.css。
   只在终端风里由 js/skins.js 调 HNYZRING.sync(true/false)。
   ========================================================= */
(function () {
  "use strict";

  /* 板块顺序：跟着首页从上到下的阅读顺序走，不按字母排 */
  /* 环上的短名：两三个字，转起来一眼能认。
     英文那套 SECTION_LABEL 留给正文，环上放不下 */
  var SHORT = {
    "top": "首屏",
    "about": "关于",
    "what-we-do": "做什么",
    "projects": "项目",
    "schedule": "活动",
    "wall": "资源",
    "faq": "问答",
    "guestbook": "留言",
    "join": "加入"
  };

  var IDS = [
    "top",
    "about",
    "what-we-do",
    "projects",
    "schedule",
    "wall",
    "faq",
    "guestbook",
    "join"
  ];

  var ring = null;          /* 舞台根节点 */
  var dial = null;          /* SVG */
  var arcEl = null;         /* 高亮弧 */
  var nodesEl = null;       /* 节点容器 */
  var coreEl = null;        /* 环心读数 */
  var backBtn = null;       /* 「回到环」按钮 */
  var nodeEls = [];
  var nodeSizes = [];       /* 每个节点的实际尺寸，避免每帧读布局 */
  var items = [];

  var step = 40;            /* 每块占的角度，构建后按数量重算 */
  var radius = 240;         /* 圆的半径（px） */
  var cy = 400;             /* 圆心的 y（px） */
  var rot = 0;              /* 当前角度 */
  var target = 0;           /* 目标角度 */
  var active = 0;
  var raf = 0;

  var isOpen = false;
  var built = false;
  var dragging = false;
  var moved = false;
  var suppressClick = false;
  var dragStartAngle = 0;
  var dragStartRot = 0;
  var wheelLock = 0;
  var wheelAcc = 0;

  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function motionOK() {
    return !(mq && mq.matches);
  }

  /* ---------------------------------------------------------
     数据：从页面里现抓，改了文案不用回来改这里
     --------------------------------------------------------- */
  function squash(s) {
    return String(s == null ? "" : s)
      .replace(/\s+/g, " ")
      /* <br> 会变成空格，中文标题里夹一个空格很难看 */
      .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2")
      .trim();
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function pad(n) {
    return ("0" + n).slice(-2);
  }

  function pickBullets(el) {
    var out = [];
    function push(t) {
      t = squash(t);
      /* 四个字以下的多半是「5」「个项目」「2 次」这种碎片，放进读数里只会更乱 */
      if (!t || t.length < 4 || t.length > 24) return;
      if (/^[\s\d./·:%+\-]+$/.test(t)) return;
      if (out.indexOf(t) !== -1) return;
      out.push(t);
    }
    /* 先看小标题：项目卡、能力卡都是 h3 */
    Array.prototype.forEach.call(el.querySelectorAll("h3"), function (h) {
      if (out.length < 4) push(h.textContent);
    });
    /* 再看定义列表：关于社团那栏的「社团名称 / 活动频率」 */
    if (out.length < 2) {
      Array.prototype.forEach.call(el.querySelectorAll("dt"), function (d) {
        if (out.length < 4) push(d.textContent);
      });
    }
    /* 定义列表取 dd：dt 是「活动频率」这种标签，念出来没信息 */
    if (out.length < 2) {
      Array.prototype.forEach.call(el.querySelectorAll("dd"), function (d) {
        if (out.length < 4) push(d.textContent);
      });
    }
    return out.slice(0, 3);
  }

  function collect() {
    var out = [];
    IDS.forEach(function (id, i) {
      var el = document.getElementById(id);
      if (!el) return;

      var head = el.querySelector("h1, h2");
      var label = el.querySelector(".section-label");
      var intro = el.querySelector(".section-intro, .hero-lead");
      var title = squash(head ? head.textContent : "");

      /* 「01 / 关于社团」取斜杠后面那半截；没有标签就用标题前六个字 */
      var name = "";
      if (label) {
        var parts = squash(label.textContent).split("/");
        name = parts.length > 1 ? squash(parts[1]) : squash(parts[0]);
      }
      if (id === "top") name = "首屏";
      if (!name) name = title.slice(0, 6);
      if (!title) title = name;

      out.push({
        index: i,
        id: id,
        no: pad(i),
        name: name,
        short: SHORT[id] || name.slice(0, 4),
        title: title,
        lede: squash(intro ? intro.textContent : "").slice(0, 64),
        bullets: id === "top" ? [] : pickBullets(el)
      });
    });
    return out;
  }

  /* ---------------------------------------------------------
     几何
     --------------------------------------------------------- */
  function measure() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    if (vh <= 470) {
      /* 横屏手机、手表：高度是第一约束，环再大就顶到顶栏了 */
      radius = Math.min(vh * 0.25, vw * 0.34);
      cy = vh * 0.58;
    } else {
      /* 竖屏：宽度先卡住（左右两个节点不能出屏），高度再兜一层 */
      radius = Math.min(vw * 0.40, vh * 0.28, 330);
      cy = vh * 0.47;
    }

    /* SVG 的 viewBox 半径 500 里主圆是 460，换算成实际直径 */
    var d = (radius * 2) / 0.92;
    ring.style.setProperty("--ring-d", d.toFixed(1) + "px");
    ring.style.setProperty("--ring-cy", cy.toFixed(1) + "px");

    /* 手机上写「滚轮」是错的，换成人话 */
    var br = ring.querySelector(".term-ring__hud--br");
    if (br) {
      br.textContent = vw <= 720
        ? "左右拖动 / 点板块切换"
        : "滚轮 / 拖拽 / ↑↓ 转动 · 点板块进入";
    }
  }

  function polar(deg, r) {
    var rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: 500 + Math.cos(rad) * r,
      y: 500 + Math.sin(rad) * r
    };
  }

  /* ---------------------------------------------------------
     SVG：三层圆 + 刻度 + 角度数字 + 一条自转的细刻
     --------------------------------------------------------- */
  function buildDial() {
    var out = [];
    var a, p1, p2, deg, len, major, mid;

    /* 外圈细刻，整组慢慢自转 */
    out.push('<g class="r-spin">');
    for (a = 0; a < 360; a += 3) {
      p1 = polar(a, 500);
      p2 = polar(a, 492);
      out.push(
        '<line class="r-tick" x1="' + p1.x.toFixed(1) + '" y1="' + p1.y.toFixed(1) +
        '" x2="' + p2.x.toFixed(1) + '" y2="' + p2.y.toFixed(1) + '" stroke-opacity="0.34"/>'
      );
    }
    out.push("</g>");

    /* 最外虚线圆、主圆、内虚线圆 */
    out.push('<circle class="r-line r-line--outer" cx="500" cy="500" r="500" stroke-dasharray="1 9"/>');
    out.push('<circle class="r-line" cx="500" cy="500" r="460"/>');
    out.push('<circle class="r-line r-line--faint" cx="500" cy="500" r="362"/>');
    out.push('<circle class="r-line r-line--faint" cx="500" cy="500" r="248"/>');

    /* 每 6° 一根刻，30° 加长，90° 最长 */
    for (deg = 0; deg < 360; deg += 6) {
      major = deg % 90 === 0;
      mid = deg % 30 === 0;
      len = major ? 26 : mid ? 16 : 8;
      p1 = polar(deg, 460);
      p2 = polar(deg, 460 - len);
      out.push(
        '<line class="r-tick' + (major ? " r-tick--major" : "") +
        '" x1="' + p1.x.toFixed(1) + '" y1="' + p1.y.toFixed(1) +
        '" x2="' + p2.x.toFixed(1) + '" y2="' + p2.y.toFixed(1) + '"/>'
      );
    }

    /* 四个方位标数字：000 在正上方，顺时针走 */
    [0, 90, 180, 270].forEach(function (d) {
      var p = polar(d, 424);
      out.push(
        '<text class="r-num" x="' + p.x.toFixed(1) + '" y="' + (p.y + 4).toFixed(1) +
        '" text-anchor="middle">' + ("00" + d).slice(-3) + "</text>"
      );
    });

    /* 当前板块的高亮弧，d 由 paint 更新 */
    out.push('<path class="r-arc" d=""/>');

    dial.innerHTML = '<svg viewBox="0 0 1000 1000" role="presentation" focusable="false">' +
      out.join("") + "</svg>";
    arcEl = dial.querySelector(".r-arc");
  }

  function updateArc() {
    if (!arcEl) return;
    /* 画在内圈上：外圈那段正好被放大的卡片压住，看不见 */
    var r = 362;
    var half = (step / 2) * 0.94;
    /* polar(0) 已经是正上方，这里不要再减 90 */
    var a = polar(-half, r);
    var b = polar(half, r);
    arcEl.setAttribute(
      "d",
      "M" + a.x.toFixed(1) + " " + a.y.toFixed(1) +
      " A" + r + " " + r + " 0 0 1 " + b.x.toFixed(1) + " " + b.y.toFixed(1)
    );
  }

  /* ---------------------------------------------------------
     画：每个节点按「自己的角度 + 整体旋转」摆到圆上
     --------------------------------------------------------- */
  function paint() {
    var n = items.length;
    var i, deg, diff, ad, s, op, rad, x, y;

    for (i = 0; i < n; i += 1) {
      deg = i * step + rot;

      /* 归一化到 -180..180，0 表示正上方 */
      diff = deg % 360;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      ad = Math.abs(diff);

      /* 越靠近 12 点越大，46° 之外就到底了 */
      s = 0.64 + 0.36 * Math.max(0, 1 - ad / 46);
      op = 0.34 + 0.66 * Math.max(0, 1 - ad / 118);

      rad = ((deg - 90) * Math.PI) / 180;
      /* 转正的那块往外挪 6%：它变宽变高之后，不挪就会压住环心和邻居 */
      var rr = radius * (i === active ? 1.06 : 1);
      x = Math.cos(rad) * rr;
      y = Math.sin(rad) * rr;

      /* transform-origin 是 0 0，所以偏移要按「缩放之后」的尺寸算：
         元素左上角落在 (x - 半宽×s, y - 半高×s)，中心才正好压在圆周上。
         用 -50% 那套会踩到 scale 把百分比一起缩掉的坑。 */
      var size = nodeSizes[i] || { w: 168, h: 40 };
      var ox = (size.w * s) / 2;
      var oy = (size.h * s) / 2;
      nodeEls[i].style.transform =
        "translate(" + (x - ox).toFixed(1) + "px," + (y - oy).toFixed(1) + "px) scale(" + s.toFixed(3) + ")";
      nodeEls[i].style.opacity = op.toFixed(3);
      nodeEls[i].style.zIndex = String(Math.round(60 - ad / 3));
    }

  }

  function measureNodes() {
    nodeSizes = nodeEls.map(function (el) {
      return { w: el.offsetWidth, h: el.offsetHeight };
    });
  }

  function paintCore() {
    var d = items[active];
    if (!d || !coreEl) return;

    coreEl.querySelector(".term-ring__idx").textContent =
      d.no + " / " + pad(items.length - 1) + "  ·  " + d.short;
    coreEl.querySelector(".term-ring__title").textContent = d.title;

    var lede = coreEl.querySelector(".term-ring__lede");
    lede.textContent = d.lede || "";

    var ul = coreEl.querySelector(".term-ring__bullets");
    ul.innerHTML = d.bullets.map(function (t) {
      return "<li>" + t.replace(/[&<>]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
      }) + "</li>";
    }).join("");

    var enter = coreEl.querySelector(".term-ring__enter");
    enter.setAttribute("href", "#" + d.id);
    enter.setAttribute("data-target", d.id);

    var hudTr = ring.querySelector(".term-ring__hud--tr");
    if (hudTr) hudTr.innerHTML = "<b>" + d.no + "</b> / " + pad(items.length - 1);

    var hudBl = ring.querySelector(".term-ring__hud--bl");
    if (hudBl) hudBl.textContent = "hnyz@club ~/ring $ rotate --to " + d.no;

    /* 换读数时淡入一下，别硬切 */
    if (motionOK()) {
      coreEl.classList.remove("is-swap");
      void coreEl.offsetWidth;
      coreEl.classList.add("is-swap");
    }
  }

  function paintActiveNodes() {
    nodeEls.forEach(function (el, i) {
      el.classList.toggle("is-active", i === active);
      el.setAttribute("aria-current", i === active ? "true" : "false");
    });
  }

  /* ---------------------------------------------------------
     转
     --------------------------------------------------------- */
  function start() {
    if (motionOK() === false) {
      rot = target;
      paint();
      return;
    }
    if (raf) return;
    raf = window.requestAnimationFrame(tick);
  }

  function tick() {
    var d = target - rot;
    if (Math.abs(d) < 0.04) {
      rot = target;
      paint();
      raf = 0;
      return;
    }
    rot += d * 0.15;
    paint();
    raf = window.requestAnimationFrame(tick);
  }

  function setActive(i) {
    var n = items.length;
    if (!n) return;
    active = ((i % n) + n) % n;

    /* 目标角取最近的一圈，别为了到 08 一路倒着转回来 */
    var goal = -active * step;
    while (goal - rot > 180) goal -= 360;
    while (goal - rot < -180) goal += 360;

    target = goal;
    paintCore();
    paintActiveNodes();
    start();

    /* 宽度是 300ms 过渡出来的，等它停稳再重新量一次 */
    window.setTimeout(function () {
      if (!built) return;
      measureNodes();
      paint();
    }, 330);
  }

  /* ---------------------------------------------------------
     开关
     --------------------------------------------------------- */
  function openRing() {
    if (!built) return;
    isOpen = true;
    measure();
    paint();
    ring.classList.add("is-on");
    ring.setAttribute("aria-hidden", "false");
    /* 锁滚动之前先把位置归零：有的内核会在 overflow 变成 hidden 的那一帧
       重新算一次滚动位置，留下几十上百像素的残余 */
    window.scrollTo(0, 0);
    document.documentElement.classList.add("term-ring-open");
    document.body.classList.add("term-ring-open");
    if (backBtn) backBtn.classList.remove("is-on");
    window.setTimeout(function () {
      try { ring.focus({ preventScroll: true }); } catch (e) { ring.focus(); }
      /* 聚焦本身可能带一次隐式滚动，收尾再归零一次 */
      window.scrollTo(0, 0);
    }, 40);
  }

  function closeRing() {
    isOpen = false;
    if (ring) {
      ring.classList.remove("is-on");
      ring.setAttribute("aria-hidden", "true");
    }
    document.documentElement.classList.remove("term-ring-open");
    document.body.classList.remove("term-ring-open");
  }

  function enterSection(id) {
    id = id || (items[active] && items[active].id);
    closeRing();
    if (backBtn) backBtn.classList.add("is-on");
    /* 地址栏跟着走，刷新或分享出去能直接落回这一节。
       replaceState 不会触发滚动，不会跟我们自己的 scrollIntoView 打架 */
    if (id && window.history && window.history.replaceState) {
      try { window.history.replaceState(null, "", "#" + id); } catch (e) { /* file:// 下会抛，忽略 */ }
    }
    window.setTimeout(function () {
      var el = id && document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "start" });
    }, 90);
  }

  /* ---------------------------------------------------------
     构建
     --------------------------------------------------------- */
  function build() {
    items = collect();
    /* 内页没有那么多板块（项目页、图集页本来就只有一块），
       凑不满一个环，就退回原来的纸带布局 */
    if (items.length < 4) return false;

    step = 360 / items.length;

    ring = document.createElement("div");
    ring.className = "term-ring";
    ring.setAttribute("role", "region");
    ring.setAttribute("aria-label", "板块轮盘");
    ring.setAttribute("aria-hidden", "true");
    ring.setAttribute("tabindex", "-1");

    ring.innerHTML =
      '<span class="term-ring__corner term-ring__corner--tl" aria-hidden="true"></span>' +
      '<span class="term-ring__corner term-ring__corner--tr" aria-hidden="true"></span>' +
      '<span class="term-ring__corner term-ring__corner--bl" aria-hidden="true"></span>' +
      '<span class="term-ring__corner term-ring__corner--br" aria-hidden="true"></span>' +
      '<p class="term-ring__hud term-ring__hud--tl">HNYZ // SECTION_RING</p>' +
      '<p class="term-ring__hud term-ring__hud--tr"></p>' +
      '<p class="term-ring__hud term-ring__hud--bl"></p>' +
      '<p class="term-ring__hud term-ring__hud--br">滚轮 / 拖拽 / ↑↓ 转动 · 点板块进入</p>' +
      '<div class="term-ring__dial" aria-hidden="true"></div>' +
      '<div class="term-ring__core">' +
      '  <p class="term-ring__idx"></p>' +
      '  <h2 class="term-ring__title"></h2>' +
      '  <p class="term-ring__lede"></p>' +
      '  <ul class="term-ring__bullets"></ul>' +
      '  <a class="term-ring__enter" href="#top">进入板块 <span aria-hidden="true">→</span></a>' +
      "</div>" +
      '<div class="term-ring__nodes"></div>';

    document.body.appendChild(ring);

    dial = ring.querySelector(".term-ring__dial");
    nodesEl = ring.querySelector(".term-ring__nodes");
    coreEl = ring.querySelector(".term-ring__core");

    buildDial();
    updateArc();

    /* 节点 */
    items.forEach(function (d, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "term-node";
      b.setAttribute("data-index", String(i));
      b.innerHTML =
        '<span class="term-node__idx">' + d.no + "</span>" +
        '<span class="term-node__title">' + esc(d.short) + "</span>" +
        '<span class="term-node__long">' + esc(d.title) + "</span>" +
        '<span class="term-node__more">' + esc(d.bullets[0] || d.lede.slice(0, 72)) + "</span>";
      b.addEventListener("click", function () {
        if (suppressClick) return;
        if (i === active) { enterSection(d.id); return; }
        setActive(i);
      });
      nodesEl.appendChild(b);
      nodeEls.push(b);
    });

    /* 「回到环」按钮：进过板块之后才出现 */
    backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "term-ring-back";
    backBtn.innerHTML = '<span aria-hidden="true">◎</span> 回到板块环';
    backBtn.addEventListener("click", function () {
      backBtn.classList.remove("is-on");
      /* 地址栏里的 #faq 会把浏览器拽回锚点，回环之前先清掉 */
      if (window.history && window.history.replaceState) {
        try { window.history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* 忽略 */ }
      }
      window.scrollTo(0, 0);
      /* 等这一帧滚完再锁滚动，否则 scrollTo 会被 overflow:hidden 打断在半路 */
      window.requestAnimationFrame(function () { openRing(); });
    });
    document.body.appendChild(backBtn);

    bindEvents();
    measure();
    measureNodes();
    paint();
    paintCore();
    paintActiveNodes();
    built = true;

    /* 第一帧量到的是还没展开的尺寸，等宽度过渡停稳再补一次 */
    window.setTimeout(function () {
      if (!built) return;
      measureNodes();
      paint();
    }, 360);

    return true;
  }

  /* ---------------------------------------------------------
     交互
     --------------------------------------------------------- */
  function angleOf(x, y) {
    return (Math.atan2(y - cy, x - window.innerWidth / 2) * 180) / Math.PI;
  }

  function bindEvents() {
    var enter = coreEl.querySelector(".term-ring__enter");
    enter.addEventListener("click", function (e) {
      e.preventDefault();
      enterSection(enter.getAttribute("data-target"));
    });

    /* 滚轮：一格一格转，260ms 内不重复响应 */
    ring.addEventListener("wheel", function (e) {
      e.preventDefault();
      var now = Date.now();
      if (now < wheelLock) return;
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) < 26) return;
      var dir = wheelAcc > 0 ? 1 : -1;
      wheelAcc = 0;
      wheelLock = now + 240;
      setActive(active + dir);
    }, { passive: false });

    /* 拖拽：跟手转，松手吸附到最近一块 */
    ring.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".term-ring__enter, .term-ring-back")) return;
      if (e.button && e.button !== 0) return;
      dragging = true;
      moved = false;
      dragStartAngle = angleOf(e.clientX, e.clientY);
      dragStartRot = rot;
      try { ring.setPointerCapture(e.pointerId); } catch (err) { /* 老内核没有捕获，退化成普通拖动 */ }
    });

    ring.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var d = angleOf(e.clientX, e.clientY) - dragStartAngle;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      if (Math.abs(d) > 5) moved = true;
      if (!moved) return;
      rot = dragStartRot + d;
      target = rot;
      paint();
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (!moved) return;
      suppressClick = true;
      window.setTimeout(function () { suppressClick = false; }, 80);
      setActive(Math.round(-rot / step));
    }

    ring.addEventListener("pointerup", endDrag);
    ring.addEventListener("pointercancel", endDrag);

    /* 键盘 */
    ring.addEventListener("keydown", function (e) {
      var k = e.key;
      if (k === "ArrowDown" || k === "ArrowRight" || k === "PageDown") {
        e.preventDefault();
        setActive(active + 1);
      } else if (k === "ArrowUp" || k === "ArrowLeft" || k === "PageUp") {
        e.preventDefault();
        setActive(active - 1);
      } else if (k === "Home") {
        e.preventDefault();
        setActive(0);
      } else if (k === "End") {
        e.preventDefault();
        setActive(items.length - 1);
      } else if (k === "Enter" || k === " ") {
        e.preventDefault();
        enterSection();
      }
    });



  }

  /* ---------------------------------------------------------
     对外
     --------------------------------------------------------- */
  function sync(on) {
    if (on) {
      if (!built && !build()) return;
      if (!isOpen) openRing();
    } else {
      if (!built) return;
      closeRing();
      if (backBtn) backBtn.classList.remove("is-on");
      /* 切走时把整套 DOM 拆掉：监听器跟着节点一起消失，不留后台开销 */
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
      if (ring && ring.parentNode) ring.parentNode.removeChild(ring);
      if (backBtn && backBtn.parentNode) backBtn.parentNode.removeChild(backBtn);
      document.documentElement.classList.remove("term-ring-open");
      document.body.classList.remove("term-ring-open");
      ring = null;
      dial = null;
      arcEl = null;
      nodesEl = null;
      coreEl = null;
      backBtn = null;
      nodeEls = [];
      items = [];
      built = false;
      isOpen = false;
      rot = 0;
      target = 0;
      active = 0;
    }
  }

  /* Esc 只在模块加载时绑一次：绑在 document 上，
     这样无论焦点在环里、在顶栏、还是刚点完风格面板，都收得掉。
     放在 bindEvents 里会随「切走再切回」反复累积监听器。 */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      closeRing();
      /* 退出环就回到页面顶部，别停在滚到一半的位置 */
      window.scrollTo(0, 0);
    }
  });

  /* 这两个也只在模块加载时绑一次。环是「切走就拆、切回来重建」的，
     绑在 bindEvents 里会随着来回切换一路累积，最后一次 resize 触发十几次重算 */
  window.addEventListener("hashchange", function () {
    if (isOpen) closeRing();
  });

  window.addEventListener("resize", function () {
    if (!built) return;
    measure();
    measureNodes();
    paint();
  }, { passive: true });

  window.HNYZRING = {
    sync: sync,
    open: function () { if (built) openRing(); },
    close: closeRing,
    /* 给调试用：HNYZRING.goto("projects") */
    goto: function (id) {
      for (var i = 0; i < items.length; i += 1) {
        if (items[i].id === id) { setActive(i); return true; }
      }
      return false;
    }
  };

  /* 直接带 #hash 进来时，进完板块再点头部导航就回到环 */
  document.addEventListener("DOMContentLoaded", function () {
    var style = document.documentElement.dataset.style;
    if (style === "term") sync(true);
  });
})();
