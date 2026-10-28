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

  /* 内联脚本已经设过一次；这里兜底，防止内联脚本被拦或页面被缓存 */
  apply(root.dataset.theme === "dark" ? "dark" : "light");

  function toggleTheme() {
    /* 过渡没结束之前不响应，避免连点把画面切来切去 */
    if (activeTransition) return;

    const next = root.dataset.theme === "dark" ? "light" : "dark";
    switchTheme(next);
  }

  if (button) {
    button.addEventListener("click", () => {
      toggleTheme();
      button.blur();
    });
  }

  media.addEventListener("change", (event) => {
    if (readStored()) return;
    if (activeTransition) return;
    apply(event.matches ? "dark" : "light");
  });

  window.HNYZ_THEME = { apply, readStored };
})();
