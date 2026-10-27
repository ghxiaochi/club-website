/* =========================================================
   HNYZ · 风格系统
   ---------------------------------------------------------
   三个皮肤：
     default  现在的蓝白科技风
     minimal  去装饰的极简风
     hacker   深色终端黑客风（带涂鸦背景 / 扫描线 / 进度条）
   顶栏的方块打开一个竖向卡片面板，切换时用整屏向上擦除。
   选择写进 localStorage，四个页面共用。
   ========================================================= */

(() => {
  "use strict";

  const KEY = "hnyz:style";
  const STYLES = ["default", "minimal", "hacker"];
  const LABELS = {
    default: "DEFAULT",
    minimal: "MINIMAL",
    hacker: "HACKER"
  };
  const NAMES = {
    default: "蓝白科技",
    minimal: "极简",
    hacker: "黑客终端"
  };

  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const trigger = document.querySelector("[data-style-toggle]");

  let current = "default";
  let busy = false;

  function readStored() {
    try {
      const value = window.localStorage.getItem(KEY);
      return STYLES.includes(value) ? value : "default";
    } catch (error) {
      return "default";
    }
  }

  current = readStored();
  root.dataset.style = current;

  /* -------------------------------------------------------
     一、涂鸦底纹（黑客风）
     ------------------------------------------------------- */
  function doodleSVG(id) {
    return `
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id="${id}" width="280" height="280" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <rect x="22" y="28" width="50" height="28" rx="12"/>
              <path d="M36 35v14M29 42h14"/>
              <circle cx="57" cy="37" r="2.4"/><circle cx="64" cy="44" r="2.4"/>

              <path d="M132 16c9 8 12 23 5 36l-11 11-11-11c-7-13-4-28 5-36 4-4 8-4 12 0Z"/>
              <circle cx="132" cy="34" r="5"/>
              <path d="m114 47-9 13 13-2M150 47l9 13-13-2"/>

              <path d="m250 18 6 14 15 2-11 10 3 15-13-8-13 8 3-15-11-10 15-2 6-14Z"/>

              <path d="M30 118c0-8 6-14 14-14 2-9 9-15 18-15 10 0 17 6 19 15 8 1 13 6 13 14 0 9-7 15-16 15H46c-9 0-16-6-16-15Z"/>
              <path d="M46 120c4 0 6 2 6 5M64 120c4 0 6 2 6 5M100 120c4 0 6 2 6 5"/>

              <path d="m112 100-14 16 14 16M144 100l14 16-14 16M134 94l-14 48"/>

              <circle cx="212" cy="110" r="14"/>
              <ellipse cx="212" cy="110" rx="27" ry="8" transform="rotate(-20 212 110)"/>

              <path d="m58 174-16 30h16l-6 28 26-38H62l10-20H58Z"/>

              <path d="M112 228v-20c0-11 8-19 18-19s18 8 18 19v20l-7-6-7 6-7-6-7 6-8-6Z"/>
              <circle cx="124" cy="215" r="1.8" fill="currentColor"/>
              <circle cx="136" cy="215" r="1.8" fill="currentColor"/>

              <rect x="204" y="188" width="36" height="36" rx="3"/>
              <rect x="212" y="194" width="16" height="12"/>
              <path d="M216 214h20"/>

              <rect x="112" y="250" width="30" height="30" rx="3"/>
              <path d="M120 242v8M127 242v8M134 242v8M120 288v8M127 288v8M134 288v8M104 258h8M104 266h8M104 274h8M142 258h8M142 266h8M142 274h8"/>

              <path d="m230 244 18 32h-36l18-32Z"/>

              <circle cx="34" cy="242" r="3"/>
              <circle cx="190" cy="46" r="2.4"/>
              <circle cx="262" cy="146" r="2.8"/>
              <circle cx="82" cy="300" r="2.2"/>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#${id})"/>
      </svg>`;
  }

  const doodle = document.createElement("div");
  doodle.className = "skin-doodle";
  doodle.setAttribute("aria-hidden", "true");
  doodle.innerHTML = doodleSVG("skinDoodlePattern");
  document.body.appendChild(doodle);

  const scanlines = document.createElement("div");
  scanlines.className = "skin-scanlines";
  scanlines.setAttribute("aria-hidden", "true");
  document.body.appendChild(scanlines);

  const progress = document.createElement("div");
  progress.className = "skin-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);

  /* 鼠标视差：涂鸦层跟着指针偏一点 */
  let pointerX = 0;
  let pointerY = 0;
  let pointerRaf = 0;

  function flushPointer() {
    pointerRaf = 0;
    if (current !== "hacker" || reduce.matches) return;
    doodle.style.setProperty("--dd-x", (pointerX * 16).toFixed(2));
    doodle.style.setProperty("--dd-y", (pointerY * 12).toFixed(2));
  }

  if (!reduce.matches) {
    document.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse" || current !== "hacker") return;
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
      if (!pointerRaf) pointerRaf = window.requestAnimationFrame(flushPointer);
    }, { passive: true });
  }

  /* 顶部滚动进度 */
  let progressRaf = 0;

  function flushProgress() {
    progressRaf = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    progress.style.setProperty("--skin-progress", value.toFixed(4));
  }

  window.addEventListener("scroll", () => {
    if (progressRaf) return;
    progressRaf = window.requestAnimationFrame(flushProgress);
  }, { passive: true });

  window.addEventListener("resize", flushProgress, { passive: true });

  /* -------------------------------------------------------
     二、风格面板
     ------------------------------------------------------- */
  const deck = document.createElement("dialog");
  deck.className = "style-deck";
  deck.setAttribute("data-style-deck", "");
  deck.setAttribute("aria-labelledby", "style-deck-title");
  deck.innerHTML = `
    <div class="style-deck__doodle" aria-hidden="true">${doodleSVG("skinDeckPattern")}</div>
    <div class="style-deck__shell">
      <header class="style-deck__head">
        <p class="style-deck__kicker">HNYZ // STYLE_DECK</p>
        <h2 class="style-deck__title" id="style-deck-title">选择网页风格</h2>
        <button class="style-deck__close" type="button" data-style-close aria-label="关闭风格面板">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </header>

      <div class="style-deck__viewport" data-style-viewport tabindex="0" role="group" aria-label="风格列表，上下滑动切换">
        <article class="style-card" data-style-option="default">
          <div class="style-card__top"><span>01 / DEFAULT</span><span class="style-card__current">当前风格</span></div>
          <div class="style-card__glyph style-card__glyph--default" aria-hidden="true">&lt;/&gt;</div>
          <p class="style-card__kicker">BLUE_TECH</p>
          <h3 class="style-card__title">蓝白科技</h3>
          <p class="style-card__desc">现在这套蓝白配色。光斑、角色排、桌宠和全部动效都保留。</p>
          <div class="style-card__swatches" aria-hidden="true">
            <i style="--c:#f5f9ff"></i><i style="--c:#2563eb"></i><i style="--c:#0f2744"></i>
          </div>
          <button class="style-card__apply" type="button" data-style-pick="default">应用此风格</button>
        </article>

        <article class="style-card" data-style-option="minimal">
          <div class="style-card__top"><span>02 / MINIMAL</span><span class="style-card__current">当前风格</span></div>
          <div class="style-card__glyph style-card__glyph--minimal" aria-hidden="true"><span></span></div>
          <p class="style-card__kicker">LESS_BUT_BETTER</p>
          <h3 class="style-card__title">极简</h3>
          <p class="style-card__desc">去掉光斑、装饰和多余阴影，只留内容、细线和黑白灰。</p>
          <div class="style-card__swatches" aria-hidden="true">
            <i style="--c:#fbfbf8"></i><i style="--c:#d9d9d3"></i><i style="--c:#161614"></i>
          </div>
          <button class="style-card__apply" type="button" data-style-pick="minimal">应用此风格</button>
        </article>

        <article class="style-card" data-style-option="hacker">
          <div class="style-card__top"><span>03 / HACKER</span><span class="style-card__current">当前风格</span></div>
          <div class="style-card__glyph style-card__glyph--hacker" aria-hidden="true">&gt;_</div>
          <p class="style-card__kicker">ROOT_ACCESS</p>
          <h3 class="style-card__title">黑客终端</h3>
          <p class="style-card__desc">深色终端、荧光绿、扫描线和会漂的涂鸦底纹，科技感拉满。</p>
          <div class="style-card__swatches" aria-hidden="true">
            <i style="--c:#030705"></i><i style="--c:#39ff88"></i><i style="--c:#00e5ff"></i>
          </div>
          <button class="style-card__apply" type="button" data-style-pick="hacker">应用此风格</button>
        </article>
      </div>

      <div class="style-deck__dots" data-style-dots role="group" aria-label="选择风格">
        <button class="style-deck__dot" type="button" data-style-dot="0" aria-label="第 1 个：蓝白科技" aria-current="true"></button>
        <button class="style-deck__dot" type="button" data-style-dot="1" aria-label="第 2 个：极简"></button>
        <button class="style-deck__dot" type="button" data-style-dot="2" aria-label="第 3 个：黑客终端"></button>
      </div>

      <p class="style-deck__hint">上下滑动 / ↑ ↓ 切换 · Esc 关闭</p>
    </div>`;
  document.body.appendChild(deck);

  const viewport = deck.querySelector("[data-style-viewport]");
  const cards = Array.from(deck.querySelectorAll("[data-style-option]"));
  const dots = Array.from(deck.querySelectorAll("[data-style-dot]"));
  const pickButtons = Array.from(deck.querySelectorAll("[data-style-pick]"));
  const closeButton = deck.querySelector("[data-style-close]");

  let activeIndex = 0;
  let scrollRaf = 0;
  let closeTimer = 0;

  function currentIndex() {
    return Math.max(0, STYLES.indexOf(current));
  }

  function syncCurrentUi() {
    cards.forEach((card) => {
      const isCurrent = card.dataset.styleOption === current;
      card.dataset.current = String(isCurrent);
      const button = card.querySelector("[data-style-pick]");
      if (button) {
        button.disabled = isCurrent;
        button.textContent = isCurrent ? "当前风格" : "应用此风格";
      }
    });
  }

  function setActive(index) {
    activeIndex = Math.max(0, Math.min(cards.length - 1, index));
    cards.forEach((card, i) => {
      card.classList.toggle("is-active", i === activeIndex);
    });
    dots.forEach((dot, i) => {
      dot.setAttribute("aria-current", String(i === activeIndex));
    });
  }

  /* 卡片高度 = 视口高度 - 上下 margin，用 offsetTop 算中心，避免受布局细节影响 */
  function scrollToCard(index, smooth) {
    const card = cards[index];
    if (!card) return;
    const top = card.offsetTop - (viewport.clientHeight - card.offsetHeight) / 2;
    viewport.scrollTo({
      top: Math.max(0, top),
      behavior: smooth && !reduce.matches ? "smooth" : "auto"
    });
  }

  function syncActiveFromScroll() {
    if (!viewport.clientHeight) return;
    const mid = viewport.scrollTop + viewport.clientHeight / 2;
    let best = 0;
    let bestGap = Infinity;

    cards.forEach((card, i) => {
      const gap = Math.abs(card.offsetTop + card.offsetHeight / 2 - mid);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    });

    if (best !== activeIndex) setActive(best);
  }

  viewport.addEventListener("scroll", () => {
    if (scrollRaf) return;
    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0;
      syncActiveFromScroll();
    });
  }, { passive: true });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const index = Number(dot.dataset.styleDot) || 0;
      scrollToCard(index, true);
      setActive(index);
    });
  });

  viewport.addEventListener("keydown", (event) => {
    const key = event.key;
    if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "PageDown" && key !== "PageUp" && key !== "Home" && key !== "End") {
      return;
    }
    event.preventDefault();

    let next = activeIndex;
    if (key === "ArrowDown" || key === "PageDown") next += 1;
    if (key === "ArrowUp" || key === "PageUp") next -= 1;
    if (key === "Home") next = 0;
    if (key === "End") next = cards.length - 1;

    next = Math.max(0, Math.min(cards.length - 1, next));
    scrollToCard(next, true);
    setActive(next);
  });

  pickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.stylePick;
      applyStyle(next);
    });
  });

  closeButton.addEventListener("click", () => closeDeck());

  deck.addEventListener("click", (event) => {
    if (event.target === deck) closeDeck();
  });

  deck.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDeck();
  });

  function openDeck() {
    if (!trigger || deck.open) return;

    syncCurrentUi();
    const index = currentIndex();
    setActive(index);

    deck.showModal();
    deck.classList.remove("is-closing");
    deck.classList.add("is-opening");
    document.documentElement.classList.add("is-style-deck-open");

    /* showModal 会把焦点丢给第一张卡并顺手滚过去，先抢回焦点再定位 */
    viewport.focus({ preventScroll: true });

    window.requestAnimationFrame(() => {
      scrollToCard(index, false);
      setActive(index);
    });

    window.setTimeout(() => {
      scrollToCard(index, false);
      setActive(index);
    }, 60);

    window.setTimeout(() => deck.classList.remove("is-opening"), 620);
    trigger.setAttribute("aria-expanded", "true");

    window.setTimeout(() => {
      const target = deck.querySelector(".style-card.is-active [data-style-pick]");
      if (target && !target.disabled) target.focus({ preventScroll: true });
      else viewport.focus({ preventScroll: true });
    }, 80);
  }

  function closeDeck() {
    if (!deck.open || deck.classList.contains("is-closing")) return;

    deck.classList.add("is-closing");
    trigger && trigger.setAttribute("aria-expanded", "false");
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      deck.close();
      deck.classList.remove("is-closing");
      document.documentElement.classList.remove("is-style-deck-open");
      trigger && trigger.focus({ preventScroll: true });
    }, reduce.matches ? 0 : 200);
  }

  if (trigger) {
    trigger.addEventListener("click", () => {
      if (deck.open) closeDeck();
      else openDeck();
    });
  }

  /* -------------------------------------------------------
     三、切换：整屏向上擦除
     ------------------------------------------------------- */
  const wipe = document.createElement("div");
  wipe.className = "style-wipe";
  wipe.hidden = true;
  wipe.setAttribute("aria-hidden", "true");
  wipe.innerHTML = `
    <span class="style-wipe__label" data-style-wipe-label>MINIMAL</span>
    <span class="style-wipe__bar"></span>`;
  document.body.appendChild(wipe);
  const wipeLabel = wipe.querySelector("[data-style-wipe-label]");

  function commit(next) {
    current = next;
    root.dataset.style = next;

    /* 黑客风默认是暗色终端；从浅色切过去时顺手把主题也带到深色 */
    if (next === "hacker" && root.dataset.theme !== "dark" && window.HNYZ_THEME) {
      window.HNYZ_THEME.apply("dark");
      try {
        window.localStorage.setItem("hnyz:theme", "dark");
      } catch (error) {
        /* 忽略 */
      }
    }

    try {
      window.localStorage.setItem(KEY, next);
    } catch (error) {
      /* 隐私模式下只生效本次会话 */
    }

    syncCurrentUi();
    flushProgress();
    flushPointer();

    if (trigger) {
      trigger.setAttribute("title", `切换网页风格（当前：${NAMES[next]}）`);
    }

    document.dispatchEvent(new CustomEvent("hnyz:stylechange", { detail: { style: next } }));
  }

  function applyStyle(next) {
    if (!STYLES.includes(next) || busy) return;

    if (next === current) {
      closeDeck();
      return;
    }

    if (reduce.matches) {
      closeDeck();
      commit(next);
      return;
    }

    busy = true;

    if (deck.open) {
      deck.close();
      deck.classList.remove("is-closing");
      document.documentElement.classList.remove("is-style-deck-open");
      trigger && trigger.setAttribute("aria-expanded", "false");
    }

    wipe.dataset.next = next;
    wipeLabel.textContent = LABELS[next];
    wipe.hidden = false;
    wipe.classList.remove("is-out", "is-in");
    void wipe.offsetWidth;

    window.requestAnimationFrame(() => {
      wipe.classList.add("is-in");
    });

    window.setTimeout(() => {
      commit(next);
      wipe.classList.remove("is-in");
      wipe.classList.add("is-out");

      window.setTimeout(() => {
        wipe.hidden = true;
        wipe.classList.remove("is-out");
        busy = false;
        if (trigger) trigger.focus({ preventScroll: true });
      }, 480);
    }, 430);
  }

  /* 初始同步 */
  syncCurrentUi();
  flushProgress();
  if (trigger) {
    trigger.setAttribute("title", `切换网页风格（当前：${NAMES[current]}）`);
  }

  window.HNYZ_STYLE = {
    apply: applyStyle,
    current: () => current
  };
})();
