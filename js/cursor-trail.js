/* =========================================================
   鼠标轨迹：指针走到哪，方块就撒到哪
   ---------------------------------------------------------
   默认**一个方块都不落**：要先去右边那条「染色区」墨槽上蘸一次墨
   （见 js/ink-slot.js），墨水大约烧 12 秒，用完自动回到无轨迹状态。
   蘸上之后按「走够多远」落块，不按固定节拍：
     · 移动中每走 7–13px 落一块（每块落定后重抽，节拍就散了）。
       方块 12px 宽，相邻两块最多叠进去四成，轨迹是一串压着边的方块，
       不是两点一组的「一对」——只要不是几乎完全重合，叠着反而更连贯；
       一帧最多落一块，不插值补点，跳得再快也不会瞬移成对；
     · 移动中只沿轨迹法线做几像素的起伏，整条轨迹看得清；
       停住时换成 190ms 一块的慢节拍，只在原地小幅抖动，不扩散、不漂移；
     · 一次只落一个，不给邻居补光，方块就是干净的方块；
     · 上限分两档：移动中 24 块、停住后 6 块。间距收紧后 10 块只够铺
       一百多像素，中速就会断成几截，所以按「够铺满 0.8 秒的行程」重新定；
       到顶时最老的块标记为淡出，90ms 内从当前透明度收到 0，不硬删；
     · 每块最长活 1 秒，消失只有一种方式——原地淡出，尺寸始终不变；
     · 颜色取 GitHub Primer 的那六个亮色，随机取、不与上一块撞色；
     · 终端风与默认皮肤才建画布，轻量档与 reduced-motion 不建；
     · 没有墨水时不生成，画布空转一帧就停。
   ========================================================= */
