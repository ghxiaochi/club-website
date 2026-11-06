/* =========================================================
   HNYZ · 衡南一中编程社 — 页面交互
   ---------------------------------------------------------
   这份脚本负责：
   1. 读取 js/members.js 的 HNYZ_MEMBERS，用 Promise.all 并发请求 GitHub API
   2. 渲染赛博风项目卡片（封面、简介、语言、Stars、Forks）
   3. 处理 403 限流 / 404 仓库不存在 / 网络异常，自动降级
   4. QQ 群号、邮箱一键复制
   5. 移动端导航、页头滚动状态、页脚年份

   想换展示的项目，只改 js/members.js 即可。
   不需要后端，也不需要构建工具。
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     一、仓库清单（唯一需要手动维护的数据）
     -------------------------------------------------------
     user     : GitHub 用户名 / 组织名
     repo     : 仓库名
     coverImg : 封面图 URL；可以填 https 远程图，也可以填本地
                images/xxx.svg。留空则自动显示科技网格占位图。
     title    : 可选，卡片上显示的中文项目名；不填就用仓库名。
     desc     : 可选，本地简介。GitHub 仓库没写简介时用它兜底。
     ======================================================= */
  /* 项目清单在 js/members.js，避免和页面逻辑混在一起 */
  const members = Array.isArray(window.HNYZ_MEMBERS) ? window.HNYZ_MEMBERS : [];

  const API_BASE = "https://api.github.com/repos";

  /* 每天由 GitHub Actions 抓一次的静态快照。
     为什么要有它：匿名 API 只有 60 次/小时/IP，纳新季一个班同时
     打开页面就能把额度打光，之后所有人都是降级卡片。
     读同域文件不受这个限制，断网时 Service Worker 里也有一份。 */
  const STATIC_DATA_URL = "data/repos.json";

  /* 首页最多展示 6 张卡片；完整的项目列表在 projects.html 按成员折叠 */
  const HOME_LIMIT = 6;

  /* 语言圆点颜色，尽量贴近 GitHub 的语言配色 */
  const LANGUAGE_COLORS = {
    "C++": "#f34b7d",
    C: "#555555",
    CSS: "#663399",
    HTML: "#e34c26",
    JavaScript: "#f1e05a",
    Kotlin: "#A97BFF",
    Python: "#3572A5",
    TypeScript: "#3178c6",
    Arduino: "#bd79d1",
    Shell: "#89e051"
  };

  /* -------------------------------------------------------
     GitHub API 本地缓存
     说明：同一个浏览器 10 分钟内重复打开页面时，直接用缓存，
     不重复消耗未登录 API 的 60 次/小时额度。
     ------------------------------------------------------- */
  const CACHE_KEY = "hnyz:github-repo-cache:v1";
  const CACHE_TTL = 10 * 60 * 1000;
  const CACHE_LIMIT = 40;

  /* =======================================================
     二、DOM 引用与状态
     ======================================================= */
  const grid = document.querySelector("#project-grid");
  const groupsRoot = document.querySelector("#project-groups");
  const count = document.querySelector("#project-count");
  const renderNote = document.querySelector("#render-note");

  /* 记录这次加载中出现了哪些降级原因，最后合并成一条提示 */
  const notices = new Set();

  /* 这次加载命中了几次 10 分钟缓存；用于把状态显示成「本地缓存」 */
  let cacheHits = 0;

  /* 刚点过顶部刷新按钮：角标改成「刚刚刷新」，别再说成每日快照 */
  let modeOverride = "";

  /* 命中静态快照的次数 / 真正打到 API 的次数 / 那份文件的 Promise */
  let staticHits = 0;
  let apiHits = 0;
  let staticStore = null;

  /* =======================================================
     三、工具函数
     ======================================================= */

  /* 把高频事件（如 resize）压到一次，避免连续触发布局计算 */
  function debounce(fn, wait = 150) {
    let timer = 0;
    return function debounced(...args) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* 封面地址校验：允许 https、绝对路径、./ 相对路径和 images/xxx 这种写法 */
  function normalizeCover(value) {
    if (typeof value !== "string") return "";
    const path = value.trim();
    if (!path || path.length > 500) return "";
    return /^(?:https?:\/\/|\/|\.{1,2}\/|[\w.-]+\/)/i.test(path) ? path : "";
  }

  /* 数字缩写：1200 -> 1.2k，避免数据栏被大数字撑开 */
  function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return "0";
    if (number < 1000) return String(number);
    return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`;
  }

  /* 统计值缺失时显示破折号，而不是假装它是 0 */
  function formatStat(value) {
    return value !== null && value !== undefined && Number.isFinite(Number(value))
      ? formatNumber(value)
      : "—";
  }

  /* -------------------------------------------------------
     本地缓存：读、取、写
     localStorage 在隐私模式下可能抛异常，所以全部包在
     try/catch 里；缓存失败不能影响页面正常加载。
     缓存内容在页面生命周期内只解析一次（cacheMemory），
     避免每个仓库请求都重新 JSON.parse 一遍。
     ------------------------------------------------------- */
  let cacheMemory = null;

  function readRepoCache() {
    if (cacheMemory) return cacheMemory;

    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      cacheMemory = parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      cacheMemory = {};
    }
    return cacheMemory;
  }

  function getCachedRepo(key) {
    const entry = readRepoCache()[key];
    if (!entry || !entry.data || !Number.isFinite(entry.savedAt)) return null;
    return entry;
  }

  function setCachedRepo(key, data) {
    const cache = readRepoCache();
    cache[key] = { savedAt: Date.now(), data };
    const keys = Object.keys(cache);
    if (keys.length > CACHE_LIMIT) {
      keys
        .sort((a, b) => (cache[a].savedAt || 0) - (cache[b].savedAt || 0))
        .slice(0, keys.length - CACHE_LIMIT)
        .forEach((oldKey) => delete cache[oldKey]);
    }

    /* 先同步内存引用，再落盘；配额满或被禁用时静默忽略 */
    cacheMemory = cache;
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      /* 忽略写入失败，本次会话内仍可用内存缓存 */
    }
  }

  /* 用 GitHub API 返回的数据组装卡片需要的字段 */
  /* 有些仓库把「没有简介」直接写进 About，那不是正文，当成空处理 */
  function cleanDescription(value) {
    if (typeof value !== "string") return "";
    const text = value.trim();
    if (!text) return "";
    if (/^(没有简介|暂无简介|无|no description\.?|n\/a)$/i.test(text)) return "";
    return text;
  }

  function normalizeRepo(data, member) {
    return {
      key: `${member.user}/${member.repo}`,
      user: member.user,
      repo: member.repo,
      name:
        (typeof member.title === "string" && member.title.trim()) ||
        data.name ||
        member.repo,
      owner: (data.owner && data.owner.login) || member.user,
      /* 描述以 GitHub 的 About 为准：仓库那边改了什么，刷新后立刻能看到。
         本地 desc 只在仓库没写简介（或只写了「没有简介」）时兜底。 */
      description:
        cleanDescription(data.description) ||
        (typeof member.desc === "string" && member.desc.trim()) ||
        "这个仓库还没有填写简介，点开源码看看吧。",
      language: data.language || "TEXT",
      stars: Number(data.stargazers_count) || 0,
      forks: Number(data.forks_count) || 0,
      url: data.html_url || `https://github.com/${member.user}/${member.repo}`,
      coverImg: normalizeCover(member.coverImg),
      status: "ok"
    };
  }

  /* 生成一张“降级卡片”的数据。status 会显示在封面角标上。
     只依赖 members.js 里的本地字段，不再维护第二份硬编码
     仓库快照；stars / forks 未知时显示破折号，避免过时数字。 */
  function createFallback(member, status) {
    const key = `${member.user}/${member.repo}`;

    let description =
      (typeof member.desc === "string" && member.desc.trim()) ||
      "GitHub API 暂时不可用，点开源码直接查看仓库。";
    if (status === "not-found") {
      description = "这个仓库返回了 404：可能已被删除、改名，或设置成了私有仓库。";
    }

    return {
      key,
      user: member.user,
      repo: member.repo,
      name:
        (typeof member.title === "string" && member.title.trim()) ||
        member.repo,
      owner: member.user,
      description,
      language: member.language || "TEXT",
      stars: null,
      forks: null,
      url: `https://github.com/${member.user}/${member.repo}`,
      coverImg: normalizeCover(member.coverImg),
      status
    };
  }

  /* =======================================================
     四、封面：真实图片 / 科技网格占位
     ======================================================= */

  function createCoverPlaceholder(project) {
    const placeholder = document.createElement("div");
    placeholder.className = "cover-placeholder";
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute("aria-label", `${project.name} 的默认科技风封面`);

    const tag = document.createElement("span");
    tag.className = "cover-tag";
    tag.textContent = "自动生成封面";

    const mark = document.createElement("strong");
    mark.className = "cover-mark";
    mark.textContent = "</>";

    const repo = document.createElement("span");
    repo.className = "cover-repo";
    repo.textContent = `${project.user}/${project.repo}`;

    placeholder.append(tag, mark, repo);
    return placeholder;
  }

  function createCover(project) {
    const wrap = document.createElement("div");
    wrap.className = "project-cover";

    /* coverImg 为空：直接使用渐变 + 网格线占位 */
    if (!project.coverImg) {
      wrap.appendChild(createCoverPlaceholder(project));
    } else {
      const image = document.createElement("img");
      image.src = project.coverImg;
      image.alt = `${project.name} 项目封面`;
      image.loading = "lazy";
      image.decoding = "async";

      /* 图片加载失败（URL 失效、外链被墙）时，无缝替换成占位图 */
      image.addEventListener(
        "error",
        () => {
          image.remove();
          wrap.appendChild(createCoverPlaceholder(project));
        },
        { once: true }
      );

      wrap.appendChild(image);
    }

    /* 右上角状态角标：只在数据异常时出现。
       正常仓库一律不挂「开源项目」——每张卡都挂一遍，
       等于五个角标说同一句话，还把封面右上角挡掉。 */
    if (project.status !== "ok") {
      const badge = document.createElement("span");
      badge.className = "cover-badge";
      badge.dataset.state = project.status;
      badge.textContent = project.status === "not-found" ? "仓库找不到" : "本地缓存";
      wrap.appendChild(badge);
    }

    return wrap;
  }

  /* =======================================================
     五、项目卡片
     ======================================================= */

  function createStat(label, value, extra, accessibleLabel) {
    const stat = document.createElement("span");
    stat.className = "project-stat";

    const key = document.createElement("span");
    key.className = "stat-label";
    key.textContent = label;

    const val = document.createElement("span");
    val.className = "stat-value";
    if (extra) val.appendChild(extra);
    val.append(document.createTextNode(value));

    if (accessibleLabel) {
      /* 不用 aria-label：它挂在没有 role 的 span 上，axe 会报
         「aria-label 不被支持」。改成一段只给读屏看的文本，
         读起来和原来一样（「语言：JavaScript」），DOM 也合法。 */
      key.setAttribute("aria-hidden", "true");
      val.setAttribute("aria-hidden", "true");

      const spoken = document.createElement("span");
      spoken.className = "sr-only";
      spoken.textContent = `${accessibleLabel}：${value}`;
      stat.appendChild(spoken);
    }

    stat.append(key, val);
    return stat;
  }

  function createProjectCard(project) {
    const card = document.createElement("article");
    card.className = "project-card";
    /* 记住这张卡对应哪个仓库：刷新时按 key 找到它，
       只改文字，不整块重画（重画会让封面闪一下） */
    card.dataset.key = project.key;

    const body = document.createElement("div");
    body.className = "project-body";

    /* 标题 + 所有者 */
    const heading = document.createElement("div");
    heading.className = "project-heading";

    const title = document.createElement("h3");
    title.className = "project-title";
    title.textContent = project.name;

    const owner = document.createElement("p");
    owner.className = "project-owner";
    owner.textContent = `@${project.owner}`;

    heading.append(title, owner);

    /* 简介：CSS 里限制 3 行，超出显示省略号 */
    const description = document.createElement("p");
    description.className = "project-desc";
    description.textContent = project.description;

    /* 底部数据栏：语言 / Stars / Forks */
    const footer = document.createElement("div");
    footer.className = "project-footer";

    const stats = document.createElement("div");
    stats.className = "project-stats";

    const languageDot = document.createElement("span");
    languageDot.className = "lang-dot";
    languageDot.style.backgroundColor = LANGUAGE_COLORS[project.language] || "#8b949e";
    languageDot.setAttribute("aria-hidden", "true");

    stats.append(
      createStat("语言", project.language, languageDot, "语言"),
      createStat("🌟", formatStat(project.stars), null, "Stars"),
      createStat("🍴", formatStat(project.forks), null, "Forks")
    );

    /* 科技风边框按钮 */
    const source = document.createElement("a");
    source.className = "project-source";
    source.href = project.url;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.setAttribute("aria-label", `查看 ${project.name} 的源码`);

    const sourceText = document.createElement("span");
    sourceText.textContent = "查看源码";

    const arrow = document.createElement("span");
    arrow.className = "source-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";

    source.append(sourceText, arrow);
    footer.append(stats, source);

    body.append(heading, description, footer);
    card.append(createCover(project), body);
    return card;
  }

  /* =======================================================
     六、渲染与降级提示
     ======================================================= */

  /* 提示只出一条。
     以前是把 403 + 缓存 + 超时拼成一长串，读起来像报错清单，
     其实都在说同一件事：现在看到的是旧数据。挑最要紧的说一句就够，
     真要重试，右上角那个刷新按钮一直都在。 */
  const NOTICE_TEXT = [
    ["network", "网络不通，先显示缓存。"],
    ["403", "GitHub 限流，先显示缓存。"],
    ["timeout", "GitHub 响应慢，先显示缓存。"],
    ["error", "部分仓库没取到，先显示缓存。"],
    ["404", "有仓库已找不到，可能改名或转私有。"],
    ["cache", "当前显示的是缓存数据。"]
  ];

  function updateNotice() {
    if (!renderNote) return;

    let text = "";
    for (const [flag, message] of NOTICE_TEXT) {
      if (notices.has(flag)) {
        text = message;
        break;
      }
    }

    renderNote.textContent = text;
    renderNote.hidden = !text;
  }

  /* 首页项目区的收尾卡：5 张卡 + 它正好两行，不再空一整列。
     total 是全部项目数，所以点进去之前就知道里面有多少。 */
  function createMoreCard(total) {
    const card = document.createElement("a");
    card.className = "project-card project-card--more";
    card.href = "projects.html";

    /* 3 列网格里按余数补位：余 0 单独一条横卡，余 1 占两格，余 2 占一格 */
    const rest = total % 3;
    card.style.setProperty("--more-span", String(rest === 0 ? 3 : rest === 1 ? 2 : 1));

    const inner = document.createElement("span");
    inner.className = "project-more__inner";

    const num = document.createElement("span");
    num.className = "project-more__count";
    num.textContent = String(total);

    const label = document.createElement("span");
    label.className = "project-more__label";
    label.textContent = "全部项目";

    const hint = document.createElement("span");
    hint.className = "project-more__hint";
    hint.textContent = "按成员分组 · 点开才加载";

    const arrow = document.createElement("span");
    arrow.className = "project-more__arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";

    inner.append(num, label, hint, arrow);
    card.append(inner);
    return card;
  }

  function renderProjects(projects) {
    const isHome = grid && grid.id === "project-grid";

    if (!grid) return;

    grid.replaceChildren();
    grid.setAttribute("aria-busy", "false");

    if (!projects.length) {
      const empty = document.createElement("p");
      empty.className = "project-empty";
      empty.textContent = "项目清单还是空的。等社团把仓库加进来，这里就会有卡片。";
      grid.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      projects.forEach((project) => fragment.appendChild(createProjectCard(project)));
      grid.appendChild(fragment);

      if (isHome) grid.appendChild(createMoreCard(members.length));
    }

    if (count) {
      const scope = members.length > HOME_LIMIT
        ? `${projects.length} / ${members.length}`
        : `${projects.length}`;
      count.textContent = `${scope} 个项目 · ${currentMode()}`;
    }

    updateNotice();
  }

  /* -------------------------------------------------------
     单张卡就地更新
     -------------------------------------------------------
     刷新时每回来一个仓库就调一次：只改文字和链接，不重建
      DOM，封面图不会重新解码，所以不会闪。
     ------------------------------------------------------- */
  function patchCard(project) {
    if (!grid) return;

    const card = grid.querySelector(`.project-card[data-key="${project.key}"]`);
    if (!card) return;

    const title = card.querySelector(".project-title");
    if (title) title.textContent = project.name;

    const owner = card.querySelector(".project-owner");
    if (owner) owner.textContent = `@${project.owner}`;

    const desc = card.querySelector(".project-desc");
    if (desc) desc.textContent = project.description;

    const values = card.querySelectorAll(".project-stats .stat-value");
    if (values.length === 3) {
      values[0].textContent = project.language;
      values[1].textContent = formatStat(project.stars);
      values[2].textContent = formatStat(project.forks);

      const dot = values[0].querySelector(".lang-dot");
      if (dot) dot.style.backgroundColor = LANGUAGE_COLORS[project.language] || "#8b949e";
    }

    const source = card.querySelector(".project-source");
    if (source) {
      source.href = project.url;
      source.setAttribute("aria-label", `查看 ${project.name} 的源码`);
    }
  }

  /* =======================================================
     七、GitHub API 请求
     -------------------------------------------------------
     关键点：
     - Promise.all 并发请求所有仓库，而不是一个接一个等
     - 每个请求内部消化 403 / 404 / 网络错误，返回兜底数据
     - Promise.all 不会因为单个仓库失败而整体崩掉
     ======================================================= */

  /* 读取 data/repos.json。整页只发一次请求，失败就记成 null，
     后续所有仓库自动走 GitHub API —— 这条路径坏了不影响主流程。 */
  function loadStaticStore() {
    if (staticStore) return staticStore;

    staticStore = fetch(STATIC_DATA_URL, { cache: "no-cache" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => (data && typeof data === "object" && data.repos ? data : null))
      .catch(() => null);

    return staticStore;
  }

  async function fetchRepo(member) {
    const apiUrl = `${API_BASE}/${encodeURIComponent(member.user)}/${encodeURIComponent(member.repo)}`;
    const cacheKey = `${member.user}/${member.repo}`;
    const cached = getCachedRepo(cacheKey);

    /* 10 分钟内直接使用缓存，不消耗 GitHub API 配额 */
    if (cached && Date.now() - cached.savedAt < CACHE_TTL) {
      cacheHits += 1;
      return normalizeRepo(cached.data, member);
    }

    /* 静态快照优先：它一天更新一次，stars 之类慢一两天无所谓，
       换来的是一次请求都不消耗 API 额度。 */
    const store = await loadStaticStore();
    const snapshot = store && store.repos ? store.repos[cacheKey] : null;
    if (snapshot) {
      /* 手动刷新写入的缓存比这份快照新，就以缓存为准：
         否则点完刷新过 10 分钟，旧快照又把它盖回去了 */
      const generatedAt = store && store.generatedAt ? Date.parse(store.generatedAt) : 0;
      if (cached && Number.isFinite(generatedAt) && cached.savedAt > generatedAt) {
        cacheHits += 1;
        return normalizeRepo(cached.data, member);
      }
      staticHits += 1;
      /* 顺手落进本地缓存：哪一天快照文件缺了这个仓库，还有旧值兜底 */
      setCachedRepo(cacheKey, snapshot);
      return normalizeRepo(snapshot, member);
    }

    /* GitHub 偶尔会挂住不返回。国内直连经常 5 秒才握手完，
       8 秒会把「线路慢」误判成「断网」，所以放到 15 秒；
       这期间卡片用的是快照 / 缓存，不是空白。 */
    apiHits += 1;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
        signal: controller.signal
      });

      /* 403：通常是未登录 API 限流（60 次 / 小时 / IP） */
      if (response.status === 403) {
        notices.add("403");
        if (cached) {
          notices.add("cache");
          cacheHits += 1;
          return normalizeRepo(cached.data, member);
        }
        return createFallback(member, "rate-limit");
      }

      /* 404：仓库不存在、改名或私有 */
      if (response.status === 404) {
        notices.add("404");
        return createFallback(member, "not-found");
      }

      if (!response.ok) {
        notices.add("error");
        return createFallback(member, "error");
      }

      const data = await response.json();
      setCachedRepo(cacheKey, data);
      return normalizeRepo(data, member);
    } catch (error) {
      /* 超时和真·断网分开报：前者浏览器已经连上了，只是 GitHub 没回话 */
      notices.add(controller.signal.aborted ? "timeout" : "network");
      if (cached) {
        notices.add("cache");
        cacheHits += 1;
        return normalizeRepo(cached.data, member);
      }
      return createFallback(member, "network");
    } finally {
      window.clearTimeout(timer);
    }
  }

  /* 固定并发的小工具：同时最多跑 limit 个，顺序返回 */
  async function mapLimit(items, limit, worker) {
    const output = new Array(items.length);
    let cursor = 0;

    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        output[index] = await worker(items[index], index);
      }
    });

    await Promise.all(runners);
    return output;
  }

  async function loadProjects() {
    if (!grid) return;

    notices.clear();
    cacheHits = 0;
    staticHits = 0;
    apiHits = 0;

    try {
      /* 首页只请求前 6 个仓库，避免一次消耗太多 GitHub API 配额。
         再限一次并发（3 个）：同时挂起 6 条请求，弱网下只会互相拖慢，
         未登录的 API 也更容易被判成滥用。 */
      const shown = members.slice(0, HOME_LIMIT);
      const projects = await mapLimit(shown, 3, (member) => fetchRepo(member));
      renderProjects(projects);
    } catch (error) {
      /* fetchRepo 已经做过兜底，这里只防御意料之外的渲染异常 */
      notices.add("error");
      renderProjects(members.map((member) => createFallback(member, "error")));
    }
  }

  /* =======================================================
     七点五、全部项目页：按成员折叠，展开时才加载
     -------------------------------------------------------
     HNYZ_MEMBERS 可以放很多人的很多仓库。全部项目页先按
     GitHub 用户名分组，每组是一个原生 <details> 折叠面板；
     点开某组时才请求该组仓库，不会一进页面就把 API 配额打满。
     ======================================================= */

  function groupMembers() {
    const grouped = new Map();

    members.forEach((member) => {
      if (!grouped.has(member.user)) grouped.set(member.user, []);
      grouped.get(member.user).push(member);
    });

    return Array.from(grouped.entries());
  }

  function updateArchiveCount() {
    if (!count) return;

    count.textContent = `${groupMembers().length} 位成员 · ${members.length} 个项目 · ${currentMode()}`;
  }

  /* 状态角标文案：有降级 > 有缓存 > 实时 API，优先级从高到低 */
  function currentMode() {
    if (modeOverride) return modeOverride;
    if (notices.size) return "部分降级";
    /* 全部来自快照才算「每日快照」；混着缓存或实时接口的说法不诚实，往上报 */
    if (staticHits && !apiHits && !cacheHits) return "每日快照";
    if (cacheHits && !apiHits) return "本地缓存";
    return apiHits ? "实时接口" : "本地缓存";
  }

  /* 成员主页横幅：数据在 js/members.js 的 HNYZ_PROFILES 里，
     main.js 只负责渲染；没有配置横幅的成员不显示这一块。 */
  function createMemberProfile(user) {
    const profiles = window.HNYZ_PROFILES || {};
    const profile = profiles[user];
    if (!profile) return null;

    const root = document.createElement("div");
    root.className = "member-profile";

    const copy = document.createElement("div");
    copy.className = "member-profile__copy";

    const kicker = document.createElement("p");
    kicker.className = "member-profile__kicker";
    kicker.textContent = typeof profile.kicker === "string" ? profile.kicker : "";

    const title = document.createElement("p");
    title.className = "member-profile__title";
    title.textContent = typeof profile.title === "string" ? profile.title : "";

    const desc = document.createElement("p");
    desc.className = "member-profile__desc";
    desc.textContent = typeof profile.desc === "string" ? profile.desc : "";

    copy.append(kicker, title, desc);

    const sprites = document.createElement("div");
    sprites.className = "member-profile__sprites";
    sprites.setAttribute("aria-hidden", "true");

    (Array.isArray(profile.sprites) ? profile.sprites : []).forEach((sprite, index) => {
      const src = normalizeCover(sprite && sprite.src);
      if (!src) return;

      const img = document.createElement("img");
      img.className = sprite.modifier ? `member-chibi ${sprite.modifier}` : "member-chibi";
      img.src = src;
      img.alt = "";
      img.width = "400";
      img.height = "400";
      img.loading = "lazy";
      img.decoding = "async";
      sprites.appendChild(img);
    });

    root.append(copy, sprites);
    return root;
  }

  function createMemberGroup(user, list, index) {
    const details = document.createElement("details");
    details.className = "member-group";
    details.dataset.user = user;
    details.dataset.loaded = "false";
    if (index === 0) details.open = true;

    const summary = document.createElement("summary");
    summary.className = "member-summary";

    const identity = document.createElement("span");
    identity.className = "member-identity";

    const prompt = document.createElement("span");
    prompt.className = "member-prompt";
    prompt.setAttribute("aria-hidden", "true");
    prompt.textContent = ">_";

    const name = document.createElement("strong");
    name.className = "member-name";
    name.textContent = `@${user}`;

    const meta = document.createElement("span");
    meta.className = "member-meta";
    meta.textContent = `${list.length} 个项目`;

    identity.append(prompt, name, meta);

    const home = document.createElement("a");
    home.className = "member-home";
    home.href = `member.html?u=${encodeURIComponent(user)}`;
    home.textContent = "个人主页 ↗";
    /* 阻止点击 summary 触发展开/收起 */
    home.addEventListener("click", (event) => event.stopPropagation());

    const marker = document.createElement("span");
    marker.className = "member-toggle";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = "+";

    /* 链接不放进 summary：summary 里嵌套可交互元素，读屏和键盘都会打架。
       「个人主页」挪到展开后的第一行，折叠时点标题只管展开。 */
    summary.append(identity, marker);

    const body = document.createElement("div");
    body.className = "member-body";

    const groupTitle = document.createElement("h2");
    groupTitle.className = "sr-only";
    groupTitle.textContent = `@${user} 的项目`;

    const head = document.createElement("p");
    head.className = "member-body__head";
    head.append(home);

    const grid = document.createElement("div");
    grid.className = "project-grid member-projects";
    grid.setAttribute("aria-busy", "false");

    const hint = document.createElement("p");
    hint.className = "member-hint";
    hint.textContent = "点开加载这一组项目";

    body.append(groupTitle, head, hint, grid);
    /* 成员横幅放在项目之后：展开一组，先看到仓库，
       再看到「这个人是谁」。首屏也就不会被一张身份卡挡死。 */
    const profile = createMemberProfile(user);
    if (profile) body.append(profile);
    details.append(summary, body);

    details.addEventListener("toggle", () => {
      if (details.open) loadMemberGroup(details, list, grid, hint);
    });

    return details;
  }

  async function loadMemberGroup(details, list, grid, hint) {
    if (details.dataset.loaded === "true" || details.dataset.loading === "true") return;

    details.dataset.loading = "true";
    if (hint) hint.textContent = "正在读取项目数据…";

    try {
      const projects = await Promise.all(list.map((member) => fetchRepo(member)));

      grid.replaceChildren();
      projects.forEach((project) => grid.appendChild(createProjectCard(project)));

      if (hint) hint.remove();
      details.dataset.loaded = "true";
      updateArchiveCount();
      updateNotice();
    } catch (error) {
      notices.add("error");
      grid.replaceChildren();
      list.forEach((member) => grid.appendChild(createProjectCard(createFallback(member, "error"))));
      if (hint) hint.remove();
      details.dataset.loaded = "true";
      updateArchiveCount();
      updateNotice();
    } finally {
      details.dataset.loading = "false";
    }
  }

  function initProjectArchive() {
    if (!groupsRoot) return;

    const grouped = groupMembers();
    groupsRoot.replaceChildren();

    if (!grouped.length) {
      const empty = document.createElement("p");
      empty.className = "project-empty";
      empty.textContent = "项目清单还是空的。等社团把仓库加进来，这里就会有卡片。";
      groupsRoot.appendChild(empty);
      groupsRoot.setAttribute("aria-busy", "false");
      if (count) count.textContent = "0 位成员 · 0 个项目";
      return;
    }

    const fragment = document.createDocumentFragment();
    grouped.forEach(([user, list], index) => {
      fragment.appendChild(createMemberGroup(user, list, index));
    });
    groupsRoot.appendChild(fragment);
    groupsRoot.setAttribute("aria-busy", "false");
    updateArchiveCount();

    /* 第一组默认展开，立即加载；其余组等用户点开再请求 */
    const firstOpen = groupsRoot.querySelector(".member-group[open]");
    if (firstOpen) firstOpen.dispatchEvent(new Event("toggle"));
  }

  /* =======================================================
     八、复制 QQ 群号 / 邮箱
     ======================================================= */

  async function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        /* 继续尝试下面的兼容方案 */
      }
    }

    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-9999px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }

    area.remove();
    return copied;
  }

  function initCopyButtons() {
    const status = document.querySelector("#copy-status");

    document.querySelectorAll("[data-copy-value]").forEach((button) => {
      /* 原始文案在绑定时就固定下来；如果放在点击回调里，
         1.8 秒内连点两次会把「已复制」当成原文案存下来，按钮文字就坏了 */
      const label = button.querySelector("[data-copy-label]") || button;
      const original = label.textContent;

      button.addEventListener("click", async () => {
        const value = button.getAttribute("data-copy-value") || "";
        if (!value) return;

        const copied = await writeClipboard(value);

        if (copied) {
          label.textContent = "已复制";
          button.classList.add("is-copied");
          if (status) status.textContent = `已复制：${value}`;
        } else {
          label.textContent = "复制失败";
          if (status) status.textContent = "自动复制失败，请手动选择并复制。";
        }

        window.setTimeout(() => {
          label.textContent = original;
          button.classList.remove("is-copied");
        }, 1800);
      });
    });
  }

  /* =======================================================
     九、移动端导航
     ======================================================= */

  function initNavigation() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav]");
    const header = document.querySelector("[data-header]");
    if (!toggle || !nav) return;

    const closeMenu = () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "打开导航菜单");
      document.body.classList.remove("nav-locked");
      if (header) header.classList.remove("is-nav-open");
    };

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "关闭导航菜单" : "打开导航菜单");
      /* 锁 body：抽屉开着时底下的页面不能跟着滚 */
      document.body.classList.toggle("nav-locked", open);
      if (header) header.classList.toggle("is-nav-open", open);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        closeMenu();
        toggle.focus();
      }
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || toggle.contains(event.target)) return;
      closeMenu();
    });

    window.addEventListener(
      "resize",
      debounce(() => {
        if (window.innerWidth > 900) closeMenu();
      })
    );
  }

  /* =======================================================
     十、页头滚动状态与年份
     ======================================================= */

  function initHeaderState() {
    const header = document.querySelector("[data-header]");
    if (!header) return;

    let pending = false;
    let scrolled = null;

    const update = () => {
      const next = window.scrollY > 8;
      if (next === scrolled) return;
      scrolled = next;
      header.classList.toggle("is-scrolled", next);
    };

    const onScroll = () => {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(() => {
        pending = false;
        update();
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initYear() {
    document.querySelectorAll("[data-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
  }

  /* =======================================================
     十一、顶部刷新按钮的回调口
     -------------------------------------------------------
     按钮逻辑在 js/repo-sync.js：它负责问 GitHub、写缓存。
     这里提供两个口子 —— 一个让它写进 main.js 内存里那份
     缓存引用（否则刚写进去的值会被旧引用盖住），一个在
     数据落地后把当前页重新画一遍。
     ======================================================= */
  /* 仓库 key -> 成员配置：刷新回来的裸数据要靠它补齐标题、封面这些本地字段 */
  const memberByKey = new Map();
  members.forEach((member) => {
    if (!member || !member.user || !member.repo) return;
    memberByKey.set(`${member.user}/${member.repo}`, member);
  });

  /* 刷新过程中每回来一个仓库就调一次：只改那几张卡的文字 */
  function onRepoUpdated(event) {
    const detail = event.detail || {};
    const member = memberByKey.get(detail.key);
    if (!member || !detail.data) return;

    modeOverride = "刚刚刷新";
    patchCard(normalizeRepo(detail.data, member));

    if (count) {
      const total = grid ? grid.querySelectorAll(".project-card:not(.project-card--more)").length : 0;
      if (total) count.textContent = `${total} 个项目 · ${currentMode()}`;
    }
  }

  /* 全部回来之后：卡片在进度里已经逐张改过了，这里只补状态角标，
     不再整块重画——重画会让六张封面同时重新解码，白闪一下。 */
  function refreshViews() {
    modeOverride = "刚刚刷新";

    const cache = readRepoCache();
    members.forEach((member) => {
      if (!member || !member.user || !member.repo) return;
      const entry = cache[`${member.user}/${member.repo}`];
      if (entry && entry.data) patchCard(normalizeRepo(entry.data, member));
    });

    if (count) {
      const total = grid ? grid.querySelectorAll(".project-card:not(.project-card--more)").length : 0;
      if (total) count.textContent = `${total} 个项目 · ${currentMode()}`;
    }

    updateNotice();

    /* 全部项目页：只重画已经展开过的分组；
       没展开的等用户点开时，自然会读到刚写好的缓存 */
    document.querySelectorAll(".member-group").forEach((details) => {
      if (details.dataset.loaded !== "true" || !details.open) return;
      details.dataset.loaded = "false";
      details.dispatchEvent(new Event("toggle"));
    });
  }

  window.HNYZ_REPO_VIEW = {
    readCache: readRepoCache,
    write: setCachedRepo,
    refresh: refreshViews
  };

  window.addEventListener("hnyz:repo-updated", onRepoUpdated);
  window.addEventListener("hnyz:repos-synced", refreshViews);

  initNavigation();
  initCopyButtons();
  initHeaderState();
  initYear();
  initProjectArchive();
  loadProjects();
})();
