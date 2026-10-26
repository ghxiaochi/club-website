/* =========================================================
   HNYZ · 项目区：角色舞台
   ---------------------------------------------------------
   小人素材取自 Anuken 的音游 Animdustry（gacha 界面），
   已去底。这里复刻游戏里的表现：
   - 待机微微上下浮动
   - 悬停抬起 + 名字牌
   - 点击弹跳 + 星星 + 台词
   - 灰色剪影是没抽到的，点了会抖
   - ROLL 按钮让所有人依次跳一下
   ========================================================= */

(() => {
  "use strict";

  const stage = document.querySelector("[data-char-stage]");
  if (!stage) return;

  const bubbleHost = document.querySelector("[data-char-bubble]");
  const rollBtn = document.querySelector("[data-char-roll]");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const characters = [
    {
      src: "images/characters/char-1.webp",
      name: "小橘",
      lines: ["这把一定出金。", "BPM 200 也不怕。", "再练一遍就睡。"]
    },
    {
      src: "images/characters/char-2.webp",
      name: "薄荷",
      lines: ["这段谱我熟。", "手速是练出来的。", "别踩我的判定线。"]
    },
    {
      src: "images/characters/char-3.webp",
      name: "虎斑",
      lines: ["耳朵会跟着节拍动。", "听前奏就知道是哪首。", "Perfect 才是及格线。"]
    },
    {
      src: "images/characters/char-4.webp",
      name: "橙子",
      lines: ["你抽了几次了？", "这只我攒了好久。", "再来一把？"]
    },
    { locked: true, name: "？？？" },
    { locked: true, name: "？？？" },
    { locked: true, name: "？？？" },
    { locked: true, name: "？？？" }
  ];

  const LOCK_LINES = ["还没抽到……", "这个位置空着。", "等下次活动吧。"];

  /* =======================================================
     一、渲染站位
     ======================================================= */
  const slots = [];

  characters.forEach((char, index) => {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = `char-slot${char.locked ? " is-locked" : ""}`;
    slot.style.setProperty("--delay", `${(index % 5) * 0.45}s`);
    slot.setAttribute("aria-label", char.locked ? "未解锁角色" : `${char.name}，点击互动`);

    const img = document.createElement("img");
    img.src = char.locked ? `images/characters/lock-${(index % 4) + 1}.webp` : char.src;
    img.alt = char.locked ? "" : char.name;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 160;
    img.height = 260;

    const name = document.createElement("span");
    name.className = "char-slot__name";
    name.textContent = char.name;

    slot.append(img, name);
    slot.addEventListener("click", () => poke(slot, char));
    stage.appendChild(slot);
    slots.push(slot);
  });

  /* =======================================================
     二、互动
     ======================================================= */
  let bubbleTimer = 0;

  function say(text, target) {
    if (!bubbleHost) return;

    bubbleHost.textContent = text;
    bubbleHost.classList.add("is-visible");

    if (target) {
      const stageRect = stage.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const x = rect.left - stageRect.left + rect.width / 2;
      bubbleHost.style.setProperty("--bx", `${x}px`);
    }

    window.clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => {
      bubbleHost.classList.remove("is-visible");
    }, 2200);
  }

  function sparks(slot, count) {
    if (reduce) return;

    for (let i = 0; i < count; i += 1) {
      const star = document.createElement("span");
      star.className = "char-spark";
      star.setAttribute("aria-hidden", "true");
      star.textContent = Math.random() > 0.5 ? "✦" : "✧";
      star.style.setProperty("--sx", `${(Math.random() - 0.5) * 70}px`);
      star.style.setProperty("--sy", `${-40 - Math.random() * 55}px`);
      star.style.setProperty("--sd", `${Math.random() * 120}ms`);
      slot.appendChild(star);
      window.setTimeout(() => star.remove(), 1000);
    }
  }

  function poke(slot, char) {
    if (char.locked) {
      slot.classList.remove("is-shaking");
      void slot.offsetWidth;
      slot.classList.add("is-shaking");
      say(LOCK_LINES[Math.floor(Math.random() * LOCK_LINES.length)], slot);
      return;
    }

    slot.classList.remove("is-jumping");
    void slot.offsetWidth;
    slot.classList.add("is-jumping");
    sparks(slot, 5);
    say(char.lines[Math.floor(Math.random() * char.lines.length)], slot);
  }

  /* ROLL：依次弹一下 */
  if (rollBtn) {
    rollBtn.addEventListener("click", () => {
      slots.forEach((slot, index) => {
        window.setTimeout(() => {
          slot.classList.remove("is-jumping");
          void slot.offsetWidth;
          slot.classList.add("is-jumping");
          if (!slot.classList.contains("is-locked")) sparks(slot, 3);
        }, index * 70);
      });

      say("Roll！4 / 10", null);
      window.setTimeout(() => {
        slots.forEach((slot) => slot.classList.remove("is-jumping"));
      }, 1400);
    });
  }
})();
