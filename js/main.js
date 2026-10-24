/* =========================================================
   HNYZ · 衡南一中编程社 — 页面交互
   ---------------------------------------------------------
   这份脚本负责：
   1. 读取 members 数组，用 Promise.all 并发请求 GitHub API
   2. 渲染赛博风项目卡片（封面、简介、语言、Stars、Forks）
   3. 处理 403 限流 / 404 仓库不存在 / 网络异常，自动降级
   4. QQ 群号、邮箱一键复制
   5. 移动端导航、页头滚动状态、页脚年份

   想换展示的项目，只改下面的 members 数组即可。
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
  const members = [
    {
      user: "ghxiaochi",
      repo: "club-website",
      coverImg: "images/project-website.svg",
      title: "社团官网 HNYZ",
      desc: "HNYZ 社团官网：纯手写 HTML / CSS / JavaScript，部署在 GitHub Pages，用 GitHub API 实时展示社团仓库。"
    },
    {
      user: "ghxiaochi",
      repo: "zaco-guess-number",
      coverImg: "images/project-zaco.svg",
      title: "Zaco 猜数字",
      desc: "运行在 Arduino 上的猜数字小游戏，练习随机数、循环、串口交互和 C++ 基础语法。"
    },
    {
      user: "ghxiaochi",
      repo: "led",
      coverImg: "",
      title: "LED 硬件实验",
      desc: "从点亮第一颗 LED 开始，练习 GPIO、基础电路和嵌入式程序结构。"
    }
  ];

  const API_BASE = "https://api.github.com/repos";

  /* 语言圆点颜色，尽量贴近 GitHub 的语言配色 */
  const LANGUAGE_COLORS = {
    "C++": "#f34b7d",
    C: "#555555",
    CSS: "#663399",
    HTML: "#e34c26",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    TypeScript: "#3178c6",
    Arduino: "#bd79d1",
    Shell: "#89e051"
  };

  /* -------------------------------------------------------
     API 不可用时的本地兜底数据
     说明：403（限流）、404、网络断开时，用这里的数据把卡片
     正常渲染出来，避免页面出现空白或一堆报错。
     ------------------------------------------------------- */
  const FALLBACK_REPOS = {
    "ghxiaochi/club-website": {
      name: "club-website",
      description:
        "你现在看到的社团官网：纯 HTML、CSS、JavaScript 手写，部署在 GitHub Pages，卡片通过 GitHub API 实时读取。",
      language: "CSS",
      stars: 0,
      forks: 0
    },
    "ghxiaochi/zaco-guess-number": {
      name: "zaco-guess-number",
      description:
        "运行在 Arduino 上的猜数字小游戏，练习随机数、循环、串口交互和 C++ 基础语法。",
      language: "C++",
      stars: 1,
      forks: 0
    },
    "ghxiaochi/led": {
      name: "led",
      description:
        "C++ 硬件实验仓库：从点亮一盏 LED 开始，练习 GPIO、基础电路和嵌入式程序结构。",
      language: "C++",
      stars: 1,
      forks: 0
    }
  };

  /* =======================================================
     二、DOM 引用与状态
     ======================================================= */
  const grid = document.querySelector("#project-grid");
  const count = document.querySelector("#project-count");
  const renderNote = document.querySelector("#render-note");

  /* 记录这次加载中出现了哪些降级原因，最后合并成一条提示 */
  const notices = new Set();

  /* =======================================================
     三、工具函数
     ======================================================= */

  /* 只允许 http(s) 和站内相对路径，避免把 javascript: 之类的东西塞进 href */
  function normalizeHttpUrl(value) {
    if (typeof value !== "string" || !value.trim()) return "";

    try {
      const url = new URL(value.trim(), window.location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch (error) {
      return "";
    }
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

  /* 用 GitHub API 返回的数据组装卡片需要的字段 */
  function normalizeRepo(data, member) {
    return {
      key: `${member.user}/${member.repo}`,
      user: member.user,
      repo: member.repo,
      name:
        (typeof member.title === "string" && member.title.trim()) ||
        data.name ||
        member.repo,
      owner: data.owner?.login || member.user,
      description:
        (typeof member.desc === "string" && member.desc.trim()) ||
        (typeof data.description === "string" && data.description.trim()) ||
        "这个仓库还没有填写简介，点开源码看看吧。",
      language: data.language || "TEXT",
      stars: Number(data.stargazers_count) || 0,
      forks: Number(data.forks_count) || 0,
      url: data.html_url || `https://github.com/${member.user}/${member.repo}`,
      coverImg: normalizeCover(member.coverImg),
      status: "ok"
    };
  }

  /* 生成一张“降级卡片”的数据。status 会显示在封面角标上。 */
  function createFallback(member, status) {
    const key = `${member.user}/${member.repo}`;
    const snapshot = FALLBACK_REPOS[key] || {};

    let description =
      (typeof member.desc === "string" && member.desc.trim()) ||
      snapshot.description ||
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
        snapshot.name ||
        member.repo,
      owner: member.user,
      description,
      language: snapshot.language || "TEXT",
      stars: Number(snapshot.stars) || 0,
      forks: Number(snapshot.forks) || 0,
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
    tag.textContent = "NO_COVER // AUTO_GEN";

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

    /* 右上角状态角标：正常数据 / 本地快照 / 404 */
    const badge = document.createElement("span");
    badge.className = "cover-badge";
    badge.dataset.state = project.status;
    badge.textContent =
      project.status === "ok"
        ? "OPEN_SOURCE"
        : project.status === "not-found"
          ? "404_NOT_FOUND"
          : "LOCAL_FALLBACK";
    wrap.appendChild(badge);

    return wrap;
  }

  /* =======================================================
     五、项目卡片
     ======================================================= */

  function createStat(label, value, extra) {
    const stat = document.createElement("span");
    stat.className = "project-stat";

    const key = document.createElement("span");
    key.className = "stat-label";
    key.textContent = label;

    const val = document.createElement("span");
    val.className = "stat-value";
    if (extra) val.appendChild(extra);
    val.append(document.createTextNode(value));

    stat.append(key, val);
    return stat;
  }

  function createProjectCard(project) {
    const card = document.createElement("article");
    card.className = "project-card";

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
      createStat("LANG", project.language, languageDot),
      createStat("🌟", formatNumber(project.stars)),
      createStat("🍴", formatNumber(project.forks))
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

  function updateNotice() {
    if (!renderNote) return;

    const messages = [];

    if (notices.has("403")) {
      messages.push(
        "GitHub API 返回 403：当前 IP 的未登录请求次数可能已用尽，已自动显示本地兜底数据，稍后刷新即可恢复实时数据。"
      );
    }
    if (notices.has("404")) {
      messages.push("有仓库返回 404：可能已被删除、改名或设为私有，卡片仍保留入口。");
    }
    if (notices.has("network")) {
      messages.push("GitHub API 暂时无法连接，已显示本地兜底数据。");
    }
    if (notices.has("error")) {
      messages.push("部分仓库请求失败，已使用本地兜底数据。");
    }

    if (!messages.length) {
      renderNote.textContent = "";
      renderNote.hidden = true;
      return;
    }

    renderNote.textContent = messages.join(" ");
    renderNote.hidden = false;
  }

  function renderProjects(projects) {
    if (!grid) return;

    grid.replaceChildren();
    grid.setAttribute("aria-busy", "false");

    if (!projects.length) {
      const empty = document.createElement("p");
      empty.className = "project-empty";
      empty.textContent = "members 数组还是空的，先填入一个 GitHub 仓库吧。";
      grid.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      projects.forEach((project) => fragment.appendChild(createProjectCard(project)));
      grid.appendChild(fragment);
    }

    if (count) {
      const mode = notices.size ? "DEGRADED" : "GITHUB_API";
      count.textContent = `${projects.length} REPOS // ${mode}`;
    }

    updateNotice();
  }

  /* =======================================================
     七、GitHub API 请求
     -------------------------------------------------------
     关键点：
     - Promise.all 并发请求所有仓库，而不是一个接一个等
     - 每个请求内部消化 403 / 404 / 网络错误，返回兜底数据
     - Promise.all 不会因为单个仓库失败而整体崩掉
     ======================================================= */

  async function fetchRepo(member) {
    const apiUrl = `${API_BASE}/${encodeURIComponent(member.user)}/${encodeURIComponent(member.repo)}`;

    try {
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store"
      });

      /* 403：通常是未登录 API 限流（60 次 / 小时 / IP） */
      if (response.status === 403) {
        notices.add("403");
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
      return normalizeRepo(data, member);
    } catch (error) {
      /* 断网、DNS 失败、CORS 等 */
      notices.add("network");
      return createFallback(member, "network");
    }
  }

  async function loadProjects() {
    if (!grid) return;

    notices.clear();

    try {
      /* 并发请求，顺序与 members 数组一致 */
      const projects = await Promise.all(members.map((member) => fetchRepo(member)));
      renderProjects(projects);
    } catch (error) {
      /* fetchRepo 已经做过兜底，这里只防御意料之外的渲染异常 */
      notices.add("error");
      renderProjects(members.map((member) => createFallback(member, "error")));
    }
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
      button.addEventListener("click", async () => {
        const value = button.getAttribute("data-copy-value") || "";
        if (!value) return;

        const label = button.querySelector("[data-copy-label]") || button;
        const original = label.textContent;
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
    if (!toggle || !nav) return;

    const closeMenu = () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "打开导航菜单");
    };

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "关闭导航菜单" : "打开导航菜单");
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

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  /* =======================================================
     十、页头滚动状态与年份
     ======================================================= */

  function initHeaderState() {
    const header = document.querySelector("[data-header]");
    if (!header) return;

    const update = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function initYear() {
    document.querySelectorAll("[data-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
  }

  initNavigation();
  initCopyButtons();
  initHeaderState();
  initYear();
  loadProjects();
})();
