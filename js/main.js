/* =========================================================
   衡南一中编程社 HN1Z CODE — 页面交互
   - 读取 projects.json 并渲染项目卡片
   - 图片缺失 / 加载失败时显示占位色块
   - 移动端菜单、页头滚动状态、复制邮箱
   无任何第三方依赖，直接由浏览器运行。
   ========================================================= */

(() => {
  "use strict";

  const PROJECTS_ENDPOINT = "projects.json";

  /**
   * 内置示例数据。
   * 使用 file:// 直接双击打开 index.html 时，浏览器出于安全限制
   * 不允许 fetch 本地 JSON，因此退回这份数据，保证首页可以完整预览。
   * 修改 projects.json 时，建议同时更新这里，或使用本地 HTTP 服务器预览。
   * （README 的「本地预览」一节有说明。）
   */
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
      name: "社团官网 HN1Z Code",
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

  /* ---------- 工具函数 ---------- */

  /**
   * 只接受 http / https 链接，避免 projects.json 中出现不安全协议。
   * 返回规范化后的绝对地址，无效时返回空字符串。
   */
  function normalizeHttpUrl(value) {
    if (typeof value !== "string" || !value.trim()) return "";

    try {
      const url = new URL(value.trim(), window.location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  /**
   * 清洗单条项目数据，防止缺字段导致渲染中断。
   * 返回 null 表示该项目无效，会被跳过。
   */
  function normalizeProject(item) {
    if (!item || typeof item !== "object") return null;

    const name = typeof item.name === "string" ? item.name.trim() : "";
    const desc = typeof item.desc === "string" ? item.desc.trim() : "";
    if (!name || !desc) return null;

    return {
      name,
      desc,
      tags: Array.isArray(item.tags)
        ? item.tags.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim())
        : [],
      repo: normalizeHttpUrl(item.repo),
      demo: normalizeHttpUrl(item.demo),
      cover: typeof item.cover === "string" ? item.cover.trim() : ""
    };
  }

  function padNumber(number) {
    return String(number).padStart(2, "0");
  }

  function createExternalLink(url, label, className = "") {
    const link = document.createElement("a");
    link.href = url;
    link.className = className;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    return link;
  }

  /* ---------- 项目卡片 ---------- */

  function createCoverPlaceholder(project, index) {
    const placeholder = document.createElement("div");
    placeholder.className = "cover-placeholder";

    const cap = document.createElement("span");
    cap.className = "cover-cap";
    cap.textContent = `COVER / ${padNumber(index + 1)}`;

    const monogram = document.createElement("span");
    monogram.className = "cover-monogram";
    monogram.setAttribute("aria-hidden", "true");
    monogram.textContent = Array.from(project.name)[0] || "N";

    const caption = document.createElement("span");
    caption.className = "cover-caption";
    caption.textContent = project.tags[0] ? `OPEN SOURCE · ${project.tags[0]}` : "OPEN SOURCE PROJECT";

    placeholder.append(cap, monogram, caption);
    return placeholder;
  }

  function createCover(project, index) {
    const cover = document.createElement("div");
    cover.className = "project-cover";

    const showPlaceholder = () => {
      cover.replaceChildren(createCoverPlaceholder(project, index));
    };

    if (!project.cover) {
      showPlaceholder();
      return cover;
    }

    const image = document.createElement("img");
    image.src = project.cover;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 1200;
    image.height = 750;
    image.addEventListener("error", showPlaceholder, { once: true });
    cover.append(image);
    return cover;
  }

  function createTagList(tags) {
    const list = document.createElement("ul");
    list.className = "tag-list";
    list.setAttribute("aria-label", "技术标签");

    tags.forEach((tag) => {
      const item = document.createElement("li");
      const pill = document.createElement("span");
      pill.className = "tag";
      pill.textContent = tag;
      item.append(pill);
      list.append(item);
    });

    return list;
  }

  function createProjectCard(project, index) {
    const card = document.createElement("article");
    card.className = "project-card";
    card.dataset.tone = String((index % 3) + 1);

    const body = document.createElement("div");
    body.className = "project-body";

    const kicker = document.createElement("p");
    kicker.className = "project-kicker";
    const projectNumber = document.createElement("span");
    projectNumber.textContent = `PROJECT ${padNumber(index + 1)}`;
    const projectType = document.createElement("span");
    projectType.textContent = project.repo ? "OPEN SOURCE" : "LAB PROJECT";
    kicker.append(projectNumber, projectType);

    const title = document.createElement("h3");
    title.className = "project-title";
    if (project.repo) {
      const titleLink = createExternalLink(project.repo, project.name);
      titleLink.setAttribute("aria-label", `${project.name} GitHub 仓库（新窗口打开）`);
      title.append(titleLink);
    } else {
      title.textContent = project.name;
    }

    const desc = document.createElement("p");
    desc.className = "project-desc";
    desc.textContent = project.desc;

    const links = document.createElement("div");
    links.className = "project-links";

    if (project.repo) {
      const repoLink = createExternalLink(project.repo, "GitHub 仓库", "project-link");
      const repoArrow = document.createElement("span");
      repoArrow.className = "link-arrow";
      repoArrow.setAttribute("aria-hidden", "true");
      repoArrow.textContent = "↗";
      repoLink.append(repoArrow);
      links.append(repoLink);
    }

    if (project.demo) {
      const demoLink = createExternalLink(project.demo, "在线演示", "project-link project-link--demo");
      const demoArrow = document.createElement("span");
      demoArrow.className = "link-arrow";
      demoArrow.setAttribute("aria-hidden", "true");
      demoArrow.textContent = "↗";
      demoLink.append(demoArrow);
      links.append(demoLink);
    }

    if (!project.repo && !project.demo) {
      const pending = document.createElement("span");
      pending.className = "project-link project-link--demo";
      pending.textContent = "仓库整理中";
      links.append(pending);
    }

    body.append(kicker, title, desc);
    if (project.tags.length) body.append(createTagList(project.tags));
    body.append(links);
    card.append(createCover(project, index), body);
    return card;
  }

  /* ---------- 数据读取与渲染 ---------- */

  const grid = document.querySelector("#project-grid");
  const renderNote = document.querySelector("#render-note");

  function showRenderNote(message) {
    if (!renderNote) return;
    renderNote.textContent = message;
    renderNote.hidden = false;
  }

  function getFallbackProjects() {
    return FALLBACK_PROJECTS.map(normalizeProject).filter(Boolean);
  }

  async function loadProjects() {
    // 直接双击 HTML 时 fetch 会被浏览器拦截，直接使用内置数据。
    if (window.location.protocol === "file:") {
      showRenderNote("本地文件预览：当前显示内置示例数据。运行本地服务器即可读取最新的 projects.json。");
      return getFallbackProjects();
    }

    try {
      const response = await fetch(PROJECTS_ENDPOINT, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("projects.json 的顶层必须是数组");
      }

      const projects = data.map(normalizeProject).filter(Boolean);
      if (!projects.length) {
        throw new Error("projects.json 中没有有效项目");
      }

      return projects;
    } catch (error) {
      console.warn("[HN1Z CODE] 读取 projects.json 失败，已回退到内置示例数据。", error);
      showRenderNote("项目清单读取失败，当前显示内置示例数据。请检查 projects.json 或改用本地服务器预览。");
      return getFallbackProjects();
    }
  }

  async function renderProjects() {
    if (!grid) return;

    try {
      const projects = await loadProjects();
      if (!projects.length) {
        throw new Error("没有可显示的项目");
      }
      grid.replaceChildren(...projects.map(createProjectCard));
    } catch (error) {
      console.warn("[HN1Z CODE] 项目渲染失败。", error);
      const message = document.createElement("p");
      message.className = "error-state";
      message.textContent = "项目暂时无法加载，请稍后刷新，或直接访问我们的 GitHub。";
      grid.replaceChildren(message);
    } finally {
      grid.setAttribute("aria-busy", "false");
    }
  }

  /* ---------- 页头与移动端导航 ---------- */

  const header = document.querySelector("[data-header]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");

  function setMenu(open) {
    if (!navToggle || !nav) return;
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "关闭导航菜单" : "打开导航菜单");
    nav.classList.toggle("is-open", open);
    if (header) header.classList.toggle("is-menu-open", open);
  }

  function initNavigation() {
    if (navToggle && nav) {
      navToggle.addEventListener("click", () => {
        setMenu(navToggle.getAttribute("aria-expanded") !== "true");
      });

      nav.addEventListener("click", (event) => {
        if (event.target.closest("a")) setMenu(false);
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && nav.classList.contains("is-open")) {
          setMenu(false);
          navToggle.focus();
        }
      });

      document.addEventListener("click", (event) => {
        if (!nav.classList.contains("is-open")) return;
        if (event.target.closest("[data-nav]") || event.target.closest("[data-nav-toggle]")) return;
        setMenu(false);
      });

      const desktopQuery = window.matchMedia("(min-width: 761px)");
      const closeOnDesktop = (event) => {
        if (event.matches) setMenu(false);
      };
      if (typeof desktopQuery.addEventListener === "function") {
        desktopQuery.addEventListener("change", closeOnDesktop);
      }
    }

    if (header) {
      const updateHeader = () => {
        header.classList.toggle("is-scrolled", window.scrollY > 6);
      };
      updateHeader();
      window.addEventListener("scroll", updateHeader, { passive: true });
    }
  }

  /* ---------- 复制邮箱 ---------- */

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // file:// 或旧浏览器上的兼容方案
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("浏览器拒绝了复制操作");
  }

  function initCopyEmail() {
    const button = document.querySelector("[data-copy-email]");
    const label = document.querySelector("[data-copy-label]");
    const status = document.querySelector("#copy-status");
    if (!button || !label) return;

    let resetTimer = 0;

    button.addEventListener("click", async () => {
      const email = button.dataset.copyEmail || "";
      if (!email) return;

      try {
        await copyText(email);
        label.textContent = "已复制 ✓";
        if (status) status.textContent = `邮箱 ${email} 已复制到剪贴板`;
      } catch (error) {
        console.warn("[HN1Z CODE] 复制邮箱失败。", error);
        label.textContent = "请手动复制";
        if (status) status.textContent = "复制失败，请手动选择页面上的邮箱地址。";
      }

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        label.textContent = "复制邮箱";
        if (status) status.textContent = "";
      }, 2400);
    });
  }

  /* ---------- 初始化 ---------- */

  function init() {
    initNavigation();
    initCopyEmail();
    renderProjects();

    document.querySelectorAll("[data-year]").forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  }

  init();
})();
