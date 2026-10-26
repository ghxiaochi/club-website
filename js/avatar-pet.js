/* =========================================================
   ghxiaochi 的像素头像桌宠
   ---------------------------------------------------------
   - 「全部项目」页：常驻左下角，可拖动
   - 首页：默认不在，点右侧「召唤东方马也」按钮才出现，
     待 26 秒（或再点一次按钮）后自己回项目区
   点击轮播台词；连点 12 次出彩蛋，之后计数清零要重新点满。
   每次点击蹦小星星；点太快会晕；召唤出来时会挥手。
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
    "再点一下试试？",
    "今天的 LED 亮了吗？",
    "别卷了，去趟操场吧。",
    "串口又乱码了？先检查波特率。",
    "我把 token 藏起来了。",
    "这个项目下周一定做完。"
  ];
  const secret = "我绝对不会偷偷告诉你，这是AI写的网页";
  const secretAgain = "还来？行吧，反正你也没别的事做。";

  const mode = pet.getAttribute("data-avatar-mode") || "fixed";
  const summonBtn = document.querySelector("[data-pet-summon]");

  const SECRET_AT = 12;
  const SPARKS = ["✦", "✧", "♥", "●", "✳"];
  const SECRET_COLORS = ["#2563eb", "#38bdf8", "#7c3aed", "#f59e0b", "#22c55e"];

  let clicks = 0;
  let speechTimer = 0;
  let secretSeen = false;
  let rapid = 0;
  let rapidTimer = 0;

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

  /* 显示一句话：所有台词、彩蛋、系统提示都走这里 */
  function showLine(text, duration = 3200, secretMode = false) {
    speech.textContent = text;

    /* 先移除再加回，连续点击时动画才会重播 */
    pet.classList.remove("is-poked");
    void pet.offsetWidth;
    pet.classList.add("is-speaking", "is-poked");
    pet.classList.toggle("is-secret", secretMode);

    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => {
      pet.classList.remove("is-speaking", "is-poked", "is-secret");
    }, duration);
  }

  function speak() {
    clicks += 1;
    const isSecret = clicks >= SECRET_AT;

    showLine(
      isSecret ? (secretSeen ? secretAgain : secret) : lines[(clicks - 1) % lines.length],
      isSecret ? 6000 : 3200,
      isSecret
    );

    spawnSparks(isSecret);

    if (isSecret) {
      /* 彩蛋出现后计数清零：想再看一次，得重新点满 12 下 */
      clicks = 0;
      secretSeen = true;
    }

    noteActivity(isSecret);
  }

  /* 点太快的检测 + 通知召唤计时器 */
  function noteActivity(isSecret) {
    rapid += 1;
    window.clearTimeout(rapidTimer);
    rapidTimer = window.setTimeout(() => {
      rapid = 0;
    }, 2600);

    if (rapid >= 6 && !isSecret) {
      rapid = 0;
      pet.classList.add("is-dizzy");
      window.setTimeout(() => pet.classList.remove("is-dizzy"), 1600);
      showLine("别点了……头有点晕。", 2600);
    }

    if (mode === "summon") scheduleStay();
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

  if (mode !== "summon") restorePosition();

  /* =======================================================
     召唤模式：按钮叫出来，待一会儿自己回项目区
     ======================================================= */
  const STAY_MS = 26000;
  let stayTimer = 0;
  let idleTimer = 0;
  let summoned = false;

  function scheduleIdle() {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (!summoned) return;
      if (!pet.classList.contains("is-speaking")) {
        showLine(lines[Math.floor(Math.random() * lines.length)], 2800);
      }
      scheduleIdle();
    }, 8000 + Math.random() * 5000);
  }

  function scheduleStay() {
    if (!summoned) return;
    window.clearTimeout(stayTimer);
    stayTimer = window.setTimeout(leaveHome, STAY_MS);
    scheduleIdle();
  }

  function summonHome() {
    if (summoned) {
      scheduleStay();
      return;
    }

    summoned = true;
    pet.classList.remove("is-leaving");
    pet.classList.add("is-visible", "is-waving");
    if (summonBtn) {
      summonBtn.classList.add("is-active");
      summonBtn.setAttribute("aria-pressed", "true");
    }
    window.setTimeout(() => pet.classList.remove("is-waving"), 800);
    showLine("叫我？我这不是来了。", 3000);
    scheduleStay();
  }

  function leaveHome() {
    if (!summoned) return;

    summoned = false;
    window.clearTimeout(stayTimer);
    window.clearTimeout(idleTimer);

    showLine("我先回项目区了。", 1400);
    pet.classList.add("is-leaving");

    window.setTimeout(() => {
      pet.classList.remove("is-visible", "is-leaving", "is-speaking", "is-poked", "is-secret");
      if (summonBtn) {
        summonBtn.classList.remove("is-active");
        summonBtn.setAttribute("aria-pressed", "false");
      }
    }, 600);
  }

  if (mode === "summon" && summonBtn) {
    summonBtn.addEventListener("click", () => {
      if (summoned) leaveHome();
      else summonHome();
    });
  }

  /* 不再因为个人横幅而隐藏：桌宠可以拖走，遮挡交给用户自己决定 */

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    window.clearTimeout(speechTimer);
    pet.classList.remove("is-speaking", "is-poked", "is-secret");
  });
})();
