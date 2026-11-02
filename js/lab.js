/* =========================================================
   HNYZ · 数据实验室（黑客风）
   ---------------------------------------------------------
   这一套不是「同一张页面换配色」，而是整页重排：

     顶栏   品牌 / 五个 KPI / 时钟 / 风格按钮
     舞台   一块画布，引擎在 js/lab-stage.js
     面板   动态、索引、节拍、加入 —— 四格，数据全取自站点本身
     调参台 六根滑块直接改舞台的 CFG（C 键开合）

   为什么单独一个文件：默认、极简、棍木三套要继续保持原来的
   长页面，只有这套要另一副骨架。整块 DOM 在这里搭，切走时
   原样拆掉，不留补丁在别人的版式里。
   ========================================================= */

(() => {
  "use strict";

  const VERSION = "20261130";
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const trigger = document.querySelector("[data-style-toggle]");
  const triggerHome = trigger ? { parent: trigger.parentNode, next: trigger.nextSibling } : null;

  let lab = null;
  let stageHost = null;
  let cxPanel = null;
  let feedTimer = 0;
  let clockTimer = 0;
  let hudRaf = 0;
  let feedIndex = 0;
  let mounted = false;
  let indexBody = null;
  let indexCap = null;
  let observer = null;
  let refreshTimer = 0;

  /* -------------------------------------------------------
     一、这一页是哪一个板块
     ------------------------------------------------------- */
  const PAGE = (() => {
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (file.indexOf("projects") === 0) return "projects";
    if (file.indexOf("gallery") === 0) return "gallery";
    if (file.indexOf("member") === 0) return "member";
    return "index";
  })();

  const NAV = [
    { page: "index", href: "index.html", label: "首页" },
    { page: "projects", href: "projects.html", label: "项目" },
    { page: "gallery", href: "gallery.html", label: "图集" },
    { page: "member", href: "member.html", label: "成员" }
  ];

  const INDEX_CAP = {
    index: "点一行看详情",
    projects: "点一行去仓库",
    gallery: "点一行看原图",
    member: "这个人的作品"
  };

  const INDEX_TITLE = {
    index: ["INDEX", "项目"],
    projects: ["INDEX", "全部项目"],
    gallery: ["INDEX", "图集"],
    member: ["INDEX", "作品"]
  };

  const SOCIAL = {
    qq: "1098931492",
    mail: "483677268@qq.com",
    org: "https://github.com/ghxiaochi"
  };

  /* -------------------------------------------------------
     二、小工具
     ------------------------------------------------------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function nowText() {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function todayText() {
    const d = new Date();
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  }

  /* 页面上的文字，压掉多余空白，太长的截断 */
  function clean(text, max) {
    const value = (text || "").replace(/\s+/g, " ").trim();
    if (!value) return "";
    return value.length > (max || 20) ? value.slice(0, max || 20) + "…" : value;
  }

  /* 项目清单是站点自己的数据源，顶栏数字和索引面板都从这里取 */
  function projects() {
    const list = window.HNYZ_MEMBERS;
    if (!Array.isArray(list)) return [];
    return list.map((item) => ({
      title: clean(item.title || item.repo, 22),
      lang: item.language || "",
      repo: item.repo || "",
      user: item.user || "",
      href: item.user && item.repo ? `https://github.com/${item.user}/${item.repo}` : "projects.html"
    }));
  }

  /* -------------------------------------------------------
     三、版式
     ------------------------------------------------------- */
  function buildHead() {
    const head = el("header", "lab-head");

    const brand = el("a", "lab-brand");
    brand.href = "index.html";
    brand.setAttribute("aria-label", "衡南一中编程社首页");
    const mark = el("span", "lab-brand__mark", "</>");
    mark.setAttribute("aria-hidden", "true");
    const brandCopy = el("span");
    const name = el("h1", "lab-brand__name");
    name.append(document.createTextNode("HNYZ"));
    name.append(el("i", null, "/"));
    name.append(document.createTextNode("编程社"));
    brandCopy.append(name, el("em", null, "HENGNAN NO.1 · STUDENT DEV CLUB"));
    brand.append(mark, brandCopy);

    const kpis = el("div", "lab-kpis");
    kpis.setAttribute("data-lab-kpis", "");

    const actions = el("div", "lab-actions");

    const nav = el("nav", "lab-nav");
    nav.setAttribute("aria-label", "快捷导航");
    NAV.forEach((item) => {
      const link = el("a", null, item.label);
      link.href = item.href;
      if (item.page === PAGE) link.setAttribute("aria-current", "page");
      nav.appendChild(link);
    });

    const clock = el("span", "lab-clock");
    clock.setAttribute("data-lab-clock", "");
    clock.textContent = nowText();

    actions.append(nav, clock);
    if (trigger) actions.appendChild(trigger);

    head.append(brand, kpis, actions);
    return head;
  }

  function paintKpis() {
    const host = lab && lab.querySelector("[data-lab-kpis]");
    if (!host) return;
    host.textContent = "";

    const list = projects();
    const total = list.length || document.querySelectorAll(".project-card").length || 0;
    const rows = [
      { k: "PROJECTS", cn: "项目", v: pad(total), seg: .55 },
      { k: "TRACKS", cn: "方向", v: "04", seg: .5, tone: "b" },
      { k: "CADENCE", cn: "频率", v: "2×/周", seg: .7 },
      { k: "SESSION", cn: "时长", v: "60 MIN", seg: .45, tone: "b" },
      { k: "BASE", cn: "门槛", v: "0", seg: .3, tone: "w" }
    ];

    rows.forEach((row) => {
      const cell = el("div", "lab-kpi" + (row.tone ? " lab-kpi--" + row.tone : ""));
      const label = el("b", null, row.k + " ");
      label.appendChild(el("i", null, "/ " + row.cn));
      cell.append(label, el("span", null, row.v));
      const bar = el("i");
      bar.style.setProperty("--seg", String(row.seg));
      cell.appendChild(bar);
      host.appendChild(cell);
    });
  }

  function buildStage() {
    const stage = el("div", "lab-stage");
    stageHost = stage;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("data-lab-halo", "");
    canvas.setAttribute("aria-hidden", "true");

    const chk = el("div", "lab-hud lab-hud--chk");
    chk.append(
      el("b", null, "STABILITY CHECK"),
      el("span", null, "BEAT 1/8 · PATTERN 2-1-1-2-2-3-1-1-1-4"),
      el("em", null, "编织核心 / 数据环带 / 外侧光束 · 同一节拍")
    );

    const beat = el("div", "lab-hud lab-hud--beat");
    const beatNum = el("b", null, "00");
    beatNum.setAttribute("data-lab-beat", "");
    const pips = el("span", "lab-pips");
    for (let i = 0; i < 4; i += 1) pips.appendChild(el("i"));
    beat.append(beatNum, pips, el("small", null, "BEAT"));

    const bpm = el("small", null, "96 BPM");
    bpm.setAttribute("data-lab-bpm", "");
    beat.appendChild(bpm);

    const fps = el("div", "lab-hud lab-hud--fps", "60 FPS");
    fps.setAttribute("data-lab-fps", "");

    const status = el("div", "lab-hud lab-hud--status");
    status.append(
      el("b", null, "STAGE / ONLINE"),
      el("span", null, `${todayText()} · 四系统同拍`)
    );

    const consoleBtn = el("button", "lab-console-btn");
    consoleBtn.type = "button";
    consoleBtn.setAttribute("data-lab-console", "");
    consoleBtn.setAttribute("aria-expanded", "false");
    consoleBtn.append(document.createTextNode("◱ CONSOLE"), el("kbd", null, "C"));

    stage.append(canvas, chk, beat, fps, status, consoleBtn);
    return stage;
  }

  /* ---------- 面板 ---------- */

  function panel(title, tag, body, cap) {
    const box = el("section", "lab-p");
    const head = el("h2", null, title);
    head.appendChild(el("span", null, tag));
    const wrap = el("div", "lab-p__body");
    wrap.appendChild(body);
    box.append(head, wrap);
    if (cap) box.appendChild(el("p", "lab-p__cap", cap));
    box._body = wrap;
    box._cap = box.querySelector(".lab-p__cap");
    return box;
  }

  /* 动态：把站点里真实发生的东西按时间往下滚 */
  function feedFacts() {
    const list = projects();
    const facts = [];
    list.forEach((item) => {
      facts.push(["REPO", `${item.title}${item.lang ? " · " + item.lang : ""}`]);
    });
    facts.push(["BEAT", "2-1-1-2-2-3-1-1-1-4"]);
    facts.push(["RING", "数据环带 · 随拍步进"]);
    facts.push(["CORE", "编织核心 · 光点沿贝塞尔跑"]);
    facts.push(["BEAM", "外侧楔形光束 · 五层"]);
    facts.push(["JOIN", `QQ 群 ${SOCIAL.qq}`]);
    facts.push(["DOC", "每周两次 · 每次一小时"]);
    return facts;
  }

  let feedFactsCache = null;

  function buildFeed() {
    const wrap = el("div", "lab-feed");
    wrap.setAttribute("data-lab-feed", "");
    feedFactsCache = feedFacts();

    /* 先铺满六行，页面一打开就是「跑了一阵」的样子 */
    const start = Math.max(0, feedFactsCache.length - 6);
    for (let i = start; i < feedFactsCache.length; i += 1) {
      wrap.appendChild(feedLine(feedFactsCache[i]));
    }
    feedIndex = feedFactsCache.length;
    return wrap;
  }

  function feedLine(pair) {
    const line = el("div");
    line.append(el("b", null, nowText()), el("span", null, `${pair[0]} ${pair[1]}`));
    return line;
  }

  function tickFeed() {
    const wrap = lab && lab.querySelector("[data-lab-feed]");
    if (!wrap || !feedFactsCache || !feedFactsCache.length) return;
    const pair = feedFactsCache[feedIndex % feedFactsCache.length];
    feedIndex += 1;
    wrap.appendChild(feedLine(pair));
    while (wrap.children.length > 6) wrap.removeChild(wrap.firstElementChild);
  }

  /* 索引：每一页列自己的东西，不硬塞同一份 */
  function buildIndex() {
    const rows = el("div", "lab-rows");
    let count = 0;

    if (PAGE === "gallery") {
      const items = Array.from(document.querySelectorAll(".gallery-item")).slice(0, 7);
      items.forEach((item, i) => {
        const cap = item.querySelector("figcaption, h3, .gallery-item__title");
        const img = item.querySelector("img");
        const row = el("a", "lab-row lab-row--thumb");
        row.href = img ? img.currentSrc || img.src : "#";
        row.target = "_blank";
        row.rel = "noopener";
        if (img) {
          const thumb = new Image();
          thumb.src = img.currentSrc || img.src;
          thumb.alt = "";
          thumb.loading = "lazy";
          row.appendChild(thumb);
        }
        row.append(el("i", null, pad(i + 1)), el("span", null, clean(cap && cap.textContent, 16) || "未命名"));
        rows.appendChild(row);
        count += 1;
      });
    } else if (PAGE === "member") {
      /* 成员页是一个人一页，列他自己的作品，不是全站作品 */
      const items = Array.from(document.querySelectorAll("#member-projects .project-card")).slice(0, 7);
      items.forEach((item, i) => {
        const name = item.querySelector(".project-title, h3");
        const owner = item.querySelector(".project-owner");
        const link = item.querySelector("a[href]");
        const row = el(link ? "a" : "div", "lab-row");
        if (link) {
          row.href = link.href;
          row.target = "_blank";
          row.rel = "noopener";
        }
        row.append(
          el("i", null, pad(i + 1)),
          el("span", null, clean(name && name.textContent, 16) || "作品"),
          el("em", null, clean(owner && owner.textContent, 12).replace("@", ""))
        );
        rows.appendChild(row);
        count += 1;
      });
    } else {
      projects().slice(0, 7).forEach((item, i) => {
        const row = el("a", "lab-row");
        row.href = item.href;
        if (PAGE === "projects") {
          row.target = "_blank";
          row.rel = "noopener";
        }
        row.append(el("i", null, pad(i + 1)), el("span", null, item.title), el("em", null, item.lang));
        rows.appendChild(row);
        count += 1;
      });
    }

    if (!count) {
      rows.appendChild(el("div", "lab-row", "暂无数据"));
    }
    return rows;
  }

  function buildRhythm() {
    const rows = el("div", "lab-rows");
    [
      ["每周 · 第一次", "主题分享 + 结对", "60 MIN"],
      ["每周 · 第二次", "自由开发 + 排查", "60 MIN"],
      ["每月", "小型 Demo Day", "60 MIN"]
    ].forEach((item, i) => {
      const row = el("div", "lab-row");
      row.append(el("i", null, pad(i + 1)), el("span", null, `${item[0]} · ${item[1]}`), el("em", null, item[2]));
      rows.appendChild(row);
    });
    return rows;
  }

  function buildJoin() {
    const wrap = el("div", "lab-join");
    const dl = el("dl");
    [
      ["QQ", SOCIAL.qq],
      ["MAIL", SOCIAL.mail]
    ].forEach((pair) => {
      dl.append(el("dt", null, pair[0]), el("dd", null, pair[1]));
    });

    const btns = el("div", "lab-join__btns");
    const join = el("a", "lab-btn lab-btn--primary", "加入我们");
    join.href = PAGE === "index" ? "#join" : "index.html#join";
    const more = el("a", "lab-btn", "常规版式");
    more.href = "#";
    more.setAttribute("data-lab-exit", "");
    btns.append(join, more);

    wrap.append(dl, btns);
    return wrap;
  }

  function buildPanels() {
    const panels = el("section", "lab-panels");
    panels.setAttribute("aria-label", "数据面板");

    const idx = INDEX_TITLE[PAGE];
    const indexPanel = panel(idx[0], idx[1], buildIndex(), INDEX_CAP[PAGE]);
    indexBody = indexPanel._body;
    indexCap = indexPanel._cap;

    panels.append(
      panel("FEED", "动态", buildFeed(), "站点里正在发生的事"),
      indexPanel,
      panel("RHYTHM", "节拍", buildRhythm(), "每周两次 · 每次一小时"),
      panel("LINK", "加入", buildJoin(), "零基础也收")
    );
    return panels;
  }

  /* -------------------------------------------------------
     四、调参台
     ------------------------------------------------------- */
  const KNOBS = [
    ["tempo", "TEMPO", .5, 2],
    ["web", "WEB", .3, 1.8],
    ["ring", "RING", .6, 1.4],
    ["beam", "BEAM", .2, 1.8],
    ["glow", "GLOW", .2, 1.8],
    ["cam", "CAM", .2, 1.6]
  ];

  const PRESETS = {
    CALM: { tempo: .8, web: .7, ring: .9, beam: .6, glow: .8, cam: .8 },
    NORMAL: { tempo: 1, web: 1, ring: 1, beam: 1, glow: 1, cam: 1 },
    INTENSE: { tempo: 1.5, web: 1.35, ring: 1.1, beam: 1.5, glow: 1.3, cam: 1.2 }
  };

  const STORE_KEY = "hnyz:lab:stage";

  function readStore() {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      return data && typeof data === "object" ? data : null;
    } catch (error) {
      return null;
    }
  }

  function writeStore(data) {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (error) {
      /* 隐私模式：本次会话生效就够了 */
    }
  }

  function stageCfg() {
    return (window.HNYZ_STAGE && window.HNYZ_STAGE.cfg) || null;
  }

  function applyKnob(key, value) {
    const cfg = stageCfg();
    if (!cfg) return;
    cfg[key] = value;
    writeStore(Object.assign({}, cfg));
    /* 密度和环径是建缓存时算好的，改完必须重建才看得出 */
    if ((key === "web" || key === "ring") && window.HNYZ_STAGE.rebuild) {
      window.clearTimeout(applyKnob.timer);
      applyKnob.timer = window.setTimeout(() => window.HNYZ_STAGE.rebuild(), 160);
    }
  }

  function buildConsole() {
    const panelEl = el("aside", "lab-cx");
    panelEl.setAttribute("data-lab-cx", "");
    panelEl.hidden = true;
    panelEl.setAttribute("aria-label", "舞台调参台");

    const head = el("header", "lab-cx__head");
    head.append(el("span", null, "HNYZ // STAGE_CONSOLE"));
    const close = el("button", null, "×");
    close.type = "button";
    close.setAttribute("data-lab-cx-close", "");
    close.setAttribute("aria-label", "关闭调参台");
    head.appendChild(close);

    const body = el("div", "lab-cx__body");
    const cfg = stageCfg();
    const saved = readStore();

    KNOBS.forEach(([key, label, min, max]) => {
      const row = el("label", "lab-cx__knob");
      row.append(el("span", null, label));
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(min);
      input.max = String(max);
      input.step = "0.05";
      input.value = String((saved && saved[key]) || (cfg && cfg[key]) || 1);
      input.setAttribute("data-knob", key);
      const out = el("output", null, Number(input.value).toFixed(2));
      input.addEventListener("input", () => {
        out.textContent = Number(input.value).toFixed(2);
        applyKnob(key, Number(input.value));
      });
      row.append(input, out);
      body.appendChild(row);
    });

    const presets = el("div", "lab-cx__presets");
    Object.keys(PRESETS).forEach((name) => {
      const btn = el("button", null, name);
      btn.type = "button";
      btn.addEventListener("click", () => applyPreset(name));
      presets.appendChild(btn);
    });
    const reset = el("button", null, "RESET");
    reset.type = "button";
    reset.addEventListener("click", () => applyPreset("NORMAL"));
    presets.appendChild(reset);

    body.appendChild(presets);
    body.appendChild(el("p", "lab-cx__note", "C 开合 · 改的是这块画布的密度、环径、光束、辉光与运镜，不写进皮肤。"));

    panelEl.append(head, body);
    return panelEl;
  }

  function applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset || !cxPanel) return;
    KNOBS.forEach(([key]) => {
      const input = cxPanel.querySelector(`[data-knob="${key}"]`);
      if (!input) return;
      input.value = String(preset[key]);
      const out = input.parentNode.querySelector("output");
      if (out) out.textContent = preset[key].toFixed(2);
      const cfg = stageCfg();
      if (cfg) cfg[key] = preset[key];
    });
    const cfg = stageCfg();
    if (cfg) writeStore(Object.assign({}, cfg));
    if (window.HNYZ_STAGE && window.HNYZ_STAGE.rebuild) window.HNYZ_STAGE.rebuild();
  }

  function toggleConsole(force) {
    if (!cxPanel) return;
    const open = typeof force === "boolean" ? force : cxPanel.hidden;
    cxPanel.hidden = !open;
    const btn = lab && lab.querySelector("[data-lab-console]");
    if (btn) btn.setAttribute("aria-expanded", String(open));
    if (open) {
      const first = cxPanel.querySelector("input");
      if (first) first.focus({ preventScroll: true });
    }
  }

  /* -------------------------------------------------------
     五、读数：时钟 / 拍号 / 帧率
     ------------------------------------------------------- */
  function startClock() {
    const tick = () => {
      const node = lab && lab.querySelector("[data-lab-clock]");
      if (node) node.textContent = nowText();
    };
    tick();
    clockTimer = window.setInterval(tick, 1000);
  }

  function startHud() {
    let frames = 0;
    let last = performance.now();
    let fps = 60;

    const loop = (now) => {
      frames += 1;
      if (now - last >= 500) {
        fps = Math.round((frames * 1000) / (now - last));
        frames = 0;
        last = now;
        const node = lab && lab.querySelector("[data-lab-fps]");
        if (node) node.textContent = `${fps} FPS`;
      }

      const state = window.HNYZ_STAGE && window.HNYZ_STAGE.beat ? window.HNYZ_STAGE.beat() : null;
      if (state) {
        const beatNode = lab.querySelector("[data-lab-beat]");
        const bpmNode = lab.querySelector("[data-lab-bpm]");
        const pips = lab.querySelectorAll(".lab-pips i");
        if (beatNode) beatNode.textContent = pad((state.n % 16) + 1);
        if (bpmNode) bpmNode.textContent = `${state.bpm} BPM`;
        pips.forEach((pip, i) => {
          pip.classList.toggle("is-on", state.env > 0.35 && i === state.n % 4);
        });
      }
      hudRaf = window.requestAnimationFrame(loop);
    };
    hudRaf = window.requestAnimationFrame(loop);
  }

  /* -------------------------------------------------------
     六、舞台引擎按需加载
     ------------------------------------------------------- */
  function loadStage() {
    if (document.querySelector("script[data-lab-stage]")) return;
    const script = document.createElement("script");
    script.src = `js/lab-stage.js?v=${VERSION}`;
    script.async = false;
    script.setAttribute("data-lab-stage", "");
    document.body.appendChild(script);
    adoptSaved();
  }

  /* 引擎是异步落地的，上一次调好的参数要在它就位后再灌一遍 */
  function adoptSaved() {
    const saved = readStore();
    if (!saved) return;
    let tries = 0;
    const step = () => {
      const cfg = stageCfg();
      if (cfg) {
        Object.keys(saved).forEach((key) => {
          if (typeof saved[key] === "number") cfg[key] = saved[key];
        });
        if (window.HNYZ_STAGE.rebuild) window.HNYZ_STAGE.rebuild();
        return;
      }
      tries += 1;
      if (tries < 40) window.setTimeout(step, 50);
    };
    window.setTimeout(step, 0);
  }

  function unloadStage() {
    if (window.HNYZ_STAGE && window.HNYZ_STAGE.stop) window.HNYZ_STAGE.stop();
    const script = document.querySelector("script[data-lab-stage]");
    if (script) script.remove();
    try {
      delete window.HNYZ_STAGE;
    } catch (error) {
      window.HNYZ_STAGE = undefined;
    }
  }

  /* -------------------------------------------------------
     七、挂载与拆除
     ------------------------------------------------------- */
  function escHandler(event) {
    if (event.key === "Escape" && cxPanel && !cxPanel.hidden) {
      toggleConsole(false);
    }
  }

  function keyHandler(event) {
    const tag = (event.target && event.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (event.target && event.target.isContentEditable)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "c" || event.key === "C") {
      toggleConsole();
    }
  }

  function exitHandler(event) {
    const link = event.target.closest("[data-lab-exit]");
    if (!link) return;
    event.preventDefault();
    if (window.HNYZ_STYLE) window.HNYZ_STYLE.apply("default");
  }

  /* 项目卡、图集、成员资料都是脚本异步画出来的，
     面板不能只在自己挂载那一刻数一次，否则永远是空的 */
  function refreshIndex() {
    if (!mounted || !indexBody) return;
    const rows = buildIndex();
    indexBody.replaceChildren(rows);
    if (indexCap) indexCap.textContent = INDEX_CAP[PAGE];
    paintKpis();
  }

  function watchContent() {
    if (observer || !("MutationObserver" in window)) return;
    const target = document.querySelector("#main") || document.body;
    observer = new MutationObserver(() => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(refreshIndex, 260);
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  function mount() {
    if (mounted) return;
    mounted = true;

    lab = el("div", "lab");
    lab.setAttribute("data-lab", "");
    lab.append(buildHead(), buildStage(), buildPanels());
    document.body.insertBefore(lab, document.body.firstChild);

    paintKpis();
    startClock();
    startHud();

    cxPanel = buildConsole();
    /* 挂在 .lab 里面：外面那条「非 .lab 一律让位」的规则会把它一起藏掉 */
    lab.appendChild(cxPanel);

    lab.addEventListener("click", (event) => {
      if (event.target.closest("[data-lab-console]")) {
        event.preventDefault();
        toggleConsole();
      }
    });
    lab.addEventListener("click", exitHandler);
    cxPanel.addEventListener("click", (event) => {
      if (event.target.closest("[data-lab-cx-close]")) toggleConsole(false);
    });

    document.addEventListener("keydown", keyHandler);
    document.addEventListener("keydown", escHandler);

    if (!reduce.matches) {
      feedTimer = window.setInterval(tickFeed, 2600);
    }

    watchContent();

    /* 画布先进 DOM，引擎再启动，它一上来就能拿到尺寸 */
    loadStage();
  }

  function unmount() {
    if (!mounted) return;
    mounted = false;

    window.clearInterval(feedTimer);
    window.clearInterval(clockTimer);
    if (hudRaf) window.cancelAnimationFrame(hudRaf);
    feedTimer = clockTimer = hudRaf = 0;

    document.removeEventListener("keydown", keyHandler);
    document.removeEventListener("keydown", escHandler);

    if (observer) observer.disconnect();
    observer = null;
    window.clearTimeout(refreshTimer);

    unloadStage();

    if (cxPanel) cxPanel.remove();
    if (lab) lab.remove();
    cxPanel = lab = stageHost = null;

    /* 风格按钮从实验室顶栏搬回去。切去棍木时它归 body 管，
       切回其他风格时插回原来顶栏里的位置。 */
    if (trigger) {
      if (root.dataset.style === "bare") {
        document.body.appendChild(trigger);
      } else if (triggerHome && triggerHome.parent) {
        triggerHome.parent.insertBefore(trigger, triggerHome.next);
      }
    }
  }

  /* -------------------------------------------------------
     八、启动
     ------------------------------------------------------- */
  if (root.dataset.style === "hacker") mount();

  document.addEventListener("hnyz:stylechange", (event) => {
    const next = event.detail && event.detail.style;
    if (next === "hacker") mount();
    else unmount();
  });
})();
