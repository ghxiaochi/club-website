/* =========================================================
   HNYZ · 项目区：ANIMDUSTRY 的一排小人
   ---------------------------------------------------------
   只复刻游戏菜单里角色排的交互（参考 Anuken/animdustry
   的 src/menus.nim）：
   - 鼠标扫过：小人依次跳一下（unit.jumping，0.21s 正弦）
   - 右键：压扁并换成「挨打」表情（clickTime → -hit 贴图）
   - 左键：打开角色卡（splash：角色配色 + 立绘 + 标题/技能）
   - 8 个角色全部解锁（想恢复剪影，把 unlocked 改回 false 即可）
   ========================================================= */

(() => {
  "use strict";

  const stage = document.querySelector("[data-char-stage]");
  if (!stage) return;

  const bubbleHost = document.querySelector("[data-char-bubble]");

  const splash = document.querySelector("[data-char-splash]");
  const splashImg = splash ? splash.querySelector("[data-splash-img]") : null;
  const splashPixel = splash ? splash.querySelector("[data-splash-pixel]") : null;
  const splashTitle = splash ? splash.querySelector("[data-splash-title]") : null;
  const splashSub = splash ? splash.querySelector("[data-splash-sub]") : null;
  const splashAbility = splash ? splash.querySelector("[data-splash-ability]") : null;
  const splashBack = splash ? splash.querySelector("[data-splash-back]") : null;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 游戏原版的升调公式（src/main.nim 的 calcPitch）：
     按大三和弦 0 / 4 / 7 半音 + 八度递增，
     所以从左到右划过时，每个小人的音调都不一样 */
  function calcPitch(note) {
    const indices = [0, 4, 7];
    const octave = Math.floor(note / 3);
    const index = note % 3;
    return Math.pow(2, (indices[index] + octave * 12) / 12);
  }

  /* 音效模块（js/sfx.js），没加载时静默降级 */
  const sfx = window.HNYZ_SFX || { play() {}, stop() {} };

  /* 角色数据来自游戏 src/vars.nim 的 allUnits，顺序与原作一致；
     s1/s2/glow/pattern 是游戏里 unit.draw 用的配色和花纹 */
  const characters = [
    { id: "alpha", title: "-ALPHA-", sub: "the first of many", ability: "creates a wall every 10 moves", unlocked: true,
      s1: "#b25840", s2: "#c07659", glow: "#ffd37f", pattern: "squares" },
    { id: "mono", title: "-MONO-", sub: "the gatherer", ability: "earns one extra point every 4 moves", unlocked: true,
      s1: "#235e62", s2: "#3a8a72", glow: "#84f490", pattern: "squares" },
    { id: "oct", title: "-OCT-", sub: "the protector", ability: "creates a shield every 30 moves", unlocked: true,
      s1: "#235e62", s2: "#3a8a72", glow: "#84f490", pattern: "circles" },
    { id: "crawler", title: "-CRAWLER-", sub: "boom", ability: "destroys 4 adjacent blocks every 4 moves", unlocked: true,
      s1: "#665c9f", s2: "#bf92f8", glow: "#bf92f8", pattern: "spin" },
    { id: "zenith", title: "-ZENITH-", sub: "gaming", ability: "destroys the next 4 blocks in a line every 4 moves", unlocked: true,
      s1: "#c45b4d", s2: "#ffa664", glow: "#ffd37f", pattern: "rays" },
    { id: "quad", title: "-QUAD-", sub: 'the "support" has arrived', ability: "destroys 8 adjacent blocks every 6 moves", unlocked: true,
      s1: "#235e62", s2: "#3a8a72", glow: "#84f490", pattern: "rays" },
    { id: "oxynoe", title: "-OXYNOE-", sub: "as was foretold", ability: "destroys alternating adjacent blocks every other move", unlocked: true,
      s1: "#235e62", s2: "#3a8a72", glow: "#c7ffb7", pattern: "circles" },
    { id: "sei", title: "-SEI-", sub: "crossed out", ability: "destroys blocks in a diagonal cross every 4 moves", unlocked: true,
      s1: "#ffa664", s2: "#ffcb82", glow: "#ffd37f", pattern: "circles" }
  ];

  /* 旧版抽卡存档已经不用了，清掉 */
  try {
    window.localStorage.removeItem("hnyz:gacha");
  } catch (error) {
    /* 忽略 */
  }

  /* =======================================================
     一、渲染站位
     ======================================================= */
  const slots = [];

  characters.forEach((char, index) => {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "char-slot";
    slot.dataset.char = char.id;

    const img = document.createElement("img");
    img.src = `images/characters/unit-${char.id}.webp`;
    img.alt = char.title.replace(/-/g, "");
    img.width = 24;
    img.height = 36;
    img.decoding = "async";
    img.draggable = false;

    const name = document.createElement("span");
    name.className = "char-slot__name";
    name.textContent = char.title;

    slot.append(img, name);

    /* 悬停（鼠标）：和游戏一样，每次进到小人身上都会跳一下 */
    slot.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      hop(slot);
      sfx.play("hover", { rate: calcPitch(index), volume: 0.12 });
    });

    /* 左键：打开角色卡 */
    slot.addEventListener("click", () => {
      squash(slot);
      openSplash(char, slot);
    });

    /* 右键：压扁 + 换挨打表情（游戏里的 keyMouseRight） */
    slot.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      hitFace(slot, char);
    });

    stage.appendChild(slot);
    slots.push(slot);
  });

  slots.forEach((slot, index) => {
    slot.setAttribute("aria-label", `${characters[index].title}，左键看卡片，右键戳一下`);
  });

  /* =======================================================
     一点五、触屏：手指划过时，指到谁谁就跳
     -------------------------------------------------------
     手机上没有 hover，用 pointermove + elementFromPoint
     判断手指正压在哪个小人身上；进入新的小人就跳一下。
     不阻止默认行为，上下滑动仍然正常滚屏。
     ======================================================= */
  let touchSlot = null;

  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse") return;

    const el = document.elementFromPoint(event.clientX, event.clientY);
    const slot = el && typeof el.closest === "function" ? el.closest(".char-slot") : null;

    if (slot && slot !== touchSlot) {
      touchSlot = slot;
      hop(slot);
      const index = slots.indexOf(slot);
      sfx.play("hover", { rate: calcPitch(index), volume: 0.1 });
    } else if (!slot) {
      touchSlot = null;
    }
  }, { passive: true });

  const clearTouch = () => { touchSlot = null; };
  stage.addEventListener("pointerdown", clearTouch, { passive: true });
  stage.addEventListener("pointercancel", clearTouch, { passive: true });
  stage.addEventListener("pointerup", clearTouch, { passive: true });

  /* =======================================================
     一点六、预载立绘
     -------------------------------------------------------
     页面加载完就把 8 张高精度立绘拉下来，
     这样第一次点开角色卡不用等网络。
     ======================================================= */
  function preloadArt() {
    characters.forEach((char) => {
      const img = new Image();
      img.src = `images/characters/art-${char.id}.webp`;
    });
  }

  if (document.readyState === "complete") {
    window.setTimeout(preloadArt, 300);
  } else {
    window.addEventListener("load", () => window.setTimeout(preloadArt, 300));
  }

  /* =======================================================
     二、三个小动作
     ======================================================= */
  function hop(slot) {
    if (reduce) return;
    slot.classList.remove("is-jumping");
    void slot.offsetWidth;
    slot.classList.add("is-jumping");
    window.setTimeout(() => slot.classList.remove("is-jumping"), 320);
  }

  function squash(slot) {
    slot.classList.remove("is-hit");
    void slot.offsetWidth;
    slot.classList.add("is-hit");
    window.setTimeout(() => slot.classList.remove("is-hit"), 220);
  }

  /* 右键：0.2 秒内换成 -hit 贴图并压扁，然后换回来 */
  function hitFace(slot, char) {
    const img = slot.querySelector("img");
    if (!img || reduce) return;

    img.src = `images/characters/unit-${char.id}-hit.webp`;
    slot.classList.add("is-squash");
    sfx.play("click", { rate: calcPitch(characters.indexOf(char) % 2), volume: 0.22 });

    window.setTimeout(() => {
      img.src = `images/characters/unit-${char.id}.webp`;
      slot.classList.remove("is-squash");
    }, 220);
  }

  function shake(slot) {
    slot.classList.remove("is-shaking");
    void slot.offsetWidth;
    slot.classList.add("is-shaking");
    window.setTimeout(() => slot.classList.remove("is-shaking"), 520);
  }

  /* =======================================================
     三、气泡
     ======================================================= */
  let bubbleTimer = 0;

  function say(text, target) {
    if (!bubbleHost) return;

    bubbleHost.textContent = text;
    bubbleHost.classList.add("is-visible");

    if (target) {
      const rect = target.getBoundingClientRect();
      bubbleHost.style.setProperty("--bx", `${rect.left + rect.width / 2}px`);
      bubbleHost.style.setProperty("--by", `${rect.top - 10}px`);
    }

    window.clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => {
      bubbleHost.classList.remove("is-visible");
    }, 2200);
  }

  /* =======================================================
     四、角色卡（splash）
     ======================================================= */
  let lastFocus = null;

  function openSplash(char, slot) {
    if (!splash) return;

    lastFocus = slot || document.activeElement;

    splash.style.setProperty("--s1", char.s1);
    splash.style.setProperty("--s2", char.s2);
    splash.style.setProperty("--glow", char.glow);
    splash.dataset.pattern = char.pattern;

    if (splashPixel) {
      /* 像素小人立刻出现（贴图早就缓存在页面里），和游戏 view 页一样 */
      splashPixel.src = `images/characters/unit-${char.id}.webp`;
      splashPixel.alt = char.title;
      splashPixel.classList.remove("is-out");
    }

    if (splashImg) {
      /* 高精度立绘在后台加载，好了以后淡入替换像素小人 */
      let artShown = false;
      const showArt = () => {
        if (artShown) return;
        artShown = true;
        splashImg.classList.add("is-loaded");
        if (splashPixel) splashPixel.classList.add("is-out");
      };

      splashImg.classList.remove("is-loaded");
      splashImg.src = `images/characters/art-${char.id}.webp`;
      splashImg.alt = char.title;

      splashImg.addEventListener("load", showArt, { once: true });
      splashImg.addEventListener("error", showArt, { once: true });
      /* 兜底：1.2 秒后无论如何都切换，不让画面卡在半路 */
      window.setTimeout(showArt, 1200);
      if (typeof splashImg.decode === "function") {
        splashImg.decode().then(showArt).catch(() => {});
      }
    }
    if (splashTitle) splashTitle.textContent = char.title;
    if (splashSub) splashSub.textContent = char.sub;
    if (splashAbility) splashAbility.textContent = char.ability;

    splash.hidden = false;
    splash.classList.remove("is-out");
    void splash.offsetWidth;
    splash.classList.add("is-in");

    document.body.classList.add("is-splash-open");
    if (splashBack) splashBack.focus({ preventScroll: true });

    sfx.play("view", { volume: 0.22 });
  }

  function closeSplash() {
    if (!splash || splash.hidden) return;

    sfx.stop("view");
    sfx.play("back", { volume: 0.2 });

    splash.classList.remove("is-in");
    splash.classList.add("is-out");
    document.body.classList.remove("is-splash-open");
    if (splashPixel) splashPixel.classList.remove("is-out");
    if (splashImg) splashImg.classList.remove("is-loaded");

    window.setTimeout(() => {
      splash.hidden = true;
      splash.classList.remove("is-out");
    }, reduce ? 0 : 220);

    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus({ preventScroll: true });
    }
  }

  if (splash) {
    const closeBtn = splash.querySelector("[data-splash-close]");
    if (closeBtn) closeBtn.addEventListener("click", closeSplash);
    if (splashBack) splashBack.addEventListener("click", closeSplash);
    splash.addEventListener("click", (event) => {
      if (event.target === splash) closeSplash();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSplash();
    });
  }
})();
