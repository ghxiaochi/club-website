/* =========================================================
   HNYZ · 图集
   ---------------------------------------------------------
   1. 读取下面的 HNYZ_GALLERY，渲染成照片墙
   2. 点击任意一张打开灯箱，支持 ← → 切换、Esc 关闭
   3. 新加图片：把文件放进 images/gallery/，在数组里加一行
   ========================================================= */

(() => {
  "use strict";

  /* 每项：src 图片地址；title 标题；tag 分类（梗图 / 壁纸 / 活动…） */
  const items = Array.isArray(window.HNYZ_GALLERY) ? window.HNYZ_GALLERY : [];

  const grid = document.querySelector("#gallery-grid");
  if (!grid) return;

  /* =======================================================
     一、渲染照片墙
     ======================================================= */
  function createItem(item, index) {
    const figure = document.createElement("figure");
    figure.className = "gallery-item";
    figure.style.setProperty("--tilt", `${((index % 5) - 2) * 0.9}deg`);

    const button = document.createElement("button");
    button.className = "gallery-item__button";
    button.type = "button";
    button.setAttribute("aria-label", `查看大图：${item.title || "图集图片"}`);

    const image = document.createElement("img");
    image.src = item.src;
    image.alt = item.title || "HNYZ 图集图片";
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 800;
    image.height = 1000;

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
      empty.textContent = "图集还是空的：在 js/gallery.js 里加一条，再把图片放进 images/gallery/。";
      grid.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => fragment.appendChild(createItem(item, index)));
    grid.appendChild(fragment);
  }

  /* =======================================================
     二、灯箱
     ======================================================= */
  let lightbox = null;
  let lightboxImage = null;
  let lightboxCaption = null;
  let lightboxIndex = 0;
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

  function paintLightbox() {
    const item = items[lightboxIndex];
    if (!item) return;

    lightboxImage.src = item.src;
    lightboxImage.alt = item.title || "图集图片";
    lightboxCaption.textContent = item.tag
      ? `${item.title || "未命名"} · #${item.tag}`
      : item.title || "未命名";
    lightbox.setAttribute("aria-label", `图集预览：${item.title || "未命名"}`);
  }

  function step(delta) {
    if (!items.length) return;
    lightboxIndex = (lightboxIndex + delta + items.length) % items.length;
    paintLightbox();
  }

  function openLightbox(index) {
    if (!lightbox) buildLightbox();
    lastFocused = document.activeElement;
    lightboxIndex = index;
    paintLightbox();
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
})();
