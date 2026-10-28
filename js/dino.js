/* =========================================================
   HNYZ · 页脚小恐龙
   ---------------------------------------------------------
   一排 4 只像素小恐龙，前面一只负责判定，后面三只跟着跑。
   两种模式：
     AUTO    自动看仙人掌距离起跳
     MANUAL  空格 / ↑ / 点击画布起跳
   画布只在进入视口时跑 rAF，离开页面就停，不拖累滚动。
   ========================================================= */

(() => {
  "use strict";

  const strip = document.querySelector("[data-dino-run]");
  if (!strip) return;

  const stage = strip.querySelector("[data-dino-stage]");
  const canvas = strip.querySelector("[data-dino-canvas]");
  const scoreEl = strip.querySelector("[data-dino-score]");
  const levelEl = strip.querySelector("[data-dino-level]");
  const popEl = strip.querySelector("[data-dino-pop]");
  const hintEl = strip.querySelector("[data-dino-hint]");
  const toastEl = strip.querySelector("[data-dino-toast]");
  const timeEl = strip.querySelector("[data-dino-time]");
  const modeButtons = Array.from(strip.querySelectorAll("[data-dino-mode]"));
  /* 带模式按钮时听用户的；按钮已经拿掉，就恒定自动跑 */
  const hasControls = modeButtons.length > 0;

  if (!stage || !canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const MODE_KEY = "hnyz:dino-mode";
  const HI_KEY = "hnyz:dino-hi";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;

  const W_UNITS = 44;
  const H_UNITS = 47;
  const GRAVITY = 2000;
  const JUMP_V = -540;
  /* 等级上限抽成常量；×1 下一整个昼夜循环的秒数 */
  const LEVEL_CAP = 100;
  const DAY_CYCLE = 60;

  let W = 0;
  let H = 0;
  let DPR = 1;
  let S = 3;
  let groundY = 0;
  let startX = 120;
  let count = 4;
  let spacing = 45;
  let mode = "auto";
  let activated = !reduce.matches;
  let visible = false;
  let running = false;
  let raf = 0;
  let lastTime = 0;

  let jumpY = 0;
  let vy = 0;
  let grounded = true;
  let dead = false;
  let deadTimer = 0;

  let speed = 170;
  let distance = 0;
  let score = 0;
  let hiScore = 0;
  let spawnIn = 1.2;
  let worldX = 0;

  let obstacles = [];
  let coins = [];
  let clouds = [];
  let stars = [];
  let dust = [];
  /* 领头龙的高度历史：后面几只按“晚一点起跳”取样，视觉上像波浪跟跳 */
  let trail = [];
  let clock = 0;

  /* 玩法状态：档位、连击、飘字、震屏 */
  let level = 1;
  let combo = 0;
  let bestCombo = 0;
  let nextLevelAt = 40;
  let popTimer = 0;
  let shake = 0;
  /* 进化演出：里程碑轻闪、领队进化辉光 */
  let flash = 0;
  let stageGlow = 0;
  /* 50 级解锁的无敌星：吃到后 3 秒穿过一切 */
  let starTimer = 0;
  let starIn = 14;
  /* 游戏内昼夜循环（0~1）与时间加速倍率 */
  let gameClock = 0.1;
  let timeScale = 1;
  /* 100 级灭绝演出：非空时接管整条 update */
  let cine = null;

  let palette = {
    ink: "#e8f1ff",
    accent: "#7dd3fc",
    dim: "#3a5a80",
    ground: "rgba(125, 211, 252, 0.42)",
    gold: "#fbbf24",
    goldLit: "#ffe9a8",
    moon: "#eaf3ff"
  };

  let sprites = {
    dino: [],
    cacti: [],
    coin: [],
    ptero: [],
    star: null
  };
  /* 月亮预渲染成一张小图：两圆相减必须用合成模式，逐帧做太浪费 */
  let moonSprite = null;

  try {
    hiScore = Number(window.localStorage.getItem(HI_KEY)) || 0;
    const saved = window.localStorage.getItem(MODE_KEY);
    if (hasControls && !reduce.matches && (saved === "auto" || saved === "manual")) {
      mode = saved;
    }
  } catch (error) {
    /* 隐私模式 */
  }

  if (reduce.matches) mode = "manual";
  else if (!hasControls) mode = "auto";

  function readPalette() {
    const cs = window.getComputedStyle(strip);
    const read = (name, fallback) => {
      const value = cs.getPropertyValue(name).trim();
      return value || fallback;
    };

    palette = {
      ink: read("--dino-ink", "#e8f1ff"),
      accent: read("--dino-accent", "#7dd3fc"),
      dim: read("--dino-dim", "#3a5a80"),
      ground: read("--dino-ground", "rgba(125, 211, 252, 0.42)"),
      gold: read("--dino-gold", "#fbbf24"),
      goldLit: read("--dino-gold-lit", "#ffe9a8"),
      moon: read("--dino-moon", "#eaf3ff")
    };
  }

  /* -------------------------------------------------------
     一、像素贴图（预渲染，主循环只 drawImage）
     ------------------------------------------------------- */
  function makeSprite(wUnits, hUnits, scale, paint) {
    const sprite = document.createElement("canvas");
    sprite.width = Math.max(1, wUnits * scale);
    sprite.height = Math.max(1, hUnits * scale);
    const g = sprite.getContext("2d");
    g.imageSmoothingEnabled = false;
    paint(g, scale);
    return sprite;
  }

  /* 22×24 的像素稿：'#' 实体，'.' 透明（眼睛和嘴留空，透出页脚底色） */
  const DINO_FRAMES = [
    [
      "............................................",
      "............................................",
      "........................################....",
      "........................################....",
      "......................####################..",
      "......................####..##############..",
      "......................####..##############..",
      "......................####################..",
      "......................####################..",
      "......................####################..",
      "......................####################..",
      "......................####################..",
      "......................####################..",
      "......................##########............",
      "......................##########............",
      "......................################......",
      "......................################......",
      "..##................##########..............",
      "..##................##########..............",
      "..##.............#############..............",
      "..##.............#############..............",
      "..####........####################..........",
      "..####........####################..........",
      "..######....##################..##..........",
      "..######....##################..##..........",
      "..############################..............",
      "..############################..............",
      "..############################..............",
      "..############################..............",
      "....##########################..............",
      "....########################................",
      "......######################................",
      "......######################................",
      "........##################..................",
      "........##################..................",
      "..........##############....................",
      "..........##############....................",
      "............######..####....................",
      "............######..####....................",
      "............####......##....................",
      "............####......##....................",
      "............##........##....................",
      "............##........##....................",
      "............####......####..................",
      "............####......####..................",
      "............................................",
      "............................................",
    ],
    [
      "............................................",
      "............................................",
      "........................################....",
      "........................################....",
      "......................####################..",
      "......................####..##############..",
      "......................####..##############..",
      "......................####################..",
      "......................####################..",
      "......................####################..",
      "......................####################..",
      "......................####################..",
      "......................####################..",
      "......................##########............",
      "......................##########............",
      "......................################......",
      "......................################......",
      "..##................##########..............",
      "..##................##########..............",
      "..##.............#############..............",
      "..##.............#############..............",
      "..####........####################..........",
      "..####........####################..........",
      "..######....##################..##..........",
      "..######....##################..##..........",
      "..############################..............",
      "..############################..............",
      "..############################..............",
      "..############################..............",
      "....##########################..............",
      "....########################................",
      "......######################................",
      "......######################................",
      "........##################..................",
      "........##################..................",
      "..........##############....................",
      "..........##############....................",
      "............######..####....................",
      "............######..####....................",
      "............####......##....................",
      "............####......##....................",
      "............##........####..................",
      "............####............................",
      "............####............................",
      "............####............................",
      "............................................",
      "............................................",
    ],
  ];

  function paintDino(g, s, frame) {
    const rows = DINO_FRAMES[frame] || DINO_FRAMES[0];
    g.fillStyle = dinoTone();

    for (let y = 0; y < rows.length; y += 1) {
      const line = rows[y];
      let x = 0;

      /* 同一行连续的像素合并成一条 fillRect，贴图只算一次 */
      while (x < line.length) {
        if (line[x] !== "#") {
          x += 1;
          continue;
        }
        let run = 1;
        while (line[x + run] === "#") run += 1;
        g.fillRect(x * s, y * s, run * s, s);
        x += run;
      }
    }
  }

  function paintCactus(g, s, variant) {
    g.fillStyle = palette.accent;

    /* 主干 + 根部（10×13 的矮胖仙人掌） */
    g.fillRect(3 * s, 1 * s, 4 * s, 11 * s);
    g.fillRect(2 * s, 11 * s, 6 * s, 2 * s);

    if (variant === 0) {
      g.fillRect(0, 4 * s, 2 * s, 5 * s);
      g.fillRect(1 * s, 7 * s, 3 * s, 2 * s);
      g.fillRect(8 * s, 2 * s, 2 * s, 5 * s);
      g.fillRect(6 * s, 5 * s, 3 * s, 2 * s);
    } else if (variant === 1) {
      g.fillRect(0, 5 * s, 2 * s, 4 * s);
      g.fillRect(1 * s, 8 * s, 3 * s, 2 * s);
    } else {
      g.fillRect(8 * s, 3 * s, 2 * s, 5 * s);
      g.fillRect(6 * s, 6 * s, 3 * s, 2 * s);
    }
  }

  /* 8×8 的金币：按宽度收放模拟旋转，左上留高光、中间一道暗缝当币面 */
  function paintCoin(g, s, width) {
    const w = Math.max(2, width);
    const inset = Math.round((8 - w) / 2);

    g.fillStyle = palette.gold;
    g.fillRect(inset * s, 1 * s, w * s, 6 * s);
    g.fillRect((inset + 1) * s, 0, Math.max(1, w - 2) * s, 8 * s);

    if (w >= 6) {
      /* 顶部一行提亮，像被光扫到的币齿 */
      g.fillStyle = palette.goldLit;
      g.fillRect((inset + 1) * s, 0, Math.max(1, w - 2) * s, s);
      g.fillRect(inset * s, 1 * s, s, 2 * s);

      g.fillStyle = palette.dim;
      g.fillRect((inset + Math.floor(w / 2)) * s, 2 * s, s, 4 * s);
    }
  }

  /* 14×9 的翼龙：两帧扇翅。高空那条线跑着能过、跳起来会撞 */
  const PTERO_FRAMES = [
    [
      "........##....",
      "........###...",
      "........####..",
      "..#.....#####.",
      "..##..########",
      ".#############",
      "....########..",
      "......####....",
      "........##....",
    ],
    [
      "..............",
      "..............",
      "........##....",
      "..#.....###...",
      "..##..#######.",
      ".#############",
      "......#####...",
      ".....####.....",
      "....###.......",
    ],
  ];

  function paintPtero(g, s, frame) {
    const rows = PTERO_FRAMES[frame] || PTERO_FRAMES[0];
    g.fillStyle = palette.ink;
    for (let y = 0; y < rows.length; y += 1) {
      const line = rows[y];
      let x = 0;
      while (x < line.length) {
        if (line[x] !== "#") { x += 1; continue; }
        let run = 1;
        while (line[x + run] === "#") run += 1;
        g.fillRect(x * s, y * s, run * s, s);
        x += run;
      }
    }
  }

  /* 9×9 的无敌星 */
  const STAR_PIXELS = [
    "....#....",
    "....#....",
    "...###...",
    "#########",
    ".#######.",
    "..#####..",
    ".###.###.",
    ".#.....#.",
  ];

  function paintStar(g, s) {
    STAR_PIXELS.forEach((line, y) => {
      let x = 0;
      while (x < line.length) {
        if (line[x] !== "#") { x += 1; continue; }
        let run = 1;
        while (line[x + run] === "#") run += 1;
        g.fillStyle = y <= 3 ? palette.goldLit : palette.gold;
        g.fillRect(x * s, y * s, run * s, s);
        x += run;
      }
    });
  }

  /* 十六进制颜色插值：恐龙 20 级以后随等级换羽色 */
  function lerpHex(a, b, t) {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    const mix = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
    return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }

  function mixHex(a, b, t) {
    if (a[0] !== "#" || b[0] !== "#") return a;
    return lerpHex(a.length === 4
      ? "#" + a[1] + a[1] + a[2] + a[2] + a[3] + a[3]
      : a, b, t);
  }

  /* 墨绿 → 深绿 → 墨蓝 → 暗金：目标羽色随等级渐变，再与皮肤底色按 3:1 调和 */
  function dinoTone() {
    const tones = ["#2f8f5f", "#37c58f", "#4f8fd9", "#d9a441"];
    if (level < 20) return palette.ink;
    const t = Math.min(0.999, (level - 20) / 60) * (tones.length - 1);
    const i = Math.floor(t);
    const target = lerpHex(tones[i], tones[i + 1] || tones[i], t - i);
    return mixHex(target, palette.ink, 0.28);
  }

  function buildSprites() {
    sprites.dino = [
      makeSprite(W_UNITS, H_UNITS, S, (g, s) => paintDino(g, s, 0)),
      makeSprite(W_UNITS, H_UNITS, S, (g, s) => paintDino(g, s, 1))
    ];
    sprites.cacti = [0, 1, 2].map((variant) =>
      makeSprite(10, 13, S, (g, s) => paintCactus(g, s, variant))
    );
    /* 金币四帧：宽 → 窄 → 最窄 → 宽，转起来像翻面 */
    sprites.coin = [8, 6, 3, 6].map((width) =>
      makeSprite(8, 8, S, (g, s) => paintCoin(g, s, width))
    );
    sprites.ptero = [0, 1].map((frame) =>
      makeSprite(14, 9, S, (g, s) => paintPtero(g, s, frame))
    );
    sprites.star = makeSprite(9, 8, S, (g) => paintStar(g, S));
    moonSprite = buildMoonSprite();
  }

  /* 画一个正确的弯月：先填整圆，再用 destination-out 啃掉偏心的一个圆。
     直接拿两个 arc 走 evenodd 会在两圆不互相包含时多填一块，形状会歪。 */
  function buildMoonSprite() {
    const r = H > 150 ? 14 : 11;
    const box = Math.ceil(r * 2 + 6);
    const scale = 2;

    const node = document.createElement("canvas");
    node.width = box * scale;
    node.height = box * scale;

    const g = node.getContext("2d");
    g.scale(scale, scale);
    g.fillStyle = palette.moon;

    const cx = box / 2;
    const cy = box / 2;

    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();

    g.globalCompositeOperation = "destination-out";
    g.beginPath();
    g.arc(cx + r * 0.55, cy - r * 0.36, r, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = "source-over";

    return { node, box };
  }

  /* -------------------------------------------------------
     二、尺寸与场景
     ------------------------------------------------------- */
  function measure() {
    const rect = stage.getBoundingClientRect();
    const nextW = Math.max(220, Math.round(rect.width || 320));
    const nextH = Math.max(76, Math.round(rect.height || 110));

    /* 尺寸没变就不重建，避免滚动时反复清空画布 */
    if (nextW === W && nextH === H && sprites.dino.length) return false;

    W = nextW;
    H = nextH;
    DPR = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = false;

    S = H >= 120 ? 2 : 1;
    groundY = H - Math.round(12 + S * 2);
    count = W < 520 ? 2 : 4;
    spacing = 46 * S;
    /* 保证整排都在画布内：最左边那只离左边缘至少 8px */
    const packLeft = 8 + (count - 1) * spacing;
    startX = Math.max(packLeft, Math.min(W * 0.36, W - 260));

    buildSprites();
    buildClouds();
    buildStars();
    return true;
  }

  function buildClouds() {
    clouds = Array.from({ length: W < 430 ? 2 : 3 }, (_, i) => ({
      x: (W / (W < 430 ? 2 : 3)) * i + (i % 2 ? 40 : 12),
      y: 10 + (i % 2) * 14 + (H > 120 ? 4 : 0),
      s: S
    }));
  }

  function buildStars() {
    const n = Math.max(13, Math.round(W / 12));
    stars = Array.from({ length: n }, () => {
      const big = Math.random() < 0.32;
      return {
        x: Math.random() * W,
        /* 星星只铺在地面线以上，别跑到土里 */
        y: 5 + Math.random() * Math.max(8, H - 88),
        s: big ? 2 : 1,
        big,
        /* 每颗自己的闪烁节奏，亮的那几颗慢一点，像在「呼吸」 */
        tw: Math.random() * Math.PI * 2,
        twSpeed: 1.6 + Math.random() * 2.4,
        depth: 0.02 + Math.random() * 0.05
      };
    });
  }

  function resetRun() {
    jumpY = 0;
    vy = 0;
    grounded = true;
    dead = false;
    deadTimer = 0;
    speed = 240;
    distance = 0;
    score = 0;
    spawnIn = 1.1;
    worldX = 0;
    obstacles = [];
    coins = [];
    dust = [];
    trail = [];
    clock = 0;
    level = 1;
    combo = 0;
    bestCombo = 0;
    nextLevelAt = 40;
    popTimer = 0;
    shake = 0;
    flash = 0;
    stageGlow = 0;
    starTimer = 0;
    starIn = 14;
    cine = null;
    strip.classList.remove("is-cine");
    if (timeEl) timeEl.classList.remove("is-locked");
    if (levelEl) levelEl.textContent = "LV.1";
    if (popEl) {
      popEl.textContent = "";
      popEl.classList.remove("is-on");
    }
    if (toastEl) toastEl.hidden = true;
    if (hintEl) hintEl.style.opacity = "";
    buildSprites(); /* 羽色复位 */
    updateScore(true);
  }

  function updateScore(force) {
    if (!scoreEl) return;
    const next = Math.floor(score);
    if (!force && next === updateScore.last) return;
    updateScore.last = next;

    if (next > hiScore) {
      hiScore = next;
      try {
        window.localStorage.setItem(HI_KEY, String(hiScore));
      } catch (error) {
        /* 忽略 */
      }
    }

    const pad = (value) => String(Math.max(0, Math.floor(value))).padStart(5, "0");
    scoreEl.textContent = `HI ${pad(hiScore)}  ${pad(next)}`;
  }

  function setMode(next, userInitiated) {
    if (next !== "auto" && next !== "manual") return;
    mode = next;
    strip.dataset.mode = mode;

    modeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.dinoMode === mode));
    });

    if (hintEl) {
      hintEl.textContent = mode === "auto" ? "AUTO_PILOT // ON" : "SPACE / TAP → JUMP";
    }

    if (mode === "auto" && !activated) {
      activated = true;
      resetRun();
    }

    if (userInitiated) {
      startLoop();
      try {
        window.localStorage.setItem(MODE_KEY, mode);
      } catch (error) {
        /* 忽略 */
      }
    }
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.dinoMode, true);
    });
  });

  /* TIME ×N：在 1 / 2 / 4 之间循环。演出期间锁死，刷新回 ×1 */
  if (timeEl) {
    timeEl.addEventListener("click", () => {
      if (cine) return;
      timeScale = timeScale === 1 ? 2 : timeScale === 2 ? 4 : 1;
      timeEl.textContent = `TIME ×${timeScale}`;
      timeEl.setAttribute("aria-pressed", String(timeScale > 1));
      timeEl.classList.toggle("is-hot", timeScale > 1);
    });
  }

  /* -------------------------------------------------------
     三、跳跃 / 障碍 / 碰撞
     ------------------------------------------------------- */
  function jump() {
    if (!activated) {
      activated = true;
      resetRun();
    }

    if (dead) {
      resetRun();
      startLoop();
      return;
    }

    if (!grounded) return;
    vy = JUMP_V;
    grounded = false;
    burstDust(3);
  }

  function burstDust(n) {
    for (let i = 0; i < n; i += 1) {
      dust.push({
        x: startX + 6 * S + (Math.random() - 0.5) * 12,
        y: groundY - 2,
        vx: -30 - Math.random() * 40,
        vy: -20 - Math.random() * 40,
        life: 0.45 + Math.random() * 0.2,
        max: 0.65
      });
    }
  }

  function spawnObstacle() {
    /* 10 级起学会飞：三成概率出翼龙。高空的跑过去就行，低空的要跳 */
    if (level >= 10 && Math.random() < 0.3) {
      const high = Math.random() < 0.5;
      obstacles.push({
        kind: "ptero",
        x: W + 24,
        w: 14 * S,
        h: 9 * S,
        lift: high ? 56 * S : 7 * S,
        high,
        bob: Math.random() * Math.PI * 2
      });
      return;
    }

    const variant = Math.floor(Math.random() * sprites.cacti.length);
    const sprite = sprites.cacti[variant];
    obstacles.push({
      kind: "cactus",
      x: W + 24,
      w: sprite.width,
      h: sprite.height,
      variant
    });

    /* 30 级起混编：三成概率再补一株，拼成双连仙人掌 */
    let width = sprite.width;
    if (level >= 30 && Math.random() < 0.35) {
      const v2 = (variant + 1) % sprites.cacti.length;
      const s2 = sprites.cacti[v2];
      obstacles.push({
        kind: "cactus",
        x: W + 24 + width + 2,
        w: s2.width,
        h: s2.height,
        variant: v2
      });
      width += s2.width + 2;
    }

    /* 仙人掌上方挂金币拱门：跳得准就一路吃过去；30 级起出现双排 */
    if (Math.random() < (level >= 30 ? 0.75 : 0.62)) {
      const cx = W + 24 + width / 2;
      const rows = level >= 30 ? [0, 24] : [0];
      rows.forEach((extra) => {
        [[-46, 26], [0, 46], [46, 26]].forEach(([dx, lift]) => {
          coins.push({
            kind: "coin",
            x: cx + dx + extra * 0.6,
            lift: lift + extra,
            frame: 0,
            spin: Math.random() * 0.5,
            got: false
          });
        });
      });
    }
  }

  function obstacleGap() {
    /* 速度越快，间隔时间稍短，但至少留出一次跳跃的距离 */
    return Math.max(0.95, 1.55 - speed / 900) + Math.random() * 0.45;
  }

  function autoJump() {
    const front = startX + 4 * S;

    /* 高空翼龙压顶时按兵不动：跑着能过，跳起来反而撞上 */
    for (const item of obstacles) {
      if (item.kind !== "ptero" || !item.high) continue;
      if (item.x < startX + speed * 0.45 + 130 && item.x + item.w > startX - 30) return;
    }

    let target = null;
    let lead = 0;
    for (const item of obstacles) {
      if (item.x + item.w <= front) continue;
      if (item.kind === "ptero" && item.high) continue;
      const d = item.x - startX;
      if (!target || d < lead) {
        target = item;
        lead = d;
      }
    }
    if (!target) return;

    /* 翼龙自身带速度，提前量比地面障碍稍宽 */
    const threshold = target.kind === "ptero" ? speed * 0.2 + 80 : speed * 0.18 + 68;
    if (lead < threshold) jump();
  }

  /* 地面障碍贴地；翼龙按飞行线 + 上下浮动算碰撞盒 */
  function obstacleBox(item) {
    if (item.kind === "ptero") {
      const bob = Math.sin(clock * 6 + item.bob) * 2 * S;
      const top = groundY - item.lift - item.h + bob;
      return { left: item.x, right: item.x + item.w, top, bottom: top + item.h };
    }
    return { left: item.x, right: item.x + item.w, top: groundY - item.h + 3, bottom: groundY };
  }

  function collide() {
    const hitX = startX + 8 * S;
    const hitW = 26 * S;
    const hitTop = groundY + jumpY - 44 * S;
    const hitBottom = groundY + jumpY - 1;

    for (let i = 0; i < obstacles.length; i += 1) {
      const item = obstacles[i];
      const box = obstacleBox(item);
      if (hitX + hitW < box.left || hitX > box.right) continue;
      if (hitBottom > box.top && hitTop < box.bottom) {
        /* 无敌冲刺：撞上的障碍直接被撞碎，不判死 */
        if (starTimer > 0) {
          obstacles.splice(i, 1);
          burstDebris(10);
          score += 25;
          distance += 25 * 14;
          updateScore(true);
          shake = Math.max(shake, 0.12);
          return false;
        }
        return true;
      }
    }
    return false;
  }

  function die() {
    dead = true;
    deadTimer = 1.45;
    shake = 0.34;
    burstDebris(18);
    if (toastEl) toastEl.hidden = false;
    if (hintEl) hintEl.style.opacity = "0";
  }

  /* -------------------------------------------------------
     三之二、金币 / 档位 / 连击
     ------------------------------------------------------- */
  function pop(text, tone) {
    if (!popEl) return;
    popEl.textContent = text;
    popEl.dataset.tone = tone || "gold";
    popEl.classList.remove("is-on");
    void popEl.offsetWidth;
    popEl.classList.add("is-on");
    popTimer = 0.9;
  }

  function setLevel(next) {
    level = next;
    if (levelEl) {
      levelEl.textContent = `LV.${level}`;
      levelEl.classList.remove("is-bump");
      void levelEl.offsetWidth;
      levelEl.classList.add("is-bump");
    }

    /* 每 10 级一次大里程碑：飘字 + 全屏轻闪 + 领队短暂发亮 */
    if (level > 1 && level % 10 === 0) {
      pop(`EVOLUTION // STAGE ${level / 10 + 1}`, "level");
      flash = 0.32;
      stageGlow = 1;
      buildSprites(); /* 羽色随等级渐变，重建贴图 */
    }
  }

  function collectCoins() {
    const hitX = startX + 2 * S;
    const hitW = 34 * S;
    const top = groundY + jumpY - 44 * S;
    const bottom = groundY + jumpY;

    /* 每一帧只吃最近的，避免一帧内连吃三枚把连击算成三连 */
    for (let i = 0; i < coins.length; i += 1) {
      const coin = coins[i];
      if (coin.got) continue;

      const size = 8 * S;
      const cy = groundY - coin.lift - size;
      if (hitX + hitW < coin.x || hitX > coin.x + size) continue;
      if (bottom < cy || top > cy + size) continue;

      coin.got = true;
      burstCoin(coin);

      /* 50 级解锁：金色星星给 3 秒无敌冲刺 */
      if (coin.kind === "star") {
        starTimer = 3;
        pop("STAR POWER // 3S", "combo");
        break;
      }

      combo += 1;
      bestCombo = Math.max(bestCombo, combo);
      score += 20;
      distance += 20 * 14; /* 分数是 distance/14，这里补回去让 HUD 一起涨 */
      updateScore(true);

      const milestone = combo >= 5 && combo % 5 === 0;
      const label = milestone ? `COMBO x${combo}` : "+20";
      pop(label, milestone ? "combo" : "gold");

      /* 只飘字，不出声：整条跑道是静音的 */
      break;
    }

    coins = coins.filter((coin) => !coin.got);
  }

  /* 金币被吃掉时炸出几粒金屑，给一点「拿到手」的实感 */
  function burstCoin(coin) {
    const cx = coin.x + 4 * S;
    const cy = groundY - coin.lift - 4 * S;
    for (let i = 0; i < 5; i += 1) {
      dust.push({
        x: cx,
        y: cy,
        vx: -60 + Math.random() * 120,
        vy: -120 + Math.random() * 90,
        life: 0.3 + Math.random() * 0.2,
        max: 0.5,
        size: 2,
        tone: "gold"
      });
    }
  }

  function burstDebris(n) {
    for (let i = 0; i < n; i += 1) {
      dust.push({
        x: startX + 14 * S + (Math.random() - 0.5) * 16,
        y: groundY + jumpY - 24 * S,
        vx: -120 + Math.random() * 260,
        vy: -240 + Math.random() * 180,
        life: 0.5 + Math.random() * 0.4,
        max: 0.9,
        size: Math.random() < 0.4 ? 3 : 2,
        tone: "accent"
      });
    }
  }

  /* -------------------------------------------------------
     四、主循环
     ------------------------------------------------------- */
  function update(dt) {
    if (!activated) return;

    /* 昼夜循环独立于跑动：只受时间倍率影响（演出期间倍率锁 1） */
    gameClock = (gameClock + dt / DAY_CYCLE) % 1;

    if (cine) {
      updateCinematic(dt);
      return;
    }

    worldX += speed * dt;
    clock += dt;
    trail.push({ t: clock, y: jumpY });
    if (trail.length > 150) trail.shift();

    if (dead) {
      deadTimer -= dt;
      if (deadTimer <= 0) resetRun();
      return;
    }

    /* 速度三层：世界里程 + 等级成长，等级是主角 */
    speed = 240 + Math.min(160, worldX / 80) + Math.min(220, (level - 1) * 2.4);
    distance += speed * dt;
    score = distance / 14;
    updateScore(false);

    /* 升级增量从约 41 分起步、缓慢涨到约 120 分：×1 全程 3~5 分钟 */
    if (score >= nextLevelAt && level < LEVEL_CAP) {
      setLevel(level + 1);
      nextLevelAt += Math.round(40 + level * 0.8);
      if (level >= LEVEL_CAP) {
        startExtinction();
        return;
      }
    }

    if (stageGlow > 0) stageGlow = Math.max(0, stageGlow - dt);
    if (flash > 0) flash = Math.max(0, flash - dt * 1.4);
    if (starTimer > 0) starTimer = Math.max(0, starTimer - dt);

    if (mode === "auto") autoJump();

    if (!grounded) {
      vy += GRAVITY * dt;
      jumpY += vy * dt;
      if (jumpY >= 0) {
        jumpY = 0;
        vy = 0;
        grounded = true;
        burstDust(5 * (timeScale >= 4 ? 2 : 1));
      }
    }

    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawnObstacle();
      spawnIn = obstacleGap();
    }

    /* 50 级起，无敌星按自己的节奏落下来 */
    if (level >= 50) {
      starIn -= dt;
      if (starIn <= 0) {
        coins.push({
          kind: "star",
          x: W + 30,
          lift: 40 + Math.random() * 18,
          frame: 0,
          spin: 0,
          got: false
        });
        starIn = 16 + Math.random() * 12;
        pop("STAR INBOUND", "combo");
      }
    }

    obstacles.forEach((item) => {
      /* 翼龙比世界快一截，扑过来才有威胁 */
      item.x -= (item.kind === "ptero" ? speed * 1.18 + 24 : speed) * dt;
    });
    obstacles = obstacles.filter((item) => item.x + item.w > -40);

    coins.forEach((coin) => {
      coin.x -= speed * dt;
      coin.spin += dt * 5;
    });
    coins = coins.filter((coin) => coin.x + 9 * S > -20 && coin.x < W + 80);
    collectCoins();

    dust.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 220 * dt;
      particle.life -= dt;
    });
    dust = dust.filter((particle) => particle.life > 0);

    if (popTimer > 0) popTimer -= dt;
    if (popEl && popTimer <= 0 && popEl.classList.contains("is-on")) {
      popEl.classList.remove("is-on");
    }
    if (shake > 0) shake = Math.max(0, shake - dt);

    if (collide()) die();
  }

  /* -------------------------------------------------------
     四之二、100 级灭绝演出：天变 → 陨石 → 回溯 → 重生
     ------------------------------------------------------- */
  function startExtinction() {
    cine = {
      phase: reduce.matches ? "toast1" : "sky",
      t: 0,
      shown: false,
      worldX0: worldX,
      score0: score,
      mx: 0,
      my: 0
    };
    timeScale = 1;
    if (timeEl) {
      timeEl.textContent = "TIME ×1";
      timeEl.classList.remove("is-hot");
      timeEl.classList.add("is-locked");
    }
    strip.classList.add("is-cine");
    obstacles = [];
    coins = [];
    dead = false;
  }

  function cineShow(text) {
    if (!toastEl) return;
    toastEl.hidden = false;
    toastEl.textContent = text;
  }

  function cineFinish() {
    cine = null;
    if (toastEl) toastEl.hidden = true;
    strip.classList.remove("is-cine");
    if (timeEl) timeEl.classList.remove("is-locked");
    resetRun();
    pop("REBORN // AGAIN", "level");
  }

  function updateCinematic(dt) {
    cine.t += dt;

    /* 演出期间公共的余韵衰减照常走 */
    if (flash > 0) flash = Math.max(0, flash - dt * 1.1);
    if (shake > 0) shake = Math.max(0, shake - dt);
    if (popTimer > 0) popTimer -= dt;
    if (popEl && popTimer <= 0 && popEl.classList.contains("is-on")) {
      popEl.classList.remove("is-on");
    }
    dust.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 220 * dt;
      particle.life -= dt;
    });
    dust = dust.filter((particle) => particle.life > 0);

    if (cine.phase === "toast1") {
      /* reduced-motion：不做震屏与粒子，两行文案讲完 */
      if (!cine.shown) {
        cineShow("MASS EXTINCTION // THIS IS THE TRUTH OF THE DINOSAURS");
        cine.shown = true;
      }
      if (cine.t >= 1.7) {
        cine.phase = "toast2";
        cine.t = 0;
        cine.shown = false;
      }
      return;
    }

    if (cine.phase === "toast2") {
      if (!cine.shown) {
        cineShow("TIME REWIND // RESTORING THE TIMELINE");
        cine.shown = true;
      }
      if (cine.t >= 1.7) cineFinish();
      return;
    }

    if (cine.phase === "sky") {
      /* 天压暗、染血色，星星一颗颗灭掉（星星 alpha 在 draw 里读 cine） */
      if (cine.t >= 1.1) {
        cine.phase = "meteor";
        cine.t = 0;
      }
      return;
    }

    if (cine.phase === "meteor") {
      const p = Math.min(1, cine.t / 1.25);
      cine.mx = W * 0.92 - (W * 0.92 - (startX + 150 * S)) * p;
      cine.my = -24 + (groundY - 20 * S + 24) * p * p;
      if (Math.random() < 0.7) {
        dust.push({
          x: cine.mx + (Math.random() - 0.5) * 8,
          y: cine.my - 6,
          vx: 30 - Math.random() * 90,
          vy: -40 - Math.random() * 60,
          life: 0.55,
          max: 0.55,
          size: 2,
          tone: "fire"
        });
      }
      if (cine.t >= 1.25) {
        cine.phase = "impact";
        cine.t = 0;
        shake = 0.62;
        flash = 1;
        burstDebris(46);
        burstDust(14);
        cineShow("MASS EXTINCTION // THIS IS THE TRUTH OF THE DINOSAURS");
      }
      return;
    }

    if (cine.phase === "impact") {
      if (cine.t >= 1.7) {
        cine.phase = "rewind";
        cine.t = 0;
        cineShow("TIME REWIND // RESTORING THE TIMELINE");
        /* 碎片全部倒飞回去 */
        dust.forEach((particle) => {
          particle.vx *= -1.7;
          particle.vy = particle.vy * -1.7 - 40;
          particle.life = Math.max(particle.life, 0.8);
          particle.max = Math.max(particle.max, 0.8);
        });
      }
      return;
    }

    if (cine.phase === "rewind") {
      const p = Math.min(1, cine.t / 2.3);
      const eased = p * p * (3 - 2 * p);
      worldX = cine.worldX0 * (1 - eased);
      score = cine.score0 * (1 - eased);
      distance = score * 14;
      updateScore(false);
      if (cine.t >= 2.3) cineFinish();
    }
  }

  /* 游戏内昼夜：0.40 进夜、0.50 全黑、0.92 出夜；黄昏压在两个交界上 */
  function skyPhases() {
    const cyc = gameClock;
    const nightAmt = cyc < 0.4 ? 0
      : cyc < 0.5 ? (cyc - 0.4) / 0.1
        : cyc < 0.92 ? 1
          : 1 - (cyc - 0.92) / 0.08;
    const duskAmt =
      Math.max(0, 1 - Math.abs(cyc - 0.45) / 0.07) +
      Math.max(0, 1 - Math.abs(cyc - 0.96) / 0.07);
    return { cyc, nightAmt, duskAmt };
  }

  /* 演出的血色天幕：sky 渐入，rewind 渐出 */
  function bloodAmt() {
    if (!cine) return 0;
    if (cine.phase === "sky") return Math.min(1, cine.t / 1.1);
    if (cine.phase === "meteor" || cine.phase === "impact") return 1;
    if (cine.phase === "rewind") return Math.max(0, 1 - (cine.t / 2.3) * 1.6);
    return 0;
  }

  function drawSky() {
    const { nightAmt, duskAmt } = skyPhases();

    if (nightAmt > 0.02) {
      ctx.fillStyle = `rgba(4, 9, 22, ${(0.34 * nightAmt).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (duskAmt > 0.02) {
      const warm = ctx.createLinearGradient(0, groundY - 90, 0, H);
      warm.addColorStop(0, "rgba(255, 138, 84, 0)");
      warm.addColorStop(1, `rgba(255, 138, 84, ${(0.2 * Math.min(1, duskAmt)).toFixed(3)})`);
      ctx.fillStyle = warm;
      ctx.fillRect(0, groundY - 90, W, 90);
    }
    const blood = bloodAmt();
    if (blood > 0.02) {
      ctx.fillStyle = `rgba(150, 22, 22, ${(0.3 * blood).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* 太阳：白天沿弧线走，夜里沉下去 */
  function drawSun(phases) {
    const { cyc, nightAmt } = phases;
    if (isNight() || nightAmt > 0.96) return;
    const dayT = cyc >= 0.92 ? (cyc - 0.92) / 0.58 : cyc / 0.5;
    const x = W * (0.08 + 0.8 * dayT);
    const y = 24 + (1 - Math.sin(dayT * Math.PI)) * 20;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - nightAmt);
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 34);
    glow.addColorStop(0, withAlpha(palette.gold, 0.5));
    glow.addColorStop(1, withAlpha(palette.gold, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.goldLit;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGround() {
    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, groundY, W, 1.5);

    const gap = 26 * S;
    const offset = worldX % gap;
    ctx.globalAlpha = 0.55;
    for (let x = -offset; x < W; x += gap) {
      ctx.fillRect(x, groundY + 4, 9 * S, 1.5);
    }
    ctx.globalAlpha = 1;
  }

  function isNight() {
    return root.dataset.theme === "dark" || root.dataset.style === "hacker";
  }

  /* 把 #rrggbb 变成带透明度的 rgba，给月晕和星芒用 */
  function withAlpha(color, alpha) {
    const value = String(color).trim();
    if (value[0] !== "#") return value;
    const hex = value.length === 4
      ? "#" + value[1] + value[1] + value[2] + value[2] + value[3] + value[3]
      : value;
    if (hex.length !== 7) return value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function drawStars() {
    if (!stars.length) return;

    const night = isNight() || skyPhases().nightAmt > 0.35;
    /* 夜间星星是主角，日间只留一层几乎看不见的底噪；演出时天塌下来星星先灭 */
    const cineKill = cine && (cine.phase === "sky" || cine.phase === "meteor" || cine.phase === "impact")
      ? 1 - bloodAmt()
      : 1;
    const base = (night ? 1 : 0.2) * cineKill;

    ctx.fillStyle = palette.ink;
    stars.forEach((star) => {
      const drift = (star.x - worldX * star.depth) % (W + 40);
      const x = drift < 0 ? drift + W + 40 : drift;

      /* 夜间：把 sin 的峰值削尖，亮一下再暗下去，闪得更明显 */
      const wave = 0.5 + 0.5 * Math.sin(clock * star.twSpeed + star.tw);
      const pulse = night ? Math.pow(wave, 1.7) : wave;
      const twinkle = night ? 0.26 + 0.74 * pulse : 0.72 + 0.28 * pulse;
      const alpha = base * twinkle;

      const px = Math.round(x);
      const py = Math.round(star.y);

      /* 小星闪到最亮的那一下会「跳」成 2px，比单纯调透明度更像在眨眼 */
      const size = star.big || (night && pulse > 0.84) ? 2 : 1;
      const half = (size - 1) / 2;

      ctx.globalAlpha = alpha;

      /* 亮星带一点点自身的光，才像在发亮而不是贴了白点 */
      if (night && star.big) {
        ctx.shadowColor = palette.ink;
        ctx.shadowBlur = 7 * alpha;
      }

      ctx.fillRect(px, py, size, size);

      if (night && star.big) {
        ctx.shadowBlur = 0;
        /* 十字星芒，跟着闪烁一起呼吸 */
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillRect(px - 2, py + half, size + 4, 1);
        ctx.fillRect(px + half, py - 2, 1, size + 4);
      }
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  /* 月亮：网站夜间固定右上角；游戏内入夜后沿弧线巡天 */
  function drawMoon() {
    const phases = skyPhases();
    const cycleNight = phases.nightAmt > 0.05;
    if ((!isNight() && !cycleNight) || !moonSprite) return;

    let cx;
    let cy;
    if (cycleNight) {
      const nightT = Math.min(1, Math.max(0, (phases.cyc - 0.36) / 0.64));
      cx = W * (0.08 + 0.84 * nightT);
      cy = 22 + (1 - Math.sin(nightT * Math.PI)) * 16;
    } else {
      const r = H > 150 ? 14 : 11;
      cx = W - r - 22;
      cy = r + 18;
    }
    const r = H > 150 ? 14 : 11;

    ctx.save();

    /* 一圈很淡的月晕，让月亮从夜色里浮出来 */
    const halo = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r * 2.9);
    halo.addColorStop(0, withAlpha(palette.moon, 0.2));
    halo.addColorStop(0.5, withAlpha(palette.moon, 0.06));
    halo.addColorStop(1, withAlpha(palette.moon, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.9, 0, Math.PI * 2);
    ctx.fill();

    const half = moonSprite.box / 2;
    ctx.drawImage(moonSprite.node, cx - half, cy - half, moonSprite.box, moonSprite.box);

    ctx.restore();
  }

  function drawClouds() {
    /* 夜里不画云：留出干净的星空给月亮 */
    if (isNight()) return;
    const nightFade = 1 - skyPhases().nightAmt;
    if (nightFade < 0.05) return;

    const s = S;
    ctx.fillStyle = palette.dim;
    ctx.globalAlpha = 0.45 * nightFade;

    clouds.forEach((cloud) => {
      const drift = (worldX * 0.08 + cloud.x) % (W + 120);
      const x = W + 40 - drift;
      const y = cloud.y;

      ctx.fillRect(x, y + s, 6 * s, 2 * s);
      ctx.fillRect(x + 2 * s, y, 4 * s, 2 * s);
      ctx.fillRect(x + 5 * s, y + s, 5 * s, 2 * s);
    });

    ctx.globalAlpha = 1;
  }

  function drawCoins() {
    coins.forEach((coin) => {
      const bob = Math.sin(clock * 3 + coin.x * 0.05) * 1.5;

      /* 无敌星：带一圈金晕，呼吸式放大 */
      if (coin.kind === "star" && sprites.star) {
        const size = 9 * S;
        const pulse = 1 + Math.sin(clock * 5) * 0.12;
        const y = groundY - coin.lift - size;
        ctx.save();
        ctx.shadowColor = palette.gold;
        ctx.shadowBlur = 9;
        ctx.translate(Math.round(coin.x + size / 2), Math.round(y + size / 2 + bob));
        ctx.scale(pulse, pulse);
        ctx.drawImage(sprites.star, -size / 2, -size / 2, size, size);
        ctx.restore();
        return;
      }

      const frame = Math.floor(coin.spin) % sprites.coin.length;
      const sprite = sprites.coin[frame];
      if (!sprite) return;

      const size = 8 * S;
      const y = groundY - coin.lift - size;
      ctx.drawImage(sprite, Math.round(coin.x), Math.round(y + bob));
    });
  }

  function drawObstacles() {
    obstacles.forEach((item) => {
      if (item.kind === "ptero") {
        const frame = Math.floor(clock * 6) % 2;
        const sprite = sprites.ptero[frame];
        if (!sprite) return;
        const box = obstacleBox(item);
        ctx.drawImage(sprite, Math.round(item.x), Math.round(box.top));
        return;
      }
      /* 按变体现取贴图：换肤重建 sprite 后，场上已有的仙人掌也跟着变色 */
      const sprite = sprites.cacti[item.variant] || sprites.cacti[0];
      if (!sprite) return;
      ctx.drawImage(sprite, Math.round(item.x), Math.round(groundY - item.h));
    });
  }

  function trailY(delay) {
    const target = clock - delay;
    for (let i = trail.length - 1; i >= 0; i -= 1) {
      if (trail[i].t <= target) return trail[i].y;
    }
    return trail.length ? trail[0].y : 0;
  }

  function drawDinos(frame) {
    const sprite = sprites.dino[frame];

    /* 40 级起，跟随龙从波浪跟跳收紧成衔尾式齐冲 */
    const formation = level >= 40;

    for (let i = count - 1; i >= 0; i -= 1) {
      const x = Math.round(startX - i * spacing);
      const lag = speed > 0 ? (i * spacing) / speed : 0;
      const y = i === 0 ? jumpY : trailY(formation ? Math.min(lag, 0.07) : lag);
      ctx.globalAlpha = 1 - i * (formation ? 0.1 : 0.14);

      /* 领队辉光：里程碑发亮 / 无敌星金身 */
      if (i === 0 && starTimer > 0) {
        ctx.shadowColor = palette.gold;
        ctx.shadowBlur = 8 + Math.sin(clock * 22) * 4;
      } else if (i === 0 && stageGlow > 0) {
        ctx.shadowColor = palette.accent;
        ctx.shadowBlur = 9 * stageGlow;
      }

      ctx.drawImage(sprite, x, Math.round(groundY - H_UNITS * S + y));
      ctx.shadowBlur = 0;
    }

    const baseY = Math.round(groundY - H_UNITS * S + jumpY);

    /* 死掉的时候，在领头龙身上盖一个叉 */
    if (dead) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = Math.max(2, S * 0.9);
      ctx.lineCap = "round";
      const ex = startX + 30 * S;
      const ey = baseY + 10 * S;
      ctx.beginPath();
      ctx.moveTo(ex - 2 * S, ey);
      ctx.lineTo(ex + 2 * S, ey + 3 * S);
      ctx.moveTo(ex + 2 * S, ey);
      ctx.lineTo(ex - 2 * S, ey + 3 * S);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  function drawDust() {
    dust.forEach((particle) => {
      ctx.fillStyle =
        particle.tone === "accent" ? palette.accent
          : particle.tone === "gold" ? palette.gold
            : particle.tone === "fire" ? "#ff8a4d"
              : palette.dim;
      ctx.globalAlpha = Math.max(0, particle.life / particle.max) * 0.7;
      const size = particle.size || 2;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), size, size);
    });
    ctx.globalAlpha = 1;
  }

  function draw(frame) {
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    if (shake > 0) {
      const amp = shake * 9;
      ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
    }

    drawSky();
    const phases = skyPhases();
    drawSun(phases);
    drawStars();
    drawMoon();
    drawClouds();
    drawSpeedLines();
    drawGround();
    drawObstacles();
    drawMeteor();
    drawCoins();
    drawDinos(frame);
    drawDust();

    /* 里程碑轻闪：一下就收，不喧宾夺主 */
    if (flash > 0) {
      ctx.fillStyle = withAlpha(palette.goldLit, 0.16 * Math.min(1, flash));
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  /* ×2 起的速度线：后景一掠而过的细拖尾 */
  function drawSpeedLines() {
    if (timeScale < 2 || cine) return;
    const n = timeScale >= 4 ? 7 : 4;
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = timeScale >= 4 ? 0.2 : 0.11;
    for (let i = 0; i < n; i += 1) {
      const y = 12 + Math.abs(Math.sin(clock * 9 + i * 37.7)) * (groundY - 46);
      const len = 26 + Math.abs(Math.sin(clock * 5 + i * 11.3)) * 70;
      const x = W - ((clock * (560 + i * 150) * timeScale + i * 230) % (W + 170));
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(len), 1);
    }
    ctx.globalAlpha = 1;
  }

  /* 灭绝陨石：带尾焰的像素火球，倒飞阶段从原地折返 */
  function drawMeteor() {
    if (!cine) return;
    if (cine.phase !== "meteor" && cine.phase !== "impact" && cine.phase !== "rewind") return;

    let mx = cine.mx;
    let my = cine.my;
    if (cine.phase === "rewind") {
      const p = Math.min(1, cine.t / 2.3);
      mx = cine.mx + (W * 1.05 - cine.mx) * p;
      my = cine.my + (-40 - cine.my) * p;
    }

    ctx.save();
    /* 尾焰 */
    ctx.fillStyle = "#ff8a4d";
    ctx.globalAlpha = 0.75;
    ctx.fillRect(Math.round(mx + 4), Math.round(my - 14), 3, 12);
    ctx.globalAlpha = 0.45;
    ctx.fillRect(Math.round(mx + 7), Math.round(my - 24), 2, 18);
    ctx.globalAlpha = 1;

    /* 本体：暗红石核 + 金边 */
    ctx.fillStyle = "#8c1f1f";
    ctx.fillRect(Math.round(mx) - 4, Math.round(my) - 4, 9, 9);
    ctx.fillStyle = palette.gold;
    ctx.fillRect(Math.round(mx) - 4, Math.round(my) - 4, 9, 1);
    ctx.fillRect(Math.round(mx) - 4, Math.round(my) - 4, 1, 9);
    ctx.restore();
  }

  function loop(now) {
    if (!running) return;

    if (!lastTime) lastTime = now;
    const rawDt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    /* 时间加速：先乘倍率，再切成小步长跑物理，跳弧线不会因为步子大而糊 */
    const scaled = rawDt * (cine ? 1 : timeScale);
    const steps = Math.max(1, Math.ceil(scaled / 0.034));
    const sub = scaled / steps;
    for (let i = 0; i < steps; i += 1) update(sub);

    const frame = activated && !reduce.matches ? Math.floor(now / 105) % 2 : 0;
    draw(frame);

    raf = window.requestAnimationFrame(loop);
  }

  function startLoop() {
    if (running || !visible || document.hidden) return;
    running = true;
    lastTime = 0;
    raf = window.requestAnimationFrame(loop);
  }

  function stopLoop() {
    running = false;
    window.cancelAnimationFrame(raf);
  }

  /* -------------------------------------------------------
     五、交互
     ------------------------------------------------------- */
  stage.addEventListener("pointerdown", (event) => {
    /* 有按钮时只认手动模式；没按钮了，点一下画布也能让它蹦一下 */
    if (hasControls && mode !== "manual") return;
    event.preventDefault();
    jump();
  });

  document.addEventListener("keydown", (event) => {
    /* 空格只在自己切换到手动模式时才接管，不去抢页面的滚动键 */
    if (!visible || mode !== "manual") return;
    if (event.key !== " " && event.key !== "ArrowUp" && event.code !== "Space") return;
    if (root.classList.contains("is-style-deck-open")) return;

    const active = document.activeElement;
    if (active && (active.closest("input, textarea, select, button, a, [contenteditable='true']"))) return;

    event.preventDefault();
    jump();
  });

  document.addEventListener("hnyz:stylechange", () => {
    readPalette();
    buildSprites();
  });

  new MutationObserver(() => {
    readPalette();
    buildSprites();
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  /* 视口内才跑；离开时暂停，顺便让右下角的校徽让位 */
  function setVisible(next) {
    if (next === visible) return;
    visible = next;
    document.body.classList.toggle("is-dino-visible", visible);
    if (visible) startLoop();
    else stopLoop();
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setVisible(entry.isIntersecting));
      },
      { threshold: 0.08 }
    );
    observer.observe(strip);
  }

  /* 兜底：平滑滚动 / 锚点跳转时 IntersectionObserver 偶尔不回调，
     用滚动位置再校一次，免得滚到页脚恐龙却不动 */
  let scrollQueued = false;
  function syncVisibility() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(() => {
      scrollQueued = false;
      const rect = strip.getBoundingClientRect();
      const onScreen = rect.top < window.innerHeight && rect.bottom > 0;
      setVisible(onScreen);
    });
  }

  window.addEventListener("scroll", syncVisibility, { passive: true });
  window.addEventListener("resize", syncVisibility);
  syncVisibility();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopLoop();
    else if (visible) startLoop();
  });

  let resizeTimer = 0;
  const resizeObserver = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const changed = measure();
      if (changed) resetRun();
      if (visible) startLoop();
    }, 160);
  });
  resizeObserver.observe(stage);

  /* -------------------------------------------------------
     六、启动
     ------------------------------------------------------- */
  readPalette();
  measure();
  resetRun();
  setMode(mode, false);
  updateScore(true);

  const dinoDebug = () => ({
    visible, running, activated, score, dead, mode, W, H, S,
    obs: obstacles.length, coins: coins.length, level, combo, bestCombo, worldX,
    gameClock, timeScale, starTimer, cine: cine ? cine.phase : null
  });
  /* 测试钩子：把里程直接拨到指定分数处（线上无入口，仅供调试用） */
  dinoDebug.seek = (target) => {
    distance = target * 14;
  };
  window.__HNYZ_DINO__ = dinoDebug;

  if (visible) startLoop();
})();
