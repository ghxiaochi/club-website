/* =========================================================
   HNYZ · 项目区：ANIMDUSTRY 抽卡界面复刻
   ---------------------------------------------------------
   参考游戏源码（Anuken/animdustry 的 src/menus.nim）：
   - 背景 patStripes(#accce3, #57639a)，斜 135°
   - 角色站在底部面板的上沿，锁定角色用 mixColor rgb(0.26) 压暗
   - 点击角色进入 splash 页：暗底 + 放射线 + 白色闪光 + 标题/副标题/技能
   - Roll 一次 10 铜板，铜板不够时数字变红
   ========================================================= */

(() => {
  "use strict";

  const stage = document.querySelector("[data-char-stage]");
  if (!stage) return;

  const bubbleHost = document.querySelector("[data-char-bubble]");
  const rollBtn = document.querySelector("[data-char-roll]");
  const copperEl = document.querySelector("[data-char-copper]");
  const copperWrap = document.querySelector("[data-char-copper-wrap]");
  const resetBtn = document.querySelector("[data-char-reset]");
  const mapsHost = document.querySelector("[data-char-maps]");

  const splash = document.querySelector("[data-char-splash]");
  const splashImg = splash ? splash.querySelector("[data-splash-img]") : null;
  const splashTitle = splash ? splash.querySelector("[data-splash-title]") : null;
  const splashSub = splash ? splash.querySelector("[data-splash-sub]") : null;
  const splashAbility = splash ? splash.querySelector("[data-splash-ability]") : null;
  const splashCount = splash ? splash.querySelector("[data-splash-count]") : null;
  const splashBack = splash ? splash.querySelector("[data-splash-back]") : null;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 音效模块（js/sfx.js），没加载时静默降级 */
  const sfx = window.HNYZ_SFX || { play() {}, stop() {} };

  /* 角色数据来自游戏 src/vars.nim 的 allUnits，顺序与原作一致 */
  const characters = [
    { id: "alpha", title: "-ALPHA-", sub: "the first of many", ability: "creates a wall every 10 moves", unlocked: true,
      s1: "#b25840", s2: "#c07659", glow: "#ffd37f", pattern: "squares" },
    { id: "mono", title: "-MONO-", sub: "the gatherer", ability: "earns one extra point every 4 moves", unlocked: true,
      s1: "#235e62", s2: "#3a8a72", glow: "#84f490", pattern: "squares" },
    { id: "oct", title: "-OCT-", sub: "the protector", ability: "creates a shield every 30 moves", unlocked: true,
      s1: "#235e62", s2: "#3a8a72", glow: "#84f490", pattern: "circles" },
    { id: "crawler", title: "-CRAWLER-", sub: "boom", ability: "destroys 4 adjacent blocks every 4 moves", unlocked: true,
      s1: "#665c9f", s2: "#bf92f8", glow: "#bf92f8", pattern: "spin" },
    { id: "zenith", title: "-ZENITH-", sub: "gaming", ability: "destroys the next 4 blocks in a line every 4 moves", unlocked: false,
      s1: "#c45b4d", s2: "#ffa664", glow: "#ffd37f", pattern: "rays" },
    { id: "quad", title: "-QUAD-", sub: 'the "support" has arrived', ability: "destroys 8 adjacent blocks every 6 moves", unlocked: false,
      s1: "#235e62", s2: "#3a8a72", glow: "#84f490", pattern: "rays" },
    { id: "oxynoe", title: "-OXYNOE-", sub: "as was foretold", ability: "destroys alternating adjacent blocks every other move", unlocked: false,
      s1: "#235e62", s2: "#3a8a72", glow: "#c7ffb7", pattern: "circles" },
    { id: "sei", title: "-SEI-", sub: "crossed out", ability: "destroys blocks in a diagonal cross every 4 moves", unlocked: false,
      s1: "#ffa664", s2: "#ffcb82", glow: "#ffd37f", pattern: "circles" }
  ];

  const LOCK_LINES = ["还没抽到……", "这个位置空着。", "铜板不够，下次吧。"];
  const COPPER_START = 88;
  const COPPER_COST = 10;
  const SAVE_KEY = "hnyz:gacha";

  /* =======================================================
     一、存档：铜板 / 已解锁 / 重复数
     ======================================================= */
  const save = {
    copper: COPPER_START,
    unlocked: characters.filter((c) => c.unlocked).map((c) => c.id),
    duplicates: {}
  };

  function loadSave() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Number.isFinite(data.copper)) save.copper = Math.max(0, Math.floor(data.copper));
      if (Array.isArray(data.unlocked)) {
        save.unlocked = data.unlocked.filter((id) => characters.some((c) => c.id === id));
      }
      if (data.duplicates && typeof data.duplicates === "object") save.duplicates = data.duplicates;
    } catch (error) {
      /* 忽略 */
    }
  }

  function persist() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (error) {
      /* 忽略 */
    }
  }

  function isUnlocked(id) {
    return save.unlocked.includes(id);
  }

  loadSave();

  /* =======================================================
     二、渲染站位
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
    slot.addEventListener("click", () => poke(slot, char));

    /* 悬停：游戏里 mouseEnter 会跳一下并响一声 */
    slot.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse" || !isUnlocked(char.id)) return;
      sfx.play("hover", { rate: 1 + index * 0.035, volume: 0.12 });
    });
    stage.appendChild(slot);
    slots.push(slot);
  });

  /* 锁定的压暗成剪影，和游戏里 mixColor rgb(0.26) 一致 */
  function paintSlots() {
    slots.forEach((slot, index) => {
      const char = characters[index];
      const unlocked = isUnlocked(char.id);
      slot.classList.toggle("is-locked", !unlocked);
      slot.setAttribute(
        "aria-label",
        unlocked ? `${char.title}，点击查看卡片` : `${char.title} 未解锁，点击提示`
      );
    });
  }

  paintSlots();

  /* 空闲时把 8 张立绘偷偷下好，第一次点开也不用等 */
  function preloadArt() {
    characters.forEach((char) => {
      const img = new Image();
      img.src = `images/characters/art-${char.id}.webp`;
    });
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preloadArt, { timeout: 2500 });
  } else {
    window.setTimeout(preloadArt, 1600);
  }

  /* =======================================================
     三、铜板与 Roll
     ======================================================= */
  function paintCopper() {
    if (copperEl) copperEl.textContent = `${save.copper} / ${COPPER_COST}`;
    const enough = save.copper >= COPPER_COST;
    if (copperWrap) copperWrap.classList.toggle("is-short", !enough);
    if (rollBtn) rollBtn.classList.toggle("is-short", !enough);
  }

  paintCopper();

  /* =======================================================
     四、气泡
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
     五、点击角色
     ======================================================= */
  function squash(slot) {
    slot.classList.remove("is-hit");
    void slot.offsetWidth;
    slot.classList.add("is-hit");
    window.setTimeout(() => slot.classList.remove("is-hit"), 220);
  }

  function poke(slot, char) {
    squash(slot);
    sfx.play("click", { rate: 1 + characters.indexOf(char) * 0.03, volume: 0.22 });

    if (!isUnlocked(char.id)) {
      slot.classList.remove("is-shaking");
      void slot.offsetWidth;
      slot.classList.add("is-shaking");
      window.setTimeout(() => slot.classList.remove("is-shaking"), 520);
      say(LOCK_LINES[Math.floor(Math.random() * LOCK_LINES.length)], slot);
      sfx.play("locked", { volume: 0.24 });
      return;
    }

    openSplash(char);
  }

  /* =======================================================
     六、抽卡结果页（splash）
     ======================================================= */
  let lastFocus = null;

  function countOf(char) {
    return 1 + (save.duplicates[char.id] || 0);
  }

  function openSplash(char) {
    if (!splash) return;

    lastFocus = document.activeElement;

    splash.style.setProperty("--s1", char.s1);
    splash.style.setProperty("--s2", char.s2);
    splash.style.setProperty("--glow", char.glow);
    splash.dataset.pattern = char.pattern;

    if (splashImg) {
      /* 站位用小像素图，结果页用高精度立绘 */
      splashImg.classList.remove("is-loaded");
      splashImg.src = `images/characters/art-${char.id}.webp`;
      splashImg.alt = char.title;

      /* 图没解码完就播动画会看到空白，等 decode 再显形 */
      const revealArt = () => splashImg.classList.add("is-loaded");
      if (typeof splashImg.decode === "function") {
        splashImg.decode().then(revealArt).catch(revealArt);
      } else {
        revealArt();
      }
    }
    if (splashTitle) splashTitle.textContent = char.title;
    if (splashSub) splashSub.textContent = char.sub;
    if (splashAbility) splashAbility.textContent = char.ability;
    if (splashCount) splashCount.textContent = `x${countOf(char)}`;

    splash.hidden = false;
    splash.classList.remove("is-out");
    void splash.offsetWidth;
    splash.classList.add("is-in");

    document.body.classList.add("is-splash-open");
    if (splashBack) splashBack.focus({ preventScroll: true });
  }

  function closeSplash() {
    if (!splash || splash.hidden) return;

    sfx.stop("reveal");
    sfx.play("back", { volume: 0.2 });

    splash.classList.remove("is-in");
    splash.classList.add("is-out");
    document.body.classList.remove("is-splash-open");

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

  /* =======================================================
     七、Roll：扣铜板、抽一个、重复计数
     ======================================================= */
  function doRoll() {
    if (save.copper < COPPER_COST) {
      if (copperWrap) {
        copperWrap.classList.remove("is-shaking");
        void copperWrap.offsetWidth;
        copperWrap.classList.add("is-shaking");
        window.setTimeout(() => copperWrap.classList.remove("is-shaking"), 420);
      }
      say("铜板不够，去打一首吧。", rollBtn);
      sfx.play("locked", { volume: 0.2 });
      return;
    }

    save.copper -= COPPER_COST;

    const char = characters[Math.floor(Math.random() * characters.length)];
    const first = !isUnlocked(char.id);

    sfx.play("reveal", { volume: 0.26 });

    if (first) {
      save.unlocked.push(char.id);
    } else {
      save.duplicates[char.id] = (save.duplicates[char.id] || 0) + 1;
    }

    persist();
    paintCopper();
    paintSlots();

    if (first) {
      const slot = slots[characters.indexOf(char)];
      slot.classList.add("is-new");
      window.setTimeout(() => slot.classList.remove("is-new"), 1600);
    }

    window.setTimeout(() => openSplash(char), 110);

    if (first) {
      window.setTimeout(() => sfx.play("win", { volume: 0.22 }), 320);
    }
  }

  if (rollBtn) rollBtn.addEventListener("click", doRoll);

  /* 齿轮：重置存档 */
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      save.copper = COPPER_START;
      save.unlocked = characters.filter((c) => c.unlocked).map((c) => c.id);
      save.duplicates = {};
      persist();
      paintCopper();
      paintSlots();
      say("存档已重置。", resetBtn);
      sfx.play("select", { volume: 0.2 });
    });
  }

  /* =======================================================
     八、下面那排谱面卡
     ======================================================= */
  const maps = [
    { label: "Map 1", cls: "map--1", line: "开胃菜，先热热手。" },
    { label: "Map 2", cls: "map--2", line: "这段双押有点密。" },
    { label: "Map 3", cls: "map--3", line: "副歌之前别断。" },
    { label: "Map 4", cls: "map--4", line: "这首我还没全连。" },
    { label: "[ locked ]", cls: "map--locked", line: "还没解锁，先去打前四首。" }
  ];

  if (mapsHost) {
    maps.forEach((map) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `char-map ${map.cls}`;

      const label = document.createElement("span");
      label.className = "char-map__label";
      label.textContent = map.label;

      card.append(label);
      card.addEventListener("click", () => {
        say(map.line, card);
        sfx.play("select", { volume: 0.18 });
      });
      mapsHost.appendChild(card);
    });
  }
})();
