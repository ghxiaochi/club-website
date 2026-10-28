/* =========================================================
   HNYZ · 主题切换
   ---------------------------------------------------------
   1. 首次访问跟随系统偏好（prefers-color-scheme）
   2. 点击按钮手动切换，选择写进 localStorage
   3. 用户没手动选过时，系统切换会实时跟随
   4. 切换时从按钮位置长出一个圆形：用 View Transitions
      让「新界面」做圆形遮罩；浏览器不支持就直接换色，
      只留按钮上的扩散圆环。
   5. 一次只切换一次：过渡没播完之前，再点不响应。
   ========================================================= */

(() => {
  "use strict";

  const KEY = "hnyz:theme";
  const root = document.documentElement;
  const button = document.querySelector("[data-theme-toggle]");
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const THEME_COLORS = { light: "#f5f9ff", dark: "#060d1c" };

  let activeTransition = null;

  function readStored() {
    try {
      const value = window.localStorage.getItem(KEY);
      return value === "light" || value === "dark" ? value : "";
    } catch (error) {
      return "";
    }
  }

  function save(theme) {
    try {
      window.localStorage.setItem(KEY, theme);
    } catch (error) {
      /* 隐私模式下忽略，本次会话仍然生效 */
    }
  }

  function apply(theme) {
    root.dataset.theme = theme;

    if (metaTheme) {
      metaTheme.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS.light);
    }

    if (button) {
      const next = theme === "dark" ? "浅色" : "深色";
      button.setAttribute("aria-label", `切换到${next}模式`);
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.setAttribute("title", `切换到${next}模式`);
    }
  }

  /* 从按钮中心画一个能盖住整个视口的圆 */
  function originFrom(buttonEl) {
    const rect = buttonEl
      ? buttonEl.getBoundingClientRect()
      : { left: window.innerWidth - 40, top: 24, width: 32, height: 32 };

    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const r = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    return { x, y, r: r + 8 };
  }

  function spinIcon() {
    if (!button) return;
    button.classList.remove("is-switching");
    void button.offsetWidth;
    button.classList.add("is-switching");
    window.setTimeout(() => button.classList.remove("is-switching"), 420);
  }

  /* 转场期间暂停持续动画和鼠标光晕，圆推得更顺 */
  function beginSwap(duration) {
    root.classList.add("is-theme-swap");
    window.clearTimeout(beginSwap.timer);
    beginSwap.timer = window.setTimeout(endSwap, duration + 480);
  }

  function endSwap() {
    window.clearTimeout(beginSwap.timer);
    root.classList.remove("is-theme-swap");
  }

  function switchTheme(next) {
    if (reduceMotion.matches) {
      apply(next);
      save(next);
      return;
    }

    const origin = originFrom(button);
    /* 圆的半径越大，动画稍微长一点；小屏更快，手感更利落 */
    const duration = Math.max(380, Math.min(640, Math.round(origin.r * 0.52)));

    if (typeof document.startViewTransition !== "function") {
      apply(next);
      save(next);
      spinIcon();
      return;
    }

    beginSwap(duration);

    let transition;
    try {
      transition = document.startViewTransition(() => {
        apply(next);
        save(next);
      });
    } catch (error) {
      apply(next);
      save(next);
      endSwap();
      return;
    }

    activeTransition = transition;

    transition.ready
      .then(() => {
        if (activeTransition !== transition) return;

        root.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${origin.r}px at ${origin.x}px ${origin.y}px)`
            ]
          },
          {
            duration,
            easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
            pseudoElement: "::view-transition-new(root)"
          }
        );
      })
      .catch(() => {
        /* 转场被中断时会 reject，属正常情况 */
      });

    transition.finished
      .catch(() => {})
      .finally(() => {
        if (activeTransition !== transition) return;
        activeTransition = null;
        endSwap();

        /* 兜底：极端情况下回调没落地，也把主题补上 */
        if (root.dataset.theme !== next) apply(next);

        /* 圆推完再放图标弹跳：
           View Transitions 会把动画冻在快照里，放前面就看不到了 */
        spinIcon();
      });
  }

  /* 内联脚本已经设过一次；这里兜底，防止内联脚本被拦或页面被缓存。
     黑客风固定在深夜：就算本地存的是浅色，这里也直接压成 dark。 */
  if (root.dataset.style === "hacker") {
    apply("dark");
  } else {
    apply(root.dataset.theme === "dark" ? "dark" : "light");
  }

  function isHacker() {
    return root.dataset.style === "hacker";
  }

  /* 切风格时同步主题：进黑客风锁深色；离开后恢复用户自己选的那档 */
  document.addEventListener("hnyz:stylechange", (event) => {
    const style = (event.detail && event.detail.style) || root.dataset.style || "default";
    if (activeTransition) return;

    if (style === "hacker") {
      apply("dark");
      return;
    }

    const stored = readStored();
    if (stored && root.dataset.theme !== stored) apply(stored);
  });

  function toggleTheme() {
    /* 过渡没结束之前不响应，避免连点把画面切来切去 */
    if (activeTransition) return;

    const next = root.dataset.theme === "dark" ? "light" : "dark";
    switchTheme(next);
  }

  if (button) {
    button.addEventListener("click", () => {
      /* 黑客风的世界没有白天：按钮不切主题，改弹一个终端来拒绝你 */
      if (isHacker()) {
        openDeniedTerminal();
        button.blur();
        return;
      }

      toggleTheme();
      button.blur();
    });
  }

  media.addEventListener("change", (event) => {
    if (isHacker()) return;
    if (readStored()) return;
    if (activeTransition) return;
    apply(event.matches ? "dark" : "light");
  });

  /* =========================================================
     黑客风 · 拒绝日间的终端
     ---------------------------------------------------------
     在黑客风里点主题按钮，不切主题，改弹一个真终端窗口：
     第一行命令逐字敲出，然后一行一行滚出没人看得懂的报错，
     最后留一句中文，停两秒自动关窗。Esc 或点击也能关。
     ========================================================= */

  const TERM_LINES = [
    { text: "[sudo] password for guest: ********", cls: "dim" },
    { text: "themectl: permission denied: the dark is not a setting", cls: "err" },
    { text: '[  0.003112] themed[1337]: request "sunlight" rejected by /etc/darkness/deny.all', cls: "" },
    { text: "[  0.004270] kernel: ioctl(THEME_SET_LIGHT) failed: Operation not permitted", cls: "err" },
    { text: "[  0.005519] themed[1337]: daylight module not found: sun.ko ... skipping", cls: "" },
    { text: "[  0.006904] audit: uid=1000(guest) msg='who gave you sudo?'", cls: "dim" },
    { text: "[  0.008148] themectl: retry 1/3 ... refused", cls: "" },
    { text: "[  0.009371] themectl: retry 2/3 ... refused", cls: "" },
    { text: "[  0.010502] themectl: retry 3/3 ... connection to the void established", cls: "" },
    { text: "[  0.011833] sec: trace dumped to /dev/null (as it should be)", cls: "dim" },
    { text: "[  0.013066] WARNING: every attempt to leave the dark is logged, forever", cls: "err" },
    { text: '[  0.014215] err: binary "morning" not found in this universe', cls: "" },
    { text: "[  0.015477] fatal: the dark does not negotiate", cls: "err" },
    { text: "exit code 13 — access denied", cls: "dim" }
  ];
  const TERM_CMD = "themectl set-mode light --force";
  const TERM_FINAL = "黑调的低客，拒绝光明";

  function termSleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function openDeniedTerminal() {
    /* 已经开着就不重复弹 */
    if (document.querySelector(".hacker-term-overlay")) return;

    const overlay = document.createElement("div");
    overlay.className = "hacker-term-overlay";
    overlay.innerHTML = `
      <div class="hacker-term" role="alertdialog" aria-label="terminal">
        <div class="hacker-term__bar">
          <span class="hacker-term__dot" style="background:#ff5f56"></span>
          <span class="hacker-term__dot" style="background:#ffbd2e"></span>
          <span class="hacker-term__dot" style="background:#27c93f"></span>
          <span class="hacker-term__title">guest@hnyz-darknet: ~/theme</span>
        </div>
        <div class="hacker-term__body"></div>
      </div>`;
    document.body.appendChild(overlay);

    const body = overlay.querySelector(".hacker-term__body");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      overlay.classList.remove("is-open");
      document.documentElement.style.removeProperty("overflow");
      window.setTimeout(() => overlay.remove(), 320);
      document.removeEventListener("keydown", onKey);
    }

    function onKey(event) {
      if (event.key === "Escape") close();
    }

    overlay.addEventListener("click", close);
    document.addEventListener("keydown", onKey);

    const cursor = document.createElement("span");
    cursor.className = "hacker-term__cursor";
    body.appendChild(cursor);

    function appendLine(text, cls) {
      const line = document.createElement("span");
      line.className = "hacker-term__line" + (cls ? ` hacker-term__line--${cls}` : "");
      line.textContent = text;
      body.insertBefore(line, cursor);
      body.scrollTop = body.scrollHeight;
      return line;
    }

    function typeLine(text, cls, charDelay) {
      const line = document.createElement("span");
      line.className = "hacker-term__line" + (cls ? ` hacker-term__line--${cls}` : "");
      body.insertBefore(line, cursor);
      body.scrollTop = body.scrollHeight;

      return new Promise((resolve) => {
        let i = 0;
        (function step() {
          if (closed) return resolve();
          i += 1;
          line.textContent = text.slice(0, i);
          body.scrollTop = body.scrollHeight;
          if (i >= text.length) return resolve();
          window.setTimeout(step, charDelay);
        })();
      });
    }

    requestAnimationFrame(() => overlay.classList.add("is-open"));
    document.documentElement.style.overflow = "hidden";

    if (reduceMotion) {
      appendLine(`$ ${TERM_CMD}`, "cmd");
      TERM_LINES.forEach((item) => appendLine(item.text, item.cls));
      appendLine(TERM_FINAL, "final");
      window.setTimeout(close, 2600);
      return;
    }

    await termSleep(300);
    await typeLine(`$ ${TERM_CMD}`, "cmd", 26);

    for (const item of TERM_LINES) {
      if (closed) return;
      /* 报错行之间留点不均匀的间隔，像真的在跑东西 */
      await termSleep(item.cls === "err" ? 130 + Math.random() * 110 : 60 + Math.random() * 100);
      appendLine(item.text, item.cls);
    }

    await termSleep(420);
    await typeLine(TERM_FINAL, "final", 72);

    await termSleep(1900);
    close();
  }

  window.HNYZ_THEME = { apply, readStored };
})();