(function () {
  "use strict";

  var STEP_STILL = 190;  /* 停住时的落块间隔：慢半拍，不然一堆方块在原地不停闪 */
  var STEP_JITTER = 0.3; /* 间隔也带随机，别像节拍器一样一下一下 */
  /* 移动中的落块间距（px）：方块 12px 宽，7–13px 的间距让相邻两块
     叠进去 0–5px（最多四成边长），轨迹是一串压着边的方块。
     上一版是固定 45ms 一块，慢速时 45ms 才走 5px，两块几乎完全重合，
     才成了「一对」；这里叠是叠，但不叠到认不出是两块 */
  var GAP_MIN = 7;
  var GAP_MAX = 13;
  var LIFE = 1;          /* 每块活 1 秒：慢速时轨迹才有两三个方块长，不然只剩一个点 */
  var LIFE_JITTER = 0.16;/* 寿命随机浮动：几块不会整齐地一起消失 */
  var FADE = 0.45;       /* 生命最后这一段开始淡出 */
  var MAX_MOVE = 60;     /* 移动时的上限：7.5px 一块，60 块刚好铺满 450px，与上一版的拖尾长度相当 */
  var MAX_STILL = 6;     /* 停住时的上限：原地不堆 */
  var KILL_FADE = 0.09;  /* 被顶掉时的淡出时长：不硬删，90ms 内从当前透明度收到 0 */
  var JITTER = 12;       /* 停住时的原地抖动半径：让 6 块略微错开，不至于严丝合缝叠成一块 */
  var MOVE_JITTER = 4;   /* 移动中的基础起伏，只够让轨迹有呼吸感 */
  var MOVE_MAX = 5;      /* 速度加成上限：再快也只到 ±9px，轨迹始终清晰 */
  var STILL_MS = 120;    /* 这么久没有新的指针事件就算"停住"（要大于落块间隔，否则慢移也会被当成停住） */
  var SIZE = 12;         /* 方块边长（桌面） */
  var SIZE_SM = 10;      /* 手机屏窄，方块按比例收一点，不然一格占了 3% 宽 */
  var SIZE_JITTER = 0.42;/* 单块尺寸浮动比例：有大有小，看起来才不是复制粘贴 */
  var ALPHA = 0.82;

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
      lastX: -1e4,     /* 上一块落定时的指针位置：算「走够没有」的基准 */
      lastY: -1e4,
      nextGap: GAP_MIN /* 下一块要走的距离，每块落定后重抽 */
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
    /* 尺寸一变画布就被擦干净了，立刻按原坐标补画一帧，
       别让屏幕空一帧再等下一次 rAF */
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

  /* atX / atY：这一块落哪儿。移动中一帧可能要补两三块，就把这一帧的
     位移均分给他们，各落一分点；不传就用指针当前位置（停住的慢节拍） */
  function spawn(t, atX, atY) {
    var still = atX === undefined && performance.now() - lastMoveAt > STILL_MS;
    var x = atX === undefined ? px : atX;
    var y = atY === undefined ? py : atY;

    if (still) {
      /* 停住就只在原地小幅抖一下：不扩散、不往外飘，
         方块就是一个个从光标底下冒出来，位置基本不变 */
      x += (Math.random() - 0.5) * JITTER * 2;
      y += (Math.random() - 0.5) * JITTER * 2;
    } else {
      /* 移动中只沿垂直于运动方向起伏：轨迹有轻微的上下波动，
         但每一块都严格落在路径的那条线上（切向不加偏移），
         所以整条轨迹看得清、不会散成一团 */
      var sp = Math.sqrt(mvx * mvx + mvy * mvy);
      var amp = MOVE_JITTER + Math.min(MOVE_MAX, sp / 140);
      var off = (Math.random() - 0.5) * 2 * amp;

      if (sp > 8) {
        x += (-mvy / sp) * off;
        y += (mvx / sp) * off;
      } else {
        y += off;   /* 方向还没测出来就先只上下抖 */
      }
    }

    /* 落在屏幕外半个方块很丑（手机贴边停住时尤其明显），
       落点先夹回可视区，留一点边距 */
    var pad = t.size;
    if (x < pad) x = pad; else if (x > t.w - pad) x = t.w - pad;
    if (y < pad) y = pad; else if (y > t.h - pad) y = t.h - pad;

    /* 移动中补点：若这一分点正好压在上一块身上（起步时前一帧是停手状态，
       那块抖到了指针旁边），就跳过不落，锚点照样往前推，下一帧接着走 */
    if (!still) {
      var near = t.cells[t.cells.length - 1];
      if (near) {
        var nx = x - near.x;
        var ny = y - near.y;
        var md = t.size * 0.58;
        if (nx * nx + ny * ny < md * md) {
          t.lastX = atX;
          t.lastY = atY;
          return;
        }
      }
    }

    var life = LIFE * (1 - LIFE_JITTER / 2 + Math.random() * LIFE_JITTER);

    /* 取色不再严格轮换：轮换出来是一条规整的彩虹，太有规律。
       随机取，只保证不跟上一块撞色，跳色才像撒纸屑 */
    var ci = Math.floor(Math.random() * PALETTE.length);
    if (ci === lastCi) ci = (ci + 1 + Math.floor(Math.random() * (PALETTE.length - 1))) % PALETTE.length;
    lastCi = ci;

    /* 到顶了就把最老的标记为"正在淡出"，90ms 内从它当前的透明度收到 0，
       而不是硬删。移动时上限高一些，轨迹才连得起来；停住后收到 6 个 */
    var cap = still ? MAX_STILL : MAX_MOVE;
    if (t.cells.length >= cap) {
      /* 只标记最老的"还活着"的那块；已经在淡出的跳过，否则会重复标记 */
      for (var k = 0; k < t.cells.length; k += 1) {
        if (t.cells[k].dying < 0) {
          t.cells[k].dying = KILL_FADE;
          break;
        }
      }
    }

    t.cells.push({
      x: x,
      y: y,
      age: 0,
      dying: -1,
      life: life,
      size: t.size * (1 - SIZE_JITTER / 2 + Math.random() * SIZE_JITTER),
      ci: ci
    });

    /* 记下这一块的位置，下一块得从这儿再走出去 nextGap 才落 */
    t.lastX = atX === undefined ? px : atX;
    t.lastY = atY === undefined ? py : atY;
    t.nextGap = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
  }

  /* 指针从上一块落点走了够不够远。用平方比，省一次开方 */
  function farEnough(t) {
    var dx = px - t.lastX;
    var dy = py - t.lastY;
    if (dx * dx + dy * dy < t.nextGap * t.nextGap) return false;

    /* 再躲开最近落下的那一块：停手时那块是在指针附近抖出来的，
       起步第一块正好压在它身上就又成了一对。重叠允许，但中心距至少
       留 0.58 个边长，最多叠进去四成 */
    var last = t.cells[t.cells.length - 1];
    if (last) {
      var ex = px - last.x;
      var ey = py - last.y;
      var min = t.size * 0.58;
      if (ex * ex + ey * ey < min * min) return false;
    }
    return true;
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
       都不发，挂事件的写法等不到下一块。
       移动中按距离，停住后按时间——两套节拍不能混，混了慢速还是会叠 */
    if (onPage) {
      var still = now - lastMoveAt > STILL_MS;
      var due = still ? now >= t.nextAt : (now >= t.nextAt && farEnough(t));

      if (due) {
        if (overFrame()) {
          onPage = false;
        } else if (!inkOn()) {
          /* 没墨：什么都不落。等用户去右边蘸一口，下一次指针事件会把它叫醒 */
          t.nextAt = now + 400;
        } else if (still) {
          spawn(t);
          t.nextAt = now + STEP_STILL * (1 - STEP_JITTER / 2 + Math.random() * STEP_JITTER);
        } else {
          /* 移动中：这一帧走了多远，就按 7.5px 一块均分补上，
             最多三块。只落一块的话间距被帧位移锁死（900px/s 时每帧 15px），
             方块之间永远留缝，也就谈不上连成一条带 */
          var x0 = t.lastX;
          var y0 = t.lastY;
          var dx = px - x0;
          var dy = py - y0;
          var d = Math.sqrt(dx * dx + dy * dy);
          var n = d > 12 ? Math.min(3, Math.round(d / 7.5)) : 1;

          for (var j = 1; j <= n; j += 1) {
            spawn(t, x0 + dx * j / n, y0 + dy * j / n);
          }
          t.nextAt = now;
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
      t.ctx.clearRect(0, 0, t.w, t.h);
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

    ctx.clearRect(0, 0, t.w, t.h);
    /* 一律普通叠加。加色（lighter）只要底下是白卡片就等于没画——
       深色主题的页面里白卡片正是主体，所以不能用它 */
    ctx.globalCompositeOperation = "source-over";

    for (var i = 0; i < t.cells.length; i += 1) {
      var cell = t.cells[i];

      /* 前 55% 生命保持实色，剩下的快速淡掉 */
      var left = 1 - cell.age / cell.life;
      var a = (left >= FADE ? 1 : left / FADE) * ALPHA;
      if (cell.dying >= 0) a *= cell.dying / KILL_FADE;
      if (a <= 0) continue;

      /* 方块不漂移、不缩放：落点就是它这一辈子的位置，
         消失只有一种方式——原地淡出 */
      var s = cell.size;
      ctx.globalAlpha = a;
      ctx.fillStyle = palette[cell.ci];
      ctx.fillRect(cell.x - s / 2, cell.y - s / 2, s, s);
    }

    ctx.globalAlpha = 1;
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
      if (trail) {
        /* 停了一会儿又开始动：上一拍的慢节拍作废，立刻按距离续上 */
        if (now - lastMoveAt > STILL_MS) trail.nextAt = 0;
        /* 按一下也要有反馈：把基准拉远，这次按下立刻冒一块 */
        if (e.type === "pointerdown") {
          trail.nextAt = 0;
          trail.lastX = -1e4;
          trail.lastY = -1e4;
        }
      }
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
      if (trail && (e.type === "touchstart" || now - lastMoveAt > STILL_MS)) {
        /* 手指刚落下、或停了会儿又滑：慢节拍作废，按距离从这儿续上 */
        trail.nextAt = 0;
        trail.lastX = -1e4;
        trail.lastY = -1e4;
      }
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
