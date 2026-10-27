/* =========================================================
   HNYZ · 主题切换
   ---------------------------------------------------------
   1. 首次访问跟随系统偏好（prefers-color-scheme）
   2. 点击按钮手动切换，选择写进 localStorage
   3. 用户没手动选过时，系统切换会实时跟随
   4. 切换时从按钮位置长出一个圆形：用 View Transitions
      让「新界面」做圆形遮罩；浏览器不支持就直接换色，
      只留按钮上的扩散圆环。
   5. 可以连续点击：新的一次会跳过上一次未播完的转场，
      主题永远以最后一次点击为准。
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

  /* 连点时 DOM 可能还没换完色：
     targetTheme 记最后一次点击的目标，pendingTheme 记还没落地的那个 */
  let pendingTheme = "";
  let targetTheme = root.dataset.theme === "dark" ? "dark" : "light";
  let activeTransition = null;
  let activeBurst = null;

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
    if (pendingTheme === theme) pendingTheme = "";

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
    window.setTimeout(() => button.classList.remove("is-switching"), 700);
  }

  function ringBurst(x, y) {
    if (activeBurst) activeBurst.remove();

    const ring = document.createElement("span");
    ring.className = "theme-burst";
    ring.setAttribute("aria-hidden", "true");
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    document.body.appendChild(ring);
    activeBurst = ring;

    window.setTimeout(() => {
      if (activeBurst === ring) activeBurst = null;
      ring.remove();
    }, 760);
  }

  /* 转场期间暂停最费性能的几层：头部毛玻璃、漂浮图标、跑马灯、
     鼠标光晕。转场结束后自动恢复。 */
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

    spinIcon();
    ringBurst(origin.x, origin.y);

    if (typeof document.startViewTransition !== "function") {
      apply(next);
      save(next);
      return;
    }

    /* 上一次还没播完就直接跳过，让它给新的这次让路 */
    if (activeTransition) {
      const old = activeTransition;
      activeTransition = null;
      try {
        old.skipTransition();
      } catch (error) {
        /* 已经结束了，忽略 */
      }
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
        /* 被新的点击跳过时会 reject，属正常情况 */
      });

    transition.finished
      .catch(() => {})
      .finally(() => {
        if (activeTransition === transition) {
          activeTransition = null;
          endSwap();
        }

        /* 最后一次点击如果因为转场被跳过而没落地，这里补上 */
        if (pendingTheme && root.dataset.theme !== pendingTheme) {
          apply(pendingTheme);
          save(pendingTheme);
        }
      });
  }

  /* 内联脚本已经设过一次；这里兜底，防止内联脚本被拦或页面被缓存 */
  apply(root.dataset.theme === "dark" ? "dark" : "light");

  function toggleTheme() {
    /* 以 targetTheme 为准，不依赖 DOM 此刻是否已经换色：
       连续点击时每一次点击都算一次翻转 */
    targetTheme = targetTheme === "dark" ? "light" : "dark";
    pendingTheme = targetTheme;
    switchTheme(targetTheme);
  }

  if (button) {
    button.addEventListener("click", () => {
      toggleTheme();
      button.blur();
    });

    /* 转场进行中，整页顶层的快照会挡住按钮的点击（事件 target 变成
       HTML）。这里接住发生在按钮范围内的点击，让用户可以连续切换，
       而不是等动画播完。 */
    document.addEventListener(
      "click",
      (event) => {
        if (!activeTransition) return;

        const rect = button.getBoundingClientRect();
        const inside =
          event.clientX >= rect.left - 6 &&
          event.clientX <= rect.right + 6 &&
          event.clientY >= rect.top - 6 &&
          event.clientY <= rect.bottom + 6;

        if (!inside) return;

        event.preventDefault();
        event.stopPropagation();
        toggleTheme();
      },
      true
    );
  }

  media.addEventListener("change", (event) => {
    if (readStored()) return;
    const theme = event.matches ? "dark" : "light";
    targetTheme = theme;
    pendingTheme = "";
    apply(theme);
  });

  window.HNYZ_THEME = { apply, readStored };
})();
