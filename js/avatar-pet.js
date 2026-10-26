/* =========================================================
   ghxiaochi 的像素头像桌宠（东方马也）
   ---------------------------------------------------------
   - 「全部项目」页 / 个人主页：常驻左下角，可拖动
   - 首页：默认不在，点右侧「召唤东方马也」按钮才出现，
     待 26 秒（或再点一次按钮）后自己回项目区
   - 点击会数次数：每 3 下报一次「你已经点了我 N 次」，
     超过 30 下就变成「你又点了我，这是第 N 次」
   - 第 100 下：整个人突然变大，然后在屏幕里像弹珠一样
     四边乱弹，中间浮出「谁让你一直点我的。」，之后字幕
     放大爆炸，计数清零，原地立一块墓碑，点墓碑复活
   ========================================================= */

(() => {
  "use strict";

  const pet = document.querySelector("[data-hnyz-avatar]");
  if (!pet) return;

  const trigger = pet.querySelector("[data-hnyz-avatar-trigger]");
  const speech = pet.querySelector("[data-hnyz-avatar-speech]");
  const avatarImg = pet.querySelector(".hnyz-avatar__img");
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

  const mode = pet.getAttribute("data-avatar-mode") || "fixed";
  const summonBtn = document.querySelector("[data-pet-summon]");

  const RAMPAGE_AT = 100;
  const SPARKS = ["✦", "✧", "♥", "●", "✳"];
  const SECRET_COLORS = ["#2563eb", "#38bdf8", "#7c3aed", "#f59e0b", "#22c55e"];

  let clicks = 0;
  let speechTimer = 0;
  let rapid = 0;
  let rapidTimer = 0;

  const state = { rampage: false, dead: false, scale: 1 };

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

  /* 数着点击次数说话 */
  function messageFor(n) {
    if (n === 1) return "干嘛？";
    if (n === RAMPAGE_AT - 1) return "别点了，真的。";
    if (n === RAMPAGE_AT - 2) return "你再点一下试试。";
    if (n > 30) {
      const tail = ["你又点了我。", "又是你。", "手不酸吗。"][n % 3];
      return `${tail}这是第 ${n} 次了。`;
    }
    if (n % 3 === 0) return `你已经点了我 ${n} 次了。`;
    return lines[n % lines.length];
  }

  function speak() {
    clicks += 1;

    if (clicks >= RAMPAGE_AT) {
      startRampage();
      return;
    }

    showLine(messageFor(clicks), 3000);
    spawnSparks(clicks % 10 === 0);
    noteActivity(false);
  }

  /* 点太快的检测 + 通知召唤计时器 */
  function noteActivity(isSecret) {
    rapid += 1;
    window.clearTimeout(rapidTimer);
    rapidTimer = window.setTimeout(() => {
      rapid = 0;
    }, 2600);

    if (rapid >= 6 && !isSecret && !state.rampage) {
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
    if (state.rampage || state.dead) return;
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
    if (state.rampage || state.dead) return;
    speak();
  });

  if (mode !== "summon") restorePosition();

  /* =======================================================
     100 次：暴走 → 弹球 → 字幕爆炸 → 墓碑 → 复活
     ======================================================= */
  const overlay = document.createElement("div");
  overlay.className = "pet-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);

  const lineEl = document.createElement("p");
  lineEl.className = "pet-rampage-line";
  lineEl.setAttribute("role", "status");
  lineEl.setAttribute("aria-live", "polite");
  document.body.appendChild(lineEl);

  const veil = document.createElement("div");
  veil.className = "pet-tomb-veil";
  veil.setAttribute("aria-hidden", "true");
  document.body.appendChild(veil);

  const tomb = document.createElement("div");
  tomb.className = "pet-tomb";
  tomb.hidden = true;
  tomb.innerHTML =
    '<button class="pet-tomb__btn" type="button" data-pet-revive aria-label="点击墓碑，复活东方马也">' +
    '<span class="pet-tomb__stone">' +
    '<span class="pet-tomb__mark">R.I.P.</span>' +
    '<span class="pet-tomb__name">东方马也</span>' +
    '<span class="pet-tomb__date">2026 — 2026</span>' +
    '<span class="pet-tomb__word">把 bug 带进了坟墓</span>' +
    "</span>" +
    '<span class="pet-tomb__hint">点一下墓碑</span>' +
    "</button>";
  document.body.appendChild(tomb);

  const reviveBtn = tomb.querySelector("[data-pet-revive]");

  let frame = 0;
  let savedStyle = null;

  function startRampage() {
    if (state.rampage || state.dead) return;

    state.rampage = true;
    clicks = 0;

    window.clearTimeout(speechTimer);
    window.clearTimeout(rapidTimer);
    pet.classList.remove("is-speaking", "is-poked", "is-secret", "is-dizzy", "is-waving");
    speech.textContent = "";

    /* 记录原始定位，复活时还原 */
    savedStyle = {
      left: pet.style.left,
      top: pet.style.top,
      bottom: pet.style.bottom,
      right: pet.style.right
    };

    const rect = pet.getBoundingClientRect();
    pet.style.left = "0px";
    pet.style.top = "0px";
    pet.style.bottom = "auto";
    pet.style.right = "auto";
    pet.classList.add("is-rampage", "is-pinball");

    lineEl.textContent = "谁让你一直点我的。";
    lineEl.classList.add("is-visible");

    /* 先变大，再开始弹 */
    const growStart = performance.now();
    const growFrom = 1;
    const growTo = 2.5;

    function grow(now) {
      const t = Math.min(1, (now - growStart) / 520);
      state.scale = growFrom + (growTo - growFrom) * (1 - Math.pow(1 - t, 3));
      pet.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(${state.scale})`;
      if (t < 1) {
        frame = window.requestAnimationFrame(grow);
      } else {
        startPinball(rect.left, rect.top);
      }
    }

    frame = window.requestAnimationFrame(grow);
  }

  function startPinball(startX, startY) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const w = pet.offsetWidth * state.scale;
    const h = pet.offsetHeight * state.scale;

    let x = Math.min(Math.max(0, startX), Math.max(0, window.innerWidth - w));
    let y = Math.min(Math.max(0, startY), Math.max(0, window.innerHeight - h));

    /* 速度：每秒上千像素，像弹珠一样四边乱弹 */
    let vx = (Math.random() > 0.5 ? 1 : -1) * (1080 + Math.random() * 360);
    let vy = (Math.random() > 0.5 ? 1 : -1) * (900 + Math.random() * 320);

    let last = performance.now();
    let elapsed = 0;
    let angle = 0;
    let squash = 0;

    const DURATION = reduce ? 2600 : 6800;

    function step(now) {
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      elapsed += dt * 1000;

      x += vx * dt;
      y += vy * dt;

      let bounced = false;

      if (x <= 0) {
        x = 0;
        vx = Math.abs(vx);
        bounced = true;
      } else if (x + w >= window.innerWidth) {
        x = window.innerWidth - w;
        vx = -Math.abs(vx);
        bounced = true;
      }

      if (y <= 0) {
        y = 0;
        vy = Math.abs(vy);
        bounced = true;
      } else if (y + h >= window.innerHeight) {
        y = window.innerHeight - h;
        vy = -Math.abs(vy);
        bounced = true;
      }

      if (bounced) {
        squash = 1;
        /* 每弹一次换一点角度，轨迹更乱 */
        vx *= 1 + (Math.random() - 0.5) * 0.04;
        vy *= 1 + (Math.random() - 0.5) * 0.04;
      }

      squash = Math.max(0, squash - dt * 6);
      angle += (vx / 40) * dt * 20;

      pet.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${state.scale})`;

      if (avatarImg) {
        const sx = 1 + squash * 0.12;
        const sy = 1 - squash * 0.12;
        avatarImg.style.transform = `rotate(${Math.sin(elapsed / 260) * 12}deg) scale(${sx}, ${sy})`;
      }

      if (elapsed < DURATION) {
        frame = window.requestAnimationFrame(step);
      } else {
        explode();
      }
    }

    frame = window.requestAnimationFrame(step);
  }

  function explode() {
    window.cancelAnimationFrame(frame);

    /* 字幕放大爆炸 */
    lineEl.classList.add("is-boom");

    /* 屏幕闪一下 + 冲击波 + 碎片 */
    const flash = document.createElement("div");
    flash.className = "pet-flash";
    document.body.appendChild(flash);
    window.setTimeout(() => flash.remove(), 520);

    const ring = document.createElement("span");
    ring.className = "pet-shock";
    overlay.appendChild(ring);
    window.setTimeout(() => ring.remove(), 900);

    const rect = pet.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < 26; i += 1) {
      const shard = document.createElement("span");
      shard.className = "pet-shard";
      shard.setAttribute("aria-hidden", "true");
      const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.2;
      const dist = 90 + Math.random() * 220;
      shard.style.left = `${cx}px`;
      shard.style.top = `${cy}px`;
      shard.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      shard.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      shard.style.setProperty("--rot", `${Math.random() * 360}deg`);
      shard.style.setProperty("--c", SECRET_COLORS[i % SECRET_COLORS.length]);
      overlay.appendChild(shard);
      window.setTimeout(() => shard.remove(), 1000);
    }

    /* 人先胀一下再消失 */
    pet.classList.add("is-dying");
    if (avatarImg) avatarImg.style.transform = "";

    window.setTimeout(() => {
      pet.classList.remove("is-dying", "is-rampage", "is-pinball");
      pet.classList.add("is-gone");
      pet.style.transform = "";
      lineEl.classList.remove("is-visible", "is-boom");
      lineEl.textContent = "";

      state.rampage = false;
      state.dead = true;
      showTomb();
    }, 720);
  }

  function showTomb() {
    tomb.hidden = false;
    tomb.classList.remove("is-leaving");
    /* 强制重排，让入场动画每次都播 */
    void tomb.offsetWidth;
    tomb.classList.add("is-visible");
    veil.classList.add("is-visible");
    if (reviveBtn) reviveBtn.focus({ preventScroll: true });
  }

  function revive() {
    if (!state.dead) return;

    state.dead = false;
    clicks = 0;

    tomb.classList.remove("is-visible");
    tomb.classList.add("is-leaving");
    veil.classList.remove("is-visible");
    window.setTimeout(() => {
      tomb.hidden = true;
      tomb.classList.remove("is-leaving");
    }, 380);

    /* 还原位置 */
    pet.classList.remove("is-gone");
    pet.style.left = savedStyle ? savedStyle.left : "";
    pet.style.top = savedStyle ? savedStyle.top : "";
    pet.style.bottom = savedStyle ? savedStyle.bottom : "";
    pet.style.right = savedStyle ? savedStyle.right : "";
    pet.style.transform = "";

    pet.classList.add("is-reviving");
    window.setTimeout(() => pet.classList.remove("is-reviving"), 900);

    if (mode === "summon") {
      pet.classList.add("is-visible");
      summoned = true;
      if (summonBtn) {
        summonBtn.classList.add("is-active");
        summonBtn.setAttribute("aria-pressed", "true");
      }
      scheduleStay();
    }

    window.setTimeout(() => {
      showLine("……我回来了。别数了。", 3600);
    }, 260);
  }

  if (reviveBtn) reviveBtn.addEventListener("click", revive);

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
      if (!summoned || state.rampage || state.dead) return;
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
    if (state.dead) return;

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
    /* 正在暴走或已经躺下时先不走，等这边结束 */
    if (state.rampage || state.dead) {
      scheduleStay();
      return;
    }

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

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    window.clearTimeout(speechTimer);
    pet.classList.remove("is-speaking", "is-poked", "is-secret");
  });
})();
