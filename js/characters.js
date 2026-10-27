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
  const splashCount = splash ? splash.querySelector("[data-splash-count]") : null;
  const splashDecor = splash ? Array.from(splash.querySelectorAll("[data-splash-decor]")) : [];

  /* 角色卡背景的 canvas 画布（js/splash-scene.js），没加载时静默降级 */
  const scene = window.HNYZ_SPLASH_SCENE || { show() {}, hide() {}, resize() {} };

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 从左到右一条完整的大调音阶（0/2/4/5/7/9/11/12 半音），
     平滑地从低音升到高音，划过最后一个刚好高一个八度 */
  const PITCH_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];

  function calcPitch(note) {
    const step = PITCH_STEPS[Math.abs(note) % PITCH_STEPS.length];
    return Math.pow(2, step / 12);
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
      s1: "#c45b4d", s2: "#ffa664", glow: "#ffd37f", pattern: "rays",
      decor: [
        "images/characters/decor-zenith-chips.webp",
        "images/characters/decor-zenith-controller.webp"
      ] },
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
    slot.style.setProperty("--i", String(index));

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

    /* 悬停（鼠标）：和游戏一样，每次进到小人身上都会跳一下。
       音高统一交给下面的「滑动音阶」处理，避免一次划动响两遍 */
    slot.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      hop(slot);
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
     一点五、滑动音阶
     -------------------------------------------------------
     不是「停在某个小人身上才响一下」，而是指针在角色排上
     横向划动时，按当前所在的水平位置取音：滑过谁就发谁的
     音，滑得再快也不会漏掉中间的音阶。
     桌面鼠标、手指拖动、触控板横向滑动都走同一套映射。
     ======================================================= */
  let noteSpots = [];
  let noteTop = 0;
  let noteBottom = 0;
  let lastNote = -1;
  let lastNoteAt = 0;
  let touchStart = null;
  let wheelPos = -1;

  function measureNoteSpots() {
    if (!slots.length) return;
    noteSpots = slots.map((slot) => slot.offsetLeft + slot.offsetWidth / 2);
    noteTop = slots[0].offsetTop - 8;
    noteBottom = slots[0].offsetTop + slots[0].offsetHeight + 8;
  }

  /* 指针落在第几个小人身上；在角色排外返回 -1 */
  function noteAt(x, y) {
    if (noteSpots.length < 2) return -1;

    const rect = stage.getBoundingClientRect();
    const lx = x - rect.left;
    const ly = y - rect.top;

    if (ly < noteTop || ly > noteBottom) return -1;

    /* 左右各放宽一点，滑到队伍边缘时音阶也能收尾 */
    const half = slots[0].offsetWidth * 0.75;
    if (lx < noteSpots[0] - half || lx > noteSpots[noteSpots.length - 1] + half) return -1;

    let index = 0;
    let best = Infinity;
    for (let i = 0; i < noteSpots.length; i += 1) {
      const distance = Math.abs(lx - noteSpots[i]);
      if (distance < best) {
        best = distance;
        index = i;
      }
    }
    return index;
  }

  function playNote(index, volume, jump) {
    if (index < 0) return;

    const now = performance.now();
    /* 换音至少隔 38ms：快速划动时不会被音频池吞掉 */
    if (index === lastNote || now - lastNoteAt < 38) return;

    lastNote = index;
    lastNoteAt = now;
    sfx.play("hover", { rate: calcPitch(index), volume });
    if (jump) hop(slots[index]);
  }

  measureNoteSpots();
  if (window.ResizeObserver) {
    new ResizeObserver(measureNoteSpots).observe(stage);
  }
  window.addEventListener("load", measureNoteSpots);

  stage.addEventListener("pointermove", (event) => {
    const index = noteAt(event.clientX, event.clientY);

    if (event.pointerType === "mouse") {
      if (index < 0) {
        lastNote = -1;
        return;
      }
      wheelPos = -1;
      playNote(index, 0.14, false);
      return;
    }

    if (!touchStart) return;

    if (!touchStart.horizontal) {
      const dx = event.clientX - touchStart.x;
      const dy = event.clientY - touchStart.y;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      /* 竖着滑是滚页面，不发声；横着划才走音阶 */
      if (Math.abs(dx) <= Math.abs(dy)) {
        touchStart = null;
        return;
      }
      touchStart.horizontal = true;
    }

    playNote(index, 0.12, true);
  }, { passive: true });

  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    touchStart = { x: event.clientX, y: event.clientY, horizontal: false };
    lastNote = -1;
    wheelPos = -1;
  }, { passive: true });

  const endTouch = () => {
    touchStart = null;
    lastNote = -1;
  };

  stage.addEventListener("pointerup", endTouch, { passive: true });
  stage.addEventListener("pointercancel", endTouch, { passive: true });
  stage.addEventListener("pointerleave", () => {
    lastNote = -1;
    wheelPos = -1;
  }, { passive: true });

  /* 触控板横向滑动：笔记本上没有「划过」的指针轨迹，用 wheel 补一段音阶 */
  stage.addEventListener("wheel", (event) => {
    if (!noteSpots.length) return;
    if (Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.4) return;

    /* 连续滚动时从当前音继续往上/往下走，不要每帧都回到原点 */
    if (wheelPos < 0) {
      wheelPos = lastNote < 0 ? 0.5 : lastNote / (noteSpots.length - 1);
    }
    wheelPos = Math.min(1, Math.max(0, wheelPos + event.deltaX * 0.0022));
    playNote(Math.round(wheelPos * (noteSpots.length - 1)), 0.12, false);
  }, { passive: true });

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

      (char.decor || []).forEach((src) => {
        const decor = new Image();
        decor.src = src;
      });
    });
  }

  /* 脚本是 defer 的，这里直接开始预载，越早越好 */
  preloadArt();

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
    sfx.play("click", { rate: calcPitch(characters.indexOf(char)), volume: 0.22 });

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
  let artToken = 0;

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
      /* 高精度立绘在后台加载，好了以后淡入替换像素小人。
         连续点开不同角色时，用 token 丢掉上一张的 load 回调 */
      let artShown = false;
      const token = (artToken += 1);
      const showArt = () => {
        if (artShown || token !== artToken) return;
        artShown = true;
        splashImg.classList.add("is-loaded");
        if (splashPixel) splashPixel.classList.add("is-out");
      };

      splashImg.classList.remove("is-loaded");
      splashImg.src = `images/characters/art-${char.id}.webp`;
      splashImg.alt = char.title;

      /* 只在完整下载并解码后切换：WebP 是渐进解码的，
         提前显示会漏出「只剩一个头」的半张图 */
      splashImg.addEventListener("load", showArt, { once: true });
      splashImg.addEventListener("error", showArt, { once: true });
    }
    if (splashTitle) splashTitle.textContent = char.title;
    if (splashSub) splashSub.textContent = char.sub;
    if (splashAbility) splashAbility.textContent = char.ability;
    if (splashCount) splashCount.textContent = "×1";

    /* 角色旁边飘的小物件（目前只有 Zenith 有） */
    splashDecor.forEach((node, index) => {
      const src = (char.decor || [])[index];
      if (src) {
        node.src = src;
        node.hidden = false;
      } else {
        node.hidden = true;
        node.removeAttribute("src");
      }
    });

    splash.dataset.character = char.id;
    splash.hidden = false;
    splash.classList.remove("is-out");
    void splash.offsetWidth;
    splash.classList.add("is-in");

    document.body.classList.add("is-splash-open");
    if (splashBack) splashBack.focus({ preventScroll: true });

    /* 背景交给 canvas：按游戏 units.nim 的画法重绘 */
    scene.show(char.id);
    sfx.play("view", { volume: 0.22 });
  }

  function closeSplash() {
    if (!splash || splash.hidden) return;

    sfx.stop("view");
    sfx.play("back", { volume: 0.2 });
    scene.hide();

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
