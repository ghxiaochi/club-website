/* =========================================================
   HNYZ · 主题切换
   ---------------------------------------------------------
   1. 首次访问跟随系统偏好（prefers-color-scheme）
   2. 点击按钮手动切换，选择写进 localStorage
   3. 用户没手动选过时，系统切换会实时跟随
   首屏的初始主题由 index.html / projects.html 里的一小段
   内联脚本提前设置，避免刷新时白闪。
   ========================================================= */

(() => {
  "use strict";

  const KEY = "hnyz:theme";
  const root = document.documentElement;
  const button = document.querySelector("[data-theme-toggle]");
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const media = window.matchMedia("(prefers-color-scheme: dark)");

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

  /* 内联脚本已经设过一次；这里兜底，防止内联脚本被拦或页面被缓存 */
  apply(root.dataset.theme === "dark" ? "dark" : "light");

  if (button) {
    button.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      apply(next);
      save(next);
      button.blur();
    });
  }

  media.addEventListener("change", (event) => {
    if (readStored()) return;
    apply(event.matches ? "dark" : "light");
  });

  window.HNYZ_THEME = { apply, readStored };
})();
