/* =========================================================
   HNYZ 站内校徽
   ---------------------------------------------------------
   轻量交互：
   - 入场交给 CSS
   - 校徽随页面滚动旋转，用 rAF 平滑
   - 点击说一句社团台词
   - 不做拖拽、滚轮缩放、键盘缩放
   ========================================================= */
(function () {
  "use strict";

  const pet = document.querySelector("[data-hnyz-pet]");
  if (!pet) return;

  const trigger = pet.querySelector("[data-hnyz-pet-trigger]");
  const badgeWrap = pet.querySelector("[data-hnyz-pet-badge]");
  const speech = pet.querySelector("[data-hnyz-pet-speech]");
  if (!trigger || !badgeWrap || !speech) return;

  const lines = [
    "今天也来点一颗 LED？",
    "先跑通，再优化。",
    "有 bug？贴群里看看。",
    "每周两次，每次一小时。",
    "把想法，烧进开发板。"
  ];

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lineIndex = 0;
  let speechTimer = 0;
  let frame = 0;
  let currentSpin = 0;
  let targetSpin = 0;

  function applySpin(value) {
    pet.style.setProperty("--hnyz-pet-spin", value.toFixed(2) + "deg");
  }

  function tick() {
    currentSpin += (targetSpin - currentSpin) * 0.18;

    if (Math.abs(targetSpin - currentSpin) < 0.08) {
      currentSpin = targetSpin;
      applySpin(currentSpin);
      frame = 0;
      return;
    }

    applySpin(currentSpin);
    frame = window.requestAnimationFrame(tick);
  }

  function updateSpinTarget() {
    targetSpin = motionQuery.matches ? 0 : window.scrollY * 0.24;

    if (
      motionQuery.matches &&
      currentSpin === 0 &&
      frame === 0
    ) {
      applySpin(0);
      return;
    }

    if (!frame) frame = window.requestAnimationFrame(tick);
  }

  function speak() {
    speech.textContent = lines[lineIndex % lines.length];
    lineIndex += 1;

    pet.classList.remove("is-poked");
    // 强制重排，让连点也能重新播放弹跳
    void pet.offsetWidth;
    pet.classList.add("is-poked", "is-speaking");

    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(function () {
      pet.classList.remove("is-speaking", "is-poked");
    }, 3200);
  }

  trigger.addEventListener("click", speak);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      window.clearTimeout(speechTimer);
      pet.classList.remove("is-speaking", "is-poked");
    }
  });

  window.addEventListener("scroll", updateSpinTarget, { passive: true });
  window.addEventListener("resize", updateSpinTarget);
  motionQuery.addEventListener?.("change", updateSpinTarget);

  currentSpin = motionQuery.matches ? 0 : window.scrollY * 0.24;
  targetSpin = currentSpin;
  applySpin(currentSpin);
})();
