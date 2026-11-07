/* =========================================================
   HNYZ · 轻量模式 / 极致模式
   ---------------------------------------------------------
   两档减法，都从同一根羽毛进去：

     正常（0）──点一下──▶ 轻量（1）──点一下──▶ 正常
                          │
                        长按
                          ▼
                       极致（2）──长按 / 点一下──▶ 轻量（1）

   轻量（data-lite="1"）—— 老手机、学校旧电脑
     关掉所有非必要的动画、模糊和 canvas 特效，只留下内容本身。
     电脑上额外关掉鼠标光晕、卡片 3D 倾斜、背景图标与跑马灯，
     画布像素比也降到 1。

   极致（data-lite="2"）—— 超低端：十年前的上网本、512MB 内存
     不是省流量，是省性能：这一档只保留终端主页（index.html +
     term 皮肤 + TUI），其余页面一律跳回来，纸带层整块不绘制，
     图像与动效类脚本全部早退。终端里的四个板块仍是完整文字，
     所以「只留主页」不等于「只剩一屏」。

   怎么开：
     1. 点顶栏那根羽毛 → 轻量，弹一张提示卡；
     2. 再点一下 → 正常；
     3. 长按那根羽毛 650ms → 极致（只留终端主页），按钮发光；
     4. 极致下长按（或点一下）→ 回到轻量；再点一下 → 正常；
     5. 第一次来、设备又明显吃力（Save-Data、2G、内存 ≤2G、核心 ≤2）
        自动开一次轻量，右下角说一句，随时能关。

   切换不刷新页面：
     CSS 立刻生效；canvas 模块监听 hnyz:lite 事件，自己停。
   ========================================================= */

