/* =========================================================
   鼠标轨迹：指针走到哪，碎星就撒到哪
   ---------------------------------------------------------
   默认**一颗都不落**：要先去右边那条「染色区」墨槽上蘸一次墨
   （见 js/ink-slot.js），墨水大约烧 12 秒，用完自动回到无轨迹状态。
   蘸上之后「按距离 + 按时间」双重节拍撒：
     · 走够一格才撒一簇，阈值 10–19px 每簇重抽，不是固定节拍。
       只按时间的话，慢速移动时 45ms 才走 5px，方块比间距还宽，
       两块必然叠在一起，看上去就是「成对出现」；
     · 一簇 = 1 颗主粒 + 3–4 颗碎屑，同色系。碎屑 2–4px、透明度更低、
       寿命更短，撒在主粒外 1.15–1.9 倍边长处 —— 中间留出空隙，
       是飘着的尘，不是粘上去的碎片；
     · 主粒沿法线起伏 ±4–9px、切向再松 2–5px，
       轨迹是一条窄带而不是一根对齐到像素的直线；
     · 静止时不再往外走，绕中心转黄金角落簇，原地铺开一小朵；
     · 上限按「粒」算：移动中 120、停住后 16。到顶时最老的标记淡出，
       90ms 内从当前透明度收到 0，不硬删；
     · 主粒活约 0.9 秒，碎屑 0.3–0.7 秒，消失只有一种方式——原地淡出；
     · 颜色取 GitHub Primer 的那六个亮色，随机取、不与上一簇撞色；
     · 每帧只清上一帧的脏矩形，不整屏 clearRect；
     · 终端风与默认皮肤才建画布，轻量档与 reduced-motion 不建；
     · 没有墨水时不生成，画布空转一帧就停。
   ========================================================= */
