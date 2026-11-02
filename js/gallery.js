/* =========================================================
   HNYZ · 图集页
   ---------------------------------------------------------
   1. 读取 js/gallery-data.js 的 HNYZ_GALLERY，渲染瀑布流
   2. 顶部分类筛选（全部 / 梗图 / 壁纸 / 社团）
   3. 点击图片开灯箱，← → 翻页、Esc 关闭；翻页只在当前筛选内
   ========================================================= */

(() => {
  "use strict";

  const items = Array.isArray(window.HNYZ_GALLERY) ? window.HNYZ_GALLERY : [];

  const grid = document.querySelector("#gallery-grid");
  if (!grid) return;

  const countEl = document.querySelector("#gallery-count");
  const filterBar = document.querySelector("[data-gallery-filters]");

  /* 当前筛选下可见的条目下标，灯箱按这个顺序翻页 */
  let visibleIndexes = items.map((_, index) => index);
  let currentTag = "all";

  const figures = [];

  /* =======================================================
     一、渲染
     ======================================================= */
  function createItem(item, index) {
    const figure = document.createElement("figure");
    figure.className = "gallery-item";
    figure.dataset.tag = item.tag || "";
    figure.style.setProperty("--tilt", `${((index % 5) - 2) * 0.9}deg`);

    /* 按原图比例占位：梗图有长有扁，统一裁成 4:5 会切掉字 */
    if (item.w && item.h) {
      figure.style.setProperty("--ratio", `${item.w} / ${item.h}`);
    }

    const button = document.createElement("button");
    button.className = "gallery-item__button";
    button.type = "button";
    button.setAttribute("aria-label", `查看大图：${item.title || "图集图片"}`);

    const image = document.createElement("img");
    image.src = item.src;
    image.alt = item.title || "HNYZ 图集图片";
    image.loading = "lazy";
    image.decoding = "async";
    image.width = item.w || 800;
    image.height = item.h || 1000;

    button.appendChild(image);

    const caption = document.createElement("figcaption");
    caption.className = "gallery-item__caption";

    const title = document.createElement("span");
    title.className = "gallery-item__title";
    title.textContent = item.title || "未命名";
    caption.appendChild(title);

    if (item.tag) {
      const tag = document.createElement("span");
      tag.className = "gallery-item__tag";
      tag.textContent = `#${item.tag}`;
      caption.appendChild(tag);
    }

    button.addEventListener("click", () => openLightbox(index));

    figure.append(button, caption);
    return figure;
  }

  function render() {
    grid.replaceChildren();
    grid.setAttribute("aria-busy", "false");

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "gallery-empty";
      empty.textContent = "图集还是空的：在 js/gallery-data.js 里加一条，再把图片放进 images/gallery/。";
      grid.appendChild(empty);
      updateCount();
      return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
      const figure = createItem(item, index);
      figures[index] = figure;
      fragment.appendChild(figure);
    });
    grid.appendChild(fragment);

    updateCount();
  }

  function updateCount() {
    if (!countEl) return;
    const label = currentTag === "all" ? `${items.length} 张` : `${visibleIndexes.length} 张`;
    countEl.textContent = `${label} // GALLERY`;
  }

  /* =======================================================
     二、筛选
     ======================================================= */
  function applyFilter(tag) {
    currentTag = tag;
    visibleIndexes = [];

    items.forEach((item, index) => {
      const figure = figures[index];
      const match = tag === "all" || item.tag === tag;
      if (figure) {
        figure.hidden = !match;
        figure.classList.toggle("is-hidden", !match);
      }
      if (match) visibleIndexes.push(index);
    });

    if (filterBar) {
      filterBar.querySelectorAll("[data-filter]").forEach((button) => {
        const active = button.dataset.filter === tag;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }

    updateCount();
  }

  function initFilters() {
    if (!filterBar) return;

    filterBar.addEventListener("click", (event) => {
      const button = event.target instanceof Element
        ? event.target.closest("[data-filter]")
        : null;
      if (!button) return;
      applyFilter(button.dataset.filter || "all");
    });
  }

  /* =======================================================
     三、灯箱
     ======================================================= */
  let lightbox = null;
  let lightboxImage = null;
  let lightboxCaption = null;
  let lightboxPos = 0;
  let lastFocused = null;

  function buildLightbox() {
    lightbox = document.createElement("div");
    lightbox.className = "hnyz-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "图集预览");
    lightbox.hidden = true;

    const close = document.createElement("button");
    close.type = "button";
    close.className = "lightbox-close";
    close.setAttribute("aria-label", "关闭预览");
    close.textContent = "×";

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "lightbox-nav lightbox-nav--prev";
    prev.setAttribute("aria-label", "上一张");
    prev.textContent = "←";

    const next = document.createElement("button");
    next.type = "button";
    next.className = "lightbox-nav lightbox-nav--next";
    next.setAttribute("aria-label", "下一张");
    next.textContent = "→";

    const figure = document.createElement("figure");
    figure.className = "lightbox-figure";

    lightboxImage = document.createElement("img");
    lightboxImage.className = "lightbox-image";
    lightboxImage.alt = "";

    lightboxCaption = document.createElement("figcaption");
    lightboxCaption.className = "lightbox-caption";

    figure.append(lightboxImage, lightboxCaption);
    lightbox.append(close, prev, figure, next);
    document.body.appendChild(lightbox);

    close.addEventListener("click", closeLightbox);
    prev.addEventListener("click", () => step(-1));
    next.addEventListener("click", () => step(1));

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;
      if (event.key === "Escape") {
        closeLightbox();
        return;
      }
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    });
  }

  function paint() {
    const index = visibleIndexes[lightboxPos];
    const item = items[index];
    if (!item) return;

    lightboxImage.src = item.src;
    lightboxImage.alt = item.title || "图集图片";
    lightboxCaption.textContent = item.tag
      ? `${item.title || "未命名"} · #${item.tag}`
      : item.title || "未命名";
    lightbox.setAttribute("aria-label", `图集预览：${item.title || "未命名"}`);
  }

  function step(delta) {
    if (visibleIndexes.length < 2) return;
    lightboxPos = (lightboxPos + delta + visibleIndexes.length) % visibleIndexes.length;
    paint();
  }

  function openLightbox(index) {
    const position = visibleIndexes.indexOf(index);
    if (position < 0) return;

    if (!lightbox) buildLightbox();
    lastFocused = document.activeElement;
    lightboxPos = position;
    paint();
    lightbox.hidden = false;
    document.body.classList.add("is-lightbox-open");
    lightbox.querySelector(".lightbox-close").focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.classList.remove("is-lightbox-open");
    lightboxImage.removeAttribute("src");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  render();
  initFilters();
})();
