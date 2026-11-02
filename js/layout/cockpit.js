/* =========================================================
   HNYZ · 驾驶舱
   ---------------------------------------------------------
   把页面里已有的 <section> 收成底部面板：面板是目录，也是仪表。
   点一块面板，舞台上就滚到那一段；滚到哪一段，哪块面板亮起。

   这样五个页面共用一套外壳，内容还是原来的内容，
   不用为驾驶舱重写一遍文案。
   ========================================================= */
(function () {
  "use strict";

  var root = document.querySelector("[data-ck]");
  if (!root) return;

  var view = root.querySelector("[data-ck-view]");
  var deck = root.querySelector("[data-ck-deck]");
  if (!view || !deck) return;

  var items = [];
  var active = -1;
  var clockEl = root.querySelector("[data-ck-clock]");

  /* ---------- 从 section 里抽信息 ---------- */

  function text(el) {
    return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "";
  }

  function pickTitle(sec) {
    if (sec.dataset.ckTitle) return sec.dataset.ckTitle;
    var h = sec.querySelector("h1, h2, h3");
    if (!h) return "UNTITLED";
    /* 标题里常挂着计数徽标（02 后面那个 4），摘掉再取字 */
    var clone = h.cloneNode(true);
    var junk = clone.querySelectorAll("span.count, .section-count, [data-count-badge]");
    for (var i = 0; i < junk.length; i += 1) junk[i].remove();
    var t = text(clone);
    return t.length > 20 ? t.slice(0, 20) + "…" : t;
  }

  function pickCount(sec) {
    if (sec.dataset.ckCount) return sec.dataset.ckCount;
    var n = sec.querySelectorAll(
      ".project-card, .do-card, .wall-card, .agenda-item, .gallery-item, .member-card, .ladder-row"
    ).length;
    if (n) return String(n);
    return "";
  }

  /* 面板正文：优先小节标题，其次列表项，最多 4 行 */
  function pickRows(sec) {
    var out = [];
    var nodes = sec.querySelectorAll(
      ".do-card h3, .wall-card h3, .project-card h3, .agenda-title, .join-steps h3, .member-card h3, .ladder-row__name, h3"
    );
    var seen = {};
    for (var i = 0; i < nodes.length && out.length < 4; i += 1) {
      var t = text(nodes[i]);
      if (!t || seen[t]) continue;
      seen[t] = 1;
      out.push(t);
    }

    if (!out.length) {
      var paragraphs = sec.querySelectorAll("p");
      for (var j = 0; j < paragraphs.length && out.length < 2; j += 1) {
        var p = text(paragraphs[j]);
        if (p.length > 4) out.push(p.slice(0, 34) + (p.length > 34 ? "…" : ""));
      }
    }
    return out;
  }

  function pickCap(sec) {
    if (sec.dataset.ckCap) return sec.dataset.ckCap;
    var n = sec.querySelectorAll(
      "li, .project-card, .gallery-item, .ladder-row"
    ).length;
    return n ? n + " 条记录" : "SECTION";
  }

  /* ---------- 建面板 ---------- */

  var sections = [];
  var all = view.querySelectorAll("[data-ck-panel-src]");
  if (!all.length) all = view.querySelectorAll("section[id]");
  if (!all.length) all = view.querySelectorAll("section");
  for (var i = 0; i < all.length; i += 1) {
    var sec = all[i];
    if (sec.id === "top" || sec.dataset.ckSkip !== undefined) continue;
    /* 页脚跑道 / 留言板在驾驶舱里不占面板 */
    if (sec.classList.contains("dino-run") || sec.classList.contains("guestbook")) continue;
    if (!sec.id) sec.id = "ck-sec-" + i;
    sections.push(sec);
  }

  if (!sections.length) {
    deck.hidden = true;
    return;
  }

  sections.forEach(function (sec, index) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ck-p";
    btn.setAttribute("data-ck-panel", String(index));
    btn.setAttribute("aria-label", "跳到 " + pickTitle(sec));

    var head = document.createElement("span");
    head.className = "ck-p__h";
    head.innerHTML =
      "<em>" +
      String(index + 1).padStart(2, "0") +
      "</em><span>" +
      pickTitle(sec).toUpperCase() +
      "</span>";
    var count = pickCount(sec);
    if (count) {
      var b = document.createElement("b");
      b.textContent = count;
      head.appendChild(b);
    }

    var body = document.createElement("span");
    body.className = "ck-p__body";
    pickRows(sec).forEach(function (row, ri) {
      var line = document.createElement("span");
      line.className = "ck-row" + (ri === 0 ? " is-top" : "");
      line.innerHTML = "<i>" + (ri + 1) + "</i>";
      var sp = document.createElement("span");
      sp.textContent = row;
      line.appendChild(sp);
      body.appendChild(line);
    });

    var cap = document.createElement("span");
    cap.className = "ck-p__cap";
    cap.textContent = pickCap(sec);

    btn.appendChild(head);
    btn.appendChild(body);
    btn.appendChild(cap);
    deck.appendChild(btn);

    items.push({ btn: btn, sec: sec });

    btn.addEventListener("click", function () {
      scrollTo(index);
    });
  });

  /* 面板不足 4 块时补「去别的页」，右下角不留空位 */
  var LINKS = [
    { href: "index.html", label: "HOME", desc: "回到总览" },
    { href: "projects.html", label: "PROJECTS", desc: "全部仓库" },
    { href: "member.html", label: "MEMBER", desc: "成员主页" },
    { href: "gallery.html", label: "GALLERY", desc: "梗图与日常" },
    { href: "dino.html", label: "LADDER", desc: "小恐龙天梯" }
  ];
  var here = (location.pathname.split("/").pop() || "index.html");
  var room = 4 - items.length;
  if (room > 0) {
    var pool = LINKS.filter(function (l) {
      return l.href !== here;
    });
    for (var li = 0; li < room && li < pool.length; li += 1) {
      var lk = pool[li];
      var a = document.createElement("a");
      a.className = "ck-p ck-p--link";
      a.href = lk.href;
      a.innerHTML =
        '<span class="ck-p__h"><em>→</em><span>' +
        lk.label +
        "</span></span>" +
        '<span class="ck-p__body"><span class="ck-row"><span>' +
        lk.desc +
        "</span></span></span>" +
        '<span class="ck-p__cap">OPEN</span>';
      deck.appendChild(a);
    }
  }

  /* ---------- 滚动联动 ---------- */

  function scrollTo(index) {
    var item = items[index];
    if (!item) return;
    var top =
      item.sec.getBoundingClientRect().top -
      view.getBoundingClientRect().top +
      view.scrollTop -
      4;
    if ("scrollBehavior" in view.style) {
      view.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    } else {
      view.scrollTop = Math.max(0, top);
    }
    setActive(index);
  }

  function setActive(index) {
    if (index === active) return;
    active = index;
    items.forEach(function (it, i) {
      it.btn.classList.toggle("is-on", i === index);
      if (i === index) it.btn.setAttribute("aria-current", "true");
      else it.btn.removeAttribute("aria-current");
    });
  }

  function markByScroll() {
    var line = view.getBoundingClientRect().top + 60;
    var best = 0;
    for (var i = 0; i < items.length; i += 1) {
      if (items[i].sec.getBoundingClientRect().top <= line) best = i;
    }
    setActive(best);
  }

  var ticking = false;

  function veil() {
    /* 首屏 0.3 → 滚过 420px 到 0.95。光场只在开场当主角 */
    var t = Math.min(1, view.scrollTop / 420);
    /* 纸白皮肤的光场本来就淡，遮罩再厚就看不见了 */
    var light = document.documentElement.dataset.style === "minimal";
    var v = (light ? 0.24 : 0.4) + t * (light ? 0.7 : 0.55);
    /* 遮罩挂在 .ck 上（全屏），不是内容区 */
    root.style.setProperty("--ck-veil", v.toFixed(3));
  }

  view.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        markByScroll();
        veil();
      });
    },
    { passive: true }
  );
  veil();

  markByScroll();

  /* ---------- 键盘 ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.key >= "1" && e.key <= "9") {
      var n = parseInt(e.key, 10) - 1;
      if (n < items.length) {
        e.preventDefault();
        scrollTo(n);
      }
    } else if (e.key === "Escape") {
      view.scrollTo({ top: 0, behavior: "smooth" });
      setActive(0);
    }
  });

  /* ---------- KPI 进度条 ---------- */
  var segs = root.querySelectorAll("[data-ck-seg]");
  requestAnimationFrame(function () {
    setTimeout(function () {
      for (var i = 0; i < segs.length; i += 1) {
        var s = segs[i];
        s.style.width = (s.getAttribute("data-ck-seg") || "60") + "%";
      }
    }, 160);
  });

  /* ---------- 时钟 ---------- */
  if (clockEl) {
    var pad = function (n) {
      return n < 10 ? "0" + n : "" + n;
    };
    var tick = function () {
      var d = new Date();
      clockEl.textContent =
        pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- KPI 自动统计 ----------
     项目卡、相册条目都是脚本渲染的，静态写死的数字会不准。
     渲染完再数一遍 DOM，插进顶栏那个数字里。 */
  var STAT_SEL = {
    repos: ".project-card",
    photos: ".gallery-item",
    members: ".member-card"
  };

  function countStats() {
    var nodes = root.querySelectorAll("[data-ck-stat]");
    for (var i = 0; i < nodes.length; i += 1) {
      var key = nodes[i].getAttribute("data-ck-stat");
      var sel = STAT_SEL[key];
      if (!sel) continue;
      var n = document.querySelectorAll(sel).length;
      if (n) nodes[i].textContent = n < 10 ? "0" + n : String(n);
    }
  }

  countStats();
  setTimeout(countStats, 1200);
  setTimeout(countStats, 3200);

  /* ---------- 面板进场 ---------- */
  requestAnimationFrame(function () {
    for (var i = 0; i < items.length; i += 1) {
      (function (el, idx) {
        el.style.opacity = "0";
        el.style.transform = "translateY(6px)";
        el.style.transition = "opacity .34s ease, transform .34s ease";
        setTimeout(function () {
          el.style.opacity = "";
          el.style.transform = "";
        }, 90 + idx * 45);
      })(items[i].btn, i);
    }
  });

  window.HNYZ_CK = {
    go: scrollTo,
    items: items.length
  };
})();
