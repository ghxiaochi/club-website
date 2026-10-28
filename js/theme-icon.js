/* =========================================================
   HNYZ · 主题按钮的月亮 / 太阳变形动画
   ---------------------------------------------------------
   图标来自一张 60 帧的雪碧图（月亮 → 收缩 → 太阳 → 收缩）。
   静止时停在当前主题对应的那一帧；切换主题时沿雪碧图走一段，
   把「变形」本身播出来，而不是硬切两张图。
   ========================================================= */

(() => {
  "use strict";

  const el = document.querySelector(".theme-toggle__flip");
  if (!el) return;

  const TOTAL = 60;      /* 雪碧图总帧数 */
  const MOON = 0;        /* 第 0 帧：月亮 */
  const SUN = 40;        /* 第 40 帧：太阳 */
  const SIZE = 18;       /* 页面上的图标尺寸，与 CSS 的 background-size 对应 */
  const STEP_MS = 9;     /* 每帧停留时间；走 40 帧约 0.36 秒，利落但不生硬 */

  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  let frame = 0;
  let raf = 0;

  function setFrame(index) {
    frame = ((index % TOTAL) + TOTAL) % TOTAL;
    el.style.backgroundPosition = `${-frame * SIZE}px 0`;
  }

  function animateTo(target) {
    window.cancelAnimationFrame(raf);

    /* 走最短的那一头：月亮 → 太阳顺着走，太阳 → 月亮倒着退 */
    const forward = (target - frame + TOTAL) % TOTAL;
    const dir = forward <= TOTAL / 2 ? 1 : -1;
    const steps = dir === 1 ? forward : TOTAL - forward;

    if (!steps) {
      setFrame(target);
      return;
    }

    if (reduce.matches) {
      setFrame(target);
      return;
    }

    const from = frame;
    const started = performance.now();
    const total = steps * STEP_MS;

    /* 帧号按 ease-out 走：开头快、最后几帧慢下来，
       收尾落在太阳/月亮上时不会「啪」地停住 */
    const tick = (now) => {
      const p = Math.min(1, (now - started) / total);
      const eased = 1 - Math.pow(1 - p, 2.4);
      setFrame(from + dir * Math.round(steps * eased));
      if (p < 1) raf = window.requestAnimationFrame(tick);
      else setFrame(target);
    };

    raf = window.requestAnimationFrame(tick);
  }

  const targetFrame = (theme) => (theme === "dark" ? MOON : SUN);

  function sync(animate) {
    const target = targetFrame(root.dataset.theme);
    if (animate) animateTo(target);
    else setFrame(target);
  }

  sync(false);

  /* 主题变更可能来自按钮、系统偏好或风格切换脚本，统一监听属性 */
  new MutationObserver(() => sync(true)).observe(root, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });

  window.HNYZ_THEME_ICON = {
    sync,
    to: (theme) => animateTo(targetFrame(theme))
  };
})();
