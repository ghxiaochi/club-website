/* =========================================================
   HNYZ · 终端风的四板块工作台（HNYZ TTY）
   ---------------------------------------------------------
   把首页当成一块 12 列的方块矩阵，而不是一页可以滚的网页：

     · 顶栏    品牌 + 会话名 + 实时时钟，右侧是原顶栏的按钮区；
     · 左栏    四个板块（概览 / 关于 / 作品 / 加入），竖排、编号 0-3；
     · 中区    当前板块的方块矩阵：每个方块是一块面板，
               大小按 12 列切（7+5、5+4+3 这类），内容全部落在方块里；
     · 右栏    本板块的方块索引（点一下滚到那块）+ 上下板块 + 会话状态；
     · 底栏    一条真的能敲的 shell，和 dsh 的输入行 / 状态条同构。

   切板块的动效是「旧矩阵缩小淡出、新矩阵从略大缩回并淡入」，
   方块再按顺序错峰浮起，不做整页跳转。

   交互参照 ccch1mneyyy/dsh-TUI 的界面结构：左侧 rail 选会话、
   中间主区、右侧 contextual panel、底部输入行与状态条。
   几何为零，全是排版。

   只在终端风首页由 js/skins.js 的 syncTerm() 调 HNYZTUI.sync()。
   内页维持琥珀纸带不动。
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     四个板块：顺序就是侧栏顺序，cmd 是命令行里能敲的名字
     --------------------------------------------------------- */
  var BLOCKS = [
    { id: "overview", cmd: "overview", en: "OVERVIEW", zh: "概览", title: "launchpad", sub: "社团速览 · 会话入口" },
    { id: "about",    cmd: "about",    en: "ABOUT",    zh: "关于", title: "man hnyz(1)", sub: "这是个什么样的社团" },
    { id: "work",     cmd: "work",     en: "WORK",     zh: "作品", title: "git log ~/repos", sub: "做出来的东西 · 能用的资源" },
    { id: "join",     cmd: "join",     en: "JOIN",     zh: "加入", title: "ssh newmember@hnyz", sub: "怎么来 · 问什么 · 在哪聊" }
  ];

  var QQ = "1098931492";
  var MAIL = "483677268@qq.com";

  /* ---------------------------------------------------------
     小工具
     --------------------------------------------------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function pad(n) { return ("0" + n).slice(-2); }

  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionOK() { return !(mq && mq.matches); }

  /* 行构建器：给每一行编个号，入场时按 34ms 错峰打印 */
  var lineIdx = 0;
  function L(html, cls) {
    return '<p class="tty-ln' + (cls ? " " + cls : "") + '" style="--i:' + (lineIdx++) + '">' + html + "</p>";
  }

  /* 仪表条（btop 味）：label + 方条 + 读数 */
  function meter(label, ratio, value, note) {
    var pct = Math.round(ratio * 100);
    return '<div class="tty-meter" style="--i:' + (lineIdx++) + '">' +
      '<span class="tty-meter__label">' + esc(label) + "</span>" +
      '<span class="tty-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
      '<span class="tty-meter__val">' + esc(value) + (note ? ' <em>' + esc(note) + "</em>" : "") + "</span>" +
      "</div>";
  }

  function copyBtn(text, label) {
    return '<button type="button" class="tty-cp" data-copy="' + esc(text) + '">' + esc(label) + "</button>";
  }

  /* ---------------------------------------------------------
     形象：dsh-TUI 的 Deepy（42×30 像素鲸鱼）
     原素材是按调色板索引的帧，这里换成 canvas 播放，
     静态首帧仍走 <img>，脚本没跑到也不会留一块空白。
     --------------------------------------------------------- */
  var DEEPY_W = 42;
  var DEEPY_H = 30;
  var DEEPY_SRC = "images/deepy/idle.webp";
  var DEEPY_IDLE = "idle";
  var deepyData = null;
  var deepyLoading = false;
  var deepyWaiters = [];
  var deepyCtx = null;
  var deepyAnim = DEEPY_IDLE;
  var deepyStart = 0;
  var deepyFrame = 0;
  var deepyTimer = 0;
  var deepyNext = 0;
  var deepyCache = {};

  function deepyBox(cell, label, interactive) {
    return '<span class="tty-deepy"' + (cell ? ' style="--cell:' + cell + 'px"' : "") +
      (label ? ' role="img"' + (interactive ? ' tabindex="0"' : "") + ' aria-label="' + esc(label) + '"' : ' aria-hidden="true"') + ">" +
      '<img class="tty-deepy__img" src="' + DEEPY_SRC + '" width="' + DEEPY_W * 4 + '" height="' + DEEPY_H * 4 +
      '" alt="" decoding="async"' + (interactive ? "" : ' loading="lazy"') + ">" +
      (interactive ? '<canvas class="tty-deepy__cv" width="' + DEEPY_W + '" height="' + DEEPY_H + '"></canvas>' : "") +
      "</span>";
  }

  function deepyFrames(anim) {
    if (deepyCache[anim]) return deepyCache[anim];
    if (!deepyData || !deepyData.animations[anim]) return null;
    var pal = deepyData.palette;
    var list = deepyData.animations[anim].map(function (f) {
      var c = document.createElement("canvas");
      c.width = DEEPY_W;
      c.height = DEEPY_H;
      var g = c.getContext("2d");
      for (var y = 0; y < DEEPY_H; y += 1) {
        for (var x = 0; x < DEEPY_W; x += 1) {
          var ch = f.p.charAt(y * DEEPY_W + x);
          if (!ch || ch === ".") continue;
          var hex = pal[ch];
          if (!hex) continue;
          g.fillStyle = hex;
          g.fillRect(x, y, 1, 1);
        }
      }
      return { d: f.d, c: c };
    });
    deepyCache[anim] = list;
    return list;
  }

  function paintDeepy(anim, index) {
    if (!deepyCtx) return;
    var frames = deepyFrames(anim);
    if (!frames || !frames[index]) return;
    deepyCtx.clearRect(0, 0, DEEPY_W, DEEPY_H);
    deepyCtx.drawImage(frames[index].c, 0, 0);
  }

  /* 一帧一帧按原素材的 dur 走；idle 循环，互动动画播完自动回 idle */
  function stepDeepy(now) {
    if (!deepyCtx) return;
    var frames = deepyFrames(deepyAnim) || deepyFrames(DEEPY_IDLE);
    if (!frames) return;
    if (!deepyStart) deepyStart = now;
    var wait = frames[deepyFrame] ? frames[deepyFrame].d : 400;
    if (now - deepyStart >= wait) {
      deepyStart = now;
      deepyFrame += 1;
      if (deepyFrame >= frames.length) {
        deepyFrame = 0;
        if (deepyAnim !== DEEPY_IDLE) {
          deepyAnim = DEEPY_IDLE;
          frames = deepyFrames(DEEPY_IDLE);
        }
      }
      paintDeepy(deepyAnim, deepyFrame);
    }
    /* 待机不能真的一动不动：每 9–16 秒插一段喷水或游动，再回待机 */
    if (deepyAnim === DEEPY_IDLE && now > deepyNext) {
      deepyNext = now + 9000 + Math.random() * 7000;
      playDeepy(Math.random() < 0.55 ? "idle-spout" : "swim");
    }
    deepyTimer = window.requestAnimationFrame(stepDeepy);
  }

  function playDeepy(anim) {
    if (!deepyCtx || !deepyData || !deepyData.animations[anim] || deepyAnim === anim) return;
    deepyAnim = anim;
    deepyFrame = 0;
    deepyStart = 0;
    paintDeepy(anim, 0);
  }

  function loadDeepy() {
    if (deepyData || deepyLoading || !window.fetch) return;
    deepyLoading = true;
    window.fetch("data/deepy.json?v=20261108b")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        deepyData = d;
        deepyWaiters.forEach(function (fn) { fn(d); });
        deepyWaiters = [];
      })
      .catch(function () { deepyWaiters = []; })
      .then(function () { deepyLoading = false; });
  }

  /* 概览方块里那只：静态图先站着，数据到了再换成会动的 canvas */
  function mountDeepy(el) {
    if (!el) return;
    var cv = el.querySelector(".tty-deepy__cv");
    if (!cv || !cv.getContext) return;
    deepyCtx = cv.getContext("2d");
    paintDeepy(DEEPY_IDLE, 0);
    el.classList.add("is-live");

    var start = function () {
      if (!deepyData) {
        deepyWaiters.push(start);
        loadDeepy();
        return;
      }
      if (deepyTimer) return;
      deepyNext = (window.performance ? performance.now() : Date.now()) + 8000;
      deepyTimer = window.requestAnimationFrame(stepDeepy);
    };

    /* 极致档：只留这一张静态首帧，不取 deepy.json、不开 rAF。
       这条 rAF 是终端里唯一一直在跑的东西，停掉它才叫真省 */
    if (motionOK() && document.documentElement.dataset.lite !== "2") {
      /* 首屏先让位给文字，鲸鱼等浏览器闲下来再动 */
      if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 1600 });
      else window.setTimeout(start, 900);
    }

    el.addEventListener("click", function () {
      if (!deepyData) return;
      /* 正常档：整只游出去兜一圈；轻量档 / 极致档 / 减弱动效：
         只换个表情，别在省电的机器上跑一整屏 canvas */
      if (crossWhale(el)) return;
      var pool = ["happy", "poke-left", "poke-right", "idle-spout"];
      playDeepy(pool[Math.floor(Math.random() * pool.length)]);
    });
    el.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      el.click();
    });
  }

  function stopDeepy() {
    if (deepyTimer) { window.cancelAnimationFrame(deepyTimer); deepyTimer = 0; }
    deepyCtx = null;
    deepyNext = 0;
    deepyAnim = DEEPY_IDLE;
    deepyFrame = 0;
    deepyStart = 0;
  }

  /* ---------------------------------------------------------
     巡游：点一下 Deepy，它从格子里游出去，绕过整块矩阵，
     掠过标题条，再从左上角回到自己的格子。
     路径：Catmull-Rom 转三次贝塞尔，借一条离屏 SVG path
     量长度取点，速度按缓动走；身后拖几颗上浮的气泡。
     --------------------------------------------------------- */
  var WHALE_SWIM = "swim";
  var WHALE_ROWS = 27;
  var whaleCv = null;
  var whaleCtx = null;
  var whaleRaf = 0;
  var whaleDpr = 1;
  var whalePathEl = null;
  var whaleBubbles = [];
  var whaleBubbleAt = 0;
  var whaleTiles = [];
  var whaleKickTimers = [];
  var whaleBusy = false;

  /* 只有正常档画这条线：轻量档给个表情，极致档连 canvas 都不该有 */
  function whaleAllowed() {
    if (!motionOK()) return false;
    var tier = document.documentElement.dataset.lite;
    return tier !== "1" && tier !== "2";
  }

  function ensureWhaleLayer() {
    if (!root) return;
    if (!whaleCv) {
      whaleCv = document.createElement("canvas");
      whaleCv.className = "tty-whale";
      whaleCv.setAttribute("aria-hidden", "true");
      root.appendChild(whaleCv);
      whaleCtx = whaleCv.getContext("2d");
    }
    if (!whalePathEl) {
      var svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("class", "tty-whale-path");
      svg.setAttribute("aria-hidden", "true");
      whalePathEl = document.createElementNS(SVG_NS, "path");
      svg.appendChild(whalePathEl);
      root.appendChild(svg);
    }
  }

  /* 一串点 → 一条不会在拐弯处顿一下的曲线 */
  function whaleCurve(pts) {
    if (pts.length < 2) return "";
    var d = "M" + pts[0][0] + " " + pts[0][1];
    for (var i = 0; i < pts.length - 1; i += 1) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6;
      var c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6;
      var c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += "C" + c1x + " " + c1y + "," + c2x + " " + c2y + "," + p2[0] + " " + p2[1];
    }
    return d;
  }

  /* 画布铺在 .tty 的 padding box 上：iPhone 有安全区时，
     原点和 root 的 border box 差一截，所以一律以画布自身为坐标原点 */
  function whaleSurface() {
    if (!whaleCtx || !whaleCv) return null;
    var cr = whaleCv.getBoundingClientRect();
    if (!cr.width || !cr.height) return null;
    whaleDpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.round(cr.width * whaleDpr);
    var h = Math.round(cr.height * whaleDpr);
    if (whaleCv.width !== w || whaleCv.height !== h) {
      whaleCv.width = w;
      whaleCv.height = h;
    }
    whaleCtx.setTransform(whaleDpr, 0, 0, whaleDpr, 0, 0);
    whaleCtx.imageSmoothingEnabled = false;
    return { w: cr.width, h: cr.height, left: cr.left, top: cr.top };
  }

  function clearWhaleKicks() {
    whaleKickTimers.forEach(function (id) { window.clearTimeout(id); });
    whaleKickTimers = [];
    whaleTiles.forEach(function (t) { t.el.classList.remove("is-kicked"); });
  }

  function stopWhale(restore) {
    whaleBusy = false;
    if (whaleRaf) { window.cancelAnimationFrame(whaleRaf); whaleRaf = 0; }
    if (whaleCv) {
      whaleCv.classList.remove("is-on");
      if (whaleCtx) whaleCtx.clearRect(0, 0, whaleCv.width, whaleCv.height);
    }
    whaleBubbles = [];
    clearWhaleKicks();
    if (restore) {
      var live = root ? root.querySelector(".tty-deepy.is-away") : null;
      if (live) live.classList.remove("is-away");
    }
  }

  function crossWhale(el) {
    if (whaleBusy || !root || !stageEl || !whaleAllowed()) return false;
    var frames = deepyFrames(WHALE_SWIM);
    if (!frames) return false;

    ensureWhaleLayer();
    var box = whaleSurface();
    if (!box) return false;

    var sr = stageEl.getBoundingClientRect();
    var wr = el.getBoundingClientRect();
    if (!wr.width) return false;

    var ww = wr.width;
    var wh = wr.height;
    var sx = wr.left - box.left + ww / 2;
    var sy = wr.top - box.top + wh / 2;
    var stageL = sr.left - box.left;
    var stageR = sr.right - box.left;
    var stageT = sr.top - box.top;
    var stageB = sr.bottom - box.top;
    var spanY = stageB - stageT;
    var hdr = stageEl.querySelector(".tty-stage__hdr");
    var hr = hdr ? hdr.getBoundingClientRect() : null;
    var hdrMid = (hr ? (hr.top + hr.bottom) / 2 : sr.top + 30) - box.top;
    /* 别盖上顶栏：时钟和那排按钮被鲸鱼压住会像画错了，
       所以整条路径的上限压在顶栏下沿再往下半个身子 */
    var topEl = root.querySelector(".tty__top");
    var tr = topEl ? topEl.getBoundingClientRect() : null;
    var topSafe = Math.max((tr ? tr.bottom - box.top : 0) + wh * 0.52, stageT + wh * 0.46);

    /* 出格 → 撑到右上 → 沿标题条横穿 → 左下 → 回格。
       y 都收在画布内，鲸鱼不会半截被切掉 */
    var pts = [
      [sx, sy],
      [Math.min(stageR - ww * 0.55, sx + ww * 1.5), Math.max(topSafe, sy - wh * 0.95)],
      [stageR - ww * 0.62, stageT + spanY * 0.32],
      [stageR - ww * 0.95, Math.max(topSafe, hdrMid)],
      [stageL + (stageR - stageL) * 0.42, Math.max(topSafe, hdrMid - wh * 0.12)],
      [stageL + ww * 0.78, stageT + spanY * 0.17],
      [sx, sy]
    ];

    var d = whaleCurve(pts);
    if (!d) return false;

    whalePathEl.setAttribute("d", d);
    var len = 0;
    try { len = whalePathEl.getTotalLength(); } catch (e) { len = 0; }
    if (!len) return false;

    /* 缓存一次方块位置：飞行途中每帧去量 rect 会一直触发布局 */
    whaleTiles = [];
    var grid = grids[active];
    if (grid) {
      Array.prototype.forEach.call(grid.children, function (node) {
        var r = node.getBoundingClientRect();
        whaleTiles.push({
          el: node,
          x: r.left - box.left + r.width / 2,
          y: r.top - box.top + r.height / 2,
          w: r.width,
          h: r.height,
          hit: false
        });
      });
    }

    var dur = Math.max(1500, Math.min(2600, Math.round(len * 1.55)));
    var bubbleGap = 150;
    var t0 = 0;
    var lastPaint = -1;

    whaleBusy = true;
    whaleBubbles = [];
    whaleBubbleAt = 0;
    el.classList.add("is-away");
    whaleCv.classList.add("is-on");

    function paint(now) {
      if (!whaleBusy || !whaleCtx) { whaleRaf = 0; return; }
      if (!t0) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      /* 起手就有速度，收尾软着地：线走完刚好把鲸鱼送回格子 */
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var at = len * e;
      var pt = whalePathEl.getPointAtLength(at);
      var ahead = whalePathEl.getPointAtLength(Math.min(len, at + 10));
      var vx = ahead.x - pt.x;
      /* 素材朝左：往右游时镜像 */
      var flip = vx > 0.4 ? -1 : 1;
      var grow = 1 + 0.18 * Math.sin(Math.PI * p);
      var bob = Math.sin(now / 260) * 2.4;
      var dw = ww * grow;
      var dh = wh * grow;
      var cx = pt.x;
      var cy = pt.y + bob;

      whaleCtx.clearRect(0, 0, box.w, box.h);

      /* 尾迹：身后 160px 的路径上画一条渐隐的线。
         整段一条路径 + 线性渐变，别分小段描：圆头叠在一起会糊成一条块 */
      var wakeLen = Math.min(at, 160);
      /* 收到鲸鱼身后一点：素材尾巴和背之间有透明缝，
         线一直画到中心会从缝里透出来，像划在身上的划痕 */
      var wakeEnd = Math.max(0, at - ww * 0.34);
      if (wakeLen > 10 && wakeEnd - (at - wakeLen) > 10) {
        var wFrom = whalePathEl.getPointAtLength(at - wakeLen);
        var wTo = whalePathEl.getPointAtLength(wakeEnd);
        var wGrad = whaleCtx.createLinearGradient(wFrom.x, wFrom.y, wTo.x, wTo.y);
        wGrad.addColorStop(0, "rgba(63, 108, 196, 0)");
        wGrad.addColorStop(1, "rgba(63, 108, 196, 0.42)");
        whaleCtx.beginPath();
        for (var wi = 0; wi <= 10; wi += 1) {
          var q = whalePathEl.getPointAtLength(at - wakeLen + ((wakeEnd - (at - wakeLen)) / 10) * wi);
          if (wi === 0) whaleCtx.moveTo(q.x, q.y);
          else whaleCtx.lineTo(q.x, q.y);
        }
        whaleCtx.lineCap = "round";
        whaleCtx.lineJoin = "round";
        whaleCtx.strokeStyle = wGrad;
        whaleCtx.lineWidth = 2;
        whaleCtx.stroke();
      }

      /* 气泡：从尾巴的位置吐出来，自己往上飘 */
      if (now - whaleBubbleAt > bubbleGap && p > 0.04 && p < 0.96) {
        whaleBubbleAt = now;
        whaleBubbles.push({
          x: cx - vx * 1.6 + (Math.random() - 0.5) * 10,
          y: cy + (Math.random() - 0.5) * 14 + dh * 0.18,
          r: 1.4 + Math.random() * 1.8,
          vy: -16 - Math.random() * 14,
          drift: (Math.random() - 0.5) * 9,
          life: 1,
          born: now
        });
      }
      for (var bi = whaleBubbles.length - 1; bi >= 0; bi -= 1) {
        var bb = whaleBubbles[bi];
        var age = (now - bb.born) / 900;
        if (age >= 1) { whaleBubbles.splice(bi, 1); continue; }
        var bx = bb.x + bb.drift * age;
        var by = bb.y + bb.vy * age;
        whaleCtx.globalAlpha = (1 - age) * 0.8;
        whaleCtx.fillStyle = "#7FA8DC";
        whaleCtx.fillRect(Math.round(bx), Math.round(by), Math.max(2, Math.round(bb.r)), Math.max(2, Math.round(bb.r)));
      }
      whaleCtx.globalAlpha = 1;

      /* 被蹭到的方块轻轻沉一下：只在它从方块正上方掠过时触发一次 */
      for (var ti = 0; ti < whaleTiles.length; ti += 1) {
        var tl = whaleTiles[ti];
        if (tl.hit) continue;
        if (Math.abs(cx - tl.x) < tl.w / 2 + ww * 0.3 && Math.abs(cy - tl.y) < tl.h / 2 + wh * 0.35) {
          tl.hit = true;
          tl.el.classList.add("is-kicked");
          (function (node) {
            whaleKickTimers.push(window.setTimeout(function () {
              node.classList.remove("is-kicked");
            }, 470));
          })(tl.el);
        }
      }

      var idx = Math.floor((now - t0) / 160) % frames.length;
      if (idx !== lastPaint || true) {
        whaleCtx.save();
        whaleCtx.translate(Math.round(cx), Math.round(cy));
        whaleCtx.scale(flip, 1);
        /* swim 帧底下三行是水面线：在格子里是「浮在水上」，
           飞出来就成了一块横板，只画到第 27 行（保留肚皮和两侧水花） */
        whaleCtx.drawImage(
          frames[idx].c, 0, 0, DEEPY_W, WHALE_ROWS,
          -Math.round(dw / 2), -Math.round(dh / 2), Math.round(dw), Math.round(dh * WHALE_ROWS / DEEPY_H)
        );
        whaleCtx.restore();
        lastPaint = idx;
      }

      if (p < 1) {
        whaleRaf = window.requestAnimationFrame(paint);
      } else {
        whaleRaf = 0;
        whaleBusy = false;
        whaleCv.classList.remove("is-on");
        whaleCtx.clearRect(0, 0, box.w, box.h);
        el.classList.remove("is-away");
        clearWhaleKicks();
        playDeepy("happy");
      }
    }

    whaleRaf = window.requestAnimationFrame(paint);
    return true;
  }

  /* ---------------------------------------------------------
     视差：鼠标在终端里走，整块矩阵跟着轻轻偏一点，
     像一块有厚度的玻璃板；指针离开就慢慢回正。
     只在「精确指针 + 正常档 + 没要求减弱动效」时开。
     --------------------------------------------------------- */
  var tiltTX = 0;
  var tiltTY = 0;
  var tiltX = 0;
  var tiltY = 0;
  var tiltRaf = 0;

  function tiltAllowed() {
    if (!motionOK() || !stageEl) return false;
    var tier = document.documentElement.dataset.lite;
    if (tier === "1" || tier === "2") return false;
    return !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }

  function paintTilt() {
    if (!stageEl) return;
    stageEl.style.setProperty("--tx", tiltX.toFixed(3));
    stageEl.style.setProperty("--ty", tiltY.toFixed(3));
  }

  /* 阻尼跟随：直接绑在 pointermove 上会一格一格跳，这里补一层缓动 */
  function tiltStep() {
    if (!stageEl) { tiltRaf = 0; return; }
    tiltX += (tiltTX - tiltX) * 0.12;
    tiltY += (tiltTY - tiltY) * 0.12;
    if (Math.abs(tiltTX - tiltX) < 0.002 && Math.abs(tiltTY - tiltY) < 0.002) {
      tiltX = tiltTX;
      tiltY = tiltTY;
      paintTilt();
      tiltRaf = 0;
      if (!tiltX && !tiltY) stageEl.classList.remove("is-tilting");
      return;
    }
    paintTilt();
    tiltRaf = window.requestAnimationFrame(tiltStep);
  }

  function kickTilt() {
    if (!tiltRaf) tiltRaf = window.requestAnimationFrame(tiltStep);
  }

  function resetTilt() {
    tiltTX = 0;
    tiltTY = 0;
    tiltX = 0;
    tiltY = 0;
    if (tiltRaf) { window.cancelAnimationFrame(tiltRaf); tiltRaf = 0; }
    if (stageEl) {
      stageEl.classList.remove("is-tilting");
      stageEl.style.removeProperty("--tx");
      stageEl.style.removeProperty("--ty");
    }
  }

  /* 每块离画面中心多远 → 视差位移的系数。用 offsetLeft/offsetTop，
     量的是布局位置，不受 transform 影响，切板块时也读得到 */
  function stampDepth() {
    grids.forEach(function (g) {
      if (!g || g.hidden) return;
      var w = g.clientWidth;
      var h = g.clientHeight;
      if (!w || !h) return;
      Array.prototype.forEach.call(g.children, function (n) {
        if (!n.style) return;
        var mx = ((n.offsetLeft + n.offsetWidth / 2) / w - 0.5) * 2;
        var my = ((n.offsetTop + n.offsetHeight / 2) / h - 0.5) * 2;
        mx = Math.max(-1, Math.min(1, mx));
        my = Math.max(-1, Math.min(1, my));
        n.style.setProperty("--mx", (mx * 4).toFixed(2));
        n.style.setProperty("--my", (my * 3).toFixed(2));
      });
    });
  }

  function bindTilt() {
    if (!root || !stageEl) return;

    root.addEventListener("pointermove", function (e) {
      if (!tiltAllowed()) return;
      var r = stageEl.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      var ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      tiltTX = Math.max(-1, Math.min(1, nx));
      tiltTY = Math.max(-1, Math.min(1, ny));
      stageEl.classList.add("is-tilting");
      kickTilt();
    }, { passive: true });

    root.addEventListener("pointerleave", function () {
      tiltTX = 0;
      tiltTY = 0;
      kickTilt();
    });
  }

  var GLYPH = {    H: ["101", "101", "111", "101", "101"],
    N: ["1001", "1101", "1011", "1001", "1001"],
    Y: ["101", "101", "010", "010", "010"],
    Z: ["1111", "0001", "0010", "1000", "1111"]
  };

  function wordmark() {
    var rows = ["", "", "", "", ""];
    ["H", "N", "Y", "Z"].forEach(function (ch, wi) {
      var g = GLYPH[ch];
      for (var r = 0; r < 5; r += 1) {
        rows[r] += (wi ? "0" : "") + g[r];
      }
    });
    var px = rows.map(function (row) {
      var out = "";
      for (var c = 0; c < row.length; c += 1) {
        out += "<i" + (row[c] === "1" ? ' class="on"' : "") + "></i>";
      }
      return out;
    }).join("");
    return '<span class="tty-pixel" role="img" aria-label="HNYZ">' + px + "</span>";
  }

  /* ---------------------------------------------------------
     方块：一块面板 = 标题条 + 正文，大小按 12 列切
     body 传函数，是为了让每块内部的行号从 0 重新错峰
     --------------------------------------------------------- */
  var tileSeq = 0;
  function tile(no, name, span, meta, body, cls) {
    lineIdx = 0;
    var ti = tileSeq++;
    return '<section class="tile' + (cls ? " " + cls : "") + '" style="--c:' + span + ";--ti:" + ti +
      '" data-tile="' + no + '" data-name="' + esc(name) + '">' +
      '<header class="tile__hdr">' +
      '<span class="tile__no">' + no + "</span>" +
      '<span class="tile__name">' + esc(name) + "</span>" +
      (meta ? '<span class="tile__meta">' + esc(meta) + "</span>" : "") +
      "</header>" +
      '<div class="tile__bd">' + body() + "</div>" +
      "</section>";
  }

  /* ---------------------------------------------------------
     板块 0 · 概览
     --------------------------------------------------------- */
  function gridOverview() {
    tileSeq = 0;
    var d = new Date();
    var date = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

    return tile("0.1", "launchpad", 7, "42×30", function () {
      var h = [];
      h.push('<div class="tty-hero" style="--i:' + (lineIdx++) + '">' +
        deepyBox(0, "Deepy 像素鲸鱼，点一下它会动", true) + wordmark() + "</div>");
      h.push('<div class="tty-meta" style="--i:' + (lineIdx++) + '">' +
        "<span>hnyz-tty <b>6.4.0</b> · 雾蓝主题 · 访客登录</span>" +
        "<span>~/hnyz · 上次登录 " + date + " · 教学楼机房</span>" +
        "<span>提示：输入 <b>help</b> 看命令，<b>0-3</b> 换板块，<b>[ ]</b> 前后翻</span>" +
        "</div>");
      h.push(L('<span class="t-dim">#</span> 各页入口在 0.4；也可以直接敲 <span class="t-cyn">projects</span> / <span class="t-cyn">gallery</span> / <span class="t-cyn">member</span>', "t-dim"));
      return h.join("");
    }) +

    tile("0.2", "一句话", 5, "intro", function () {
      return '<p class="tty-tag" style="--i:' + (lineIdx++) + '">把想法，<span>写成代码</span>。</p>' +
        L("衡南一中编程社 · 全校学生都能参加", "t-cyn") +
        L("主线是 Arduino 硬件：从点亮第一颗 LED 开始，学接线、写程序、查问题，再组队做一个小装置。零基础也能来。", "t-mut") +
        '<ul class="tty-tags" style="--i:' + (lineIdx++) + '">' +
        "<li><span>01</span>零基础友好</li>" +
        "<li><span>02</span>Arduino 主线</li>" +
        "<li><span>03</span>每周两小时</li>" +
        "<li><span>04</span>做完比完美更重要</li>" +
        "</ul>";
    }) +

    tile("0.3", "节奏", 5, "meters", function () {
      return '<div class="tty-meters">' +
        meter("活动频率", 2 / 7, "每周 2 次") +
        meter("单次时长", 60 / 60, "60 分钟") +
        meter("入门要求", 0, "零基础") +
        meter("项目周期", 5 / 10, "一学期") +
        "</div>";
    }) +

    tile("0.4", "入口", 4, "4 个入口", function () {
      return '<ul class="tty-entries">' +
        '<li><a href="projects.html"><b>projects</b><span>全部仓库与项目卡片</span><i>↗</i></a></li>' +
        '<li><a href="gallery.html"><b>gallery</b><span>活动的照片与作品图</span><i>↗</i></a></li>' +
        '<li><a href="member.html"><b>member</b><span>社团成员与各自的仓库</span><i>↗</i></a></li>' +
        '<li><a href="https://github.com/ghxiaochi" target="_blank" rel="noopener noreferrer"><b>github</b><span>源码、问题讨论与提交记录</span><i>↗</i></a></li>' +
        "</ul>";
    }) +

    tile("0.5", "联系", 3, "contact", function () {
      return '<div class="tty-contact tty-contact--flat">' +
        '<div class="tty-contact__row"><span class="t-dim">QQ 群</span><b>' + QQ + "</b>" + copyBtn(QQ, "复制") + "</div>" +
        '<div class="tty-contact__row"><span class="t-dim">邮箱</span><b>' + MAIL + "</b>" + copyBtn(MAIL, "复制") + "</div>" +
        '<div class="tty-contact__row"><span class="t-dim">位置</span><span>教学楼机房</span></div>' +
        '<p class="tty-contact__note t-dim">加群请备注「班级 + 姓名」。</p>' +
        "</div>";
    });
  }

  /* ---------------------------------------------------------
     板块 1 · 关于
     --------------------------------------------------------- */
  function gridAbout() {
    tileSeq = 0;

    return tile("1.1", "man hnyz", 7, "man 1", function () {
      var h = [];
      h.push(L('<span class="t-dim">$</span> man hnyz <span class="t-dim">(1)</span>'));
      h.push(L('<b class="t-yel">名称</b>　hnyz — 衡南一中编程社 / HNYZ CS CLUB'));
      h.push(L('<b class="t-yel">加入</b>　加 QQ 群，备注「班级 + 姓名」'));
      h.push(L('<b class="t-yel">时间</b>　每周两次，每次 60 分钟；具体见 QQ 群公告'));
      h.push(L('<b class="t-yel">简介</b>'));
      h.push(L("一个把好奇心变成作品的地方。不用先学完什么才能来：从点亮第一颗 LED、读按钮和传感器开始，学数字/模拟输入输出、串口和简单的控制逻辑，再组队完成一个完整的硬件小项目。ESP32 会作为进阶平台接触。", "t-mut tty-indent"));
      h.push(L('<b class="t-yel">另见</b>　右侧「作品」「加入」两栏'));
      return h.join("");
    }) +

    tile("1.2", "文化", 5, "3 条", function () {
      return '<ol class="tty-rules">' +
        '<li><b>做完比完美更重要。</b><span>先跑起来，再改好。</span></li>' +
        '<li><b>提问不需要理由。</b><span>卡住就喊，没人会笑。</span></li>' +
        '<li><b>不是只有写代码。</b><span>设计、文案、测试、组织，都是项目的一部分。</span></li>' +
        "</ol>";
    }) +

    tile("1.3", "课表", 7, "crontab", function () {
      var h = [];
      h.push(L('<span class="t-dim">$</span> crontab -l <span class="t-dim">| grep hnyz</span>'));
      h.push(L('<span class="t-dim"># 每周两次 · 每次 60 分钟 · 时间地点以 QQ 群公告为准，考试周会减量</span>'));
      h.push(L('<b class="t-grn">每周第一次</b>　主题分享 + 结对开发　<span class="t-dim"># 讲一个小主题，讲完就动手</span>'));
      h.push(L('<b class="t-grn">每周第二次</b>　自由开发 + 问题排查　<span class="t-dim"># 带项目来，报错现场修</span>'));
      h.push(L('<b class="t-grn">每月一次　</b>　Demo Day 展示　　　<span class="t-dim"># 展示这个月做的东西</span>'));
      h.push('<div class="tty-timeline" style="--i:' + (lineIdx++) + '" aria-label="一次活动 60 分钟的时间分配">' +
        '<i style="width:16.7%"></i><i style="width:41.6%"></i><i style="width:25%"></i><i style="width:16.7%"></i></div>' +
        '<p class="tty-timeline__cap t-dim" style="--i:' + (lineIdx++) + '">' +
        '<span class="t-cyn">分享 10’</span> · <span class="t-grn">自由开发 25’</span> · <span class="t-yel">进度同步 15’</span> · <span class="t-mgt">提问/结对 10’</span></p>');
      return h.join("");
    }) +

    tile("1.4", "资源墙", 5, "ls -la", function () {
      var h = [];
      h.push('<div class="tty-wall" style="--i:' + (lineIdx++) + '">');
      h.push('<a class="tty-wall__row" href="https://www.runoob.com/cplusplus/cpp-tutorial.html" target="_blank" rel="noopener noreferrer">' +
        '<b class="t-cyn">CPP/</b><span>C++ 菜鸟教程</span><span class="tty-wall__host t-dim">runoob ↗</span></a>');
      h.push('<a class="tty-wall__row" href="https://www.waveshare.net/wiki/ESP32-S3-DEV-KIT-N8R8" target="_blank" rel="noopener noreferrer">' +
        '<b class="t-cyn">ESP32/</b><span>微雪 ESP32-S3 Wiki</span><span class="tty-wall__host t-dim">waveshare ↗</span></a>');
      h.push('<a class="tty-wall__row" href="https://docs.arduino.cc/" target="_blank" rel="noopener noreferrer">' +
        '<b class="t-cyn">ARDUINO/</b><span>官方文档与示例</span><span class="tty-wall__host t-dim">arduino.cc ↗</span></a>');
      h.push('<a class="tty-wall__row" href="https://oshwhub.com/" target="_blank" rel="noopener noreferrer">' +
        '<b class="t-cyn">OSHWHUB/</b><span>立创开源硬件平台</span><span class="tty-wall__host t-dim">oshwhub ↗</span></a>');
      h.push("</div>");
      h.push(L("# C++ 基础配合 Arduino 项目一起看；ESP32 统一看微雪的 Wiki。", "t-dim"));
      h.push(L("# 想推荐教程、工具或项目，丢进 QQ 群，这面墙会一直补。", "t-dim"));
      return h.join("");
    });
  }

  /* ---------------------------------------------------------
     板块 2 · 作品
     --------------------------------------------------------- */
  function gridWork() {
    tileSeq = 0;

    return tile("2.1", "git log", 8, "全部", function () {
      return L('<span class="t-dim">$</span> git log --oneline <span class="t-dim">~/repos --all</span>') +
        '<div class="tty-repos" data-repos><p class="t-dim" style="--i:' + (lineIdx++) + '">正在读取仓库数据…</p></div>';
    }) +

    tile("2.2", "全部项目", 4, "→", function () {
      return '<p class="tty-note">卡片按成员分组，标了语言、star 和最近推送时间。点右上角的刷新按钮，可以跳过每日快照直接问 GitHub。</p>' +
        '<a class="tty-btn tty-btn--block" href="projects.html">全部项目 →</a>';
    }, "tile--spread") +

    tile("2.3", "图集", 4, "→", function () {
      return '<p class="tty-note">活动的照片、作品实物，还有社团的日常。点开看大图，方向键翻页。</p>' +
        '<a class="tty-btn tty-btn--block" href="gallery.html">图集 →</a>';
    }, "tile--spread") +

    tile("2.4", "技术栈", 4, "4 项", function () {
      return '<ul class="tty-stack">' +
        '<li><b>Arduino</b><span>主线平台</span></li>' +
        '<li><b>C++</b><span>配合硬件</span></li>' +
        '<li><b>ESP32</b><span>进阶方向</span></li>' +
        '<li><b>Figma</b><span>界面与海报</span></li>' +
        "</ul>";
    }) +

    tile("2.5", "参与", 4, "3 步", function () {
      return '<ol class="tty-rules tty-rules--tight">' +
        '<li><b>先读代码</b><span>从最近一次提交看起。</span></li>' +
        '<li><b>发现问题就提 issue</b><span>说清复现步骤就够。</span></li>' +
        '<li><b>想动手就来活动</b><span>现场结对，不用预约。</span></li>' +
        "</ol>";
    }, "tile--spread");
  }

  /* ---------------------------------------------------------
     板块 3 · 加入
     --------------------------------------------------------- */
  function gridJoin() {
    tileSeq = 0;

    return tile("3.1", "ssh newmember", 7, "join", function () {
      var h = [];
      h.push(L('<span class="t-dim">$</span> ssh newmember@hnyz.club'));
      h.push(L("▸ 第一次来不用准备任何东西，直接来坐坐。", "t-mut"));
      h.push(L("▸ 带电脑更好，没有也能先听分享、参与设计和讨论。", "t-mut"));
      h.push('<div class="tty-contact" style="--i:' + (lineIdx++) + '">');
      h.push('<div class="tty-contact__row"><span class="t-dim">QQ 群</span><b class="t-cyn">' + QQ + "</b>" + copyBtn(QQ, "复制群号") + "</div>");
      h.push('<div class="tty-contact__row"><span class="t-dim">邮箱</span><b>' + MAIL + "</b>" + copyBtn(MAIL, "复制邮箱") + "</div>");
      h.push('<div class="tty-contact__row"><span class="t-dim">备注</span><span>班级 + 姓名</span></div>');
      h.push('<p class="tty-contact__note t-dim">零基础可以 · 非技术方向也可以 · 考试周活动会减量</p>');
      h.push("</div>");
      return h.join("");
    }) +

    tile("3.2", "faq", 5, "5 问", function () {
      var h = [];
      h.push(L('<span class="t-dim">$</span> faq --list <span class="t-dim">（点问题展开）</span>'));
      var qa = [
        ["零基础可以加入吗？", "可以。社团里很多人也是从零开始的。你不需要先学完某门课再来，带着问题和兴趣来就够了。"],
        ["社团主要教什么？", "以 Arduino 为主线：从点亮 LED、读按钮和传感器开始，学数字/模拟输入输出、串口、简单控制逻辑，再完成一个完整的硬件小项目。ESP32 作为进阶平台接触。"],
        ["需要自己带电脑吗？", "有电脑会更方便，但不是硬性要求。没有电脑也可以先来听分享、参与讨论和设计，之后再决定怎么参与项目。"],
        ["不是技术方向也能加入吗？", "可以。一个项目除了写代码，还需要设计、文案、测试和活动组织。先认领一件小事，再慢慢找到自己擅长的部分。"],
        ["活动时间是什么时候？", "常规活动每周两次，每次一小时：一次主题分享 + 结对开发，一次自由开发 + 问题排查。具体时间地点在 QQ 群公告里，考试周会适当调整。"]
      ];
      qa.forEach(function (p, i) {
        h.push('<details class="tty-faq" style="--i:' + (lineIdx++) + '"' + (i === 0 ? " open" : "") + ">" +
          "<summary><span class='t-dim'>" + pad(i + 1) + " ▸</span> " + esc(p[0]) + "</summary>" +
          "<p>" + esc(p[1]) + "</p></details>");
      });
      return h.join("");
    }) +

    tile("3.3", "留言", 5, "tail -f", function () {
      var h = [];
      h.push(L('<span class="t-dim">$</span> tail -f <span class="t-dim">~/hnyz/guestbook.log</span>'));
      h.push(L("▌ 留言走 GitHub Discussions：公开、不设匿名、没有第三方服务器——删库才会消失。", "t-mut"));
      h.push(L('▌ <span class="t-dim">正在等待新留言…</span>'));
      h.push(L('<button type="button" class="tty-btn" data-open-guestbook>打开留言板 →</button>　<span class="t-dim tty-inline-note">需要 GitHub 账号；没有就进群说一声</span>'));
      return h.join("");
    }, "tile--spread") +

    tile("3.4", "一句", 7, "motd", function () {
      return '<p class="tty-quote">"不用很厉害才开始，<br>开始了才会很厉害。"</p>' +
        L('<span class="t-dim">#</span> 衡南一中编程社 · 教学楼机房 · 每周两次', "t-dim") +
        '<div class="tty-cta">' +
        '<a class="tty-btn" href="member.html">看看成员</a>' +
        '<a class="tty-btn tty-btn--ghost" href="projects.html">先看作品</a>' +
        '<button type="button" class="tty-btn tty-btn--ghost" data-copy="' + QQ + '">复制群号</button>' +
        "</div>";
    }, "tile--spread");
  }

  var GRIDS = { overview: gridOverview, about: gridAbout, work: gridWork, join: gridJoin };

  /* ---------------------------------------------------------
     仓库数据：本地缓存优先，静态快照兜底
     --------------------------------------------------------- */
  function renderRepos(box, data) {
    if (!box) return;
    lineIdx = 0;
    var h = [];
    var repos = data && data.repos ? Object.keys(data.repos).map(function (k) { return data.repos[k]; }) : [];
    if (!repos.length) {
      h.push(L("没取到仓库数据，去「全部项目」页看实时版。", "t-dim"));
    } else {
      repos.sort(function (a, b) { return String(b.pushed_at || "").localeCompare(String(a.pushed_at || "")); });
      /* 仓库没写 About 时，用 members.js 里的本地简介兜底，别留一行空话 */
      var localDesc = {};
      (window.HNYZ_MEMBERS || []).forEach(function (m) {
        if (m && m.repo && m.desc) localDesc[m.repo] = m.desc;
      });

      repos.forEach(function (r) {
        var raw = String(r.description || "").trim();
        if (/^(没有简介|暂无简介|无|no description\.?|n\/a)$/i.test(raw)) raw = "";
        var desc = raw
          ? esc(raw)
          : (localDesc[r.name] ? esc(localDesc[r.name]) : '<span class="t-dim">（还没有描述）</span>');
        h.push(L(
          '<span class="t-dim">*</span> <a class="tty-link" href="' + esc(r.html_url || "#") + '" target="_blank" rel="noopener noreferrer">' + esc(r.name || "") + "</a> " +
          '<span class="t-mgt">[' + esc(r.language || "—") + "]</span> " +
          '<span class="t-yel">★' + (r.stargazers_count || 0) + "</span><br>" +
          '<span class="t-mut tty-desc">' + desc + "</span>"
        ));
      });
    }
    box.innerHTML = h.join("");
  }

  function readCachedRepos() {
    try {
      var raw = window.localStorage.getItem("hnyz:github-repo-cache:v1");
      var cache = raw ? JSON.parse(raw) : null;
      if (!cache || typeof cache !== "object") return null;
      var repos = {};
      var newest = 0;
      Object.keys(cache).forEach(function (k) {
        var entry = cache[k];
        if (!entry || !entry.data) return;
        repos[k] = entry.data;
        if (entry.savedAt > newest) newest = entry.savedAt;
      });
      return Object.keys(repos).length ? { repos: repos, newest: newest } : null;
    } catch (e) {
      return null;
    }
  }

  /* 先把缓存画出来（有的话），再拿快照比一次时间：
     快照更老就不动，免得把刚刷新过的数据盖回去 */
  function paintRepos(box) {
    if (!box) return;
    var cached = readCachedRepos();
    if (cached) renderRepos(box, { repos: cached.repos });

    window.fetch("data/repos.json?v=20261108b")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (store) {
        if (!store || !store.repos) {
          if (!cached) renderRepos(box, null);
          return;
        }
        var generatedAt = Date.parse(store.generatedAt || "") || 0;
        if (!cached || generatedAt > cached.newest) renderRepos(box, store);
      })
      .catch(function () {
        if (!cached) renderRepos(box, null);
      });
  }

  /* 顶部按钮同步完：作品板块里那份也得换 */
  window.addEventListener("hnyz:repos-synced", function () {
    if (!built) return;
    var box = root && root.querySelector("[data-repos]");
    if (!box) return;
    var cached = readCachedRepos();
    if (cached) renderRepos(box, { repos: cached.repos });
  });

  /* ---------------------------------------------------------
     模块级状态
     --------------------------------------------------------- */
  var root = null;
  var railEl = null, stageEl = null, sideEl = null;
  var stageNoEl = null, stageTtlEl = null, stageSubEl = null, stageStatEl = null;
  var echoEl = null, inputEl = null;
  var clockEl = null, upEl = null;
  var grids = [];
  var sideListEl = null;
  var active = 0;
  var built = false;
  var isOpen = false;
  var openedAt = 0;
  var tickTimer = 0;
  var swapTimer = 0;
  var swapToken = 0;
  var scrollRaf = 0;
  /* 板块切换的走线层：一条主线 + 一层光晕 + 一段彗尾 + 一个方块光标 */
  var pathSvg = null;
  var pathGlow = null;
  var pathLine = null;
  var pathTail = null;
  var pathDot = null;
  var pathMark = null;
  var pathBeam = null;
  var pathBeamStop = [];
  var pathRaf = 0;
  var pathHideTimer = 0;
  var pathClearTimer = 0;
  var pathMarkTimer = 0;
  var SVG_NS = "http://www.w3.org/2000/svg";

  var savedActionsParent = null;
  var savedActionsNext = null;

  /* 时钟与 uptime */
  function fmtUptime(ms) {
    var s = Math.floor(ms / 1000);
    return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
  }

  function tick() {
    if (!isOpen) return;
    var d = new Date();
    if (clockEl) clockEl.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    if (upEl) upEl.textContent = "v6.4.0 · UP " + fmtUptime(Date.now() - openedAt);
  }

  /* ---------------------------------------------------------
     右栏：当前板块的方块索引
     --------------------------------------------------------- */
  function paintSide(index) {
    if (!sideListEl) return;
    var grid = grids[active];
    var items = grid ? grid.querySelectorAll(".tile") : [];
    var frag = [];
    Array.prototype.forEach.call(items, function (el, i) {
      frag.push('<li><button type="button" data-goto-tile="' + i + '"' + (i === (index || 0) ? ' class="is-current"' : "") + ">" +
        '<span class="side-item__no">' + esc(el.getAttribute("data-tile")) + "</span>" +
        '<span class="side-item__name">' + esc(el.getAttribute("data-name")) + "</span>" +
        '<span class="side-item__w">' + esc(el.style.getPropertyValue("--c")) + " 栏</span>" +
        "</button></li>");
    });
    sideListEl.innerHTML = frag.join("");
    if (stageStatEl) stageStatEl.textContent = items.length + " 块 · 12 栏";
  }

  function markSide(index) {
    if (!sideListEl) return;
    Array.prototype.forEach.call(sideListEl.children, function (li, j) {
      var b = li.firstChild;
      if (!b) return;
      b.classList.toggle("is-current", j === index);
    });
  }

  /* 左栏高亮 + 中区标题 + 右栏索引，一次画齐 */
  function paintChrome() {
    var blk = BLOCKS[active];
    if (railEl) {
      Array.prototype.forEach.call(railEl.children, function (b, j) {
        b.classList.toggle("is-active", j === active);
        b.setAttribute("aria-selected", j === active ? "true" : "false");
      });
    }
    if (stageNoEl) stageNoEl.textContent = active + ":" + blk.id;
    if (stageTtlEl) stageTtlEl.textContent = blk.title;
    if (stageSubEl) stageSubEl.textContent = blk.sub;
    paintSide(grids[active] ? nearestTile(grids[active]) : 0);
  }

  function nearestTile(grid) {
    if (!grid) return 0;
    var top = grid.scrollTop + 12;
    var best = 0, bestTop = -1;
    /* 同一行会有几块 offsetTop 相同，取这一行里的第一块 */
    Array.prototype.forEach.call(grid.children, function (el, i) {
      if (el.offsetTop <= top && el.offsetTop > bestTop) {
        bestTop = el.offsetTop;
        best = i;
      }
    });
    return best;
  }

  /* 内容比一屏高时给底部铺一层渐隐。滚到底就摘掉，
     否则「这里还有」的暗示会一直挂着，反而像没加载完 */
  function updateOverflow() {
    if (!stageEl) return;
    var bd = stageEl.querySelector(".tty-stage__bd");
    var grid = grids[active];
    if (!bd || !grid) return;
    var left = grid.scrollHeight - grid.clientHeight - grid.scrollTop;
    bd.classList.toggle("is-more", left > 8);
  }

  /* ---------------------------------------------------------
     板块切换：沿一条走线推进
     ---------------------------------------------------------
     旧矩阵先退半步淡出，一条线从旧板块的小方点出发：沿栏边
     走到新编号、拐进标题条、贴着标题条下沿横走，最后向下扎进
     内容区；线走到三成时新矩阵从左往右被「打印」出来。
     线条分三层叠着画 —— 9px 淡光晕、1.8px 主线、3px 彗尾 ——
     光标是 8px 方块，到终点会炸开一个小方框。
     --------------------------------------------------------- */
  function ensurePathLayer() {
    if (pathSvg || !root) return;
    pathSvg = document.createElementNS(SVG_NS, "svg");
    pathSvg.setAttribute("class", "tty-path");
    pathSvg.setAttribute("aria-hidden", "true");
    pathSvg.setAttribute("focusable", "false");

    /* 扫描光带：一条竖向的淡蓝渐变，跟着光标走，
       让「线扫过的地方」有被照亮的感觉 */
    var defs = document.createElementNS(SVG_NS, "defs");
    var grad = document.createElementNS(SVG_NS, "linearGradient");
    grad.setAttribute("id", "ttyBeamGrad");
    grad.setAttribute("x1", "0");
    grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "1");
    grad.setAttribute("y2", "0");
    [0, 0.12, 0].forEach(function (opacity) {
      var stop = document.createElementNS(SVG_NS, "stop");
      stop.setAttribute("offset", String(pathBeamStop.length / 2));
      stop.setAttribute("stop-opacity", String(opacity));
      grad.appendChild(stop);
      pathBeamStop.push(stop);
    });
    defs.appendChild(grad);
    pathSvg.appendChild(defs);

    pathBeam = document.createElementNS(SVG_NS, "rect");
    pathBeam.setAttribute("class", "tty-path__beam");
    pathBeam.setAttribute("fill", "url(#ttyBeamGrad)");
    pathBeam.setAttribute("width", "56");
    pathSvg.appendChild(pathBeam);

    pathGlow = document.createElementNS(SVG_NS, "path");
    pathGlow.setAttribute("class", "tty-path__glow");
    pathLine = document.createElementNS(SVG_NS, "path");
    pathLine.setAttribute("class", "tty-path__line");
    pathTail = document.createElementNS(SVG_NS, "path");
    pathTail.setAttribute("class", "tty-path__tail");
    /* 位置放在 <g> 上，缩放动画放在 rect 上：
       CSS transform 会盖掉 SVG 的 transform 属性，混在一层会跳位 */
    pathMark = document.createElementNS(SVG_NS, "g");
    pathMark.setAttribute("class", "tty-path__mark");
    var markBox = document.createElementNS(SVG_NS, "rect");
    markBox.setAttribute("width", "16");
    markBox.setAttribute("height", "16");
    markBox.setAttribute("rx", "1");
    markBox.setAttribute("class", "tty-path__mark-box");
    /* 第二圈涟漪：方框先张开一次，紧跟着再散一圈，
       一次扩张看着像「闪了一下」，两圈才像「落下去了」 */
    var markRing = document.createElementNS(SVG_NS, "rect");
    markRing.setAttribute("width", "16");
    markRing.setAttribute("height", "16");
    markRing.setAttribute("rx", "1");
    markRing.setAttribute("class", "tty-path__mark-ring");
    pathMark.appendChild(markRing);
    pathMark.appendChild(markBox);
    pathDot = document.createElementNS(SVG_NS, "rect");
    pathDot.setAttribute("class", "tty-path__dot");
    pathDot.setAttribute("width", "8");
    pathDot.setAttribute("height", "8");
    pathDot.setAttribute("rx", "1");

    pathSvg.appendChild(pathGlow);
    pathSvg.appendChild(pathLine);
    pathSvg.appendChild(pathTail);
    pathSvg.appendChild(pathMark);
    pathSvg.appendChild(pathDot);
    /* 挂在 .tty 上而不是中区：线要能跨过左栏和中区之间的边界，
       挂在中区里会被裁掉一半 */
    root.appendChild(pathSvg);
  }

  function clearPath() {
    if (pathRaf) { window.cancelAnimationFrame(pathRaf); pathRaf = 0; }
    if (pathHideTimer) { window.clearTimeout(pathHideTimer); pathHideTimer = 0; }
    if (pathClearTimer) { window.clearTimeout(pathClearTimer); pathClearTimer = 0; }
    if (pathMarkTimer) { window.clearTimeout(pathMarkTimer); pathMarkTimer = 0; }
    if (!pathSvg) return;
    pathSvg.classList.remove("is-on");
    pathMark.classList.remove("is-hit");
    [pathGlow, pathLine, pathTail].forEach(function (el) {
      el.style.transition = "none";
      el.style.strokeDasharray = "";
      el.style.strokeDashoffset = "";
    });
    pathDot.style.opacity = "";
    if (pathBeam) pathBeam.style.opacity = "0";
  }

  /* 折线 → 带小圆角的路径。拐角半径 7px，线拐弯时不会戳出一个尖 */
  function roundedPath(pts, radius) {
    var clean = [pts[0]];
    for (var i = 1; i < pts.length; i += 1) {
      var prev = clean[clean.length - 1];
      if (Math.abs(pts[i][0] - prev[0]) > 0.5 || Math.abs(pts[i][1] - prev[1]) > 0.5) {
        clean.push(pts[i]);
      }
    }
    if (clean.length < 2) return "";

    var d = "M" + clean[0][0] + " " + clean[0][1];
    for (var j = 1; j < clean.length - 1; j += 1) {
      var a = clean[j - 1], c = clean[j], b = clean[j + 1];
      var v1x = c[0] - a[0], v1y = c[1] - a[1];
      var v2x = b[0] - c[0], v2y = b[1] - c[1];
      var l1 = Math.sqrt(v1x * v1x + v1y * v1y);
      var l2 = Math.sqrt(v2x * v2x + v2y * v2y);
      if (!l1 || !l2) { d += "L" + c[0] + " " + c[1]; continue; }
      var r = Math.min(radius, l1 / 2, l2 / 2);
      var ax = c[0] - (v1x / l1) * r, ay = c[1] - (v1y / l1) * r;
      var bx = c[0] + (v2x / l2) * r, by = c[1] + (v2y / l2) * r;
      d += "L" + ax + " " + ay + "Q" + c[0] + " " + c[1] + " " + bx + " " + by;
    }
    var last = clean[clean.length - 1];
    return d + "L" + last[0] + " " + last[1];
  }

  /* 量栏位，生成一条「旧编号 → 新编号 → 标题条 → 内容区」的折线，
     把线画出来、让光标跑一遍，返回时长 */
  function playPath(fromIndex, toIndex, token) {
    if (!railEl || !stageEl || !root) return 0;
    var a = railEl.children[fromIndex];
    var b = railEl.children[toIndex];
    if (!a || !b) return 0;

    ensurePathLayer();
    if (!pathSvg) return 0;

    /* 以 SVG 自身左上角为原点：.tty 有安全区 padding 时，
       border box 和 SVG 的定位起点会差一截 */
    var pr = pathSvg.getBoundingClientRect();
    if (!pr.width || !pr.height) return 0;

    var ar = a.getBoundingClientRect();
    var sr = stageEl.getBoundingClientRect();
    var hdr = stageEl.querySelector(".tty-stage__hdr");
    var hr = hdr ? hdr.getBoundingClientRect() : null;
    var railBox = railEl.getBoundingClientRect();
    var verticalRail = railBox.height >= railBox.width;

    /* 标题条下沿：线贴在这条边上走，不会压住标题文字 */
    /* 走在标题条下沿往上 4px：压着边框线会看不出是「线」，
       再往上又会蹭到标题文字 */
    var hdrBottom = (hr ? hr.bottom - 4 : sr.top + 30) - pr.top;
    var stageLeft = sr.left - pr.left;
    var stageRight = sr.right - pr.left;
    var endX = Math.round(Math.min(stageRight - 32, stageLeft + sr.width * 0.5));
    var endY = Math.round(hdrBottom + 22);
    var pts;

    if (verticalRail) {
      /* 从原来那个板块的小方点出发，斜进标题条左端。
         起点用旧项：线从「你刚才在看的地方」滑到新内容，
         方向和信息流向一致 */
      var sx = Math.round(ar.right - pr.left - 6);
      var sy = Math.round(ar.top + ar.height / 2 - pr.top);
      var gateX = Math.round(stageLeft + 14);
      pts = [
        [sx, sy],
        [gateX, Math.round(hdrBottom)],
        [endX, Math.round(hdrBottom)],
        [endX, endY]
      ];
    } else {
      /* 横排标签条：从旧标签底部垂直落下，沿栏底横到中区左端，
         再贴着标题条走 —— 全程不穿过其他标签的文字 */
      var ox = Math.round(ar.left + ar.width / 2 - pr.left);
      var railBottom = Math.round(railBox.bottom - pr.top + 2);
      pts = [
        /* 从旧标签内部下方拉出来，能看出线是从「刚才看的那一栏」出发 */
        [ox, Math.round(ar.bottom - pr.top - 12)],
        [ox, railBottom],
        [Math.round(stageLeft + 14), railBottom],
        [Math.round(stageLeft + 14), Math.round(hdrBottom)],
        [endX, Math.round(hdrBottom)],
        [endX, endY]
      ];
    }

    var d = roundedPath(pts, 7);
    if (!d) return 0;

    if (pathGlow) pathGlow.setAttribute("d", d);
    pathLine.setAttribute("d", d);
    pathTail.setAttribute("d", d);
    pathSvg.classList.add("is-on");
    pathMark.classList.remove("is-hit");

    var len = 0;
    try { len = pathLine.getTotalLength(); } catch (e) { len = 0; }
    if (!len) return 0;

    var dur = Math.max(420, Math.min(640, Math.round(len * 0.7)));
    var dash = len + " " + len;

    [pathGlow, pathLine].forEach(function (el) {
      el.style.transition = "none";
      el.style.strokeDasharray = dash;
      el.style.strokeDashoffset = len;
    });
    /* 彗尾：20px 一段，跟着光标走；9999 的第二段保证只剩这一段可见 */
    pathTail.style.transition = "none";
    pathTail.style.strokeDasharray = "20 9999";
    pathTail.style.strokeDashoffset = "20";

    /* 光带只铺在内容区（标题条下沿到中区底部） */
    if (pathBeam) {
      var beamTop = hdrBottom + 2;
      var beamH = Math.max(0, sr.bottom - pr.top - beamTop);
      pathBeam.setAttribute("y", String(beamTop));
      pathBeam.setAttribute("height", String(beamH));
      pathBeam.style.opacity = "0";
    }

    var p0 = pathLine.getPointAtLength(0);
    pathDot.setAttribute("transform", "translate(" + (p0.x - 4) + "," + (p0.y - 4) + ")");
    pathDot.style.opacity = "1";
    pathMark.setAttribute("transform", "translate(" + (endX - 8) + "," + (endY - 8) + ")");
    void pathLine.getBoundingClientRect();

    var ease = "cubic-bezier(0.24, 0.76, 0.2, 1)";
    [pathGlow, pathLine].forEach(function (el) {
      el.style.transition = "stroke-dashoffset " + dur + "ms " + ease;
      el.style.strokeDashoffset = "0";
    });

    var t0 = 0;
    function follow(now) {
      if (token !== swapToken) { pathRaf = 0; return; }
      if (!t0) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      /* 和 CSS 那条 cubic-bezier 近似：慢起、快走、轻收 */
      var e = p < 0.5
        ? 4 * p * p * p
        : 1 - Math.pow(-2 * p + 2, 3) / 2;
      var at = len * e;
      var pt = pathLine.getPointAtLength(at);
      pathDot.setAttribute("transform", "translate(" + (pt.x - 4) + "," + (pt.y - 4) + ")");
      pathTail.style.strokeDashoffset = String(20 - at);

      /* 中后段才亮，起手那截在栏里没什么可照的 */
      if (pathBeam) {
        var beamOn = e > 0.28 && e < 0.94;
        pathBeam.style.opacity = beamOn ? "1" : "0";
        if (beamOn) pathBeam.setAttribute("x", String(Math.round(pt.x - 28)));
      }

      if (p < 1) {
        pathRaf = window.requestAnimationFrame(follow);
      } else {
        pathRaf = 0;
        /* 光标不立刻消失：停在落点上，等整层一起淡出，
           否则线到了、头没了，像中途断掉 */
        if (pathBeam) pathBeam.style.opacity = "0";
        pathMark.classList.add("is-hit");
        pathMarkTimer = window.setTimeout(function () {
          pathMark.classList.remove("is-hit");
          pathMarkTimer = 0;
        }, 340);
        /* 线在终点多留一小会儿，再整层淡出：给眼睛一个「走到了」的落点 */
        pathHideTimer = window.setTimeout(function () {
          if (token !== swapToken) return;
          pathSvg.classList.remove("is-on");
          pathHideTimer = 0;
        }, 320);
      }
    }
    pathRaf = window.requestAnimationFrame(follow);
    return dur;
  }

  function goto(i, opts) {
    if (!built) return;
    var n = BLOCKS.length;
    var next = ((i % n) + n) % n;
    var instant = !!opts && opts.instant;

    if (next === active) {
      /* 首次打开也走这里：把当前板块显示出来并画好两栏 */
      grids[active].hidden = false;
      stampDepth();
      paintChrome();
      updateOverflow();
      try { grids[active].focus({ preventScroll: true }); } catch (e) { /* 忽略 */ }
      return;
    }

    var fromIndex = active;
    var from = grids[active];
    var to = grids[next];

    active = next;
    swapToken += 1;
    var token = swapToken;

    paintChrome();

    if (swapTimer) { window.clearTimeout(swapTimer); swapTimer = 0; }
    if (pathClearTimer) { window.clearTimeout(pathClearTimer); pathClearTimer = 0; }

    if (!motionOK() || instant || document.documentElement.dataset.lite) {
      clearPath();
      from.hidden = true;
      from.classList.remove("is-out");
      to.hidden = false;
      stampDepth();
      to.classList.remove("is-in", "is-fresh");
      to.scrollTop = to.scrollTop || 0;
      markSide(nearestTile(to));
      updateOverflow();
      return;
    }

    /* 连按数字键时上一段可能还没收尾，先把别的矩阵清干净 */
    clearPath();
    for (var gi = 0; gi < grids.length; gi += 1) {
      if (grids[gi] === from || grids[gi] === to) continue;
      grids[gi].classList.remove("is-in", "is-fresh", "is-out");
      grids[gi].hidden = true;
    }
    from.classList.remove("is-in", "is-fresh");
    to.classList.remove("is-in", "is-fresh", "is-out");

    var railItem = railEl ? railEl.children[next] : null;
    if (railItem) {
      railItem.classList.remove("is-flash");
      void railItem.offsetWidth;
      railItem.classList.add("is-flash");
      window.setTimeout(function () { railItem.classList.remove("is-flash"); }, 700);
    }

    var dur = playPath(fromIndex, next, token);

    /* 旧的先退（0.14s 淡出），新方块紧跟着逐块浮起。
       不做整块裁切：擦除边界会把两套卡片并排摆出来 */
    from.classList.add("is-out");
    to.hidden = false;
    stampDepth();
    to.classList.add("is-fresh");
    void to.offsetWidth;

    swapTimer = window.setTimeout(function () {
      if (token !== swapToken) return;
      from.hidden = true;
      from.classList.remove("is-out");
      to.classList.remove("is-fresh");
      markSide(nearestTile(to));
      updateOverflow();
      swapTimer = 0;
    }, 360);

    try { to.focus({ preventScroll: true }); } catch (e) { /* 忽略 */ }
  }

  function step(dir) {
    goto(active + dir);
  }

  /* ---------------------------------------------------------
     命令行
     --------------------------------------------------------- */
  function echo(html, isErr) {
    if (!echoEl) return;
    var p = document.createElement("p");
    p.className = "tty-echo__ln" + (isErr ? " is-err" : "");
    p.innerHTML = html;
    echoEl.appendChild(p);
    while (echoEl.children.length > 4) echoEl.removeChild(echoEl.firstChild);
    echoEl.scrollTop = echoEl.scrollHeight;
  }

  var ALIAS = {
    main: "overview", index: "overview", start: "overview",
    man: "about", sched: "about", schedule: "about",
    build: "work", git: "work", repos2: "work",
    ssh: "join", faq: "join", msg: "join", guestbook: "join"
  };

  function runCommand(raw) {
    /* 按 : 聚焦时个别输入法/合成事件会把冒号留在框里，先剥掉 */
    var c = String(raw || "").trim().replace(/^[:/>]+\s*/, "");
    echo('<span class="t-dim">guest@hnyz:~$</span> ' + esc(c));
    var k = c.toLowerCase().replace(/\s+/g, "");
    if (!k) return;

    for (var i = 0; i < BLOCKS.length; i += 1) {
      if (k === BLOCKS[i].cmd) { goto(i); return; }
      if (k === String(i)) { goto(i); return; }
    }
    if (ALIAS[k]) {
      for (var j = 0; j < BLOCKS.length; j += 1) {
        if (BLOCKS[j].id === ALIAS[k]) { goto(j); return; }
      }
    }

    /* 极致档只留终端主页：跳页命令没有去处，直接说清楚 */
    if (document.documentElement.dataset.lite === "2" &&
        (k === "gallery" || k === "member" || k === "members" || k === "projects" || k === "repos")) {
      echo("极致模式：只保留终端主页。项目与作品在这个终端的 <span class='t-cyn'>work</span> 板块。");
      return;
    }

    switch (k) {
      case "help":
      case "?":
        echo("可用命令：<br>" +
          "　<span class='t-cyn'>overview about work join</span>　切到对应板块<br>" +
          "　<span class='t-cyn'>0-3</span>　切板块　<span class='t-cyn'>ls</span>　列出板块<br>" +
          (document.documentElement.dataset.lite === "2"
            ? ""
            : "　<span class='t-cyn'>gallery member projects</span>　打开对应页面<br>") +
          "　<span class='t-cyn'>whoami clear</span>　我是谁 / 清屏");
        return;
      case "ls":
        echo(BLOCKS.map(function (b, j) { return "<span class='t-dim'>" + j + "</span>:" + b.cmd; }).join("　"));
        return;
      case "whoami":
        echo("guest — 衡南一中编程社的访客。输入 <span class='t-cyn'>join</span> 看怎么加入。");
        return;
      case "clear":
        echoEl.innerHTML = "";
        return;
      case "gallery":
        echo("→ opening gallery.html");
        window.setTimeout(function () { window.location.href = "gallery.html"; }, 240);
        return;
      case "member":
      case "members":
        echo("→ opening member.html");
        window.setTimeout(function () { window.location.href = "member.html"; }, 240);
        return;
      case "projects":
      case "repos":
        echo("→ opening projects.html");
        window.setTimeout(function () { window.location.href = "projects.html"; }, 240);
        return;
      default:
        echo("tty: command not found: " + esc(k) + "　<span class='t-dim'>(try: help)</span>", true);
    }
  }

  /* ---------------------------------------------------------
     复制（带老内核回退）
     --------------------------------------------------------- */
  function flash(btn, ok) {
    if (!btn) return;
    var old = btn.getAttribute("data-copy-label") || btn.textContent;
    btn.setAttribute("data-copy-label", old);
    btn.textContent = ok ? "已复制 ✓" : "复制失败";
    btn.classList.add("is-done");
    window.setTimeout(function () {
      btn.textContent = old;
      btn.classList.remove("is-done");
    }, 1400);
  }

  function doCopy(btn) {
    var text = btn.getAttribute("data-copy") || "";
    function legacy() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      flash(btn, ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(btn, true); }, legacy);
    } else {
      legacy();
    }
  }

  /* ---------------------------------------------------------
     事件：根上走一遍委托，切换皮肤拆 DOM 时一起消失
     --------------------------------------------------------- */
  function bindRoot() {
    /* 左栏板块 */
    railEl.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-block]");
      if (!b) return;
      goto(parseInt(b.getAttribute("data-block"), 10) || 0);
    });

    /* 右栏：方块索引 / 上下板块 */
    sideEl.addEventListener("click", function (e) {
      var t = e.target.closest("button[data-goto-tile]");
      if (t) {
        var grid = grids[active];
        var idx = parseInt(t.getAttribute("data-goto-tile"), 10);
        var el = grid && grid.children[idx];
        if (!el) return;
        grid.scrollTo({ top: Math.max(0, el.offsetTop - 6), behavior: motionOK() ? "smooth" : "auto" });
        markSide(idx);
        /* 内容不满一屏时滚不动，给目标方块闪一下边框，否则点了像没反应 */
        el.classList.add("is-ping");
        window.setTimeout(function () { el.classList.remove("is-ping"); }, 900);
        return;
      }
      var p = e.target.closest("button[data-step]");
      if (p) step(parseInt(p.getAttribute("data-step"), 10) || 1);
    });

    /* 方块内的复制 / 留言板 */
    stageEl.addEventListener("click", function (e) {
      var cp = e.target.closest("[data-copy]");
      if (cp) { doCopy(cp); return; }
      if (e.target.closest("[data-open-guestbook]")) {
        /* 极致档：关掉终端就等于把纸带层放出来，和「只留终端」冲突。
           这里只解释一句，不真的跳走 */
        if (document.documentElement.dataset.lite === "2") {
          echo("极致模式：只保留终端主页。留言板要回到轻量模式才能打开。");
          return;
        }
        close();
        window.setTimeout(function () {
          var el = document.getElementById("guestbook");
          if (!el) return;
          el.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "start" });
        }, 90);
      }
    });

    /* 滚动时把右栏索引跟着挪（rAF 节流，不逐帧算） */
    stageEl.addEventListener("scroll", function (e) {
      var grid = e.target;
      if (!grid || !grid.classList || !grid.classList.contains("tty-grid")) return;
      if (scrollRaf) return;
      scrollRaf = window.requestAnimationFrame(function () {
        scrollRaf = 0;
        if (grid === grids[active]) {
          markSide(nearestTile(grid));
          updateOverflow();
        }
      });
    }, true);

    /* 手机：内容区左右滑切换板块。终端没有侧滑菜单，
       手势是最快的入口；纵向位移更大时立刻让给滚动 */
    var swipeX = 0, swipeY = 0, swipeOn = false;
    stageEl.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { swipeOn = false; return; }
      swipeX = e.touches[0].clientX;
      swipeY = e.touches[0].clientY;
      swipeOn = true;
    }, { passive: true });

    stageEl.addEventListener("touchmove", function (e) {
      if (!swipeOn || e.touches.length !== 1) return;
      var dy = Math.abs(e.touches[0].clientY - swipeY);
      var dx = Math.abs(e.touches[0].clientX - swipeX);
      if (dy > 16 && dy > dx) swipeOn = false;
    }, { passive: true });

    stageEl.addEventListener("touchend", function (e) {
      if (!swipeOn) return;
      swipeOn = false;
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      var dx = t.clientX - swipeX;
      var dy = t.clientY - swipeY;
      /* 横着走过 56px、且明显比纵向多，才算一次翻页 */
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      step(dx < 0 ? 1 : -1);
    }, { passive: true });

    /* 输入行 */
    var form = root.querySelector(".tty__prompt");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      runCommand(inputEl.value);
      inputEl.value = "";
    });
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { inputEl.blur(); e.stopPropagation(); }
    });
  }

  /* 这些监听绑在 document 上，模块加载时只绑一次：
     TUI 是「切走就拆、切回重建」的，绑在 build() 里会一路累积 */
  var resizeRaf = 0;
  window.addEventListener("resize", function () {
    if (resizeRaf) return;
    resizeRaf = window.requestAnimationFrame(function () {
      resizeRaf = 0;
      if (isOpen) { updateOverflow(); stampDepth(); }
    });
  });

  /* 切到轻量/极致：视差当场停下，别在省电的档位上继续跟着指针算。
     看事件里的 tier 而不是属性：属性的写入顺序将来若有调整，这里也不会漏 */
  document.addEventListener("hnyz:lite", function (e) {
    var tier = e && e.detail ? e.detail.tier : 0;
    if (tier !== 0 || !tiltAllowed()) resetTilt();
  });

  document.addEventListener("keydown", function (e) {
    if (!isOpen) return;
    if (e.target === inputEl) return; /* 输入行里让 shell 自己处理 */

    var k = e.key;
    if (k >= "0" && k <= "3") { e.preventDefault(); goto(parseInt(k, 10)); return; }
    if (k === "[" || k === "h" || k === "ArrowLeft") { e.preventDefault(); step(-1); return; }
    if (k === "]" || k === "l" || k === "ArrowRight") { e.preventDefault(); step(1); return; }
    if (k === ":" || k === "/") { e.preventDefault(); try { inputEl.focus(); } catch (err) { /* 忽略 */ } return; }
    if (k === "?") { e.preventDefault(); runCommand("help"); return; }
    if (k === "Escape") { return; }

    var grid = grids[active];
    if (!grid) return;
    if (k === "j" || k === "ArrowDown") { e.preventDefault(); grid.scrollTop += 72; return; }
    if (k === "k" || k === "ArrowUp") { e.preventDefault(); grid.scrollTop -= 72; return; }
  });

  window.addEventListener("hashchange", function () {
    /* 从别处带 #guestbook 这类锚点进来时，让位给真正的页面内容。
       极致档没有「真正的页面内容」可让，终端继续占着 */
    if (document.documentElement.dataset.lite === "2") return;
    if (isOpen && window.location.hash) close();
  });

  /* ---------------------------------------------------------
     顶栏按钮：把原顶栏的 .header-actions 整块搬进 TUI，
     关掉时再搬回去——监听器都在元素上，搬家不影响功能
     --------------------------------------------------------- */
  function adoptActions() {
    var ha = document.querySelector(".header-actions");
    if (!ha) return;
    /* 已经搬进来了就别再搬一次：反复 open 会把「原来的位置」
       记成终端顶栏，关闭时按钮被插进已拆掉的节点里 */
    var dock = root.querySelector(".tty__actions");
    if (dock && ha.parentNode === dock) return;
    savedActionsParent = ha.parentNode;
    savedActionsNext = ha.nextSibling;
    root.querySelector(".tty__actions").appendChild(ha);
  }

  function returnActions() {
    if (!document.querySelector(".tty") || !savedActionsParent) return;
    var ha = document.querySelector(".header-actions");
    if (ha) {
      try { savedActionsParent.insertBefore(ha, savedActionsNext); } catch (e) { savedActionsParent.appendChild(ha); }
    }
    savedActionsParent = null;
    savedActionsNext = null;
  }

  /* ---------------------------------------------------------
     开 / 关
     --------------------------------------------------------- */
  function open() {
    if (!built) return;
    isOpen = true;
    openedAt = Date.now();
    adoptActions();
    root.classList.add("is-on");
    root.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("tty-on");
    document.body.classList.add("tty-on");
    window.scrollTo(0, 0);
    goto(active, { instant: true });
    tick();
    if (tickTimer) window.clearInterval(tickTimer);
    /* 极致档：时钟停在打开那一刻，不再每秒重绘一次整行 */
    if (document.documentElement.dataset.lite !== "2") {
      tickTimer = window.setInterval(tick, 1000);
    }
  }

  function close() {
    isOpen = false;
    if (tickTimer) { window.clearInterval(tickTimer); tickTimer = 0; }
    if (root) {
      root.classList.remove("is-on");
      root.setAttribute("aria-hidden", "true");
    }
    returnActions();
    document.documentElement.classList.remove("tty-on");
    document.body.classList.remove("tty-on");
  }

  /* ---------------------------------------------------------
     构建（只建一次；切走皮肤时拆掉）
     --------------------------------------------------------- */
  function build() {
    var rail = BLOCKS.map(function (b, i) {
      return '<button type="button" role="tab" data-block="' + i + '" aria-selected="false">' +
        '<span class="rail__no">' + i + "</span>" +
        '<span class="rail__txt"><b>' + b.en + "</b><i>" + b.zh + "</i></span>" +
        '<span class="rail__dot" aria-hidden="true"></span>' +
        "</button>";
    }).join("");

    var gridHtml = BLOCKS.map(function (b) {
      return '<div class="tty-grid" role="tabpanel" tabindex="-1" aria-label="' + esc(b.en + " · " + b.zh) + '" hidden>' +
        GRIDS[b.id]() + "</div>";
    }).join("");

    root = document.createElement("div");
    root.className = "tty";
    root.setAttribute("role", "application");
    root.setAttribute("aria-label", "HNYZ 终端");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML =
      '<div class="tty__top">' +
      '  <span class="tty__logo" aria-hidden="true"></span>' +
      '  <span class="tty__brand">HNYZ<i>//TTY</i></span>' +
      '  <span class="tty__sess">hnyz@club · tty1 · <b>雾蓝</b></span>' +
      '  <span class="tty__clock" aria-hidden="true"></span>' +
      '  <span class="tty__actions"></span>' +
      "</div>" +
      '<div class="tty__shell">' +
      '  <nav class="tty__rail" role="tablist" aria-label="板块" aria-orientation="vertical">' + rail + "</nav>" +
      '  <div class="tty__stage">' +
      '    <div class="tty-stage__hdr">' +
      '      <span class="tty-stage__no">0:overview</span>' +
      '      <b class="tty-stage__ttl">launchpad</b>' +
      '      <span class="tty-stage__sub"></span>' +
      '      <span class="tty-stage__stat"></span>' +
      "    </div>" +
      '    <div class="tty-stage__bd">' + gridHtml + "</div>" +
      "  </div>" +
      '  <div class="tty__side" role="group" aria-label="板块索引">' +
      '    <div class="side__hdr"><span>BLOCKS</span><i class="side__hint">点一行滚过去</i></div>' +
      '    <ol class="side__list"></ol>' +
      '    <div class="side__nav">' +
      '      <button type="button" data-step="-1" aria-label="上一个板块">←</button>' +
      '      <span class="side__nav-txt">上一 / 下一</span>' +
      '      <button type="button" data-step="1" aria-label="下一个板块">→</button>' +
      "    </div>" +
      '    <div class="side__meta">' +
      '      <div><span>主题</span><b>雾蓝</b></div>' +
      '      <div><span>布局</span><b>12 栏</b></div>' +
      '      <div><span>板块</span><b>4 个</b></div>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div class="tty__echo" aria-live="polite"></div>' +
      '<form class="tty__prompt">' +
      '  <label class="tty__prompt-label" for="tty-cmd-input">guest@hnyz:~$</label>' +
      '  <input id="tty-cmd-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" aria-label="输入命令，help 查看可用命令">' +
      "</form>" +
      '<footer class="tty__legend" aria-hidden="true">' +
      '  <span class="tty-legend__path"><b>~/hnyz</b> · 4 个板块</span>' +
      '  <span class="tty-legend__keys"><kbd>0-3</kbd> 换板块 · <kbd>[ ]</kbd> 前后 · <kbd>↑↓</kbd>/<kbd>j k</kbd> 滚动 · <kbd>:</kbd> 命令 · <kbd>?</kbd> 帮助</span>' +
      '  <span class="tty__up"></span>' +
      "</footer>";

    document.body.appendChild(root);

    railEl = root.querySelector(".tty__rail");
    stageEl = root.querySelector(".tty__stage");
    sideEl = root.querySelector(".tty__side");
    sideListEl = root.querySelector(".side__list");
    stageNoEl = root.querySelector(".tty-stage__no");
    stageTtlEl = root.querySelector(".tty-stage__ttl");
    stageSubEl = root.querySelector(".tty-stage__sub");
    stageStatEl = root.querySelector(".tty-stage__stat");
    echoEl = root.querySelector(".tty__echo");
    inputEl = root.querySelector("#tty-cmd-input");
    clockEl = root.querySelector(".tty__clock");
    upEl = root.querySelector(".tty__up");

    grids = Array.prototype.slice.call(root.querySelectorAll(".tty-grid"));

    /* 顶栏的小鲸鱼：Deepy 的首帧，1px 一格刚好压在 46px 的顶栏里 */
    var logoEl = root.querySelector(".tty__logo");
    if (logoEl) logoEl.innerHTML = deepyBox(1, "", false);

    /* 概览那块：等方块都插好再挂 canvas */
    mountDeepy(root.querySelector(".tty-grid .tty-deepy"));

    bindRoot();
    bindTilt();
    stampDepth();
    built = true;

    /* 作品板块：本地缓存优先，静态快照兜底 */
    var box = root.querySelector("[data-repos]");
    if (box && window.fetch) {
      paintRepos(box);
    } else if (box) {
      renderRepos(box, null);
    }
  }

  function teardown() {
    close();
    stopDeepy();
    stopWhale(false);
    resetTilt();
    if (swapTimer) { window.clearTimeout(swapTimer); swapTimer = 0; }
    clearPath();
    swapToken += 1;
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null; railEl = null; stageEl = null; sideEl = null;
    echoEl = null; inputEl = null; clockEl = null; upEl = null;
    sideListEl = null; grids = [];
    pathSvg = null; pathLine = null; pathDot = null;
    built = false;
    active = 0;
  }

  /* ---------------------------------------------------------
     对外：只有 sync 一个口子
     --------------------------------------------------------- */
  function sync(on) {
    /* 只有首页有完整的首屏（section.hero）：内页凑不满四个板块，
       维持琥珀纸带不动 */
    if (on && !document.querySelector("section.hero")) return;
    if (on) {
      if (!built) build();
      /* 已经开着就不要再 open 一次：adoptActions 与 goto 都会重跑 */
      if (!isOpen) open();
    } else if (built) {
      teardown();
    }
  }

  window.HNYZTUI = { sync: sync, goto: goto, run: runCommand };

  /* 直接带 style=term 打开首页时，skins.js 会调 sync(true)，这里不用抢跑 */
})();
