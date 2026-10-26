/* =========================================================
   ghxiaochi 的像素头像桌宠
   ---------------------------------------------------------
   点击轮播台词；连点 12 次出现隐藏彩蛋，彩蛋出现后计数清零，
   想再看一次要再点 12 下。
   每次点击会蹦出几颗小星星，并做一个挤压回弹。
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
  const secretAgain = "还来？行吧，反正你也没别的事做。";

  const SECRET_AT = 12;
  const SPARKS = ["✦", "✧", "♥", "●", "✳"];
  const SECRET_COLORS = ["#2563eb", "#38bdf8", "#7c3aed", "#f59e0b", "#22c55e"];

  let clicks = 0;
  let speechTimer = 0;
  let secretSeen = false;

  /* 点一下蹦几颗小星星，向上飘散 */
  function spawnSparks(secretMode) {
    const count = secretMode ? 12 : 5;

    for (let i = 0; i < count; i += 1) {
      const spark = document.createElement("span");
      spark.className = "hnyz-avatar__spark";
      spark.setAttribute("aria-hidden", "true");
      spark.textContent = SPARKS[Math.floor(Math.random() * SPARKS.length)];

      const spread = secretMode ? 130 : 90;
      spark.style.setProperty("--px", `${(Math.random() - 0.5) * spread}px`);
      spark.style.setProperty("--py", `${-50 - Math.random() * (secretMode ? 110 : 60)}px`);
      spark.style.setProperty("--delay", `${Math.random() * 120}ms`);
      spark.style.setProperty("--size", `${9 + Math.random() * 8}px`);
      if (secretMode) {
        spark.style.color = SECRET_COLORS[i % SECRET_COLORS.length];
      }

      pet.appendChild(spark);
      window.setTimeout(() => spark.remove(), 1200);
    }
  }

  function speak() {
    clicks += 1;
    const isSecret = clicks >= SECRET_AT;

    speech.textContent = isSecret
      ? (secretSeen ? secretAgain : secret)
      : lines[(clicks - 1) % lines.length];

    /* 重新触发动画：先移除再加回，避免连续点击时动画不重播 */
    pet.classList.remove("is-poked");
    void pet.offsetWidth;
    pet.classList.add("is-speaking", "is-poked");
    pet.classList.toggle("is-secret", isSecret);

    spawnSparks(isSecret);

    if (isSecret) {
      /* 彩蛋出现后计数清零：想再看一次，得重新点满 12 下 */
      clicks = 0;
      secretSeen = true;
    }

    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(
      () => {
        pet.classList.remove("is-speaking", "is-poked", "is-secret");
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
