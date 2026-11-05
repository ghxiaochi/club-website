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

  /* 一张 1×1 的透明占位：真实地址放 data-src，
     进到视口前 800px 再换上去，布局由 width/height 撑住，不抖 */
  const PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";
  let lazyObserver = null;

  function flushLazy(images) {
    images.forEach((img) => {
      const src = img.dataset.src;
      if (!src) return;
      img.src = src;
      delete img.dataset.src;
      if (lazyObserver) lazyObserver.unobserve(img);
    });
  }

  function observeLazyImages() {
    const pending = Array.prototype.slice.call(grid.querySelectorAll("img[data-src]"));
    if (!pending.length) return;

    if (!("IntersectionObserver" in window)) {
      flushLazy(pending);
      return;
    }

    if (!lazyObserver) {
      lazyObserver = new IntersectionObserver((entries) => {
        const hits = [];
        entries.forEach((entry) => {
          if (entry.isIntersecting) hits.push(entry.target);
        });
        if (hits.length) flushLazy(hits);
      }, { rootMargin: "300px 0px" });
    }

    pending.forEach((img) => lazyObserver.observe(img));
  }

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
    /* 首屏两行先加载，其余等滚到附近再给 src。
       图集一共六百多 KB，以前 loading="lazy" 在 Chrome 上仍会把
       3 屏内的图全拉下来，等于首屏替整个页面付流量。

       网格里用 560px 宽的 thumb（约原图 43%），点开灯箱才换原图。
       桌面一列约 290px、手机约 350px，两倍屏也够。 */
    const gridSrc = item.thumb || item.src;
    const eager = index < 4;
    image.src = eager ? gridSrc : PLACEHOLDER;
    if (!eager) image.dataset.src = gridSrc;
    image.alt = item.title || "HNYZ 图集图片";
    image.loading = eager ? "eager" : "lazy";
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
    observeLazyImages();

    updateCount();
  }

  function updateCount() {
    if (!countEl) return;
    const label = currentTag === "all" ? `${items.length} 张` : `${visibleIndexes.length} 张`;
    countEl.textContent = label;
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
  let lightboxCount = null;
  let lightboxPos = 0;
  let lastFocused = null;
  /* 每次换图 +1：原图异步回来时对一下，翻走了就不再覆盖 */
  let paintToken = 0;

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

    lightboxCount = document.createElement("span");
    lightboxCount.className = "lightbox-count";
    lightboxCount.setAttribute("aria-hidden", "true");

    lightboxCaption.append(lightboxCount);

    figure.append(lightboxImage, lightboxCaption);
    lightbox.append(close, prev, figure, next);
    document.body.appendChild(lightbox);

    close.addEventListener("click", closeLightbox);
    prev.addEventListener("click", () => step(-1));
    next.addEventListener("click", () => step(1));

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    /* 手机上用手指翻：横向拖 45px 以上才认，竖向划动留给关闭/滚动，
       免得看长图时轻轻一斜就跳到下一张。 */
    let dragFrom = null;
    lightbox.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".lightbox-nav, .lightbox-close")) return;
      dragFrom = { x: event.clientX, y: event.clientY };
    });
    lightbox.addEventListener("pointerup", (event) => {
      if (!dragFrom) return;
      const dx = event.clientX - dragFrom.x;
      const dy = event.clientY - dragFrom.y;
      dragFrom = null;
      if (Math.abs(dx) < 45) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.4) return;
      step(dx < 0 ? 1 : -1);
    });
    lightbox.addEventListener("pointercancel", () => { dragFrom = null; });

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

    const token = ++paintToken;
    const quick = item.thumb || item.src;

    /* 先上网格那张 thumb：它已经在缓存里，点开就是图，不用等原图。
       原图加载完再换上去，换图时不留白屏。 */
    lightboxImage.onerror = () => {
      if (item.thumb && lightboxImage.getAttribute("src") !== item.thumb) {
        lightboxImage.src = item.thumb;
      }
    };
    if (lightboxImage.getAttribute("src") !== quick) lightboxImage.src = quick;
    lightboxImage.alt = item.title || "图集图片";

    if (item.src !== quick) {
      const full = new Image();
      full.decoding = "async";
      full.onload = () => {
        /* 期间用户可能已经翻到别的图，token 对不上就不换 */
        if (token !== paintToken) return;
        lightboxImage.src = item.src;
      };
      full.onerror = () => { /* 原图拿不到就留在 thumb 上 */ };
      full.src = item.src;
    }

    /* 翻到一张还没懒加载的图：顺手把它在网格里的缩略图也补上，
       关掉灯箱时不会看到一块占位 */
    const figure = figures[index];
    const thumb = figure && figure.querySelector("img[data-src]");
    if (thumb) flushLazy([thumb]);
    lightboxCaption.textContent = item.tag
      ? `${item.title || "未命名"} · #${item.tag}`
      : item.title || "未命名";
    if (lightboxCount) {
      /* textContent 会把子节点一起清掉，所以每次设完文字再挂回去 */
      lightboxCount.textContent = `${lightboxPos + 1} / ${visibleIndexes.length}`;
      lightboxCaption.append(lightboxCount);
    }
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
