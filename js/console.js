/* =========================================================
   HNYZ · CONSOLE 调参面板
   ---------------------------------------------------------
   只有切到「控制台」皮肤才会被加载（js/skins.js 里按需注入），
   默认皮肤的用户一个字节都不付。

   面板本身照着 HALOFLUX 的 lab.html 做：
     左上角是标题和一组预设按钮，中间是分组折叠的参数行，
     每行「标签 · 滑块 · 数字框」，改过的行用强调色标出来，
     底部一行提示。按 C 开合，Esc 关闭。

   所有参数最终都写进 <html> 的 CSS 变量，
   所以调节是即时的、不需要重绘任何 JS 画面；
   值存在 localStorage，刷新后由这里读回来再套一遍。
   ========================================================= */

(() => {
  "use strict";

  const KEY = "hnyz:console";
  const root = document.documentElement;
  if (root.dataset.style !== "console") return;

  /* -------------------------------------------------------
     参数表
     -------------------------------------------------------
     css  写进哪个变量
     unit 数值后缀（空表示纯数字，CSS 里自己 calc）
     ------------------------------------------------------- */
  const PARAMS = [
    { key: "scan", label: "扫描线强度", css: "--cx-scan", min: 0, max: 40, step: 1, unit: "", def: 10, group: "外观" },
    { key: "scanGap", label: "扫描线间距", css: "--cx-scan-gap", min: 2, max: 10, step: 1, unit: "px", def: 3, group: "外观" },
    { key: "hud", label: "四角 HUD", css: "--cx-hud", min: 0, max: 1, step: 1, unit: "", def: 1, group: "外观" },
    { key: "cursor", label: "标题光标", css: "--cx-cursor", min: 0, max: 1, step: 1, unit: "", def: 1, group: "外观" },
    { key: "blink", label: "光标闪烁周期", css: "--cx-blink", min: 0.4, max: 2.4, step: 0.1, unit: "s", def: 1.1, group: "外观" },

    { key: "hue", label: "强调色色相", css: "--cx-hue", min: 0, max: 360, step: 1, unit: "", def: 22, group: "配色" },
    { key: "sat", label: "强调色饱和", css: "--cx-sat", min: 10, max: 100, step: 1, unit: "%", def: 86, group: "配色" },
    { key: "bgL", label: "底色明度", css: "--cx-bg-l", min: 2, max: 16, step: 0.5, unit: "", def: 4, group: "配色" },
    { key: "paperL", label: "文字明度", css: "--cx-paper-l", min: 78, max: 100, step: 1, unit: "%", def: 93, group: "配色" },

    { key: "fs", label: "字号缩放", css: "--cx-fs", min: 86, max: 126, step: 1, unit: "", def: 100, group: "排版" },
    { key: "lh", label: "行高", css: "--cx-lh", min: 140, max: 210, step: 5, unit: "", def: 170, group: "排版" },
    { key: "measure", label: "正文宽度", css: "--cx-measure", min: 560, max: 1000, step: 20, unit: "px", def: 760, group: "排版" },
    { key: "track", label: "标题字距", css: "--cx-track", min: 0, max: 12, step: 1, unit: "", def: 2, group: "排版" },

    { key: "panelW", label: "面板宽度", css: "--cx-panel-w", min: 300, max: 480, step: 10, unit: "px", def: 392, group: "面板" },
    { key: "panelAlpha", label: "面板不透明度", css: "--cx-panel-alpha", min: 60, max: 100, step: 1, unit: "", def: 100, group: "面板" }
  ];

  const DEFAULTS = {};
  PARAMS.forEach((p) => { DEFAULTS[p.key] = p.def; });

  const PRESETS = {
    a: { name: "A·炭黑橙", hint: "MV 原味", values: {} },
    b: { name: "B·琥珀纸", hint: "旧终端", values: { hue: 38, sat: 72, bgL: 6.5, paperL: 96, scan: 4, scanGap: 2, lh: 180 } },
    c: { name: "C·磷光青", hint: "示波器", values: { hue: 168, sat: 62, bgL: 3, paperL: 90, scan: 16, scanGap: 3 } }
  };

  let values = Object.assign({}, DEFAULTS);

  /* -------------------------------------------------------
     读写本机
     ------------------------------------------------------- */
  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      PARAMS.forEach((p) => {
        const v = Number(saved[p.key]);
        if (Number.isFinite(v) && v >= p.min && v <= p.max) values[p.key] = v;
      });
    } catch (error) {
      /* 存的东西坏了就当没存过 */
    }
  }

  function save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(values));
    } catch (error) {
      /* 隐私模式下只在本次会话生效 */
    }
  }

  /* -------------------------------------------------------
     把值写进 CSS 变量
     ------------------------------------------------------- */
  const readEls = {};

  function hslToHex(h, s, l) {
    const sat = s / 100;
    const lig = l / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = sat * Math.min(lig, 1 - lig);
    const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const to = (n) => Math.round(f(n) * 255).toString(16).padStart(2, "0");
    return "#" + to(0) + to(8) + to(4);
  }

  function paintReadout() {
    if (!readEls.accent) {
      panel.querySelectorAll("[data-cx-read]").forEach((el) => { readEls[el.dataset.cxRead] = el; });
    }
    if (!readEls.accent) return;
    readEls.accent.textContent = hslToHex(values.hue, values.sat, 58);
    readEls.accent.style.color = "hsl(" + values.hue + ", " + values.sat + "%, 58%)";
    readEls.base.textContent = (16 * values.fs / 100).toFixed(1) + "px / " + (values.lh / 100).toFixed(2);
    readEls.scan.textContent = values.scan + "% @ " + values.scanGap + "px";
    readEls.measure.textContent = values.measure + "px";
  }

  function paint() {
    PARAMS.forEach((p) => {
      root.style.setProperty(p.css, values[p.key] + p.unit);
    });
    /* HUD 和光标是「有/无」，用 data 属性让 CSS 直接切显示 */
    root.dataset.cxHud = String(values.hud);
    root.dataset.cxCursor = String(values.cursor);
    root.dataset.cxScan = values.scan > 0 ? "1" : "0";
    paintReadout();
  }

  /* -------------------------------------------------------
     四角 HUD：四个 L 形方块
     ------------------------------------------------------- */
  const hud = document.createElement("div");
  hud.className = "cx-hud";
  hud.setAttribute("aria-hidden", "true");
  hud.innerHTML = "<i></i><i></i><i></i><i></i>";
  document.body.appendChild(hud);

  /* 窄屏下面板是底部抽屉，上面还露着一截页面：
     盖一层遮罩，点一下就收，免得在半截页面上误操作 */
  const scrim = document.createElement("div");
  scrim.className = "cx-scrim";
  document.body.appendChild(scrim);

  /* -------------------------------------------------------
     入口按钮：顶栏有位置就进顶栏，没有（天梯页 / 404）就浮动
     ------------------------------------------------------- */
  const actions = document.querySelector(".header-actions");
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = actions ? "style-toggle cx-trigger" : "style-toggle cx-trigger cx-trigger--float";
  trigger.setAttribute("data-cx-toggle", "");
  trigger.setAttribute("aria-label", "打开调参面板");
  trigger.setAttribute("aria-expanded", "false");
  trigger.title = "调参面板（C）";
  trigger.innerHTML = '<span class="cx-trigger__glyph" aria-hidden="true">⌘</span>';

  if (actions) actions.insertBefore(trigger, actions.firstChild);
  else document.body.appendChild(trigger);

  /* -------------------------------------------------------
     面板
     ------------------------------------------------------- */
  const groups = [];
  PARAMS.forEach((p) => {
    if (!groups.includes(p.group)) groups.push(p.group);
  });

  const panel = document.createElement("aside");
  panel.className = "cx-panel";
  panel.id = "cx-panel";
  panel.setAttribute("aria-label", "控制台调参面板");
  panel.hidden = true;

  panel.innerHTML = `
    <div class="cx-panel__top">
      <div class="cx-panel__id">
        <b>CONSOLE</b>
        <span>HNYZ // LIVE_TUNING</span>
      </div>
      <button class="cx-panel__x" type="button" data-cx-close aria-label="关闭面板">✕</button>
    </div>

    <div class="cx-panel__presets">
      ${Object.keys(PRESETS).map((k) => `<button type="button" data-cx-preset="${k}" title="${PRESETS[k].hint}">${PRESETS[k].name}</button>`).join("")}
      <button type="button" data-cx-reset title="回到这套皮肤的出厂值">重置</button>
      <button type="button" data-cx-export title="把当前参数导出成 JSON">导出</button>
      <button type="button" data-cx-import title="从下面的框里读入 JSON">导入</button>
    </div>

    <div class="cx-panel__body">
      ${groups.map((g) => `
        <details open>
          <summary>${g}</summary>
          ${PARAMS.filter((p) => p.group === g).map((p) => `
            <div class="cx-row" data-k="${p.key}">
              <label for="cx-${p.key}" title="${p.label}">${p.label}</label>
              <input type="range" id="cx-${p.key}" min="${p.min}" max="${p.max}" step="${p.step}">
              <input type="number" min="${p.min}" max="${p.max}" step="${p.step}" aria-label="${p.label} 数值">
            </div>`).join("")}
        </details>`).join("")}
      <textarea class="cx-panel__io" data-cx-io spellcheck="false" placeholder="点「导出」把参数写到这里；粘贴一份 JSON 再点「导入」"></textarea>

      <div class="cx-readout" aria-hidden="true">
        <div><span>ACCENT</span><b data-cx-read="accent">#ff6b2c</b></div>
        <div><span>BASE</span><b data-cx-read="base">16.0px / 1.70</b></div>
        <div><span>SCAN</span><b data-cx-read="scan">10% @ 3px</b></div>
        <div><span>MEASURE</span><b data-cx-read="measure">760px</b></div>
      </div>
    </div>

    <p class="cx-panel__hint">C 键开合 · Esc 关闭 · 改动即时生效并保存在本机</p>`;

  document.body.appendChild(panel);

  const rows = Array.from(panel.querySelectorAll(".cx-row"));
  const io = panel.querySelector("[data-cx-io]");

  function syncRows() {
    rows.forEach((row) => {
      const key = row.dataset.k;
      const p = PARAMS.find((x) => x.key === key);
      const v = values[key];
      const range = row.children[1];
      const num = row.children[2];
      if (document.activeElement !== range) range.value = v;
      if (document.activeElement !== num) num.value = v;
      row.classList.toggle("is-changed", Math.abs(v - p.def) > 1e-9);
    });
  }

  function setValue(key, raw) {
    const p = PARAMS.find((x) => x.key === key);
    if (!p) return;
    let v = Number(raw);
    if (!Number.isFinite(v)) return;
    v = Math.min(p.max, Math.max(p.min, v));
    /* 小数步长会产生 0.30000000000000004，按步长对齐一下 */
    const decimals = String(p.step).split(".")[1];
    if (decimals) v = Number(v.toFixed(decimals.length));
    values[key] = v;
    paint();
    syncRows();
    save();
  }

  panel.addEventListener("input", (event) => {
    const row = event.target.closest(".cx-row");
    if (!row) return;
    setValue(row.dataset.k, event.target.value);
  });

  /* 数字框允许输入超范围的值，离开时夹回来 */
  panel.addEventListener("change", (event) => {
    const row = event.target.closest(".cx-row");
    if (!row || event.target.type !== "number") return;
    setValue(row.dataset.k, event.target.value);
  });

  /* -------------------------------------------------------
     预设 / 重置 / 导入导出
     ------------------------------------------------------- */
  function applyPreset(name) {
    if (name === "a") values = Object.assign({}, DEFAULTS);
    else values = Object.assign({}, DEFAULTS, PRESETS[name].values);
    if (window.matchMedia("(max-width: 720px)").matches) values.scan = Math.min(values.scan, 6);
    paint();
    syncRows();
    save();
    panel.querySelectorAll("[data-cx-preset]").forEach((b) => {
      b.classList.toggle("is-on", b.dataset.cxPreset === name);
    });
  }

  panel.querySelectorAll("[data-cx-preset]").forEach((btn) => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.cxPreset));
  });

  panel.querySelector("[data-cx-reset]").addEventListener("click", () => applyPreset("a"));

  panel.querySelector("[data-cx-export]").addEventListener("click", () => {
    io.style.display = "block";
    io.value = JSON.stringify(values, null, 2);
    io.select();
  });

  panel.querySelector("[data-cx-import]").addEventListener("click", () => {
    io.style.display = "block";
    try {
      const parsed = JSON.parse(io.value);
      PARAMS.forEach((p) => {
        const v = Number(parsed[p.key]);
        if (Number.isFinite(v) && v >= p.min && v <= p.max) values[p.key] = v;
      });
      paint();
      syncRows();
      save();
      io.value = "已导入 " + Object.keys(parsed).length + " 项";
    } catch (error) {
      io.value = "导入失败：这不是一份合法的 JSON";
    }
  });

  /* -------------------------------------------------------
     开合
     ------------------------------------------------------- */
  function open() {
    if (panel.classList.contains("is-open")) return;
    panel.hidden = false;
    /* 先摆到屏幕外再进一帧加类，transition 才有起点 */
    void panel.offsetWidth;
    panel.classList.add("is-open");
    root.classList.add("cx-panel-open");
    trigger.setAttribute("aria-expanded", "true");
    syncRows();
    panel.querySelector("[data-cx-close]").focus({ preventScroll: true });
  }

  function close() {
    if (!panel.classList.contains("is-open")) return;
    panel.classList.remove("is-open");
    root.classList.remove("cx-panel-open");
    trigger.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      if (!panel.classList.contains("is-open")) panel.hidden = true;
    }, 220);
    trigger.focus({ preventScroll: true });
  }

  trigger.addEventListener("click", () => {
    if (panel.hidden) open();
    else close();
  });

  panel.querySelector("[data-cx-close]").addEventListener("click", close);
  scrim.addEventListener("click", close);

  document.addEventListener("keydown", (event) => {
    const tag = (event.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || event.target.isContentEditable) {
      if (event.key === "Escape") close();
      return;
    }
    if (event.key === "c" || event.key === "C") {
      /* 输入法在中文状态时 keyCode 是 229，别抢 */
      if (event.keyCode === 229) return;
      event.preventDefault();
      if (panel.hidden) open();
      else close();
    } else if (event.key === "Escape" && !panel.hidden) {
      close();
    }
  });

  /* 皮肤被切走时面板必须收起来 —— 这套样式在别的皮肤下不存在，
     留着就是一个没有任何样式、铺满屏幕的 div */
  document.addEventListener("hnyz:stylechange", (event) => {
    const on = event.detail && event.detail.style === "console";
    /* 这套样式只有在 console 皮肤下才存在，留着就是一个没样式的裸 div；
       但脚本已经注入过了，不能 remove —— 切回来还得用它，所以只藏 */
    panel.classList.remove("is-open");
    panel.hidden = true;
    root.classList.remove("cx-panel-open");
    trigger.hidden = !on;
    scrim.hidden = !on;
  });

  load();
  paint();
  syncRows();

  window.HNYZ_CONSOLE = {
    values: () => Object.assign({}, values),
    open,
    close,
    preset: applyPreset
  };
})();
