/* =========================================================
   HNYZ · 个性化交互
   ---------------------------------------------------------
   1. 首屏打字机标语（按时段问候开场）
   2. 滚动渐显 + 数据滚动计数
   3. 项目卡片 3D 倾斜（仅精确指针，触屏不启用）
   4. 首屏光标光晕
   5. 彩蛋：连点 Logo、Konami 密码进入 HACKER_MODE
   6. 控制台签名、页脚访问次数

   所有动效都尊重 prefers-reduced-motion；元素不存在时
   直接跳过，因此两个页面共用同一个脚本。
   ========================================================= */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const root = document.documentElement;

  /* =======================================================
     一、终端风格提示条
     ======================================================= */
  let toastEl = null;
  let toastTimer = 0;

  function toast(message, tone = "blue", duration = 3200) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "hnyz-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");

      const prompt = document.createElement("span");
      prompt.className = "hnyz-toast__prompt";
      prompt.setAttribute("aria-hidden", "true");
      prompt.textContent = ">_";

      const text = document.createElement("span");
      text.className = "hnyz-toast__text";

      toastEl.append(prompt, text);
      document.body.appendChild(toastEl);
    }

    const text = toastEl.querySelector(".hnyz-toast__text");
    if (text) text.textContent = message;
    toastEl.dataset.tone = tone;
    toastEl.classList.add("is-visible");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove("is-visible");
    }, duration);
  }

  /* =======================================================
     二、首屏打字机标语
     ======================================================= */
  function greeting() {
    const hour = new Date().getHours();
    if (hour < 5) return "夜深了";
    if (hour < 8) return "早上好";
    if (hour < 11) return "上午好";
    if (hour < 13) return "中午好";
    if (hour < 17) return "下午好";
    if (hour < 22) return "晚上好";
    return "夜里好";
  }

  /* 三种风格三套说法：同一句话，换一种人设 */
  const ROTATOR = {
    default: () => [
      `${greeting()}，这里是衡南一中编程社。`,
      "零基础也能进来，先从点亮一颗 LED 开始。",
      "每周两次，每次一小时，把抽象的东西跑起来。",
      "做完，比完美更重要。"
    ],
    minimal: () => [
      "少一点，做深一点。",
      "删到只剩必要的那一行。",
      "留白不是空，是还没说完的部分。",
      "我们只做减法。"
    ],
    hacker: () => [
      `${greeting()}。握手完成，欢迎接入。`,
      "在 0 与 1 的缝隙里，重新定义「可被运行」。",
      "教不是输入，是接口对齐。",
      "所有范式都是临时的，只有 commit 是真的。"
    ]
  };

  function initRotator() {
    const target = document.querySelector("[data-rotator]");
    if (!target) return;

    let token = 0;
    let timer = 0;

    function start() {
      token += 1;
      const mine = token;
      window.clearTimeout(timer);

      const style = document.documentElement.dataset.style || "default";
      const phrases = (ROTATOR[style] || ROTATOR.default)();

      if (reduceMotion.matches) {
        target.textContent = phrases[0];
        return;
      }

      let phraseIndex = 0;
      let charIndex = 0;
      let deleting = false;

      function tick() {
        /* 切过风格就作废，避免两套标语叠在一起打字 */
        if (mine !== token) return;

        const phrase = phrases[phraseIndex];

        if (!deleting) {
          charIndex += 1;
          target.textContent = phrase.slice(0, charIndex);

          if (charIndex >= phrase.length) {
            deleting = true;
            timer = window.setTimeout(tick, 2200);
            return;
          }
          timer = window.setTimeout(tick, 58);
          return;
        }

        charIndex -= 1;
        target.textContent = phrase.slice(0, Math.max(charIndex, 0));

        if (charIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          timer = window.setTimeout(tick, 380);
          return;
        }
        timer = window.setTimeout(tick, 26);
      }

      target.textContent = "";
      timer = window.setTimeout(tick, 420);
    }

    start();
    document.addEventListener("hnyz:stylechange", start);
  }

  /* =======================================================
     三、滚动渐显 + 数字滚动
     ======================================================= */
  const revealTargets = ".hero-copy, .quick-card, .section-head, .do-card, .project-card, .schedule-item, .agenda-card, .wall-card, .faq-item, .join-panel, .archive-head";

  function countUp(element) {
    if (element.dataset.counted === "true") return;

    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;

    element.dataset.counted = "true";

    if (reduceMotion.matches || target === 0) {
      element.textContent = String(target);
      return;
    }

    const duration = 760;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = String(Math.round(target * eased));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = String(target);
      }
    }

    window.requestAnimationFrame(step);
  }

  let revealObserver = null;

  function observeReveal(element) {
    if (!element || element.dataset.revealReady === "true") return;
    element.dataset.revealReady = "true";

    /* 首屏元素立即显示，避免打开页面空一拍 */
    element.setAttribute("data-reveal", "");

    if (!revealObserver) {
      element.classList.add("is-revealed");
      element.querySelectorAll("[data-count]").forEach(countUp);
      return;
    }

    revealObserver.observe(element);
  }

  function initReveal() {
    if (reduceMotion.matches) return;

    root.classList.add("reveal-ready");

    if ("IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-revealed");
            entry.target.querySelectorAll("[data-count]").forEach(countUp);
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
    }

    document.querySelectorAll(revealTargets).forEach(observeReveal);

    /* main.js 动态渲染的项目卡片也要参与渐显 */
    if ("MutationObserver" in window) {
      const watcher = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches(".project-card")) observeReveal(node);
            node.querySelectorAll(".project-card").forEach(observeReveal);
          });
        });
      });

      ["#project-grid", "#project-groups"].forEach((selector) => {
        const container = document.querySelector(selector);
        if (container) watcher.observe(container, { childList: true, subtree: true });
      });
    }

    /* data-count 在首屏时也要计数，不等滚动 */
    document.querySelectorAll("[data-count]").forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight) countUp(element);
    });
  }

  /* =======================================================
     四、项目卡片 3D 倾斜
     ======================================================= */
  function initTilt() {
    if (reduceMotion.matches || !finePointer.matches) return;

    const MAX_TILT = 7;
    let activeCard = null;
    let frame = 0;

    function reset(card) {
      if (!card) return;
      card.classList.remove("is-tilting");
      card.style.transform = "";
    }

    let lastX = 0;
    let lastY = 0;

    document.addEventListener(
      "pointermove",
      (event) => {
        const card = event.target instanceof Element
          ? event.target.closest(".project-card")
          : null;

        if (!card) {
          if (activeCard) {
            reset(activeCard);
            activeCard = null;
          }
          return;
        }

        if (activeCard && activeCard !== card) reset(activeCard);
        activeCard = card;
        lastX = event.clientX;
        lastY = event.clientY;

        /* 每帧最多读一次布局：把 getBoundingClientRect 放进 rAF，
           高频 pointermove 时不会每次都强制同步布局 */
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          if (!activeCard) return;
          const rect = activeCard.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const px = (lastX - rect.left) / rect.width - 0.5;
          const py = (lastY - rect.top) / rect.height - 0.5;
          activeCard.classList.add("is-tilting");
          activeCard.style.transform = `perspective(900px) rotateX(${(-py * MAX_TILT).toFixed(2)}deg) rotateY(${(px * MAX_TILT).toFixed(2)}deg) translateY(-4px)`;
        });
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerleave",
      () => {
        reset(activeCard);
        activeCard = null;
      },
      { passive: true }
    );
  }

  /* =======================================================
     五、全站光标光晕
     -------------------------------------------------------
     一层 fixed 的柔光跟着鼠标走，覆盖整站而不只是首屏。
     用 mix-blend-mode 让它像投影/手电，而不是灰色蒙版；
     触屏和「减少动效」下完全不启用。
     ======================================================= */
  function initGlobalGlow() {
    if (reduceMotion.matches || !finePointer.matches) return;

    const glow = document.createElement("div");
    glow.className = "hnyz-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(glow);

    let frame = 0;
    let visible = false;

    function follow(x, y) {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        /* 只动 transform，让光晕走合成层，不触发整屏重绘 */
        glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    }

    window.addEventListener(
      "pointermove",
      (event) => {
        if (!visible) {
          glow.classList.add("is-on");
          visible = true;
        }
        follow(event.clientX, event.clientY);
      },
      { passive: true }
    );

    document.addEventListener("pointerleave", () => {
      glow.classList.remove("is-on");
      visible = false;
    });
  }

  /* =======================================================
     五点五、技术关键词跑马灯
     -------------------------------------------------------
     把一组关键词复制到足够宽，再按「一组」的宽度位移，
     循环时看不出接缝；窗口变化时重建。
     ======================================================= */
  function initTicker() {
    const track = document.querySelector("[data-ticker-track]");
    if (!track || reduceMotion.matches) return;

    const base = track.firstElementChild;
    if (!base) return;

    let timer = 0;

    function build() {
      while (track.children.length > 1) track.lastElementChild.remove();

      const groupWidth = base.getBoundingClientRect().width;
      if (groupWidth < 10) return;

      const need = Math.ceil((window.innerWidth * 2) / groupWidth) + 1;
      for (let i = 1; i < need; i += 1) {
        const clone = base.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      }

      track.style.setProperty("--shift", `-${groupWidth}px`);
      track.style.animationDuration = `${Math.max(20, Math.round(groupWidth / 46))}s`;
    }

    build();
    window.addEventListener("resize", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(build, 250);
    });
  }

  /* =======================================================
     五点八、背景图标阵列
     -------------------------------------------------------
     校徽 / Arduino / token 三枚灰度图标，缩小后随机撒在
     背景里，各自缓慢上下浮动。桌面端才生成，避免手机上
    多出一层影响滚动性能。
     ======================================================= */
  function initBgIcons() {
    if (reduceMotion.matches) return;
    if (!window.matchMedia("(min-width: 901px)").matches) return;

    const icons = [
      "images/decor/icon-badge.webp",
      "images/decor/icon-arduino.webp",
      "images/decor/icon-token.webp"
    ];

    const layer = document.createElement("div");
    layer.className = "bg-icons";
    layer.setAttribute("aria-hidden", "true");

    const COLS = 5;
    const ROWS = 4;

    for (let i = 0; i < COLS * ROWS; i += 1) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);

      /* 网格 + 抖动：既有分布感，又不会挤成一团 */
      const left = col * 19.5 + 3 + ((i * 7) % 7);
      const top = row * 22.5 + 3 + ((i * 11) % 7);

      const icon = document.createElement("span");
      icon.className = "bg-icon";
      icon.style.backgroundImage = `url("${icons[i % icons.length]}")`;
      icon.style.left = `${Math.min(left, 92)}%`;
      icon.style.top = `${Math.min(top, 90)}%`;
      icon.style.setProperty("--s", `${26 + (i % 4) * 11}px`);
      icon.style.setProperty("--dur", `${14 + (i % 5) * 3.2}s`);
      icon.style.setProperty("--delay", `${-(i % 9) * 2.6}s`);
      icon.style.setProperty("--dx", `${((i % 7) - 3) * 9}px`);
      icon.style.setProperty("--rot", `${((i % 5) - 2) * 9}deg`);
      icon.style.setProperty("--o", `${0.15 + (i % 3) * 0.03}`);
      layer.appendChild(icon);
    }

    document.body.appendChild(layer);
  }

  /* =======================================================
     六、彩蛋一：连点 Logo
     ======================================================= */
  function initBrandEgg() {
    const brand = document.querySelector(".brand");
    if (!brand) return;

    const lines = [
      "你已经点了 5 下。这里没有隐藏功能，只有一群写代码的人。",
      "提示：QQ 群在页面右上角，长这样 1098931492。",
      "别点了，真的没有第 6 个彩蛋……大概。",
      "社团招新中。会拖拽 LED 也算特长。"
    ];

    let clicks = 0;
    let resetTimer = 0;

    brand.addEventListener("click", () => {
      clicks += 1;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        clicks = 0;
      }, 2600);

      if (clicks < 5) return;

      clicks = 0;
      brand.classList.add("is-poked");
      window.setTimeout(() => brand.classList.remove("is-poked"), 700);

      toast(lines[Math.floor(Math.random() * lines.length)], "green", 4200);
    });
  }

  /* =======================================================
     七、彩蛋二：Konami 密码 → HACKER_MODE
     ======================================================= */
  function initHackerMode() {
    const sequence = [
      "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
      "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
      "b", "a"
    ];

    let progress = 0;
    let scanlines = null;
    let timer = 0;

    function enter() {
      root.dataset.hacker = "true";

      if (!scanlines) {
        scanlines = document.createElement("div");
        scanlines.className = "hnyz-scanlines";
        scanlines.setAttribute("aria-hidden", "true");
        document.body.appendChild(scanlines);
      }
      scanlines.classList.add("is-on");

      toast("HACKER_MODE 已启用 // 9 秒后自动退出", "green", 4200);

      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        root.removeAttribute("data-hacker");
        if (scanlines) scanlines.classList.remove("is-on");
      }, 9000);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === sequence[progress].toLowerCase()) {
        progress += 1;
        if (progress === sequence.length) {
          progress = 0;
          enter();
        }
        return;
      }
      progress = event.key === sequence[0] ? 1 : 0;
    });
  }

  /* =======================================================
     八、控制台签名与访问次数
     ======================================================= */
  function initConsoleSignature() {
    const style = "font-family:monospace;";
    console.log(
      `%c\n  _  _ _  _ __   _____\n | || | \\| |\\ \\ / /__\\\n | __ | .\` | \\ V / /_\\\\\n |_||_|_|\\_|  \\_/\\____/\n%c${style}color:#2563eb;font-weight:700`,
      style,
      "padding:4px 0;font-size:12px;color:#526b89",
      style
    );
    console.log("%c把想法，写成代码。", `${style}color:#0369a1;font-size:12px;`);
    console.log("%c想加入？QQ 群 1098931492，备注「班级 + 姓名」。", `${style}color:#526b89;font-size:12px;`);
    console.log("%c顺便说一句：按 ↑↑↓↓←→←→BA 有惊喜。", `${style}color:#7c3aed;font-size:12px;`);
  }

  function initVisitCounter() {
    const meta = document.querySelector(".footer-meta");
    if (!meta) return;

    let visits = 0;
    try {
      visits = Number(window.localStorage.getItem("hnyz:visits") || "0") + 1;
      window.localStorage.setItem("hnyz:visits", String(visits));
    } catch (error) {
      return;
    }

    if (!Number.isFinite(visits) || visits < 1) return;

    const note = document.createElement("span");
    note.className = "footer-visits";
    note.textContent =
      visits === 1 ? "// 第一次来，欢迎。" : `// 这是你第 ${visits} 次打开这里。`;
    meta.appendChild(note);
  }

  /* =======================================================
     九、启动
     ======================================================= */
  initRotator();
  initReveal();
  initTilt();
  initGlobalGlow();
  initTicker();

  /* 背景图标不着急：等页面空闲下来再撒，首屏更快 */
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(initBgIcons, { timeout: 2000 });
  } else {
    window.setTimeout(initBgIcons, 1200);
  }
  initBrandEgg();
  initHackerMode();
  initConsoleSignature();
  initVisitCounter();
})();
