/* =========================================================
   ghxiaochi 的像素头像桌宠
   ---------------------------------------------------------
   点击轮播台词；第 6 次点击出现隐藏彩蛋。
   可以按住拖动，位置记在 localStorage，下次打开还在原处。
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

  /* ---------------- 拖动 ---------------- */
  const drag = { active: false, moved: false, startX: 0, startY: 0, baseX: 0, baseY: 0 };

  function restorePosition() {
    try {
      const raw = window.localStorage.getItem("hnyz:pet-pos");
      if (!raw) return;
      const pos = JSON.parse(raw);
      if (typeof pos.x !== "number" || typeof pos.y !== "number") return;
      pet.style.bottom = "auto";
      pet.style.left = `${Math.max(4, Math.min(pos.x, window.innerWidth - pet.offsetWidth - 4))}px`;
      pet.style.top = `${Math.max(4, Math.min(pos.y, window.innerHeight - pet.offsetHeight - 4))}px`;
    } catch (error) {
      /* 忽略 */
    }
  }

  trigger.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const rect = pet.getBoundingClientRect();
    drag.active = true;
    drag.moved = false;
    drag.startX = event.clientX;
    drag.startY = event.clientY;
    drag.baseX = rect.left;
    drag.baseY = rect.top;

    pet.style.bottom = "auto";
    pet.style.left = `${rect.left}px`;
    pet.style.top = `${rect.top}px`;

  });

  window.addEventListener("pointermove", (event) => {
    if (!drag.active) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;

    const maxX = window.innerWidth - pet.offsetWidth - 4;
    const maxY = window.innerHeight - pet.offsetHeight - 4;
    pet.style.left = `${Math.min(Math.max(4, drag.baseX + dx), Math.max(4, maxX))}px`;
    pet.style.top = `${Math.min(Math.max(4, drag.baseY + dy), Math.max(4, maxY))}px`;
  });

  window.addEventListener("pointerup", (event) => {
    if (!drag.active) return;
    drag.active = false;

    if (!drag.moved) return;

    try {
      window.localStorage.setItem(
        "hnyz:pet-pos",
        JSON.stringify({ x: parseFloat(pet.style.left), y: parseFloat(pet.style.top) })
      );
    } catch (error) {
      /* 忽略 */
    }
  });

  trigger.addEventListener("click", (event) => {
    /* 拖动结束时浏览器也会派发 click，这里吞掉，避免拖一下就说句话 */
    if (drag.moved) {
      drag.moved = false;
      event.preventDefault();
      return;
    }
    speak();
  });

  restorePosition();

  /* 不再因为个人横幅而隐藏：桌宠可以拖走，遮挡交给用户自己决定 */

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    window.clearTimeout(speechTimer);
    pet.classList.remove("is-speaking", "is-poked");
  });
})();
