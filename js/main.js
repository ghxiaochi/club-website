/* =========================================================
   衡南一中编程社 HN1Z CODE — 页面交互
   功能：
   1. 读取 projects.json 并渲染项目卡片
   2. 按技术标签筛选项目
   3. QQ 群号 / 邮箱一键复制
   4. 移动端导航
   5. 图片缺失时显示占位块
   无任何第三方依赖，直接由浏览器运行。
   ========================================================= */

(() => {
  "use strict";

  const PROJECTS_ENDPOINT = "projects.json";

  /* 直接双击 index.html（file://）时浏览器禁止 fetch 本地 JSON，
     这里保留一份与 projects.json 同步的预览数据。 */
  const FALLBACK_PROJECTS = [
    {
      name: "Zaco 猜数字",
      desc: "运行在 Arduino 上的猜数字小游戏，练习随机数、循环和串口交互。",
      tags: ["Arduino", "C++", "嵌入式"],
      repo: "https://github.com/ghxiaochi/zaco-guess-number",
      demo: "",
      cover: "images/project-zaco.svg"
    },
    {
      name: "社团官网 HN1Z CODE",
      desc: "你现在看到的这个页面：纯 HTML、CSS、JavaScript 手写的社团官网，部署在 GitHub Pages。",
      tags: ["HTML", "CSS", "JavaScript"],
      repo: "https://github.com/ghxiaochi/club-website",
      demo: "",
      cover: "images/project-website.svg"
    },
    {
      name: "下一个社团项目",
      desc: "这里留给你们的下一件作品。修改 projects.json，把名字、描述和仓库链接换成真实项目即可。",
      tags: ["Idea", "Build", "Share"],
      repo: "",
      demo: "",
      cover: ""
    }
  ];

  const grid = document.querySelector("#project-grid");
  const filters = document.querySelector("#project-filters");
  const count = document.querySelector("#project-count");
  const renderNote = document.querySelector("#render-note");

  let allProjects = [];
  let activeTag = "全部";

  /* ---------- 数据清洗 ---------- */

  function normalizeHttpUrl(value) {
    if (typeof value !== "string" || !value.trim()) return "";

    try {
      const url = new URL(value.trim(), window.location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function normalizeCover(value) {
    if (typeof value !== "string") return "";
    const path = value.trim();
    if (!path || path.length > 300) return "";
    return /^(?:https?:\/\/|\/|\.{1,2}\/)?[^\s"'<>]+$/i.test(path) ? path : "";
  }

  function normalizeProject(project, index) {
    const source = project && typeof project === "object" ? project : {};
    const name =
      typeof source.name === "string" && source.name.trim()
        ? source.name.trim()
        : `未命名项目 ${index + 1}`;
    const desc =
      typeof source.desc === "string" && source.desc.trim()
        ? source.desc.trim()
        : "暂无项目描述。";

    const tags = [];
    const seenTags = new Set();
    if (Array.isArray(source.tags)) {
      source.tags.forEach((tag) => {
        if (typeof tag !== "string") return;
        const clean = tag.trim();
        if (!clean || seenTags.has(clean) || tags.length >= 5) return;
        seenTags.add(clean);
        tags.push(clean);
      });
    }

    return {
      index,
      name,
      desc,
      tags,
      repo: normalizeHttpUrl(source.repo),
      demo: normalizeHttpUrl(source.demo),
      cover: normalizeCover(source.cover)
    };
  }

  /* ---------- 项目卡片 ---------- */

  function padNumber(value) {
    return String(value).padStart(2, "0");
  }

  function createCoverPlaceholder(project) {
    const placeholder = document.createElement("div");
    placeholder.className = "cover-placeholder";

    const index = document.createElement("span");
    index.className = "cover-index";
    index.textContent = `PROJECT / ${padNumber(project.index + 1)}`;

    const mark = document.createElement("strong");
    mark.textContent = Array.from(project.name).slice(0, 2).join("");

    const note = document.createElement("span");
    note.className = "cover-note";
    note.textContent = project.tags[0] || "IDEA";

    placeholder.append(index, mark, note);
    return placeholder;
  }

  function createCover(project) {
    const wrap = document.createElement("div");
    wrap.className = "project-cover";

    if (!project.cover) {
      wrap.appendChild(createCoverPlaceholder(project));
      return wrap;
    }

    const image = document.createElement("img");
    image.src = project.cover;
    image.alt = `${project.name} 项目封面`;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener(
      "error",
      () => {
        image.remove();
        wrap.appendChild(createCoverPlaceholder(project));
      },
      { once: true }
    );

    wrap.appendChild(image);
    return wrap;
  }

  function createTagList(tags) {
    const list = document.createElement("ul");
    list.className = "tag-list";
    list.setAttribute("aria-label", "技术标签");

    tags.forEach((tag) => {
      const item = document.createElement("li");
      item.className = "tag";
      item.textContent = tag;
      list.appendChild(item);
    });

    return list;
  }

  function createProjectLink(href, label) {
    const link = document.createElement("a");
    link.className = "project-link";
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    return link;
  }

  function createProjectCard(project) {
    const card = document.createElement("article");
    card.className = "project-card";

    const body = document.createElement("div");
    body.className = "project-body";

    const top = document.createElement("div");
    top.className = "project-top";

    const title = document.createElement("h3");
    title.textContent = project.name;

    const status = document.createElement("span");
    status.className = "project-status";
    status.textContent = project.repo ? "OPEN SOURCE" : project.demo ? "LIVE DEMO" : "IDEA";
    if (project.repo) status.classList.add("project-status--open");

    top.append(title, status);

    const desc = document.createElement("p");
    desc.className = "project-desc";
    desc.textContent = project.desc;

    const links = document.createElement("div");
    links.className = "project-links";

    if (project.repo) {
      links.appendChild(createProjectLink(project.repo, "查看仓库 ↗"));
    }

    if (project.demo) {
      links.appendChild(createProjectLink(project.demo, "在线演示 ↗"));
    }

    if (!project.repo && !project.demo) {
      const pending = document.createElement("span");
      pending.className = "project-link project-link--muted";
      pending.textContent = "筹备中";
      links.appendChild(pending);
    }

    body.append(top, desc, createTagList(project.tags), links);
    card.append(createCover(project), body);
    return card;
  }

  /* ---------- 筛选与渲染 ---------- */

  function updateFilterState(tag) {
    activeTag = tag;

    if (!filters) return;
    filters.querySelectorAll(".filter-button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.tag === tag));
    });
  }

  function renderProjects() {
    if (!grid) return;

    const visible =
      activeTag === "全部"
        ? allProjects
        : allProjects.filter((project) => project.tags.includes(activeTag));

    grid.replaceChildren();
    grid.setAttribute("aria-busy", "false");

    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "project-empty";
      empty.textContent = "这个标签下还没有项目，换个标签看看。";
      grid.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      visible.forEach((project) => fragment.appendChild(createProjectCard(project)));
      grid.appendChild(fragment);
    }

    if (count) {
      count.textContent =
        activeTag === "全部"
          ? `${allProjects.length} 个项目`
          : `${visible.length} / ${allProjects.length} 个项目`;
    }
  }

  function renderFilters() {
    if (!filters) return;

    const tags = [];
    allProjects.forEach((project) => {
      project.tags.forEach((tag) => {
        if (!tags.includes(tag)) tags.push(tag);
      });
    });

    filters.replaceChildren();

    if (!tags.length) {
      filters.hidden = true;
      return;
    }

    filters.hidden = false;
    const values = ["全部", ...tags];
    const fragment = document.createDocumentFragment();

    values.forEach((tag) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-button";
      button.dataset.tag = tag;
      button.textContent = tag;
      button.setAttribute("aria-pressed", String(tag === activeTag));
      button.addEventListener("click", () => {
        if (tag === activeTag) return;
        updateFilterState(tag);
        renderProjects();
      });
      fragment.appendChild(button);
    });

    filters.appendChild(fragment);
  }

  function showNote(message) {
    if (!renderNote) return;
    renderNote.textContent = message;
    renderNote.hidden = false;
  }

  function renderAll() {
    updateFilterState("全部");
    renderFilters();
    renderProjects();
  }

  async function loadProjects() {
    if (!grid) return;

    try {
      const response = await fetch(PROJECTS_ENDPOINT, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data) || !data.length) {
        throw new Error("项目列表为空或格式不正确");
      }

      allProjects = data.map(normalizeProject);
      renderAll();
    } catch (error) {
      allProjects = FALLBACK_PROJECTS.map(normalizeProject);

      showNote(
        window.location.protocol === "file:"
          ? "当前使用内置预览数据。通过本地服务器打开，可读取最新的 projects.json。"
          : "项目数据读取失败，当前显示内置示例。请检查 projects.json 是否存在或格式是否正确。"
      );

      renderAll();
    }
  }

  /* ---------- 复制群号 / 邮箱 ---------- */

  async function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        // 继续尝试下方兼容方案
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

  /* ---------- 移动端导航 ---------- */

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

  /* ---------- 年份 ---------- */

  function initYear() {
    document.querySelectorAll("[data-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
  }

  initNavigation();
  initCopyButtons();
  initYear();
  loadProjects();
})();
