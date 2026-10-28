/* =========================================================
   HNYZ · 风格系统
   ---------------------------------------------------------
   四个皮肤：
     default  现在的蓝白科技风
     minimal  去装饰的极简风
     hacker   深色终端黑客风（代码雨 / 气泡 / 进度条）
     bare     棍木：整页空白，只留右上角的风格按钮和一句灰字
   顶栏的方块打开一个竖向卡片面板，切换时用整屏向上擦除。
   选择写进 localStorage，四个页面共用。
   ========================================================= */

(() => {
  "use strict";

  const KEY = "hnyz:style";
  const STYLES = ["default", "minimal", "hacker", "bare"];
  const LABELS = {
    default: "DEFAULT",
    minimal: "MINIMAL",
    hacker: "HACKER",
    bare: "BARE"
  };
  const NAMES = {
    default: "蓝白科技",
    minimal: "极简",
    hacker: "黑客终端",
    bare: "棍木"
  };

  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const trigger = document.querySelector("[data-style-toggle]");
  /* 记住按钮原本在顶栏的位置，从棍木切回来时要放回去 */
  const triggerHome = trigger ? { parent: trigger.parentNode, next: trigger.nextSibling } : null;

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
     一、黑客风的背景层：一层漂浮的气泡
     -------------------------------------------------------
     代码雨在 js/matrix.js 里画，气泡放在 DOM 里用 CSS 动，
     只跑 transform，便宜且不会和画布抢帧。
     尺寸、位置、速度、延迟都写死在行内，刷新也不会变。
     ------------------------------------------------------- */
  const bubbles = document.createElement("div");
  bubbles.className = "skin-bubbles";
  bubbles.setAttribute("aria-hidden", "true");

  const BUBBLE_COUNT = 16;
  for (let i = 0; i < BUBBLE_COUNT; i += 1) {
    const bubble = document.createElement("i");
    const size = 7 + Math.random() * 29;
    bubble.style.cssText = [
      `--r:${size.toFixed(1)}px`,
      `--x:${(Math.random() * 100).toFixed(2)}%`,
      `--dx:${(Math.random() * 72 - 36).toFixed(0)}px`,
      `--dur:${(16 + Math.random() * 18).toFixed(1)}s`,
      `--delay:${(-Math.random() * 34).toFixed(1)}s`,
      `--a:${(0.18 + Math.random() * 0.28).toFixed(2)}`
    ].join(";");
    bubbles.appendChild(bubble);
  }

  document.body.appendChild(bubbles);

  const progress = document.createElement("div");
  progress.className = "skin-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);

  /* 棍木：整页清空后，中间只剩这一行灰字 */
  const bareNote = document.createElement("p");
  bareNote.className = "bare-note";
  bareNote.textContent = "这里什么也没有";
  document.body.appendChild(bareNote);

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
          <p class="style-card__desc">纯黑终端、荧光绿和一整屏落下来的代码雨，其余什么都没有。</p>
          <div class="style-card__swatches" aria-hidden="true">
            <i style="--c:#030705"></i><i style="--c:#39ff88"></i><i style="--c:#00e5ff"></i>
          </div>
          <button class="style-card__apply" type="button" data-style-pick="hacker">应用此风格</button>
        </article>

        <article class="style-card" data-style-option="bare">
          <div class="style-card__top"><span>04 / BARE</span><span class="style-card__current">当前风格</span></div>
          <div class="style-card__glyph style-card__glyph--bare" aria-hidden="true"><span></span></div>
          <p class="style-card__kicker">NOTHING_HERE</p>
          <h3 class="style-card__title">棍木</h3>
          <div class="style-card__swatches" aria-hidden="true">
            <i style="--c:#ffffff"></i><i style="--c:#f2f2ee"></i><i style="--c:#b9b9b4"></i>
          </div>
          <button class="style-card__apply" type="button" data-style-pick="bare">应用此风格</button>
        </article>
      </div>

      <div class="style-deck__dots" data-style-dots role="group" aria-label="选择风格">
        <button class="style-deck__dot" type="button" data-style-dot="0" aria-label="第 1 个：蓝白科技" aria-current="true"></button>
        <button class="style-deck__dot" type="button" data-style-dot="1" aria-label="第 2 个：极简"></button>
        <button class="style-deck__dot" type="button" data-style-dot="2" aria-label="第 3 个：黑客终端"></button>
        <button class="style-deck__dot" type="button" data-style-dot="3" aria-label="第 4 个：棍木"></button>
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

  /* -------------------------------------------------------
     三之二、棍木：把风格按钮搬到右上角
     -------------------------------------------------------
     空白页要把 <header> 整个藏掉，按钮又在 header 里，
     父级 display:none 管不到子元素，所以直接把它挪到 body 下，
     切走时按当初记下的位置插回顶栏。 */
  let bareMounted = false;

  function setBareMode(on) {
    if (!trigger || bareMounted === on) return;
    bareMounted = on;

    if (on) {
      document.body.appendChild(trigger);
    } else if (triggerHome && triggerHome.parent) {
      triggerHome.parent.insertBefore(trigger, triggerHome.next);
    }
  }

  function commit(next) {
    current = next;
    root.dataset.style = next;
    setBareMode(next === "bare");

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
  setBareMode(current === "bare");
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
