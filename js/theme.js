/* =========================================================
   HNYZ · 主题切换
   ---------------------------------------------------------
   1. 首次访问跟随系统偏好（prefers-color-scheme）
   2. 点击按钮手动切换，选择写进 localStorage
   3. 用户没手动选过时，系统切换会实时跟随
   首屏的初始主题由 index.html / projects.html 里的一小段
   内联脚本提前设置，避免刷新时白闪。
   4. 切换时从按钮位置长出一个圆形：优先用 View Transitions
      （新旧两套界面真正做圆形遮罩），不支持就退化成色块圆 wipe。
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
    window.setTimeout(() => button.classList.remove("is-switching"), 720);
  }

  function ringBurst(x, y) {
    const ring = document.createElement("span");
    ring.className = "theme-burst";
    ring.setAttribute("aria-hidden", "true");
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    document.body.appendChild(ring);
    window.setTimeout(() => ring.remove(), 780);
  }

  /* 不支持 View Transitions 时的退路：一块目标底色的圆从按钮长开，
     盖满后换主题，再淡出 */
  function fallbackWipe(next, origin) {
    const wipe = document.createElement("div");
    wipe.className = "theme-wipe";
    wipe.setAttribute("aria-hidden", "true");
    wipe.style.setProperty("--wipe-x", `${origin.x}px`);
    wipe.style.setProperty("--wipe-y", `${origin.y}px`);
    wipe.style.setProperty("--wipe-r", `${origin.r}px`);
    wipe.style.setProperty("--wipe-color", THEME_COLORS[next]);
    document.body.appendChild(wipe);

    window.requestAnimationFrame(() => wipe.classList.add("is-on"));

    window.setTimeout(() => {
      apply(next);
      save(next);
    }, 560);

    window.setTimeout(() => wipe.classList.add("is-fade"), 640);
    window.setTimeout(() => wipe.remove(), 1080);
  }

  let switching = false;

  function switchTheme(next) {
    if (switching) return;
    switching = true;
    window.setTimeout(() => {
      switching = false;
    }, 760);

    if (reduceMotion.matches) {
      apply(next);
      save(next);
      return;
    }

    const origin = originFrom(button);

    spinIcon();
    ringBurst(origin.x, origin.y);

    if (typeof document.startViewTransition === "function") {
      root.style.setProperty("--theme-x", `${origin.x}px`);
      root.style.setProperty("--theme-y", `${origin.y}px`);
      root.style.setProperty("--theme-r", `${origin.r}px`);

      const transition = document.startViewTransition(() => {
        apply(next);
        save(next);
      });

      transition.ready
        .then(() => {
          root.animate(
            {
              clipPath: [
                `circle(0px at ${origin.x}px ${origin.y}px)`,
                `circle(${origin.r}px at ${origin.x}px ${origin.y}px)`
              ]
            },
            {
              duration: 680,
              easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)"
            }
          );
        })
        .catch(() => {
          /* 某些浏览器 ready 会拒绝，忽略即可 */
        });

      transition.finished.finally(() => {
        root.style.removeProperty("--theme-x");
        root.style.removeProperty("--theme-y");
        root.style.removeProperty("--theme-r");
      });

      return;
    }

    fallbackWipe(next, origin);
  }

  /* 内联脚本已经设过一次；这里兜底，防止内联脚本被拦或页面被缓存 */
  apply(root.dataset.theme === "dark" ? "dark" : "light");

  if (button) {
    button.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      switchTheme(next);
      button.blur();
    });
  }

  media.addEventListener("change", (event) => {
    if (readStored()) return;
    apply(event.matches ? "dark" : "light");
  });

  window.HNYZ_THEME = { apply, readStored };
})();