(function () {
  "use strict";

  var KEY = "hnyz:lite";
  var AUTO_KEY = "hnyz:lite:auto";
  var PREV_KEY = "hnyz:ultra:prev";
  var root = document.documentElement;

  /* 长按多久算「要极致」。太短容易误触，太长像卡住 */
  var HOLD_MS = 650;

  function read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function write(key, value) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (error) {
      /* 隐私模式下存不住，本次会话仍然照常生效 */
    }
  }

  /* 0 关 / 1 轻量 / 2 极致 */
  function tier() {
    var v = root.dataset.lite;
    if (v === "2") return 2;
    if (v === "1") return 1;
    return 0;
  }

  function isOn() {
    return tier() > 0;
  }

  function ultra() {
    return tier() === 2;
  }

  /* 极致只认首页：根路径或 index.html */
  function onHome() {
    var p = location.pathname;
    return /\/$/.test(p) || /index\.html?$/i.test(p);
  }

  function guard() {
    if (!ultra() || onHome()) return false;
    location.replace("index.html");
    return true;
  }

  /* ---------- 提示：一句小条 ---------- */
  var toastTimer = 0;
  function toast(text) {
    if (!document.body) return;
    var el = document.querySelector(".lite-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "lite-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = text;
    /* 同一个元素连续提示时也能淡入 */
    void el.offsetWidth;
    el.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.classList.remove("is-on");
    }, 4200);
  }

  /* ---------- 提示：带标题的小卡片 ----------
     切档会让页面少掉一层东西，一句话说不清，
     所以给标题 + 一行解释。不挡点击、不锁滚动，五秒后自己走。 */
  var noteTimer = 0;
  function note(title, body) {
    if (!document.body) return;
    var el = document.querySelector(".lite-note");
    if (!el) {
      el = document.createElement("div");
      el.className = "lite-note";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = "";
    var h = document.createElement("strong");
    h.textContent = title;
    var p = document.createElement("p");
    p.textContent = body;
    el.appendChild(h);
    el.appendChild(p);

    /* 小条和卡片不同时出现，否则底部叠两层 */
    var t = document.querySelector(".lite-toast");
    if (t) t.classList.remove("is-on");

    void el.offsetWidth;
    el.classList.add("is-on");
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(function () {
      el.classList.remove("is-on");
    }, 5600);
  }

  /* ---------- 按钮状态 ---------- */
  var LABEL = {
    0: "开启轻量模式（点一下开启，长按直接进入极致模式）",
    1: "关闭轻量模式（长按进入极致模式）",
    2: "回到轻量模式"
  };
  var TIP = {
    0: "轻量模式：关闭 · 点一下开启 · 长按进入极致模式",
    1: "轻量模式：已开启 · 点一下关闭 · 长按进入极致模式",
    2: "极致模式：只保留终端主页 · 长按或点一下回到轻量"
  };

  function syncButtons() {
    var t = tier();
    var buttons = document.querySelectorAll("[data-lite-toggle]");
    for (var i = 0; i < buttons.length; i += 1) {
      var btn = buttons[i];
      btn.setAttribute("aria-pressed", t > 0 ? "true" : "false");
      btn.setAttribute("aria-label", LABEL[t]);
      btn.setAttribute("title", TIP[t]);
      btn.setAttribute("data-tier", String(t));
      btn.classList.toggle("is-on", t > 0);
      btn.classList.toggle("is-ultra", t === 2);
    }
  }

  /* 把当前档位告诉 Service Worker 和一片很小的状态缓存。
     SW 装完会串行预热一批资源；极致档的机器不该替这些预付。 */
  var STATE_CACHE = "hnyz-state";

  function publish(t) {
    try {
      if (window.caches && window.Response) {
        var url = new URL("__hnyz_lite", document.baseURI).href;
        window.caches.open(STATE_CACHE).then(function (store) {
          return store.put(
            url,
            new Response(String(t), { headers: { "content-type": "text/plain" } })
          );
        }).catch(function () { /* 隐私模式或存储满了 */ });
      }
    } catch (error) { /* 老内核 */ }

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "lite", tier: t });
      }
    } catch (error) { /* 没有 SW */ }
  }

  /* 极致档的图片闸门（在各页 <head> 里）把 src 换成了 1×1 占位，
     原地址存在 data-ultra-src。退出极致时按原样放回去。 */
  function restoreImages() {
    var imgs = document.querySelectorAll("img[data-ultra-src]");
    for (var i = 0; i < imgs.length; i += 1) {
      var img = imgs[i];
      var src = img.getAttribute("data-ultra-src");
      img.removeAttribute("data-ultra-src");
      if (src) img.setAttribute("src", src);
    }
  }

  /* ---------- 开关 ---------- */
  function set(next, options) {
    var t = next === true ? 1 : next === false ? 0 : Number(next);
    if (t !== 1 && t !== 2) t = 0;

    var was = tier();

    if (t > 0) root.dataset.lite = String(t);
    else delete root.dataset.lite;

    write(KEY, String(t));
    write(AUTO_KEY, options && options.auto ? "1" : null);

    if (was === 2 && t < 2) restoreImages();
    publish(t);

    syncButtons();
    /* 派发在 document 上：各模块都监听 document，
       从 window 发出去的事件不会往下冒泡，收不到 */
    document.dispatchEvent(
      new CustomEvent("hnyz:lite", { detail: { on: t > 0, tier: t } })
    );
  }

  /* ---------- 首次访问自动开轻量 ---------- */
  function maybeAuto() {
    if (read(KEY) !== null) return;
    if (!isOn()) return;

    write(KEY, "1");
    write(AUTO_KEY, "1");

    /* 系统里开了「减少动效」的人，别再说「设备吃力」——
       这不是性能问题，是偏好，照着做就行，也不用弹提示打扰 */
    var quiet = false;
    try {
      quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (error) { /* 老内核 */ }

    if (quiet) return;

    window.setTimeout(function () {
      if (isOn()) toast("设备有点吃力，已开启轻量模式，右上角那根羽毛可以关掉。");
    }, 2600);
  }

  /* ---------- 极致：只留终端主页 ---------- */
  function enterUltra() {
    /* 记下进来之前在哪个皮肤，回到轻量时原样还回去 */
    var prev = window.HNYZ_STYLE ? window.HNYZ_STYLE.current() : "";
    if (prev && prev !== "term") write(PREV_KEY, prev);

    if (!onHome()) {
      /* 先落档位再跳：新页面的 <head> 预置会直接按极致渲染 */
      set(2, { auto: false });
      location.href = "index.html";
      return;
    }

    set(2, { auto: false });

    /* 只留终端：皮肤必须是 term，TUI 必须开着 */
    if (window.HNYZ_STYLE) {
      if (window.HNYZ_STYLE.current() === "term") {
        if (window.HNYZTUI) window.HNYZTUI.sync(true);
      } else {
        window.HNYZ_STYLE.apply("term", { instant: true });
      }
    }

    note("已进入极致模式", "只保留终端主页。长按这根羽毛（或点一下）回到轻量模式。");
  }

  function leaveUltra() {
    var prev = read(PREV_KEY);
    write(PREV_KEY, null);

    set(1, { auto: false });

    /* 从纸带进来的，把纸带还回去；本来就在终端的就留在终端 */
    if (prev && prev !== "term" && window.HNYZ_STYLE) {
      window.HNYZ_STYLE.apply(prev, { instant: true });
    }

    note("已回到轻量模式", "再点一下这根羽毛，就恢复正常模式。");
  }

  /* ---------- 长按羽毛 → 极致 ---------- */
  var holdTimer = 0;
  var holdTarget = null;

  /* 这一次按下是不是已经被长按消费掉了？
     每次 pointerdown 都重置，所以长按之后浏览器补的那一下 click
     只会被吞一次，不会波及用户紧接着的下一次点击。
     以前用「600ms 时间窗」判断，快速再点会被误吞——就是那个
     「点一下、长按、再点没反应」的 bug。 */
  var pressHandled = false;
  /* 长按抬手后浏览器补的那一下 click，不一定是落在羽毛上：
     切档会重排顶栏，手指下可能已经换成「风格」按钮。
     所以这一次 click 要在捕获阶段整条吞掉，而不是只判断 target */
  var swallowClickOnce = false;

  var pressX = 0;
  var pressY = 0;
  var pressAt = 0;

  function clearHold() {
    if (holdTimer) {
      window.clearTimeout(holdTimer);
      holdTimer = 0;
    }
    if (holdTarget) {
      holdTarget.classList.remove("is-holding");
      holdTarget = null;
    }
  }

  function pressStart(btn, event) {
    clearHold();
    pressHandled = false;
    holdTarget = btn;
    pressX = event.clientX;
    pressY = event.clientY;
    pressAt = Date.now();
    btn.classList.add("is-holding");
    holdTimer = window.setTimeout(function () {
      holdTimer = 0;
      pressHandled = true;
      btn.classList.remove("is-holding");
      holdTarget = null;

      if (tier() === 2) leaveUltra();
      else enterUltra();
    }, HOLD_MS);
  }

  /* 短按：正常 ↔ 轻量；极致下回轻量 */
  function handleTap() {
    var t = tier();
    if (t === 2) {
      leaveUltra();
      return;
    }
    if (t === 1) {
      set(0, { auto: false });
      note("已恢复正常模式", "动画、特效和所有页面都回来了。");
      return;
    }
    set(1, { auto: false });
    note("已进入轻量模式", "动画、模糊和粒子已关闭。长按这根羽毛可以进入极致模式。");
  }

  function bindPress() {
    /* 长按抬手那一下的 click 一律吃掉，别让它触发别的按钮 */
    document.addEventListener("click", function (event) {
      if (!swallowClickOnce) return;
      swallowClickOnce = false;
      event.preventDefault();
      event.stopPropagation();
    }, { capture: true });

    document.addEventListener("pointerdown", function (event) {
      var btn = event.target.closest ? event.target.closest("[data-lite-toggle]") : null;
      if (!btn) return;
      /* 鼠标只认左键；触摸和笔都算 */
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pressStart(btn, event);
    }, { passive: true });

    /* 短按在 pointerup 里直接判，不靠 click。
       长按之后浏览器补的那一下 click 很容易和下一次真实点击撞在
       一起（旧实现用 600ms 时间窗吞它，结果吞掉了用户的点击）——
       现在一次按下只对应一次 pointerup，没有补发事件可混。 */
    function pressEnd() {
      if (!holdTarget) return;
      var held = Date.now() - pressAt;
      clearHold();

      /* 长按已经由上面的定时器处理过 */
      if (pressHandled) {
        pressHandled = false;
        swallowClickOnce = true;
        /* click 紧跟 pointerup 同步派发，0ms 定时器在它之后；
           万一浏览器没补 click，也不会留到下一次点击 */
        window.setTimeout(function () { swallowClickOnce = false; }, 0);
        return;
      }

      /* 定时器被主线程耽误了：抬起时按实际时长补一次 */
      if (held >= HOLD_MS) {
        pressHandled = true;
        if (tier() === 2) leaveUltra();
        else enterUltra();
        return;
      }

      handleTap();
    }

    document.addEventListener("pointerup", pressEnd, { passive: true, capture: true });
    document.addEventListener("pointercancel", pressEnd, { passive: true, capture: true });

    document.addEventListener("pointermove", function (event) {
      if (!holdTimer) return;
      if (Math.abs(event.clientX - pressX) > 12 || Math.abs(event.clientY - pressY) > 12) {
        clearHold();
      }
    }, { passive: true });

    /* 只接键盘触发的 click（detail === 0）。
       指针点击已经在 pointerup 里做完了，这里再执行会翻两次 */
    document.addEventListener("click", function (event) {
      var btn = event.target.closest ? event.target.closest("[data-lite-toggle]") : null;
      if (!btn) return;
      event.preventDefault();
      if (event.detail !== 0) return;
      handleTap();
    });
  }

  /* ---------- 键盘：Shift+L 切轻量，Shift+Alt+L 切极致 ---------- */
  function onKey(event) {
    if (!event.shiftKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "L" && event.key !== "l") return;

    var el = event.target;
    var tag = el && el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select" || (el && el.isContentEditable)) return;

    event.preventDefault();

    if (event.altKey) {
      if (tier() === 2) leaveUltra();
      else enterUltra();
      return;
    }

    var t = tier();
    if (t === 2) {
      leaveUltra();
      return;
    }
    if (t === 1) {
      set(0, { auto: false });
      note("已恢复正常模式", "动画、特效和所有页面都回来了。");
      return;
    }
    set(1, { auto: false });
    note("已进入轻量模式", "动画、模糊和粒子已关闭。长按这根羽毛可以进入极致模式。");
  }

  function bind() {
    syncButtons();
    bindPress();
    document.addEventListener("keydown", onKey);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }

  maybeAuto();
  /* 首帧就把档位写进去：SW 更新时正好读到 */
  publish(tier());

  /* 首次访问时 SW 还在装，controller 是空的，上面那次消息发不出去；
     等它就绪再补一次，让安装完的预取立刻知道该不该拉图 */
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(function () {
        publish(tier());
      }).catch(function () { /* 没有 SW */ });
    }
  } catch (error) { /* 老内核 */ }

  /* 没有预置脚本的独立页（天梯、光场、404）在这里兜一次 */
  guard();

  window.HNYZ_LITE = {
    tier: tier,
    toast: toast,
    note: note,
    isOn: isOn,
    isUltra: ultra,
    set: set,
    toggle: function () { set(isOn() ? 0 : 1, { auto: false }); }
  };
})();
