/* =========================================================
   HNYZ · 成员个人页
   ---------------------------------------------------------
   1. 根据 URL 里的 ?u=用户名 找到对应成员（缺省取第一个）
   2. 渲染个人横幅（头像贴纸 + 简介 + 个性色）与他的项目卡片
   3. 项目数据来自 GitHub API，失败时用 members.js 里的字段兜底
   ========================================================= */

(() => {
  "use strict";

  const members = Array.isArray(window.HNYZ_MEMBERS) ? window.HNYZ_MEMBERS : [];
  const profiles = window.HNYZ_PROFILES || {};
  const extras = window.HNYZ_MEMBER_EXTRAS || {};
  const embeds = window.HNYZ_MEMBER_EMBEDS || {};

  const root = document.querySelector("[data-member-root]");
  const heroEl = document.querySelector("#member-hero");
  const grid = document.querySelector("#member-projects");
  const projectsHead = document.querySelector(".member-projects-head");
  if (!root || !heroEl || !grid) return;

  /* 找到目标成员 */
  const param = new URLSearchParams(window.location.search).get("u");
  const firstUser = members.length ? members[0].user : "";
  const user = members.some((m) => m.user === param) ? param : firstUser;
  /* 成员页专属的外链作品追加在仓库卡片后面 */
  const ownExtras = Array.isArray(extras[user]) ? extras[user] : [];
  /* 内嵌作品单独成块，不进卡片网格 */
  const ownEmbeds = Array.isArray(embeds[user]) ? embeds[user] : [];
  const list = members.filter((m) => m.user === user).concat(ownExtras);
  const profile = profiles[user] || {};

  /* 个性色：优先用 profile.accent，缺省蓝 */
  const accent = typeof profile.accent === "string" && profile.accent.trim()
    ? profile.accent.trim()
    : "#2563eb";
  root.style.setProperty("--member-accent", accent);

  document.title = `${user} 的主页｜HNYZ · 衡南一中编程社`;

  /* =======================================================
     一、个人横幅
     ======================================================= */
  function buildHero() {
    heroEl.replaceChildren();
    heroEl.setAttribute("aria-busy", "false");

    const hero = document.createElement("div");
    hero.className = "member-hero";

    const copy = document.createElement("div");
    copy.className = "member-hero__copy";

    const kicker = document.createElement("p");
    kicker.className = "member-hero__kicker";
    kicker.textContent = profile.kicker || `@${user}`;

    const title = document.createElement("h1");
    title.className = "member-hero__title";
    title.textContent = profile.title || `@${user}`;

    copy.append(kicker, title);

    const desc = document.createElement("p");
    desc.className = "member-hero__desc";
    const fallback = "还没有写简介。";
    const intro = profile.intro || profile.desc;
    desc.textContent = intro || fallback;
    if (!intro) desc.dataset.copy = "member-desc-fallback";

    copy.appendChild(desc);

    /* 简介里的彩蛋：平时被涂掉，点一下才显形 */
    if (typeof profile.secret === "string" && profile.secret.trim()) {
      const secret = document.createElement("button");
      secret.type = "button";
      secret.className = "member-secret";
      secret.setAttribute("aria-expanded", "false");
      secret.setAttribute("aria-label", "查看简介里被涂掉的一句话");

      const mask = document.createElement("span");
      mask.className = "member-secret__mask";
      mask.textContent = "（这里有一句话被涂掉了）";

      const text = document.createElement("span");
      text.className = "member-secret__text";
      text.textContent = profile.secret.trim();

      secret.append(mask, text);
      secret.addEventListener("click", () => {
        const open = secret.classList.toggle("is-open");
        secret.setAttribute("aria-expanded", String(open));
      });

      copy.appendChild(secret);
    }

    const actions = document.createElement("div");
    actions.className = "member-hero__actions";

    const gh = document.createElement("a");
    gh.className = "button button--primary";
    gh.href = profile.link || `https://github.com/${user}`;
    gh.target = "_blank";
    gh.rel = "noopener noreferrer";
    gh.textContent = "查看 GitHub 主页 ↗";
    gh.dataset.copy = "member-github";
    actions.appendChild(gh);

    const back = document.createElement("a");
    back.className = "button button--secondary";
    back.href = "projects.html";
    back.textContent = "← 返回全部项目";
    back.dataset.copy = "member-back";
    actions.appendChild(back);

    copy.appendChild(actions);

    const sprites = document.createElement("div");
    sprites.className = "member-hero__sprites";
    sprites.setAttribute("aria-hidden", "true");

    (Array.isArray(profile.sprites) ? profile.sprites : []).forEach((sprite, index) => {
      const src = (sprite && sprite.src) || "";
      if (!src) return;
      const img = document.createElement("img");
      img.className = sprite.modifier ? `member-chibi ${sprite.modifier}` : "member-chibi";
      img.src = src;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      sprites.appendChild(img);
    });

    hero.append(copy, sprites);
    heroEl.appendChild(hero);
  }

  /* =======================================================
     二、内嵌作品（iframe 直接装进本页）
     -------------------------------------------------------
     朋友的作品不再是「一张卡片点了跳走」，而是把网页本身
     放进成员页：外框做成一块屏幕，边框、地址栏都跟着皮肤走。
     轻量模式下不自动下载这个 iframe（里面是十二首曲子加
     一堆动画数据），先盖一层封面，点一下才真正加载。
     ======================================================= */
  function isLiteTier() {
    const tier = document.documentElement.dataset.lite;
    return tier === "1" || tier === "2";
  }

  /* 省流量 / 2G 边缘网：这个播放器自己就要十兆，不该偷偷替人下。
     这类设备直接走「点一下才加载」的那条路。 */
  function isFrugalNet() {
    const c = navigator.connection;
    if (!c) return false;
    if (c.saveData) return true;
    return /(^|-)2g$/.test(c.effectiveType || "");
  }

  function gateEmbed() {
    return isLiteTier() || isFrugalNet();
  }

  function buildEmbed(item, index) {
    const section = document.createElement("section");
    section.className = "member-embed";
    section.id = index === 0 ? "member-embed" : `member-embed-${index}`;
    section.setAttribute("aria-labelledby", `${section.id}-title`);

    /* 右边这一栏是说明：播放器本身只有一张画布，
       没有进度条也没有歌单按钮，得先告诉人怎么用 */
    const side = document.createElement("div");
    side.className = "member-embed__side";

    const copy = document.createElement("div");
    copy.className = "member-embed__copy";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    const dot = document.createElement("span");
    dot.className = "eyebrow-dot";
    dot.setAttribute("aria-hidden", "true");
    const eyebrowText = document.createElement("span");
    eyebrowText.textContent = "在这里就能用";
    eyebrow.append(dot, eyebrowText);

    const title = document.createElement("h2");
    title.className = "member-embed__title";
    title.id = `${section.id}-title`;
    title.textContent = item.title || "内嵌作品";

    copy.append(eyebrow, title);

    if (item.desc) {
      const desc = document.createElement("p");
      desc.className = "member-embed__desc";
      desc.textContent = item.desc;
      copy.appendChild(desc);
    }

    const open = document.createElement("a");
    open.className = "member-embed__open";
    open.href = item.src;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    const openText = document.createElement("span");
    openText.textContent = "新窗口打开";
    const openArrow = document.createElement("span");
    openArrow.className = "source-arrow";
    openArrow.setAttribute("aria-hidden", "true");
    openArrow.textContent = "↗";
    open.append(openText, openArrow);

    side.append(copy);

    /* 作者 / 曲目 / 类型：右侧光有几句介绍太单薄，补一排小字 */
    const facts = [
      ["作者", item.by],
      ["曲目", item.tracks],
      ["类型", item.kind]
    ].filter((row) => typeof row[1] === "string" && row[1].trim());

    if (facts.length) {
      const meta = document.createElement("dl");
      meta.className = "member-embed__meta";
      facts.forEach(([label, value]) => {
        const cell = document.createElement("div");
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = value.trim();
        cell.append(dt, dd);
        meta.appendChild(cell);
      });
      side.appendChild(meta);
    }

    side.appendChild(open);

    const frame = document.createElement("div");
    frame.className = "member-embed__frame";

    const bar = document.createElement("div");
    bar.className = "member-embed__bar";
    bar.setAttribute("aria-hidden", "true");

    const dots = document.createElement("span");
    dots.className = "member-embed__dots";
    for (let i = 0; i < 3; i += 1) dots.appendChild(document.createElement("i"));

    const addr = document.createElement("span");
    addr.className = "member-embed__addr";
    addr.textContent = item.label || item.src.replace(/^https?:\/\//, "").replace(/\/$/, "");

    const live = document.createElement("span");
    live.className = "member-embed__live";
    live.textContent = "LIVE";

    bar.append(dots, addr, live);

    const viewport = document.createElement("div");
    viewport.className = "member-embed__viewport";
    if (item.height) viewport.style.height = String(item.height);

    const iframe = document.createElement("iframe");
    iframe.className = "member-embed__iframe";
    iframe.title = item.title || "内嵌作品";
    iframe.loading = "lazy";
    iframe.setAttribute("allow", "autoplay; fullscreen; encrypted-media; picture-in-picture");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("referrerpolicy", "no-referrer");

    if (gateEmbed()) {
      /* 轻量模式：封面 + 一颗按钮，点了才给 iframe 接上地址 */
      const gate = document.createElement("button");
      gate.type = "button";
      gate.className = "member-embed__gate";
      if (item.coverImg) {
        const cover = document.createElement("img");
        cover.className = "member-embed__gate-cover";
        cover.src = item.coverImg;
        cover.alt = "";
        cover.loading = "lazy";
        cover.decoding = "async";
        gate.appendChild(cover);
      }

      const gateTitle = document.createElement("span");
      gateTitle.className = "member-embed__gate-title";
      gateTitle.textContent = "点一下加载放映室";

      const gateHint = document.createElement("span");
      gateHint.className = "member-embed__gate-hint";
      gateHint.textContent = isLiteTier()
        ? "轻量模式不自动下载播放器"
        : "播放器有十兆，按需加载";

      gate.append(gateTitle, gateHint);

      gate.addEventListener("click", () => {
        gate.classList.add("is-loading");
        gateTitle.textContent = "正在加载…";
        gateHint.textContent = "画面和第一首歌准备好就出现";
        iframe.src = item.src;
        const drop = () => gate.remove();
        iframe.addEventListener("load", drop, { once: true });
        /* 播放器加载慢（十二段动画数据）时也别把人锁在按钮上 */
        window.setTimeout(drop, 12000);
      }, { once: true });

      viewport.appendChild(gate);
    } else {
      /* 正常档也不立刻挂 src。
         这个 iframe 里是十二首歌和一堆手绘动画，光是它自己就要拉
         两兆多的图，实测把 load 从 0.5s 拖到 3.6s，首屏的标题、
         正文全在等它。改成先立一层封面，等页面自己 load 完、主线程
         空下来再去下载；期间点封面可以催它。
         轻量/极致档仍然走上面的 gate，点一下才下。 */
      const boot = document.createElement("div");
      boot.className = "member-embed__boot";

      const bootDot = document.createElement("i");
      bootDot.className = "member-embed__boot-dot";
      bootDot.setAttribute("aria-hidden", "true");

      const bootText = document.createElement("span");
      bootText.className = "member-embed__boot-text";
      bootText.textContent = "正在准备放映室…";
      boot.append(bootDot, bootText);
      viewport.appendChild(boot);

      let armed = false;
      const drop = () => {
        /* iframe 的 load 只代表文档到了，播放器自己还要画一帧。
           直接摘掉会先露一块浅色底再跳成画面，所以淡出一下再摘。 */
        if (!boot.isConnected) return;
        boot.classList.add("is-out");
        window.setTimeout(() => boot.remove(), 320);
      };
      const fire = () => {
        if (armed) return;
        armed = true;
        iframe.src = item.src;
        iframe.addEventListener("load", () => window.setTimeout(drop, 160), { once: true });
        /* 播放器自己很慢（十二段动画数据）时，别让人一直盯着"准备中" */
        window.setTimeout(drop, 15000);
      };

      boot.addEventListener("click", fire, { once: true });

      /* 页面 load 之后再等空闲：别和首屏的字体、脚本抢带宽 */
      const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 240));
      const afterLoad = () => idle(fire, { timeout: 1800 });
      if (document.readyState === "complete") afterLoad();
      else window.addEventListener("load", afterLoad, { once: true });
    }

    viewport.appendChild(iframe);
    frame.append(bar, viewport);
    section.append(frame, side);

    return section;
  }

  function renderEmbeds() {
    if (!ownEmbeds.length) return;
    /* 插在「这个成员的作品」标题之前：先能听，再看仓库 */
    const anchor = projectsHead || grid;
    ownEmbeds.forEach((item, index) => {
      if (!item || !item.src) return;
      anchor.parentNode.insertBefore(buildEmbed(item, index), anchor);
    });
  }

  /* =======================================================
     三、项目卡片（复用 style.css 的卡片类）
     ======================================================= */
  function number(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "—";
    if (n < 1000) return String(n);
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  }

  function coverPlaceholder(name, user) {
    const box = document.createElement("div");
    box.className = "cover-placeholder";
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", `${name} 的默认封面`);

    const tag = document.createElement("span");
    tag.className = "cover-tag";
    tag.textContent = "自动生成封面";

    const mark = document.createElement("strong");
    mark.className = "cover-mark";
    mark.textContent = "</>";

    const repo = document.createElement("span");
    repo.className = "cover-repo";
    repo.textContent = `${user}`;

    box.append(tag, mark, repo);
    return box;
  }

  function buildCover(member) {
    const wrap = document.createElement("div");
    wrap.className = "project-cover";

    if (member.coverImg) {
      const img = document.createElement("img");
      img.src = member.coverImg;
      img.alt = member.title || member.repo;
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", () => {
        img.remove();
        wrap.appendChild(coverPlaceholder(member.title, member.owner || member.user));
      }, { once: true });
      wrap.appendChild(img);
    } else {
      wrap.appendChild(coverPlaceholder(member.title, member.owner || member.user));
    }

    return wrap;
  }

  function buildCard(member, data) {
    const card = document.createElement("article");
    card.className = "project-card";

    const body = document.createElement("div");
    body.className = "project-body";

    const heading = document.createElement("div");
    heading.className = "project-heading";

    const title = document.createElement("h3");
    title.className = "project-title";
    title.textContent = member.title || data.name || member.repo;

    const owner = document.createElement("p");
    owner.className = "project-owner";
    /* 友邻作品挂在本人页面上，作者名要用 owner，不能用页面归属的 user */
    owner.textContent = `@${member.owner || member.user}`;

    heading.append(title, owner);

    const desc = document.createElement("p");
    desc.className = "project-desc";
    desc.textContent = data.description || member.desc || "这个仓库还没有填写简介。";

    const footer = document.createElement("div");
    footer.className = "project-footer";

    const stats = document.createElement("div");
    stats.className = "project-stats";

    const dot = document.createElement("span");
    dot.className = "lang-dot";
    dot.setAttribute("aria-hidden", "true");

    const lang = document.createElement("span");
    lang.className = "project-stat";
    const langLabel = document.createElement("span");
    langLabel.className = "stat-label";
    langLabel.textContent = "语言";
    const langValue = document.createElement("span");
    langValue.className = "stat-value";
    langValue.append(dot, document.createTextNode(data.language || "TEXT"));
    lang.append(langLabel, langValue);

    const stars = document.createElement("span");
    stars.className = "project-stat";
    const sLabel = document.createElement("span");
    sLabel.className = "stat-label";
    sLabel.textContent = "🌟";
    const sValue = document.createElement("span");
    sValue.className = "stat-value";
    sValue.textContent = number(data.stars);
    stars.append(sLabel, sValue);

    const forks = document.createElement("span");
    forks.className = "project-stat";
    const fLabel = document.createElement("span");
    fLabel.className = "stat-label";
    fLabel.textContent = "🍴";
    const fValue = document.createElement("span");
    fValue.className = "stat-value";
    fValue.textContent = number(data.forks);
    forks.append(fLabel, fValue);

    /* 站点类条目没有仓库，星标 / fork 数是空的，一排「—」不如不显示 */
    if (member.link) {
      stats.append(lang);
    } else {
      stats.append(lang, stars, forks);
    }

    const source = document.createElement("a");
    source.className = "project-source";
    source.href = member.link || data.url || `https://github.com/${member.user}/${member.repo}`;
    source.target = "_blank";
    source.rel = "noopener noreferrer";

    const sourceText = document.createElement("span");
    sourceText.textContent = member.link ? "打开网站" : member.external ? "下载 / 仓库" : "查看源码";
    const arrow = document.createElement("span");
    arrow.className = "source-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    source.append(sourceText, arrow);

    footer.append(stats, source);
    body.append(heading, desc, footer);
    card.append(buildCover(member), body);
    return card;
  }

  async function fetchRepo(member) {
    /* 站点类条目：链接是现成的，不进 GitHub API。
       仓库本来就没有公开简介，问一次必然是 404，还要等 8 秒超时。 */
    if (member.link) {
      return {
        name: member.repo,
        description: member.desc || "",
        language: member.language || "HTML",
        stars: null,
        forks: null,
        url: member.link
      };
    }

    const api = `https://api.github.com/repos/${encodeURIComponent(member.user)}/${encodeURIComponent(member.repo)}`;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(api, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
        signal: controller.signal
      });
      if (!res.ok) throw new Error(String(res.status));
      const d = await res.json();
      return {
        name: d.name,
        description: member.desc || d.description || "",
        language: d.language || member.language || "TEXT",
        stars: d.stargazers_count || 0,
        forks: d.forks_count || 0,
        url: d.html_url || `https://github.com/${member.user}/${member.repo}`
      };
    } catch (error) {
      return {
        name: member.repo,
        description: member.desc || "GitHub API 暂时不可用，点开仓库直接查看。",
        language: member.language || "TEXT",
        stars: null,
        forks: null,
        url: `https://github.com/${member.user}/${member.repo}`
      };
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function renderProjects() {
    grid.replaceChildren();
    grid.setAttribute("aria-busy", "true");
    /* 卡数写进属性，桌面端按 3 张 / 4 张分别排版。
       属性名不能叫 data-count：personal.js 会把所有 [data-count] 当数字
       增长动画处理，直接改写 textContent，卡片会被拍成一个数字。 */
    grid.dataset.cards = String(list.length);

    const hint = document.createElement("p");
    hint.className = "member-hint";
    hint.textContent = "正在读取仓库…";
    grid.appendChild(hint);

    const data = await Promise.all(list.map((m) => fetchRepo(m)));

    grid.replaceChildren();
    grid.setAttribute("aria-busy", "false");

    if (!data.length) {
      const empty = document.createElement("p");
      empty.className = "project-empty";
      empty.textContent = "这个成员还没有公开仓库。";
      grid.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    list.forEach((member, index) => frag.appendChild(buildCard(member, data[index])));
    grid.appendChild(frag);
  }

  buildHero();
  renderEmbeds();
  renderProjects();
})();
