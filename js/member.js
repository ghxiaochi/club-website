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

  const root = document.querySelector("[data-member-root]");
  const heroEl = document.querySelector("#member-hero");
  const grid = document.querySelector("#member-projects");
  if (!root || !heroEl || !grid) return;

  /* 找到目标成员 */
  const param = new URLSearchParams(window.location.search).get("u");
  const firstUser = members.length ? members[0].user : "";
  const user = members.some((m) => m.user === param) ? param : firstUser;
  const list = members.filter((m) => m.user === user);
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
    gh.textContent = "GitHub 主页 ↗";
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
     二、项目卡片（复用 style.css 的卡片类）
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
    tag.textContent = "NO_COVER // AUTO_GEN";

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
        wrap.appendChild(coverPlaceholder(member.title, member.user));
      }, { once: true });
      wrap.appendChild(img);
    } else {
      wrap.appendChild(coverPlaceholder(member.title, member.user));
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
    owner.textContent = `@${member.user}`;

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
    langLabel.textContent = "LANG";
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

    stats.append(lang, stars, forks);

    const source = document.createElement("a");
    source.className = "project-source";
    source.href = data.url || `https://github.com/${member.user}/${member.repo}`;
    source.target = "_blank";
    source.rel = "noopener noreferrer";

    const sourceText = document.createElement("span");
    sourceText.textContent = member.external ? "下载 / 仓库" : "查看源码";
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
    const api = `https://api.github.com/repos/${encodeURIComponent(member.user)}/${encodeURIComponent(member.repo)}`;
    try {
      const res = await fetch(api, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
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
    }
  }

  async function renderProjects() {
    grid.replaceChildren();
    grid.setAttribute("aria-busy", "true");

    const hint = document.createElement("p");
    hint.className = "member-hint";
    hint.textContent = "正在读取 GitHub…";
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
  renderProjects();
})();