(function () {
  "use strict";

  var STEP_MIN = 22;     /* 移动中的最短间隔（ms）：再短就是每帧硬塞，拖尾会被上限吃光 */
  var STEP_MAX = 90;     /* 最长间隔（ms）：慢速时距离门槛管得着，这里只是防止等到天荒地老 */
  var STEP_STILL = 190;  /* 停住时的落簇间隔：慢半拍，不然一堆碎屑在原地不停闪 */
  var STEP_JITTER = 0.5; /* 间隔也带随机，别像节拍器一样一下一下 */
  var GAP_MIN = 10;      /* 相邻两簇的最小间距（px）：必须比主粒宽一档，否则两块会叠成一对 */
  var GAP_MAX = 19;      /* 最大间距：每簇落定后在这个区间重新抽一次，节拍就散了 */
  var LIFE = 0.9;        /* 主粒寿命：0.66 时拖尾只有两百来像素，扫过去像被切断了 */
  var LIFE_JITTER = 0.22;/* 寿命随机浮动：一簇不会整齐地一起消失 */
  var FADE = 0.32;       /* 生命最后这一段开始淡出：实色期长，尾端收得快 */
  var MAX_MOVE = 120;    /* 移动时的上限（粒数）：一簇 4–5 粒，约等于 26 簇 */
  var MAX_STILL = 16;    /* 停住时的上限：原地不堆 */
  var KILL_FADE = 0.09;  /* 被顶掉时的淡出时长：不硬删，90ms 内从当前透明度收到 0 */
  var MOVE_JITTER = 4;   /* 移动中的法向基础起伏，只够让轨迹有呼吸感 */
  var MOVE_MAX = 5;      /* 法向速度加成上限：再快也只到 ±9px，轨迹始终清晰 */
  var TAN_JITTER = 2;    /* 切向松动：让轨迹成一条带，而不是一根像素直线 */
  var TAN_MAX = 3.5;     /* 切向随速度再放开一点，快滑时甩得开 */
  var STILL_MS = 120;    /* 这么久没有新的指针事件就算"停住"（要大于落簇间隔，否则慢移也会被当成停住） */
  var SIZE = 7;          /* 主粒边长（桌面）：比上一版小三档，才有碎的感觉 */
  var SIZE_SM = 6.5;     /* 手机屏窄，主粒按比例再收一点 */
  var SIZE_JITTER = 0.55;/* 主粒尺寸浮动比例：有大有小，才像星屑而不是复制粘贴的方块 */
  var DUST_MIN = 0.24;   /* 碎屑最小：0.24 × 主粒 ≈ 1.7px，比一粒像素大一点 */
  var DUST_MAX = 0.5;    /* 碎屑最大：不超过主粒的一半，才不会看着像另一颗方块 */
  /* 碎屑落在主粒外 1.15–1.9 倍边长处：和主粒之间留出空隙，
     是飘着的尘，不是粘上去的碎片 */
  var DUST_SPREAD = 1.15;
  var DUST_SPREAD_MAX = 1.9;
  var ALPHA_MAIN = 0.95; /* 主粒：满一点，才压得住下面那点碎屑 */
  var ALPHA_DUST = 0.52; /* 碎屑基准：比主粒淡一档半，远看是氛围，近看才是尘 */

  /* GitHub Primer 的六个亮色：蓝紫粉绿橙青，色相彼此拉得开。
     深色主题另备一套亮一档的变体：深底上要更亮才浮得出来，
     而页面里同时有白卡片，不能靠加色混合解决 */
  var PALETTE = ["#4493f8", "#a371f7", "#db61a2", "#3fb950", "#f0883e", "#39c5cf"];
  var PALETTE_DARK = ["#6cb6ff", "#bf8fff", "#f778ba", "#56d364", "#ffa657", "#56d4dd"];

  var trail = null;
  var bound = false;
  var lastCi = -1;

  /* 指针的最后位置与「在不在页面上」。鼠标静止时浏览器不再发
     pointermove，所以生成不能挂在事件上，只能挂在帧循环里读这两个值 */
  var px = 0;
  var py = 0;
  var onPage = false;
  var lastMoveAt = 0;
  var lastTouchAt = 0;   /* 最近一次真手指事件：用来挡住滚动时的合成鼠标事件 */
  var touchLive = false; /* 手指还在屏幕上（touchstart → touchend） */
  var scrolled = false;  /* 这一次手势把页面滚动了 */
  var lastTouchMoveAt = 0;

  /* 指针速度：移动中的抖动幅度跟着它走（快滑时甩得更开），
     也用它算"垂直于运动方向"那根轴 */
  var mvx = 0;
  var mvy = 0;
  var lastTx = 0;
  var lastTy = 0;
  var lastTt = 0;

  /* 终端风与默认皮肤都开：这两套页面本身就是浅色纸带，方块压得住。
     黑客（代码雨）与光场（iframe 舞台）自己有更强的动效，不叠加 */
  function styleOn() {
    var style = document.documentElement.dataset.style || "default";
    return style === "term" || style === "default";
  }

  /* 墨水：只有蘸过墨（墨槽还没烧完）才落块。
     没装 ink-slot.js 的页面等于永远没墨，保持默认无轨迹 */
  function inkOn() {
    return !!(window.HNYZINK && window.HNYZINK.active());
  }

  function allowed() {
    if (!styleOn()) return false;
    if (document.documentElement.dataset.lite) return false;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return true;
  }

  function build() {
    if (trail) return trail;
    if (!allowed()) return null;

    var cv = document.createElement("canvas");
    cv.className = "tty-trail";
    cv.setAttribute("aria-hidden", "true");
    document.body.appendChild(cv);

    var ctx = cv.getContext("2d");
    if (!ctx) {
      cv.parentNode.removeChild(cv);
      return null;
    }

    trail = {
      cv: cv,
      ctx: ctx,
      cells: [],
      w: 0,
      h: 0,
      size: SIZE,
      raf: 0,
      last: 0,
      nextAt: 0,
      nextGap: GAP_MIN,   /* 下一簇要走的距离：每簇落定后重抽 */
      spin: Math.random() * 6.283,  /* 静止时的落点角度：每簇转一个黄金角 */
      dirty: null,        /* 上一帧画过的区域：下一帧只清这一块 */
      seedX: 0,           /* 上一簇落在哪：用来量"走够了没有" */
      seedY: 0
    };

    resize();
    return trail;
  }

  /* 真正按当前视口重设内部分辨率。改 width/height 会把画布擦干净，
     但 cells 一个都不丢 —— 它们按视口坐标存着，下一帧照原样画回来 */
  function applySize() {
    if (!trail) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth;
    var h = window.innerHeight;

    trail.w = w;
    trail.h = h;
    trail.size = w < 720 ? SIZE_SM : SIZE;
    trail.cv.width = Math.round(w * dpr);
    trail.cv.height = Math.round(h * dpr);
    trail.cv.style.width = w + "px";
    trail.cv.style.height = h + "px";
    trail.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* 尺寸一变画布就被擦干净了，脏区也跟着失效 */
    trail.dirty = null;
    /* 立刻按原坐标补画一帧，别让屏幕空一帧再等下一次 rAF */
    paint();
    if (trail.cells.length) wake();
  }

  var resizeTimer = 0;

  function resize() {
    if (!trail) return;
    /* 第一次建画布：立刻量 */
    if (!trail.w || !trail.h) { applySize(); return; }

    /* 手机上一边滑一边滚，地址栏收起/展开会连着发 resize。
       当场重设的话每一发都会擦一次画布，整屏墨迹跟着一闪一闪 ——
       就是用户说的「断触」。压 180ms 防抖，等尺寸稳下来再重设一次；
       这期间旧画布被 CSS 按 100% 拉一下，肉眼看不出来。
       重设时也不清空 cells，所以哪怕真重设了，墨迹也在下一帧回来 */
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      resizeTimer = 0;
      if (!trail) return;
      if (Math.abs(window.innerWidth - trail.w) < 1 && Math.abs(window.innerHeight - trail.h) < 1) return;
      applySize();
    }, 180);
  }

  /* 指针压在 iframe（成员页那个播放器）上时，父页面收不到
     pointermove，位置会卡在边界上一直冒方块。命中测试很便宜，
     每次落块前问一句就够了 */
  function overFrame() {
    var el = document.elementFromPoint(px, py);
    return !!el && el.tagName === "IFRAME";
  }

  /* 往数组里放一粒。到顶就把最老的「还活着」的那粒标记成淡出。
     一次只标一粒：put 是逐粒调的，进一粒腾一粒，长度自然守住上限。
     写成 while 就错了 —— 标记不改变 length，条件永远成立，
     会把整批粒子一口气全标掉，看上去就是"碎屑刚冒出来就整片灭了" */
  function put(t, cell) {
    var cap = cell.still ? MAX_STILL : MAX_MOVE;
    if (t.cells.length >= cap) {
      for (var k = 0; k < t.cells.length; k += 1) {
        if (t.cells[k].dying < 0) {
          t.cells[k].dying = KILL_FADE;
          break;
        }
      }
    }
    t.cells.push(cell);
  }

  function spawn(t, now) {
    var still = now - lastMoveAt > STILL_MS;
    var x = px;
    var y = py;

    /* 单位法线 / 切线：碎屑往法线两侧甩，像火星被运动带开 */
    var sp = Math.sqrt(mvx * mvx + mvy * mvy);
    var hasDir = sp > 8;
    var nx = hasDir ? -mvy / sp : 0;
    var ny = hasDir ? mvx / sp : 1;
    var tx = hasDir ? mvx / sp : 1;
    var ty = hasDir ? mvy / sp : 0;

    if (still) {
      /* 停住不往外走，但也不能一心一意落在同一个点上——那样两簇必然叠成一对。
         绕中心转一个黄金角再落，星屑就一小圈一小圈铺开，像原地冒出来的一朵 */
      t.spin += 2.39996 + (Math.random() - 0.5) * 0.9;
      var rr = 3 + Math.random() * 15;
      x += Math.cos(t.spin) * rr;
      y += Math.sin(t.spin) * rr;
    } else {
      /* 法向按速度放大起伏，切向再松一点点。
         只给法向的话，每一粒都严格落在同一条直线上，那是虚线不是星屑 */
      var amp = MOVE_JITTER + Math.min(MOVE_MAX, sp / 140);
      var offN = (Math.random() - 0.5) * 2 * amp;
      var offT = (Math.random() - 0.5) * 2 * (TAN_JITTER + Math.min(TAN_MAX, sp / 420));
      x += nx * offN + tx * offT;
      y += ny * offN + ty * offT;
    }

    /* 落在屏幕外半个方块很丑（手机贴边停住时尤其明显），
       落点先夹回可视区，留一点边距 */
    var pad = t.size;
    if (x < pad) x = pad; else if (x > t.w - pad) x = t.w - pad;
    if (y < pad) y = pad; else if (y > t.h - pad) y = t.h - pad;

    var life = LIFE * (1 - LIFE_JITTER / 2 + Math.random() * LIFE_JITTER);

    /* 取色不再严格轮换：轮换出来是一条规整的彩虹，太有规律。
       随机取，只保证不跟上一簇撞色。同一簇的主粒和碎屑同色，
       视觉上才是一颗星而不是几粒各色纸屑 */
    var ci = Math.floor(Math.random() * PALETTE.length);
    if (ci === lastCi) ci = (ci + 1 + Math.floor(Math.random() * (PALETTE.length - 1))) % PALETTE.length;
    lastCi = ci;

    /* 偶尔来一颗明显大的：一串同尺寸的小方块看着像珠链，
       掺进几颗"亮星"，大小才有落差 */
    var big = Math.random() < 0.16;
    var base = t.size * (1 - SIZE_JITTER / 2 + Math.random() * SIZE_JITTER) * (big ? 1.45 : 1);

    put(t, {
      x: x,
      y: y,
      age: 0,
      dying: -1,
      still: still,
      life: life,
      size: base,
      alpha: ALPHA_MAIN * (0.88 + Math.random() * 0.12),
      ci: ci
    });

    /* 碎屑：一簇 2–3 颗，撒在主粒外缘 0.55–1.75 倍半径处。
       第一颗偏向法线两侧（像被运动甩出去的火星），
       后面几颗角度放宽，整圈都可能落，一颗星才有毛边 */
    var n = still ? 2 : (Math.random() < 0.4 ? 4 : 3);
    var baseAng = Math.atan2(ny, nx);

    for (var i = 0; i < n; i += 1) {
      /* 奇偶交替往法线两侧甩：一直用同一边的话，碎屑全堆在轨迹的同侧，
         远看像方块在地上投的影子，而不是四周炸开的星尘 */
      var side = (i % 2 === 0) ? 1 : -1;
      var mag = (i < 2 ? 1.2 : 2.4) * (0.5 + Math.random() * 0.6);
      var ang = still
        ? Math.random() * Math.PI * 2
        : baseAng + side * mag;
      var r = base * (DUST_SPREAD + Math.random() * (DUST_SPREAD_MAX - DUST_SPREAD));
      var dx = Math.cos(ang) * r;
      var dy = Math.sin(ang) * r;
      var ds = base * (DUST_MIN + Math.random() * (DUST_MAX - DUST_MIN));

      put(t, {
        x: x + dx,
        y: y + dy,
        age: 0,
        dying: -1,
        still: still,
        /* 碎屑活得短：一闪就灭，才不会把轨迹糊成一条实心带 */
        life: life * (0.36 + Math.random() * 0.38),
        size: ds,
        alpha: ALPHA_DUST + Math.random() * 0.24,
        ci: ci
      });
    }
  }

  function frame(now) {
    var t = trail;
    if (!t) return;

    var dt = t.last ? Math.min(0.05, (now - t.last) / 1000) : 0.016;
    t.last = now;

    /* 竖划滚到尽头、或者滚动停了，手指还按着但位置已经推不出来：
       这时不再补块，免得在边上堆成一坨 */
    if (onPage && touchLive && scrolled && now - lastMoveAt > 220) onPage = false;

    /* 生成放在这里而不是 pointermove 里：鼠标停住时浏览器一个事件
       都不发，挂事件的写法等不到下一簇 */
    if (onPage && now >= t.nextAt) {
      if (overFrame()) {
        onPage = false;
      } else if (!inkOn()) {
        /* 没墨：什么都不落。等用户去右边蘸一口，下一次指针事件会把它叫醒 */
        t.nextAt = now + 400;
      } else {
        var still = now - lastMoveAt > STILL_MS;
        var dx = px - t.seedX;
        var dy = py - t.seedY;
        var far = Math.sqrt(dx * dx + dy * dy);

        /* 距离不够就先不撒。少了这一句，慢速移动时一块压着一块，
           看上去就是"方块成对出现"：间距 5px、方块宽 12px，必然叠 */
        if (!still && far < t.nextGap) {
          t.nextAt = now + 10;
        } else {
          spawn(t, now);
          t.seedX = px;
          t.seedY = py;
          /* 下一簇要走多远：在这个区间里重抽，节拍就散了 */
          t.nextGap = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
          var step = STEP_STILL;
          if (!still) {
            /* 按速度把「要走多远」换算成「等多久」。
               慢速时换算值偏大，间距就锚在 nextGap 上（不会叠）；
               快速时换算值偏小，靠下限兜住，间距随速度拉开成一条拖影，
               而不是每帧硬塞一簇——那样 80 粒上限两三帧就见底，
               画面里只剩光标屁股后面一小撮 */
            var sp = Math.sqrt(mvx * mvx + mvy * mvy);
            step = Math.max(STEP_MIN, Math.min(STEP_MAX, t.nextGap / Math.max(40, sp) * 1000));
          }
          t.nextAt = now + step * (1 - STEP_JITTER / 2 + Math.random() * STEP_JITTER);
        }
      }
    }

    var alive = 0;
    for (var i = t.cells.length - 1; i >= 0; i -= 1) {
      var cell = t.cells[i];
      cell.age += dt;

      if (cell.age >= cell.life) {
        t.cells.splice(i, 1);
        continue;
      }

      /* 被顶掉的块：从当前透明度平滑收到 0，不做硬切的"啪一下" */
      if (cell.dying >= 0) {
        cell.dying -= dt;
        if (cell.dying <= 0) {
          t.cells.splice(i, 1);
          continue;
        }
      }

      alive += 1;
    }

    paint();

    /* 指针还在页面上、而且还有墨，就一直转：停住时也要持续冒方块 */
    if (alive || (onPage && inkOn())) {
      t.raf = window.requestAnimationFrame(frame);
    } else {
      t.raf = 0;
      t.last = 0;
      if (t.dirty) {
        t.ctx.clearRect(t.dirty.x, t.dirty.y, t.dirty.w, t.dirty.h);
        t.dirty = null;
      }
    }
  }

  /* 把当前这批方块照原样画一遍。抽出来是为了在重设画布尺寸
     （canvas.width 一赋值就会擦干净）之后立刻补画，少一帧空白 */
  function paint() {
    var t = trail;
    if (!t) return;
    var ctx = t.ctx;
    var dark = document.documentElement.dataset.theme === "dark";
    var palette = dark ? PALETTE_DARK : PALETTE;

    /* 只清上一帧真正画过的那一小块，不整屏清。
       整屏 clearRect 在 2 倍屏上是每帧 15MB 的显存带宽，
       实测光这一下就把页面从 60fps 拖到 31fps ——
       粒子只有几十颗，脏区通常也就两三百像素宽 */
    if (t.dirty) {
      ctx.clearRect(t.dirty.x, t.dirty.y, t.dirty.w, t.dirty.h);
      t.dirty = null;
    }

    /* 一律普通叠加。加色（lighter）只要底下是白卡片就等于没画——
       深色主题的页面里白卡片正是主体，所以不能用它 */
    ctx.globalCompositeOperation = "source-over";

    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;

    for (var i = 0; i < t.cells.length; i += 1) {
      var cell = t.cells[i];

      /* 前 55% 生命保持实色，剩下的快速淡掉。
         每粒自带一个基准透明度：主粒实、碎屑淡，一根筋的 0.82 会让碎屑发硬 */
      var left = 1 - cell.age / cell.life;
      var a = (left >= FADE ? 1 : left / FADE) * cell.alpha;
      if (cell.dying >= 0) a *= cell.dying / KILL_FADE;
      if (a <= 0) continue;

      /* 方块不漂移、不缩放：落点就是它这一辈子的位置，
         消失只有一种方式——原地淡出 */
      var s = cell.size;
      var px0 = cell.x - s / 2;
      var py0 = cell.y - s / 2;
      ctx.globalAlpha = a;
      ctx.fillStyle = palette[cell.ci];
      ctx.fillRect(px0, py0, s, s);

      if (px0 < x0) x0 = px0;
      if (py0 < y0) y0 = py0;
      if (px0 + s > x1) x1 = px0 + s;
      if (py0 + s > y1) y1 = py0 + s;
    }

    ctx.globalAlpha = 1;

    /* 记下这一帧画到哪儿了，下一帧只清这块（各扩 1px 兜住抗锯齿的边） */
    if (x1 > x0) {
      t.dirty = { x: x0 - 1, y: y0 - 1, w: x1 - x0 + 2, h: y1 - y0 + 2 };
    }
  }

  function wake() {
    if (!trail) return;
    if (!trail.raf) {
      trail.last = 0;
      trail.raf = window.requestAnimationFrame(frame);
    }
  }

  function start() {
    if (!allowed()) return;
    if (!build()) return;
    resize();
    wake();
  }

  function stop() {
    if (!trail) return;
    if (trail.raf) {
      window.cancelAnimationFrame(trail.raf);
      trail.raf = 0;
    }
    trail.cells.length = 0;
    trail.last = 0;
    touchLive = false;
    scrolled = false;
    trail.dirty = null;
    trail.ctx.clearRect(0, 0, trail.w, trail.h);
  }

  function bind() {
    if (bound) return;
    bound = true;

    /* touchcancel 的延迟收手定时器（滚动刚被接管时会误报 cancel） */
    var cancelTimer = 0;

    /* 平滑后的指针速度，移动中的抖动幅度要用它 */
    function measure(x, y, now) {
      if (lastTt) {
        var dt = (now - lastTt) / 1000;
        if (dt > 0.001 && dt < 0.25) {
          mvx += ((x - lastTx) / dt - mvx) * 0.4;
          mvy += ((y - lastTy) / dt - mvy) * 0.4;
        } else {
          mvx = 0;
          mvy = 0;
        }
      }
      lastTx = x;
      lastTy = y;
      lastTt = now;
    }

    function track(e) {
      var now = performance.now();
      /* 合成的 pointerdown 可能不带坐标，别让 NaN 漏进命中测试 */
      if (!isFinite(e.clientX) || !isFinite(e.clientY)) return;
      px = e.clientX;
      py = e.clientY;
      onPage = true;
      lastMoveAt = now;
      measure(px, py, now);
      wake();
    }

    window.addEventListener("pointermove", track, { passive: true });
    window.addEventListener("pointerdown", track, { passive: true });

    /* 触摸的独立通道：手机上浏览器一接管滚动手势就发 pointercancel，
       此后 pointermove 全停（实测一次 0.6 秒的滑动：pointermove 2 次、
       touchmove 31 次），只挂 pointermove 的话移动端等于没有轨迹 */
    /* 每个滚动容器一个锚点：{ top: 记锚时的 scrollTop, py: 记锚时的手指 y }。
       手指真给了坐标就以它为准；收不到坐标时，靠 scroll 增量从这个锚点推 */
    var scrollSeen = new Map();

    function topOf(el) {
      if (!el || el === document || el === document.documentElement || el === document.body) {
        return window.pageYOffset || 0;
      }
      return el.scrollTop || 0;
    }

    /* 手指按下的地方往上找：哪几个容器能滚，就给它们各记一个锚点 */
    function rememberScroll(startEl) {
      scrollSeen.clear();
      scrollSeen.set(document.documentElement, { top: topOf(null), py: py });
      var el = startEl;
      while (el && el !== document.documentElement) {
        if (el.scrollHeight > el.clientHeight + 1) {
          scrollSeen.set(el, { top: el.scrollTop, py: py });
        }
        el = el.parentElement;
      }
    }

    function anchorAt(pyNow) {
      scrollSeen.forEach(function (rec, el) {
        rec.top = topOf(el);
        rec.py = pyNow;
      });
    }

    /* 竖着划时页面跟着滚，iOS 会**停止派发 touchmove** ——
       手指还在屏幕上走，我们却收不到新坐标，轨迹就只剩零星几块
       （横着划不触发滚动，所以一直是好好的）。
       滚动量和手指位移是 1:1 的：手指上滑 40px，内容也上移 40px。
       收不到坐标时用「当前 scrollTop − 锚点 scrollTop」把 py 反推出来，
       轨迹就能继续连成线；touchmove 正常时它永远是权威，这条只是替补 */
    function onScroll(e) {
      var el = (e.target === document) ? document.documentElement : e.target;
      if (!el) return;
      var rec = scrollSeen.get(el);
      if (!rec) return;                       /* 没碰过的容器不管 */
      var now = topOf(el);
      if (now === rec.top) return;
      var t = performance.now();

      if (!touchLive || t - lastTouchMoveAt < 70) {
        /* 坐标是新鲜的（或者手已抬起）：以 touchmove 为准，只把锚点挪过去 */
        rec.top = now;
        rec.py = py;
        return;
      }

      /* 内容上移多少，手指就在屏幕上往下走了多少 */
      py = rec.py - (now - rec.top);
      scrolled = true;
      lastMoveAt = t;
      lastTouchAt = t;
      onPage = true;
      wake();
    }

    function trackTouch(e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      var now = performance.now();
      px = t.clientX;
      py = t.clientY;
      onPage = true;
      touchLive = true;
      lastMoveAt = now;
      lastTouchAt = now;
      lastTouchMoveAt = now;
      if (cancelTimer) { window.clearTimeout(cancelTimer); cancelTimer = 0; }
      if (e.type === "touchstart") {
        scrolled = false;
        rememberScroll(document.elementFromPoint(px, py));
      } else {
        /* 手指真给了新坐标，就以它为准，顺便把滚动锚点对齐 */
        anchorAt(py);
      }
      measure(px, py, now);
      wake();
    }

    window.addEventListener("touchstart", trackTouch, { passive: true });
    window.addEventListener("touchmove", trackTouch, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });

    /* 手指抬起：停手。方块按自己的寿命淡完，不再补新块 */
    window.addEventListener("touchend", function (e) {
      lastTouchAt = performance.now();
      if (!e.touches || !e.touches.length) {
        touchLive = false;
        onPage = false;
      }
    }, { passive: true });

    /* 有些机型在浏览器刚接管滚动手势时会补一个 touchcancel。
       不当场收手：等 180ms，这期间只要还有 touchmove 进来（说明手指还在滑），
       就照旧画 */
    window.addEventListener("touchcancel", function () {
      lastTouchAt = performance.now();
      touchLive = false;
      if (cancelTimer) window.clearTimeout(cancelTimer);
      cancelTimer = window.setTimeout(function () {
        cancelTimer = 0;
        onPage = false;
      }, 180);
    }, { passive: true });

    document.addEventListener("mouseleave", function (e) {
      /* 触屏滚动时浏览器会补发一串合成鼠标事件（mouseover/mouseout/mouseleave），
         不能把它当成「指针离开页面」，否则滚动中轨迹会一阵一阵地断 */
      var sc = e && e.sourceCapabilities;
      if (sc && sc.firesTouchEvents) return;
      if (performance.now() - lastTouchAt < 900) return;
      onPage = false;
    });

    window.addEventListener("resize", resize);

    document.addEventListener("visibilitychange", function () {
      if (!trail) return;
      if (document.hidden && trail.raf) {
        window.cancelAnimationFrame(trail.raf);
        trail.raf = 0;
      } else if (!document.hidden) {
        onPage = false;   /* 切回来先不冒，等下一次指针事件重新定位 */
        wake();
      }
    });
  }

  function sync() {
    if (allowed()) {
      bind();
      start();
    } else {
      onPage = false;
      stop();
    }
  }

  document.addEventListener("hnyz:stylechange", sync);
  document.addEventListener("hnyz:lite", sync);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }

  window.HNYZTRAIL = { sync: sync };
})();
