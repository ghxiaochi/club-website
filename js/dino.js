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
  let nextLevelAt = 320;
  let popTimer = 0;
  let shake = 0;

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
    coin: []
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
    g.fillStyle = palette.ink;

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
    nextLevelAt = 320;
    popTimer = 0;
    shake = 0;
    if (levelEl) levelEl.textContent = "LV.1";
    if (popEl) {
      popEl.textContent = "";
      popEl.classList.remove("is-on");
    }
    if (toastEl) toastEl.hidden = true;
    if (hintEl) hintEl.style.opacity = "";
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
    const variant = Math.floor(Math.random() * sprites.cacti.length);
    const sprite = sprites.cacti[variant];
    obstacles.push({
      x: W + 24,
      w: sprite.width,
      h: sprite.height,
      variant
    });

    /* 六成的仙人掌上方挂一道金币拱门：跳得准就一路吃过去 */
    if (Math.random() < 0.62) {
      const cx = W + 24 + sprite.width / 2;
      [[-46, 26], [0, 46], [46, 26]].forEach(([dx, lift]) => {
        coins.push({
          x: cx + dx,
          lift,
          frame: 0,
          spin: Math.random() * 0.5,
          got: false
        });
      });
    }
  }

  function obstacleGap() {
    /* 速度越快，间隔时间稍短，但至少留出一次跳跃的距离 */
    return Math.max(0.95, 1.55 - speed / 900) + Math.random() * 0.45;
  }

  function autoJump() {
    const next = obstacles.find((item) => item.x + item.w > startX + 4 * S);
    if (!next) return;
    /* 恐龙右缘（碰撞盒前沿）距仙人掌还有约 0.18 秒路程时起跳 */
    if (next.x - startX < speed * 0.18 + 68) jump();
  }

  function collide() {
    const hitX = startX + 8 * S;
    const hitW = 26 * S;
    const hitTop = groundY + jumpY - 44 * S;
    const hitBottom = groundY + jumpY - 1;

    for (let i = 0; i < obstacles.length; i += 1) {
      const item = obstacles[i];
      if (hitX + hitW < item.x || hitX > item.x + item.w) continue;
      const cactusTop = groundY - item.h + 3;
      if (hitBottom > cactusTop && hitTop < groundY) return true;
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

    worldX += speed * dt;
    clock += dt;
    trail.push({ t: clock, y: jumpY });
    if (trail.length > 150) trail.shift();

    if (dead) {
      deadTimer -= dt;
      if (deadTimer <= 0) resetRun();
      return;
    }

    speed = 240 + Math.min(160, worldX / 80);
    distance += speed * dt;
    score = distance / 14;
    updateScore(false);

    /* 每跨过一个分数门槛升一档：恐龙快一点，HUD 亮一下 */
    if (score >= nextLevelAt && level < 5) {
      setLevel(level + 1);
      pop(`LV.${level} // SPEED UP`, "level");
      nextLevelAt += 320;
    }

    if (mode === "auto") autoJump();

    if (!grounded) {
      vy += GRAVITY * dt;
      jumpY += vy * dt;
      if (jumpY >= 0) {
        jumpY = 0;
        vy = 0;
        grounded = true;
        burstDust(5);
      }
    }

    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawnObstacle();
      spawnIn = obstacleGap();
    }

    obstacles.forEach((item) => { item.x -= speed * dt; });
    obstacles = obstacles.filter((item) => item.x + item.w > -30);

    coins.forEach((coin) => {
      coin.x -= speed * dt;
      coin.spin += dt * 5;
    });
    coins = coins.filter((coin) => coin.x + 8 * S > -20 && coin.x < W + 80);
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

    const night = isNight();
    /* 夜间星星是主角，日间只留一层几乎看不见的底噪 */
    const base = night ? 1 : 0.2;

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

  /* 右上角一弯月亮 */
  function drawMoon() {
    if (!isNight() || !moonSprite) return;

    const r = H > 150 ? 14 : 11;
    const cx = W - r - 22;
    const cy = r + 18;

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

    const s = S;
    ctx.fillStyle = palette.dim;
    ctx.globalAlpha = 0.45;

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
      const frame = Math.floor(coin.spin) % sprites.coin.length;
      const sprite = sprites.coin[frame];
      if (!sprite) return;

      const size = 8 * S;
      const y = groundY - coin.lift - size;
      /* 金币上下浮一点，像悬在那儿 */
      const bob = Math.sin(clock * 3 + coin.x * 0.05) * 1.5;
      ctx.drawImage(sprite, Math.round(coin.x), Math.round(y + bob));
    });
  }

  function drawObstacles() {
    obstacles.forEach((item) => {
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

    for (let i = count - 1; i >= 0; i -= 1) {
      const x = Math.round(startX - i * spacing);
      const lag = speed > 0 ? (i * spacing) / speed : 0;
      const y = i === 0 ? jumpY : trailY(lag);
      ctx.globalAlpha = 1 - i * 0.14;
      ctx.drawImage(sprite, x, Math.round(groundY - H_UNITS * S + y));
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

    drawStars();
    drawMoon();
    drawClouds();
    drawGround();
    drawObstacles();
    drawCoins();
    drawDinos(frame);
    drawDust();

    ctx.restore();
  }

  function loop(now) {
    if (!running) return;

    if (!lastTime) lastTime = now;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    update(dt);

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

  window.__HNYZ_DINO__ = () => ({
    visible, running, activated, score, dead, mode, W, H, S,
    obs: obstacles.length, coins: coins.length, level, combo, bestCombo, worldX
  });

  if (visible) startLoop();
})();
