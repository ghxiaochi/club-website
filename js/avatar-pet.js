/* =========================================================
   ghxiaochi 的像素头像桌宠
   ---------------------------------------------------------
   点击轮播台词；第 6 次点击出现隐藏彩蛋。
   不做拖拽、滚轮缩放、键盘缩放。
   ========================================================= */

(() => {
  "use strict";

  const pet = document.querySelector("[data-hnyz-avatar]");
  if (!pet) return;

  const trigger = pet.querySelector("[data-hnyz-avatar-trigger]");
  const speech = pet.querySelector("[data-hnyz-avatar-speech]");
  if (!trigger || !speech) return;

  const lines = [
    "干嘛？",
    "在写代码，别催。",
    "这个 bug 不是我写的。",
    "点我干嘛，快去写作业。",
    "再点一下试试？"
  ];
  const secret = "我绝对不会偷偷告诉你，这是AI写的网页";

  let clicks = 0;
  let speechTimer = 0;

  function speak() {
    clicks += 1;
    const isSecret = clicks >= 6;

    speech.textContent = isSecret ? secret : lines[(clicks - 1) % lines.length];
    pet.classList.add("is-speaking", "is-poked");
    pet.classList.toggle("is-secret", isSecret);

    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(
      () => {
        pet.classList.remove("is-speaking", "is-poked");
      },
      isSecret ? 6000 : 3200
    );
  }

  trigger.addEventListener("click", speak);

  /* 个人主页横幅出现时暂时收起头像，离开后恢复 */
  function watchProfile() {
    const profile = document.querySelector(".member-profile");
    if (!profile) {
      window.setTimeout(watchProfile, 400);
      return;
    }
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        pet.classList.toggle("is-away", entry.isIntersecting);
      },
      { threshold: 0.12 }
    );
    observer.observe(profile);
  }

  window.setTimeout(watchProfile, 300);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    window.clearTimeout(speechTimer);
    pet.classList.remove("is-speaking", "is-poked");
  });
})();
