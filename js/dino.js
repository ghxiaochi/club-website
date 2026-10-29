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
  const extinctEl = strip.querySelector("[data-dino-extinct]");
  const rewindBtn = strip.querySelector("[data-dino-rewind]");
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
  const DAY_CYCLE = 34;

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
  /* 每帧 update / draw 的平滑耗时，用来盯性能（不影响逻辑） */
  let perfUpdate = 0;
  let perfDraw = 0;
  let idleSkip = false;

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
  /* 演出里的粒子、灰烬、火星：数组复用，不每帧新建 */
  let sparks = [];
  let smoke = [];
  let ash = [];
  /* 陨石砸完，恐龙就该消失了 */
  let hideDinos = false;
  /* 夜色里给恐龙补一点月光，0~1 */
  let nightLift = 0;

  let palette = {
    ink: "#e8f1ff",
    accent: "#7dd3fc",
    dim: "#3a5a80",
    ground: "rgba(125, 211, 252, 0.42)",
    gold: "#fbbf24",
    goldLit: "#ffe9a8",
    moon: "#eaf3ff"
  };
  /* 天体专用的颜色：只有它跟风格走，金币不跟着变绿 */
  let skyPal = { sun: "#fbbf24", sunLit: "#ffe9a8", moon: "#eaf3ff" };

  let sprites = {
    dino: [],
    dinoNight: [],
    cacti: [],
    coin: [],
    ptero: [],
    star: null
  };
  /* 月亮预渲染成一张小图：两圆相减必须用合成模式，逐帧做太浪费 */
  let moonSprite = null;
  /* 太阳、星星、火光、烟、焦痕、墓碑：全部预渲染，主循环只 drawImage */
  let sunSprite = null;
  let starSprites = null;
  let fireSprite = null;
  let smokeSprite = null;
  let scorchSprite = null;
  let meteorSprite = null;
  let tombSprites = [];
  /* 天空渐变按尺寸缓存，尺寸变了才重建 */
  let skyGrad = null;

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

    /* 黑客风：太阳月亮统一荧光绿（金币仍是琥珀色，靠 palette.gold 不受影响） */
    const hacker = root.dataset.style === "hacker";
    skyPal = hacker
      ? { sun: "#39ff88", sunLit: "#c8ffdd", moon: "#8dffb4" }
      : { sun: palette.gold, sunLit: palette.goldLit, moon: palette.moon };
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

  function paintDino(g, s, frame, ink) {
    const rows = DINO_FRAMES[frame] || DINO_FRAMES[0];
    g.fillStyle = ink || dinoTone();

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
    /* 夜里天压到纯黑，深色恐龙就看不见了：另烘一套提亮的，按夜色交叉淡入 */
    const moonlit = mixHex(dinoTone(), "#9db4d6", 0.55);
    sprites.dinoNight = [
      makeSprite(W_UNITS, H_UNITS, S, (g, s) => paintDino(g, s, 0, moonlit)),
      makeSprite(W_UNITS, H_UNITS, S, (g, s) => paintDino(g, s, 1, moonlit))
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
    g.fillStyle = skyPal.moon;

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

    /* 月晕也烘进这张图：逐帧 createRadialGradient 是手机端最容易掉帧的地方 */
    const side = box * 2;
    const center = side / 2;
    const halo = document.createElement("canvas");
    halo.width = Math.ceil(side * scale);
    halo.height = Math.ceil(side * scale);
    const hg = halo.getContext("2d");
    hg.scale(scale, scale);
    const ring = hg.createRadialGradient(center, center, r * 0.5, center, center, center);
    ring.addColorStop(0, withAlpha(skyPal.moon, 0.22));
    ring.addColorStop(0.45, withAlpha(skyPal.moon, 0.07));
    ring.addColorStop(1, withAlpha(skyPal.moon, 0));
    hg.fillStyle = ring;
    hg.beginPath();
    hg.arc(center, center, center, 0, Math.PI * 2);
    hg.fill();
    hg.drawImage(node, center - box / 2, center - box / 2, box, box);

    return { node: halo, box: side, glow: true };
  }

  /* ---------- 太阳：光晕烘成一张图，圆盘按高度改色，逐帧只画一个 arc ---------- */
  function buildSun() {
    const box = 120;
    const node = document.createElement("canvas");
    node.width = box * 2;
    node.height = box * 2;
    const g = node.getContext("2d");
    g.scale(2, 2);

    const ring = g.createRadialGradient(box / 2, box / 2, 3, box / 2, box / 2, box / 2);
    ring.addColorStop(0, withAlpha(skyPal.sun, 0.5));
    ring.addColorStop(0.35, withAlpha(skyPal.sun, 0.16));
    ring.addColorStop(1, withAlpha(skyPal.sun, 0));

    g.fillStyle = ring;
    g.beginPath();
    g.arc(box / 2, box / 2, box / 2, 0, Math.PI * 2);
    g.fill();

    sunSprite = { node, box, r: H >= 150 ? 8.5 : 7 };
  }

  /* ---------- 星星：去掉逐颗 shadowBlur，改成两张预渲染小图 ---------- */
  function buildStarSprites() {
    /* 星星不能跟正文墨色走：蓝白风的浅色主题里 ink 是深蓝，
       压在近乎纯黑的夜天上等于隐了形。夜里就该是月光白。 */
    const ink = root.dataset.style === "hacker"
      ? mixHex(skyPal.moon, "#ffffff", 0.42)
      : "#e2ecff";

    const dot = document.createElement("canvas");
    dot.width = 3;
    dot.height = 3;
    const dg = dot.getContext("2d");
    dg.fillStyle = ink;
    /* 一像素的核心 + 四向很淡的呼吸，夜里是星点，不是雪 */
    dg.globalAlpha = 0.3;
    dg.fillRect(1, 0, 1, 1);
    dg.fillRect(0, 1, 1, 1);
    dg.fillRect(2, 1, 1, 1);
    dg.fillRect(1, 2, 1, 1);
    dg.globalAlpha = 1;
    dg.fillRect(1, 1, 1, 1);

    const big = document.createElement("canvas");
    big.width = 9;
    big.height = 9;
    const bg = big.getContext("2d");
    bg.fillStyle = ink;
    bg.fillRect(4, 4, 2, 2);
    bg.globalAlpha = 0.34;
    bg.fillRect(1, 4, 7, 1);
    bg.fillRect(4, 1, 1, 7);

    starSprites = { dot, big };
  }

  /* ---------- 火光 / 烟 / 焦痕：陨石尾焰与爆炸全靠这三张图 ---------- */
  /* 渐变贴图烘完撒一层极淡的噪点：暗底上纯径向渐变会拉出一圈圈等值线 */
  function ditherSprite(node, amp) {
    const g = node.getContext("2d");
    const w = node.width;
    const h = node.height;
    const img = g.getImageData(0, 0, w, h);
    const px = img.data;
    let seed = 20260117;
    for (let i = 3; i < px.length; i += 4) {
      const a = px[i];
      if (a < 4) continue;
      seed = (seed * 16807) % 2147483647;
      const n = ((seed / 2147483647) - 0.5) * amp;
      px[i] = Math.max(0, Math.min(255, a + n));
    }
    g.putImageData(img, 0, 0);
  }

  function buildFxSprites() {
    const make = (size, stops) => {
      const node = document.createElement("canvas");
      node.width = size;
      node.height = size;
      const g = node.getContext("2d");
      const half = size / 2;
      const ring = g.createRadialGradient(half, half, 0, half, half, half);
      stops.forEach(([at, color]) => ring.addColorStop(at, color));
      g.fillStyle = ring;
      g.fillRect(0, 0, size, size);
      ditherSprite(node, 10);
      return node;
    };

    fireSprite = make(160, [
      [0, "rgba(255, 252, 226, 0.98)"],
      [0.22, "rgba(255, 214, 130, 0.92)"],
      [0.48, "rgba(255, 132, 58, 0.66)"],
      [0.74, "rgba(196, 48, 20, 0.26)"],
      [1, "rgba(120, 20, 6, 0)"]
    ]);
    smokeSprite = make(128, [
      [0, "rgba(46, 40, 38, 0.5)"],
      [0.55, "rgba(34, 30, 30, 0.24)"],
      [1, "rgba(20, 18, 18, 0)"]
    ]);
    scorchSprite = make(128, [
      [0, "rgba(4, 4, 6, 0.78)"],
      [0.45, "rgba(8, 6, 6, 0.42)"],
      [1, "rgba(10, 8, 8, 0)"]
    ]);
  }

  /* ---------- 墓碑：拱顶石碑 + 十字刻痕，三种高矮 ---------- */
  function buildTombSprites() {
    tombSprites = [[10, 14], [9, 11], [11, 16]].map(([w, h], index) => {
      const node = document.createElement("canvas");
      node.width = w * S * 2;
      node.height = h * S * 2;
      const g = node.getContext("2d");
      g.scale(S * 2, S * 2);
      g.imageSmoothingEnabled = false;

      const stone = index === 1 ? "#7d8494" : "#98a1b3";
      g.fillStyle = stone;
      g.beginPath();
      g.moveTo(0.5, h - 0.5);
      g.lineTo(0.5, w * 0.45);
      g.quadraticCurveTo(0.5, 0.5, w / 2, 0.5);
      g.quadraticCurveTo(w - 0.5, 0.5, w - 0.5, w * 0.45);
      g.lineTo(w - 0.5, h - 0.5);
      g.closePath();
      g.fill();

      /* 顶面高光 + 右侧暗部，小尺寸下也能看出是块石头 */
      g.fillStyle = "rgba(255, 255, 255, 0.26)";
      g.fillRect(1, w * 0.5, 0.9, h - w * 0.5 - 1);
      g.fillStyle = "rgba(0, 0, 0, 0.22)";
      g.fillRect(w - 1.6, w * 0.5, 1.2, h - w * 0.5 - 1);

      /* 刻痕：十字 */
      g.globalCompositeOperation = "destination-out";
      g.fillRect(w / 2 - 0.55, w * 0.62, 1.1, h * 0.5);
      g.fillRect(w * 0.26, w * 0.95, w * 0.48, 1.1);
      g.globalCompositeOperation = "source-over";

      return { node, w: w * S, h: h * S };
    });
  }

  /* ---------- 天空渐变：尺寸不变就一直用同一份 ---------- */
  function buildSkyGradients() {
    /* 夜色要压到近乎不透明：跑道底是浅色时，半透明的黑只会变成一片灰 */
    const night = ctx.createLinearGradient(0, 0, 0, H);
    night.addColorStop(0, "rgba(1, 3, 8, 0.99)");
    night.addColorStop(0.58, "rgba(3, 7, 16, 0.97)");
    night.addColorStop(1, "rgba(7, 12, 22, 0.92)");

    /* 夕阳：顶上压一层紫，中间玫瑰，贴地才烧成橙红 */
    const dusk = ctx.createLinearGradient(0, 0, 0, H);
    dusk.addColorStop(0, "rgba(47, 18, 76, 0.99)");
    dusk.addColorStop(0.42, "rgba(126, 40, 86, 0.97)");
    dusk.addColorStop(0.72, "rgba(232, 90, 44, 0.96)");
    dusk.addColorStop(1, "rgba(255, 168, 84, 0.95)");

    /* 蓝调时刻：夜与昼之间垫一层冷色，天色才不会从黑直接灰过去 */
    const blue = ctx.createLinearGradient(0, 0, 0, H);
    blue.addColorStop(0, "rgba(14, 26, 52, 0.95)");
    blue.addColorStop(0.55, "rgba(30, 54, 94, 0.93)");
    blue.addColorStop(1, "rgba(60, 92, 136, 0.9)");

    /* 血色的灭绝天幕 */
    const blood = ctx.createLinearGradient(0, 0, 0, H);
    blood.addColorStop(0, "rgba(96, 8, 12, 0.62)");
    blood.addColorStop(0.55, "rgba(134, 20, 16, 0.5)");
    blood.addColorStop(1, "rgba(72, 8, 8, 0.42)");

    /* 废墟：烧过的灰天，越往上越黑 */
    const dead = ctx.createLinearGradient(0, 0, 0, H);
    dead.addColorStop(0, "rgba(5, 5, 8, 0.97)");
    dead.addColorStop(0.6, "rgba(15, 10, 11, 0.9)");
    dead.addColorStop(1, "rgba(30, 15, 12, 0.78)");

    skyGrad = { night, dusk, blue, blood, dead };
  }

  /* 一次性把不随等级变的东西全烘出来 */
  function buildScenery() {
    buildSun();
    moonSprite = buildMoonSprite();
    buildStarSprites();
    buildFxSprites();
    buildMeteor();
    buildTombSprites();
    buildSkyGradients();
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

    /* 贴图烘焙只在已经烘过（尺寸变化）时重建；第一次交给 ensureBuilt，
       页脚跑道在首屏之外，没必要和首屏的字体、图片抢主线程 */
    if (sprites.dino.length) {
      buildSprites();
      buildScenery();
    }
    buildClouds();
    buildStars();
    return true;
  }

  /* 第一次滚到页脚、或首屏就包含了跑道时，把静态贴图补齐 */
  function ensureBuilt() {
    if (sprites.dino.length) return;
    readPalette();
    buildSprites();
    buildScenery();
  }

  function buildClouds() {
    clouds = Array.from({ length: W < 430 ? 2 : 3 }, (_, i) => ({
      x: (W / (W < 430 ? 2 : 3)) * i + (i % 2 ? 40 : 12),
      y: 10 + (i % 2) * 14 + (H > 120 ? 4 : 0),
      s: S
    }));
  }

  function buildStars() {
    const n = Math.max(15, Math.round(W / 14));
    const skyH = Math.max(12, (groundY || H - 20) - 8);
    stars = Array.from({ length: n }, () => {
      const big = Math.random() < 0.26;
      return {
        x: Math.random() * W,
        /* 铺满整片天，别全挤在最上面一条缝里 */
        y: 4 + Math.random() * skyH,
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
    hideDinos = false;
    sparks = [];
    smoke = [];
    ash = [];
    strip.classList.remove("is-cine", "is-extinct");
    if (extinctEl) {
      extinctEl.hidden = true;
      extinctEl.classList.remove("is-on");
    }
    if (timeEl) timeEl.classList.remove("is-locked");
    if (levelEl) levelEl.textContent = "LV.1";
    if (popEl) {
      popEl.textContent = "";
      popEl.classList.remove("is-on");
    }
    if (toastEl) toastEl.hidden = true;
    if (hintEl) hintEl.style.opacity = "";
    /* 羽色复位：只有已经烘过才重烘。首屏还没进视口时贴图是空的，
       这里再建一次等于把刚推迟的工作又拉回主线程 */
    if (sprites.dino.length) buildSprites();
    updateScore(true);
  }

  /* 最高分落盘节流：跑动时分数每几十毫秒就涨一分，
     逐分写 localStorage 等于每帧做一次同步 IO，白白拖慢主线程 */
  let hiSavedAt = 0;

  function flushHi() {
    try {
      window.localStorage.setItem(HI_KEY, String(hiScore));
    } catch (error) {
      /* 忽略 */
    }
  }

  function updateScore(force) {
    if (!scoreEl) return;
    const next = Math.floor(score);
    if (!force && next === updateScore.last) return;
    updateScore.last = next;

    if (next > hiScore) {
      hiScore = next;
      const now = performance.now();
      /* force 只负责立刻刷新 HUD，落盘依旧按 2.5 秒节流 */
      if (now - hiSavedAt > 2500) {
        hiSavedAt = now;
        flushHi();
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

  /* 结局里唯一能点的东西：时间回溯 */
  if (rewindBtn) {
    rewindBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startRewind();
    });
  }

  /* -------------------------------------------------------
     三、跳跃 / 障碍 / 碰撞
     ------------------------------------------------------- */
  function jump() {
    /* 灭绝演出期间，点画布不跳；要重来只能按左边的「时间回溯」 */
    if (cine) return;

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

    compact(coins, (coin) => !coin.got);
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

    /* 演出自己管昼夜（回溯时还要把日月倒着走），所以不在外面推进 */
    if (cine) {
      updateCinematic(dt);
      return;
    }

    gameClock = (gameClock + dt / DAY_CYCLE) % 1;

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
    compact(obstacles, (item) => item.x + item.w > -40);

    coins.forEach((coin) => {
      coin.x -= speed * dt;
      coin.spin += dt * 5;
    });
    compact(coins, (coin) => coin.x + 9 * S > -20 && coin.x < W + 80);
    collectCoins();

    stepParticles(dt);

    if (popTimer > 0) popTimer -= dt;
    if (popEl && popTimer <= 0 && popEl.classList.contains("is-on")) {
      popEl.classList.remove("is-on");
    }
    if (shake > 0) shake = Math.max(0, shake - dt);

    if (collide()) die();
  }

  /* -------------------------------------------------------
     四之二、100 级灭绝演出
     ---------------------------------------------------------
     天塌 → 巨型陨石 → 爆炸 → 废墟。砸完就停在结局里：
     恐龙没了，地上留一个坑和几块墓碑，画面中间压一句中文，
     左边滑出「时间回溯」。不点它，就永远停在这一帧。
     ------------------------------------------------------- */
  const SKY_T = 1.15;
  const FALL_T = 1.55;
  const BLAST_T = 1.3;
  const WIND_T = 1.9;

  /* 陨石直径按跑道面积算，约四分之一；再用高度封顶，窄屏也撑得满 */
  function meteorRadius() {
    const d = Math.max(H * 0.66, Math.min(W * 0.29, H * 1.28));
    return d / 2;
  }

  function startExtinction() {
    const r = meteorRadius();
    cine = {
      phase: reduce.matches ? "ruins" : "sky",
      t: 0,
      r,
      clock0: gameClock,
      worldX0: worldX,
      score0: score,
      impactX: Math.max(W * 0.34, Math.min(W * 0.66, startX + 110 * S)),
      impactY: groundY - 2,
      mx: W * 1.12,
      my: -r * 1.05,
      fire: 0,
      tombs: [],
      rubble: []
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
    dust = [];
    sparks = [];
    smoke = [];
    ash = [];
    dead = false;
    hideDinos = false;

    /* 减弱动效：直接给结局，不做下落与爆炸 */
    if (reduce.matches) enterRuins();
  }

  /* 落地：火球、冲击波、火星、烟，恐龙在这一帧消失 */
  function blast() {
    const c = cine;
    c.phase = "blast";
    c.t = 0;
    shake = 1;
    flash = 1;
    hideDinos = true;
    layRuins();

    for (let i = 0; i < 54; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const power = 90 + Math.random() * 430;
      sparks.push({
        x: c.impactX,
        y: c.impactY - 6,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power * 0.72 - 130,
        life: 0.5 + Math.random() * 0.8,
        max: 1.3,
        size: Math.random() < 0.35 ? 3 : 2
      });
    }

    for (let i = 0; i < 14; i += 1) {
      smoke.push({
        x: c.impactX + (Math.random() - 0.5) * c.r,
        y: c.impactY - 8 - Math.random() * 10,
        vx: (Math.random() - 0.5) * 54,
        vy: -22 - Math.random() * 46,
        life: 1.5 + Math.random() * 1.4,
        max: 3,
        size: c.r * (0.7 + Math.random() * 0.9)
      });
    }
  }

  /* 墓碑与碎石的位置：砸之前就排好，砸完只让它们往上升 */
  function layRuins() {
    const c = cine;
    const spots = [0.15, 0.29, 0.71, 0.85];
    c.tombs = spots.map((f, i) => ({
      x: W * f + (i % 2 ? 3 : -3),
      variant: i % 3,
      tilt: (i % 2 ? 1 : -1) * (2 + (i % 3) * 2),
      rise: 0
    }));

    c.pit = Array.from({ length: 9 }, (_, i) => 0.55 + Math.random() * 0.9 + (i === 4 ? 0.5 : 0));

    c.rubble = [];
    for (let i = 0; i < 8; i += 1) {
      c.rubble.push({
        x: W * (0.06 + i * 0.12) + Math.random() * 10,
        w: 4 + Math.random() * 9,
        h: 2 + Math.random() * 4,
        dark: i % 3 === 0
      });
    }
  }

  /* 结局：中文压屏 + 左边按钮，之后不再自动推进 */
  function enterRuins() {
    cine.phase = "ruins";
    cine.t = 0;
    hideDinos = true;
    if (!cine.tombs.length) layRuins();
    cine.tombs.forEach((tomb) => {
      tomb.rise = 1;
    });
    buildAsh();
    cine.smokeIn = 0.3;
    strip.classList.add("is-extinct");
    if (hintEl) hintEl.style.opacity = "0";
    if (timeEl) timeEl.classList.add("is-locked");
    if (extinctEl) {
      extinctEl.hidden = false;
      window.requestAnimationFrame(() => extinctEl.classList.add("is-on"));
    }
  }

  /* 用户点「时间回溯」才走这一步 */
  function startRewind() {
    if (!cine || cine.phase !== "ruins") return;
    cine.phase = "rewind";
    cine.t = 0;
    cine.clock0 = gameClock;
    strip.classList.remove("is-extinct");
    if (extinctEl) extinctEl.classList.remove("is-on");
    ash = [];
    if (reduce.matches) {
      cineFinish();
      return;
    }
    /* 火星倒着收回去，像磁带倒放 */
    sparks.forEach((p) => {
      p.vx *= -1.2;
      p.vy = p.vy * -0.6;
      p.life = Math.max(p.life, 0.7);
    });
  }

  function cineFinish() {
    cine = null;
    hideDinos = false;
    sparks = [];
    smoke = [];
    ash = [];
    if (extinctEl) {
      extinctEl.hidden = true;
      extinctEl.classList.remove("is-on");
    }
    strip.classList.remove("is-cine", "is-extinct");
    if (timeEl) timeEl.classList.remove("is-locked");
    resetRun();
    pop("时间重新流动", "level");
  }

  function updateCinematic(dt) {
    const c = cine;
    c.t += dt;

    /* 演出期间公共的余韵衰减照常走 */
    if (flash > 0) flash = Math.max(0, flash - dt * 1.1);
    if (shake > 0) shake = Math.max(0, shake - dt);
    if (popTimer > 0) popTimer -= dt;
    if (popEl && popTimer <= 0 && popEl.classList.contains("is-on")) {
      popEl.classList.remove("is-on");
    }
    stepParticles(dt);

    if (c.phase === "sky") {
      /* 天压下来、血色渗进来，星星一颗颗灭；日月就停在被吞掉的那一刻 */
      if (c.t >= SKY_T) {
        c.phase = "meteor";
        c.t = 0;
      }
      return;
    }

    if (c.phase === "meteor") {
      const p = Math.min(1, c.t / FALL_T);
      const ease = Math.pow(p, 1.7); /* 越落越快 */
      c.mx = W * 1.12 + (c.impactX - W * 1.12) * ease;
      c.my = -c.r * 1.05 + (c.impactY - c.r * 0.5 + c.r * 1.05) * ease;

      /* 尾焰拖一把碎火，落到一半就越烧越旺 */
      if (Math.random() < 0.9) {
        sparks.push({
          x: c.mx + (Math.random() - 0.5) * c.r * 1.2,
          y: c.my - c.r * 0.6 + (Math.random() - 0.5) * c.r,
          vx: 40 - Math.random() * 130,
          vy: -50 - Math.random() * 70,
          life: 0.4 + Math.random() * 0.4,
          max: 0.8,
          size: Math.random() < 0.5 ? 3 : 2
        });
      }

      if (c.t >= FALL_T) blast();
      return;
    }

    if (c.phase === "blast") {
      c.tombs.forEach((tomb, i) => {
        tomb.rise = Math.min(1, Math.max(0, (c.t - 0.45 - i * 0.09) / 0.55));
      });
      if (c.t >= BLAST_T) enterRuins();
      return;
    }

    if (c.phase === "ruins") {
      /* 只剩灰在落、烟在冒。什么都不推进，等用户按左边那颗按钮 */
      updateAsh(dt);
      c.smokeIn -= dt;
      if (c.smokeIn <= 0 && smoke.length < 16) {
        smoke.push({
          x: c.impactX + (Math.random() - 0.5) * c.r * 0.9,
          y: groundY - 4,
          vx: 4 - Math.random() * 14,
          vy: -12 - Math.random() * 16,
          life: 2.6,
          max: 2.6,
          size: c.r * (0.34 + Math.random() * 0.3),
          a: 0.4
        });
        c.smokeIn = 0.45 + Math.random() * 0.55;
      }
      return;
    }

    if (c.phase === "rewind") {
      const p = Math.min(1, c.t / WIND_T);
      const eased = p * p * (3 - 2 * p);

      /* 时间倒着走：日月跟着倒退大半圈，中途能看到月亮沉下去、太阳升上来 */
      gameClock = (c.clock0 - 0.58 * eased + 1) % 1;
      worldX = c.worldX0 * (1 - eased);
      score = c.score0 * (1 - eased);
      distance = score * 14;
      updateScore(false);

      c.tombs.forEach((tomb, i) => {
        const back = Math.min(1, Math.max(0, (c.t - 0.18 - i * 0.06) / 0.7));
        tomb.rise = 1 - back;
      });

      if (p >= 1) cineFinish();
    }
  }

  /* -------------------------------------------------------
     四之三、粒子与废墟
     ---------------------------------------------------------
     所有粒子都用「下标覆盖」就地压缩，不用 filter 造新数组：
     跑动时每秒几十次分配，GC 一抖就是肉眼可见的卡顿。
     ------------------------------------------------------- */
  /* 就地压缩：活着的往前搬，不新建数组（每帧 filter 一次就是一次 GC） */
  function compact(list, alive) {
    let keep = 0;
    for (let i = 0; i < list.length; i += 1) {
      const item = list[i];
      if (!alive || alive(item)) {
        list[keep] = item;
        keep += 1;
      }
    }
    list.length = keep;
  }

  function stepList(list, dt, gravity, drag) {
    let keep = 0;
    for (let i = 0; i < list.length; i += 1) {
      const p = list[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += gravity * dt;
      if (drag) p.vx *= 1 - Math.min(0.9, dt * drag);
      p.life -= dt;
      if (p.life > 0) {
        list[keep] = p;
        keep += 1;
      }
    }
    list.length = keep;
  }

  function stepParticles(dt) {
    if (dust.length) stepList(dust, dt, 220, 0);
    if (sparks.length) stepList(sparks, dt, 320, 0.6);
    if (smoke.length) stepList(smoke, dt, -14, 0.9);
  }

  function buildAsh() {
    ash = [];
    const n = W < 520 ? 12 : 20;
    for (let i = 0; i < n; i += 1) {
      ash.push({
        x: Math.random() * W,
        y: Math.random() * groundY,
        vx: -6 - Math.random() * 12,
        vy: 10 + Math.random() * 20,
        size: Math.random() < 0.4 ? 2 : 1,
        a: 0.16 + Math.random() * 0.32
      });
    }
  }

  function updateAsh(dt) {
    for (let i = 0; i < ash.length; i += 1) {
      const a = ash[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.y > groundY) {
        a.y = -3;
        a.x = Math.random() * W;
      }
      if (a.x < -6) a.x = W + 4;
    }
  }

  function drawAsh() {
    if (!cine || cine.phase !== "ruins" || !ash.length) return;
    ctx.fillStyle = "#d9cfc2";
    for (let i = 0; i < ash.length; i += 1) {
      const a = ash[i];
      ctx.globalAlpha = a.a;
      ctx.fillRect(Math.round(a.x), Math.round(a.y), a.size, a.size);
    }
    ctx.globalAlpha = 1;
  }

  /* 火星：新的是亮黄，烧到最后转暗红 */
  function drawSparks() {
    if (!sparks.length) return;
    for (let i = 0; i < sparks.length; i += 1) {
      const p = sparks[i];
      const t = Math.max(0, Math.min(1, p.life / p.max));
      ctx.fillStyle = t > 0.62 ? "#ffe6a8" : t > 0.3 ? "#ff9a4d" : "#a83a1c";
      ctx.globalAlpha = Math.min(1, t * 1.4);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawSmoke() {
    if (!smoke.length || !smokeSprite) return;
    for (let i = 0; i < smoke.length; i += 1) {
      const p = smoke[i];
      const t = Math.max(0, Math.min(1, p.life / p.max));
      const size = p.size * (1.6 - t * 0.7);
      ctx.globalAlpha = Math.min(0.5, t * 0.6) * (p.a || 1);
      ctx.drawImage(smokeSprite, p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  /* 爆炸：膨大的火球 + 贴着地面的冲击波 + 掀起来的土 */
  function drawBlast() {
    if (!cine || cine.phase !== "blast" || !fireSprite) return;
    const c = cine;
    const cx = c.impactX;
    const cy = c.impactY;

    const grow = Math.min(1, c.t / 0.3);
    const fade = 1 - Math.min(1, Math.max(0, (c.t - 0.22) / 0.7));
    const size = c.r * (0.7 + grow * 2.1);

    /* 火球本体 + 几团上下翻的火，别让它只是一坨圆光 */
    ctx.globalAlpha = fade * 0.95;
    ctx.drawImage(fireSprite, cx - size / 2, cy - size * 0.72, size, size);
    for (let i = 0; i < 5; i += 1) {
      const wob = Math.sin(clock * 9 + i * 2.3) * size * 0.18;
      const s2 = size * (0.3 + 0.14 * ((i * 7) % 3));
      ctx.globalAlpha = fade * (0.55 - i * 0.07);
      ctx.drawImage(
        fireSprite,
        cx - s2 / 2 + wob,
        cy - size * (0.3 + 0.1 * i) - s2 / 2 + wob * 0.4,
        s2,
        s2
      );
    }

    /* 冲击波：两圈贴着地面荡开，别飞上天 */
    for (let i = 0; i < 2; i += 1) {
      const p = Math.min(1, Math.max(0, (c.t - i * 0.1) / (0.66 + i * 0.18)));
      if (p <= 0) continue;
      const rr = c.r * (0.55 + p * (1.4 + i * 0.5));
      ctx.globalAlpha = (1 - p) * (0.5 - i * 0.2);
      ctx.strokeStyle = i ? "#ff9a4d" : "#ffd2a0";
      ctx.lineWidth = Math.max(1, (1 - p) * 3.5);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /* 地面被掀起来的一圈尘 */
    const dustP = Math.min(1, c.t / 0.7);
    ctx.globalAlpha = (1 - dustP) * 0.2;
    ctx.fillStyle = "#8a6a52";
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.16);
    ctx.beginPath();
    ctx.arc(0, 0, c.r * (0.6 + dustP * 3), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 1;
  }

  /* 废墟地面：焦痕、陨石坑、碎石、墓碑 */
  function drawRuinsGround() {
    if (!cine) return;
    const c = cine;
    if (c.phase !== "blast" && c.phase !== "ruins" && c.phase !== "rewind") return;

    const fade = c.phase === "rewind" ? Math.max(0, 1 - c.t / (WIND_T * 0.85)) : 1;
    if (fade <= 0.01) return;

    const r = c.r;

    /* 焦痕 */
    if (scorchSprite) {
      ctx.globalAlpha = 0.8 * fade;
      ctx.drawImage(scorchSprite, c.impactX - r * 1.5, groundY - r * 0.55, r * 3, r * 1.1);
    }

    /* 坑：撕开的地面 + 坑底余烬 + 坑口碎石 */
    if (c.phase !== "blast" || c.t > 0.08) {
      const rx = r * 0.95;
      const pit = c.pit || [1, 1, 1, 1, 1, 1, 1, 1, 1];
      /* 坑再深就掉出画布了，按剩给地面的高度收口 */
      const maxDepth = Math.max(8, H - groundY - 3);
      const depth = Math.min(maxDepth, Math.max(8, r * 0.26));

      ctx.globalAlpha = fade * 0.32;
      ctx.fillStyle = "rgba(9, 5, 4, 0.9)";
      ctx.beginPath();
      ctx.ellipse(c.impactX, groundY + 4, rx * 1.3, rx * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      /* 锯齿坑口：中间最深，两边收口 */
      ctx.globalAlpha = fade;
      ctx.fillStyle = "rgba(2, 3, 5, 0.96)";
      ctx.beginPath();
      ctx.moveTo(c.impactX - rx, groundY + 1);
      for (let i = 0; i < pit.length; i += 1) {
        const t = i / (pit.length - 1);
        const dip = Math.min(maxDepth, Math.sin(t * Math.PI) * depth * pit[i]);
        ctx.lineTo(c.impactX - rx + rx * 2 * t, groundY + 1 + dip);
      }
      ctx.lineTo(c.impactX + rx, groundY + 13);
      ctx.lineTo(c.impactX - rx, groundY + 13);
      ctx.closePath();
      ctx.fill();

      /* 坑口那圈还没冷透的红光 */
      const cool = c.phase === "blast" ? Math.max(0, 1 - c.t / 1.8) : 0.18;
      ctx.globalAlpha = fade * (0.3 + cool * 0.5);
      ctx.strokeStyle = "#ff7b3a";
      ctx.lineWidth = Math.max(1, r * 0.03);
      ctx.beginPath();
      ctx.moveTo(c.impactX - rx, groundY + 1);
      for (let i = 0; i < pit.length; i += 1) {
        const t = i / (pit.length - 1);
        ctx.lineTo(
          c.impactX - rx + rx * 2 * t,
          groundY + 1 + Math.min(maxDepth, Math.sin(t * Math.PI) * depth * pit[i])
        );
      }
      ctx.stroke();

      /* 坑口碎石 */
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = "#4b423a";
      for (let i = 0; i < 4; i += 1) {
        const side = i % 2 ? 1 : -1;
        const off = r * (0.95 + (i >> 1) * 0.2) * side;
        const h = 3 + (i % 3) * 2;
        ctx.fillRect(Math.round(c.impactX + off), Math.round(groundY - h), 5 + (i % 2) * 3, h);
      }

      /* 坑底余烬 */
      ctx.fillStyle = "#ff8a3d";
      for (let i = 0; i < 3; i += 1) {
        const flick = 0.35 + 0.45 * Math.abs(Math.sin(clock * 2.2 + i * 2.1));
        ctx.globalAlpha = fade * flick;
        ctx.fillRect(
          Math.round(c.impactX - r * 0.3 + i * r * 0.26),
          Math.round(groundY + 4 + (i % 2) * 3),
          3,
          2 + (i % 2)
        );
      }
    }

    /* 碎石 */
    ctx.globalAlpha = 0.9 * fade;
    for (let i = 0; i < c.rubble.length; i += 1) {
      const rock = c.rubble[i];
      ctx.fillStyle = rock.dark ? "#3a3330" : "#6b6157";
      ctx.fillRect(Math.round(rock.x), Math.round(groundY - rock.h), Math.round(rock.w), Math.round(rock.h));
    }

    /* 墓碑：从土里顶出来，只在土面以上可见 */
    if (tombSprites.length) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, groundY);
      ctx.clip();
      for (let i = 0; i < c.tombs.length; i += 1) {
        const tomb = c.tombs[i];
        if (tomb.rise <= 0.02) continue;
        const sprite = tombSprites[tomb.variant % tombSprites.length];
        if (!sprite) continue;
        const lift = sprite.h * (1 - tomb.rise);
        ctx.globalAlpha = fade;
        ctx.save();
        ctx.translate(tomb.x, groundY + lift + 2);
        ctx.rotate((tomb.tilt * Math.PI) / 180);
        ctx.drawImage(sprite.node, -sprite.w / 2, -sprite.h, sprite.w, sprite.h);
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  /* 游戏内昼夜：太阳走 0→0.5 的白天弧，月亮走 0.5→1 的夜弧。
     夜色和晚霞都按「离日落多远」来算，绕着 1 点连续，
     所以月亮沉下去时天只会慢慢变亮，不会再冒出一片夕阳。 */
  const ring = (v) => ((v % 1) + 1) % 1;
  const smoothStep = (a, b, v) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  function skyPhases() {
    const cyc = gameClock;
    /* s：以日落为零点绕圈，0 = 太阳刚落，0.5 = 太阳刚升 */
    const s = ring(cyc - 0.5);

    /* 日落后立刻压黑，日出前 0.45→0.6 透亮 */
    const nightAmt = smoothStep(0, 0.072, s) * (1 - smoothStep(0.45, 0.6, s));

    /* 晚霞只挂在日落这一侧：d=0 时最浓，边缘平滑归零。
       用 (1 - d/w)^1.55 而不是抛物线：抛物线中间是一大片饱和的平台，
       看着像黄昏卡住了；这条曲线在峰值处尖、两侧退得快，约 5 秒收完 */
    const d = Math.min(s, 1 - s);
    const duskAmt = Math.pow(Math.max(0, 1 - d / 0.075), 1.55);

    const sunT = cyc < 0.5 ? cyc / 0.5 : -1;
    /* 月亮等晚霞退干净了再从左边升起来，别跟夕阳同框 */
    const moonT = cyc >= 0.64 ? (cyc - 0.64) / 0.36 : -1;
    return { cyc, s, nightAmt, duskAmt, sunT, moonT };
  }

  /* 天体走的扁弧：贴地平线升起，中间最高，落到另一头 */
  function arcPos(t, radius) {
    const foot = groundY - radius - 6;
    const high = Math.max(14, groundY * 0.17);
    return {
      x: W * (0.05 + 0.9 * t),
      y: foot - Math.sin(t * Math.PI) * (foot - high)
    };
  }

  /* 日月在演出里什么时候还在：天塌时被吞掉，回溯时重新升起来 */
  function celestialKill() {
    if (!cine) return 1;
    switch (cine.phase) {
      case "sky": return Math.max(0, 1 - cine.t / 0.9);
      case "rewind": return Math.min(1, cine.t / 1.1);
      default: return 0;
    }
  }

  /* 演出的血色天幕：sky 渐入，砸完停在血天，回溯时退回白昼 */
  function bloodAmt() {
    if (!cine) return 0;
    switch (cine.phase) {
      case "sky": return Math.min(1, cine.t / 1.0);
      case "meteor": return 1;
      case "blast": return 1 - Math.min(0.45, cine.t / 1.2 * 0.45);
      case "ruins": return 0.55;
      case "rewind": return Math.max(0, 0.55 - (cine.t / 1.9) * 1.1);
      default: return 0;
    }
  }

  function drawSky(phases) {
    if (!skyGrad) return;
    const { nightAmt, duskAmt } = phases;
    const hacker = root.dataset.style === "hacker";

    if (hacker) {
      /* 黑客风：天永远纯黑，只剩日月和星星在动 */
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);
    } else {
      /* 先压黑、再铺晚霞：日落那几秒夜色已经到位。晚霞从半透明退场时
         底下是黑的，天色只会一路暗下去，不会在中间亮回来一块 */
      if (nightAmt > 0.01) {
        ctx.globalAlpha = nightAmt;
        ctx.fillStyle = skyGrad.night;
        ctx.fillRect(0, 0, W, H);
      }
      if (duskAmt > 0.01) {
        /* 直接用 0~1 的权重，别截断：截断会让峰值附近几秒颜色完全不变 */
        ctx.globalAlpha = duskAmt;
        ctx.fillStyle = skyGrad.dusk;
        ctx.fillRect(0, 0, W, H);
      }
      /* 冷暖交接处垫一层冷蓝；夜里最深处不加 */
      const blueAmt = Math.pow(4 * nightAmt * (1 - nightAmt), 1.15) * 0.8 * (1 - duskAmt * 0.9);
      if (blueAmt > 0.01) {
        ctx.globalAlpha = blueAmt;
        ctx.fillStyle = skyGrad.blue;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalAlpha = 1;
    }

    const blood = bloodAmt();
    if (blood > 0.01) {
      ctx.globalAlpha = blood;
      ctx.fillStyle = skyGrad.blood;
      ctx.fillRect(0, 0, W, H);
    }

    /* 陨石落下来时天就该黑透，不然火光跟血天糊成一片 */
    let dead = 0;
    if (cine) {
      if (cine.phase === "meteor") dead = Math.min(1, cine.t / 0.9) * 0.62;
      else if (cine.phase === "blast") dead = 0.62 + Math.min(1, cine.t / 0.6) * 0.38;
      else if (cine.phase === "ruins") dead = 1;
      else if (cine.phase === "rewind") dead = Math.max(0, 1 - cine.t / 1.4);
    }
    if (dead > 0.01) {
      ctx.globalAlpha = dead * 0.92;
      ctx.fillStyle = skyGrad.dead;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  }

  /* 太阳：贴地时发红、升高转金，全由高度算，不另存状态 */
  function drawSun(phases) {
    if (!sunSprite || phases.sunT < 0) return;

    const t = phases.sunT;
    /* 出地平线淡入；落山时别急着消失，留一轮贴着地平线的红日，
       否则晚霞最浓那几秒天上什么都没有 */
    const fade = Math.min(1, t / 0.07) * Math.min(1, (1 - t) / 0.035);
    if (fade <= 0.01) return;

    const alt = Math.sin(t * Math.PI);
    /* 贴地时按大气折射放大一点，落日才有一颗能看见的圆 */
    const r = sunSprite.r * (1 + (1 - alt) * 0.3);
    const p = arcPos(t, r);
    const kill = celestialKill();
    if (kill <= 0.02) return;
    const alpha = fade * (isNight() ? 0.78 : 1) * kill;

    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.drawImage(sunSprite.node, p.x - sunSprite.box / 2, p.y - sunSprite.box / 2, sunSprite.box, sunSprite.box);
    ctx.globalAlpha = alpha;
    /* 黑客风：一整颗荧光绿，不做红→金的渐变，免得中途变成土黄 */
    ctx.fillStyle = root.dataset.style === "hacker"
      ? mixHex(skyPal.sun, skyPal.sunLit, Math.min(1, alt * 1.2))
      : mixHex("#ff6a3d", palette.goldLit, Math.min(1, alt * 1.7));
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    /* 贴地时补一颗亮核：橙红的落日压在同色晚霞上会整个糊掉 */
    if (alt < 0.4) {
      const k = 1 - alt / 0.4;
      ctx.globalAlpha = alpha * k * 0.92;
      ctx.fillStyle = "#fff4d2";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * (0.4 + 0.24 * k), 0, Math.PI * 2);
      ctx.fill();
    }
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

  function drawStars(phases) {
    if (!stars.length || !starSprites) return;

    const nightSky = phases.nightAmt;
    /* 夜里满星；天亮时按高次幂收掉，免得灰天里还挂着一片十字 */
    const base = Math.max(Math.pow(nightSky, 1.7) * 0.95, (isNight() ? 0.07 : 0.04) * (1 - nightSky))
      * (1 - Math.min(1, phases.duskAmt * 1.3));
    /* 演出的天塌下来：星星先一颗颗灭 */
    const kill = 1 - bloodAmt();
    const strength = base * kill;
    if (strength < 0.02) return;

    const night = nightSky > 0.35;
    for (let i = 0; i < stars.length; i += 1) {
      const star = stars[i];
      const drift = (star.x - worldX * star.depth) % (W + 40);
      const x = Math.round(drift < 0 ? drift + W + 40 : drift);

      /* 夜间把 sin 的峰值削尖，亮一下再暗下去 */
      const wave = 0.5 + 0.5 * Math.sin(clock * star.twSpeed + star.tw);
      const pulse = night ? Math.pow(wave, 1.7) : wave;
      const alpha = strength * (night ? 0.26 + 0.74 * pulse : 0.72 + 0.28 * pulse);
      if (alpha < 0.015) continue;

      ctx.globalAlpha = Math.min(1, alpha);
      if (star.big && starSprites.big) {
        ctx.drawImage(starSprites.big, x - 4, Math.round(star.y) - 4);
      } else {
        ctx.drawImage(starSprites.dot, x, Math.round(star.y));
      }
    }
    ctx.globalAlpha = 1;
  }

  /* 月亮：跟着游戏内夜弧走，跟太阳一头落一头起 */
  function drawMoon(phases) {
    if (!moonSprite || phases.moonT < 0) return;

    const t = phases.moonT;
    const fade = Math.min(1, t / 0.06) * Math.min(1, (1 - t) / 0.06);
    if (fade <= 0.01) return;

    const kill = celestialKill();
    if (kill <= 0.02) return;

    const p = arcPos(t, 11);
    const half = moonSprite.box / 2;

    ctx.globalAlpha = fade * (isNight() ? 1 : 0.94) * kill;
    ctx.drawImage(moonSprite.node, p.x - half, p.y - half, moonSprite.box, moonSprite.box);
    ctx.globalAlpha = 1;
  }

  function drawClouds(phases) {
    const nightFade = 1 - phases.nightAmt;
    if (nightFade < 0.05) return;

    const s = S;
    /* 晚霞把云染暖，白天还是皮肤色 */
    ctx.fillStyle = mixHex(palette.dim, "#ff8a4d", Math.min(1, phases.duskAmt * 0.85));
    ctx.globalAlpha = 0.45 * nightFade;

    for (let i = 0; i < clouds.length; i += 1) {
      const cloud = clouds[i];
      const drift = (worldX * 0.08 + cloud.x) % (W + 120);
      const x = W + 40 - drift;
      const y = cloud.y;

      ctx.fillRect(x, y + s, 6 * s, 2 * s);
      ctx.fillRect(x + 2 * s, y, 4 * s, 2 * s);
      ctx.fillRect(x + 5 * s, y + s, 5 * s, 2 * s);
    }

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
    if (hideDinos) return;
    const sprite = sprites.dino[frame];
    const moonlit = nightLift > 0.02 ? sprites.dinoNight[frame] : null;

    /* 40 级起，跟随龙从波浪跟跳收紧成衔尾式齐冲 */
    const formation = level >= 40;

    for (let i = count - 1; i >= 0; i -= 1) {
      const x = Math.round(startX - i * spacing);
      const lag = speed > 0 ? (i * spacing) / speed : 0;
      const y = i === 0 ? jumpY : trailY(formation ? Math.min(lag, 0.07) : lag);
      const alpha = 1 - i * (formation ? 0.1 : 0.14);
      ctx.globalAlpha = alpha;

      /* 领队辉光：里程碑发亮 / 无敌星金身 */
      if (i === 0 && starTimer > 0) {
        ctx.shadowColor = palette.gold;
        ctx.shadowBlur = 8 + Math.sin(clock * 22) * 4;
      } else if (i === 0 && stageGlow > 0) {
        ctx.shadowColor = palette.accent;
        ctx.shadowBlur = 9 * stageGlow;
      }

      const py = Math.round(groundY - H_UNITS * S + y);
      if (moonlit) {
        ctx.globalAlpha = alpha * (1 - nightLift);
        ctx.drawImage(sprite, x, py);
        ctx.globalAlpha = alpha * nightLift;
        ctx.drawImage(moonlit, x, py);
      } else {
        ctx.drawImage(sprite, x, py);
      }
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

    /* 每帧只算一次昼夜，日、月、星、云共用同一份 */
    const phases = skyPhases();
    /* 暗色主题的恐龙本来就是亮的，不用再提；浅色主题夜里才需要补光。
       阈值要等天真的黑下来（nightAmt ≈ 0.86 之后）才启动：晚霞刚退、天还是
       灰紫的时候，深蓝的恐龙本来就看得见，提前补光反而把它洗成一片灰。 */
    nightLift = isNight() ? 0 : Math.min(1, Math.max(0, (phases.nightAmt - 0.86) / 0.14)) * phases.nightAmt;
    drawSky(phases);
    drawSun(phases);
    drawStars(phases);
    drawMoon(phases);
    drawClouds(phases);
    drawSpeedLines();
    drawGround();
    drawRuinsGround();
    drawObstacles();
    drawCoins();
    drawDinos(frame);
    drawMeteor();
    drawSmoke();
    drawBlast();
    drawDust();
    drawSparks();
    drawAsh();

    /* 里程碑轻闪：一下就收，不喧宾夺主 */
    if (flash > 0) {
      ctx.fillStyle = withAlpha(palette.goldLit, 0.16 * Math.min(1, flash));
      ctx.fillRect(0, 0, W, H);
    }

    /* 陨石落地的白光：只有爆炸那一瞬 */
    if (cine && cine.phase === "blast" && cine.t < 0.13) {
      ctx.globalAlpha = (1 - cine.t / 0.13) * 0.9;
      ctx.fillStyle = "#fff4e0";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
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
  /* 陨石：一颗占满画面三分之一的火球，拖十六团尾焰砸下来 */
  function drawMeteor() {
    if (!cine || !meteorSprite || !fireSprite) return;
    const c = cine;
    if (c.phase !== "meteor" && c.phase !== "rewind") return;

    let mx = c.mx;
    let my = c.my;
    if (c.phase === "rewind") {
      const p = Math.min(1, c.t / WIND_T);
      mx = c.impactX + (W * 1.14 - c.impactX) * p;
      my = c.impactY - (c.impactY + c.r * 1.6) * p;
    }

    const r = c.r;
    /* 来路在右上，尾巴就往右上拖 */
    const dx = 0.92;
    const dy = -0.39;

    for (let i = 16; i >= 1; i -= 1) {
      const k = i / 16;
      const wobble = Math.sin(clock * 12 + i * 1.7) * r * 0.07;
      const dist = r * (0.9 + k * 3.4);
      const size = r * (1.5 - k * 0.95);
      ctx.globalAlpha = Math.pow(1 - k, 1.4) * 0.5;
      ctx.drawImage(
        fireSprite,
        mx + dx * dist + wobble - size / 2,
        my + dy * dist - size / 2,
        size,
        size
      );
    }

    /* 大气摩擦：外圈一层虚火，紧贴石头再裹一层实的，边缘就烧起来了 */
    ctx.globalAlpha = 0.55;
    ctx.drawImage(fireSprite, mx - r * 2, my - r * 2, r * 4, r * 4);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(fireSprite, mx - r * 1.24, my - r * 1.24, r * 2.48, r * 2.48);

    /* 石核：轮廓自己是坑洼的，不再描边——一圈亮线只会像塑料壳 */
    const rock = r * 0.93;
    ctx.globalAlpha = 1;
    ctx.drawImage(meteorSprite, mx - rock, my - rock, rock * 2, rock * 2);
  }

  /* 陨石轮廓：三组错相的正弦起伏叠一层细碎噪点，再随机啃掉几口。
     刻意不成周期，免得画出来像花瓣或齿轮 */
  const METEOR_SHAPE = (() => {
    const n = 26;
    const out = [];
    let seed = 9173;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const phase = [rnd() * 6.283, rnd() * 6.283, rnd() * 6.283];
    /* 三处咬口，位置随机后固定，避免落在正上方挡住视线 */
    const bites = [0, 0, 0].map(() => 2 + Math.floor(rnd() * (n - 4)));
    for (let i = 0; i < n; i += 1) {
      const angle = (i / n) * Math.PI * 2;
      let k =
        1 +
        0.08 * Math.sin(angle * 2 + phase[0]) +
        0.055 * Math.sin(angle * 3 + phase[1]) +
        0.03 * Math.sin(angle * 5 + phase[2]);
      k += (rnd() - 0.5) * 0.05;
      bites.forEach((b) => {
        const d = Math.min(Math.abs(i - b), n - Math.abs(i - b));
        if (d === 0) k -= 0.17 + rnd() * 0.05;
        else if (d === 1) k -= 0.05;
      });
      out.push({ a: angle, k: Math.max(0.74, Math.min(1.06, k)) });
    }
    return out;
  })();

  function meteorPath(g, cx, cy, r) {
    const n = METEOR_SHAPE.length;
    const pt = (i) => {
      const p = METEOR_SHAPE[((i % n) + n) % n];
      return { x: cx + Math.cos(p.a) * r * p.k, y: cy + Math.sin(p.a) * r * p.k };
    };
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    g.beginPath();
    const start = mid(pt(-1), pt(0));
    g.moveTo(start.x, start.y);
    for (let i = 0; i < n; i += 1) {
      const cur = pt(i);
      const next = mid(cur, pt(i + 1));
      g.quadraticCurveTo(cur.x, cur.y, next.x, next.y);
    }
    g.closePath();
  }

  /* 陨石本体烘一次：烧黑的岩壳 + 熔缝，之后只做缩放 */
  function buildMeteor() {
    const size = 200;
    const node = document.createElement("canvas");
    node.width = size;
    node.height = size;
    const g = node.getContext("2d");
    const c = size / 2;
    /* 轮廓最鼓处约 1.14r，留够边，否则会被贴图边界削平 */
    const r = c * 0.86;

    const body = g.createRadialGradient(c - r * 0.3, c - r * 0.35, r * 0.1, c, c, r);
    body.addColorStop(0, "#8a3a28");
    body.addColorStop(0.45, "#4a1a14");
    body.addColorStop(0.86, "#2b0f0a");
    body.addColorStop(1, "#220c08");
    g.fillStyle = body;
    meteorPath(g, c, c, r);
    g.fill();

    /* 坑、缝、内热都裁进轮廓里，边缘才不会露出来 */
    g.save();
    meteorPath(g, c, c, r);
    g.clip();

    /* 岩壳边缘被大气烧红了一圈，剪影才不会糊进夜空里 */
    g.strokeStyle = "rgba(150, 54, 24, 0.55)";
    g.lineWidth = r * 0.1;
    meteorPath(g, c, c, r * 0.955);
    g.stroke();

    /* 撞击坑 */
    g.fillStyle = "rgba(18, 6, 4, 0.6)";
    const pits = [[-0.34, -0.18, 0.16], [0.22, 0.3, 0.12], [0.36, -0.32, 0.09], [-0.1, 0.44, 0.08]];
    for (let i = 0; i < pits.length; i += 1) {
      const [px, py, pr] = pits[i];
      g.beginPath();
      g.arc(c + r * px, c + r * py, r * pr, 0, Math.PI * 2);
      g.fill();
    }

    /* 熔缝：岩壳裂开的地方还在烧 */
    g.strokeStyle = "rgba(255, 132, 56, 0.9)";
    g.lineWidth = Math.max(1.5, r * 0.028);
    g.lineCap = "round";
    const cracks = [
      [-0.62, -0.05, -0.28, -0.22, 0.02, 0.12],
      [-0.05, -0.6, 0.12, -0.24, 0.34, 0.05],
      [0.1, 0.52, 0.3, 0.28, 0.5, 0.34],
      [-0.3, 0.28, -0.02, 0.4, 0.24, 0.62]
    ];
    for (let i = 0; i < cracks.length; i += 1) {
      const k = cracks[i];
      g.beginPath();
      g.moveTo(c + r * k[0], c + r * k[1]);
      g.lineTo(c + r * k[2], c + r * k[3]);
      g.lineTo(c + r * k[4], c + r * k[5]);
      g.stroke();
    }

    /* 中心透出来的一点热度 */
    const core = g.createRadialGradient(c, c, 0, c, c, r * 0.85);
    core.addColorStop(0, "rgba(255, 120, 48, 0.35)");
    core.addColorStop(1, "rgba(255, 90, 30, 0)");
    g.fillStyle = core;
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.fill();
    g.restore();

    meteorSprite = node;
  }

  function loop(now) {
    if (!running) return;

    if (!lastTime) lastTime = now;
    const rawDt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    /* 结局是一帧静止的废墟，隔帧画一次就够，手机省一半电 */
    if (cine && cine.phase === "ruins") {
      idleSkip = !idleSkip;
      if (idleSkip) {
        raf = window.requestAnimationFrame(loop);
        return;
      }
    }

    /* 时间加速：先乘倍率，再切成小步长跑物理，跳弧线不会因为步子大而糊 */
    const scaled = rawDt * (cine ? 1 : timeScale);
    const steps = Math.max(1, Math.ceil(scaled / 0.034));
    const sub = scaled / steps;
    const tUpdate = performance.now();
    for (let i = 0; i < steps; i += 1) update(sub);
    perfUpdate = perfUpdate ? perfUpdate * 0.9 + (performance.now() - tUpdate) * 0.1 : performance.now() - tUpdate;

    const frame = activated && !reduce.matches ? Math.floor(now / 105) % 2 : 0;
    const tDraw = performance.now();
    draw(frame);
    perfDraw = perfDraw ? perfDraw * 0.9 + (performance.now() - tDraw) * 0.1 : performance.now() - tDraw;

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

  /* 切风格会同时改 data-style 和 data-theme：两个监听如果各重建一遍，
     一次切换就要烘两整套贴图。合并到下一帧，只做一次。 */
  let rebuildQueued = false;
  function scheduleRebuild() {
    if (rebuildQueued) return;
    rebuildQueued = true;
    window.requestAnimationFrame(() => {
      rebuildQueued = false;
      readPalette();
      /* 还没进过视口就不用烘，等 ensureBuilt 用新配色一次做完 */
      if (!sprites.dino.length && !visible) return;
      buildSprites();
      buildScenery();
    });
  }

  document.addEventListener("hnyz:stylechange", scheduleRebuild);

  new MutationObserver(scheduleRebuild).observe(root, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });

  /* 视口内才跑；离开时暂停，顺便让右下角的校徽让位 */
  function setVisible(next) {
    if (next === visible) return;
    visible = next;
    document.body.classList.toggle("is-dino-visible", visible);
    if (visible) {
      ensureBuilt();
      startLoop();
    } else {
      stopLoop();
    }
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
  /* 初始那次 getBoundingClientRect 会强制整页布局，正好撞在首屏上：
     交给 IntersectionObserver 的首次回调，或在 load（布局已完成）后再校 */
  if (document.readyState === "complete") syncVisibility();
  else window.addEventListener("load", syncVisibility, { once: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopLoop();
      flushHi();
    } else if (visible) {
      startLoop();
    }
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
  measure();
  resetRun();
  setMode(mode, false);
  updateScore(true);

  const dinoDebug = () => ({
    visible, running, activated, score, dead, mode, W, H, S,
    obs: obstacles.length, coins: coins.length, level, combo, bestCombo, worldX,
    gameClock, timeScale, starTimer, cine: cine ? cine.phase : null,
    cineT: cine ? Math.round(cine.t * 100) / 100 : 0,
    perf: { update: Math.round(perfUpdate * 100) / 100, draw: Math.round(perfDraw * 100) / 100 },
    hideDinos, sparks: sparks.length, smoke: smoke.length, ash: ash.length,
    meteR: cine ? Math.round(cine.r) : 0,
    tombs: cine ? cine.tombs.filter((t) => t.rise > 0.5).length : 0
  });
  /* 测试钩子：把里程直接拨到指定分数处（线上无入口，仅供调试用） */
  dinoDebug.seek = (target) => {
    distance = target * 14;
  };
  dinoDebug.rewind = () => startRewind();
  dinoDebug.setClock = (value) => {
    gameClock = ((value % 1) + 1) % 1;
  };
  dinoDebug.extinct = () => {
    level = LEVEL_CAP - 1;
    setLevel(LEVEL_CAP);
    startExtinction();
  };
  window.__HNYZ_DINO__ = dinoDebug;

  if (visible) {
    ensureBuilt();
    startLoop();
  }
})();
