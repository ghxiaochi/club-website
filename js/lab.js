/* =========================================================
   HNYZ · 黑客风：底部舞台壁纸 + 控制板
   ---------------------------------------------------------
   这一版不再重排页面。文案、板块、页脚、卡片全是站点原来
   那一套，黑客只做两件事：

     一、壁纸   一块固定画布铺在页面底下，环坐在画面底边之外，
                只露出上半截弧，光束从底部往四周迸发
     二、控制板 右上角风格按钮旁边多一枚 CONSOLE，打开是六根
                滑块，直接改壁纸的密度、环径、光束、辉光、运镜

   画布只在选中黑客风时下载，切走时停帧、藏起来（脚本留着，
   切回来重新开拍，不重复初始化）。
   ========================================================= */

(() => {
  "use strict";

  const VERSION = "20261201";
  const STORE_KEY = "hnyz:lab:stage";

  let backdrop = null;
  let panel = null;
  let button = null;
  let stageLinked = false;

  /* -------------------------------------------------------
     一、小工具
     ------------------------------------------------------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function stage() {
    return window.HNYZ_STAGE || null;
  }

  function stageCfg() {
    const api = stage();
    return (api && api.cfg) || null;
  }

  function readStore() {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      return data && typeof data === "object" ? data : null;
    } catch (error) {
      return null;
    }
  }

  function writeStore(data) {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (error) {
      /* 隐私模式：本次会话生效就够了 */
    }
  }

  /* -------------------------------------------------------
     二、壁纸层
     ------------------------------------------------------- */
  function buildBackdrop() {
    const wrap = el("div", "lab-bg");
    wrap.setAttribute("aria-hidden", "true");

    const canvas = document.createElement("canvas");
    canvas.setAttribute("data-lab-halo", "");
    wrap.appendChild(canvas);

    document.body.insertBefore(wrap, document.body.firstChild);
    return wrap;
  }

  /* -------------------------------------------------------
     三、控制板
     ------------------------------------------------------- */
  const KNOBS = [
    ["tempo", "TEMPO", .5, 2],
    ["web", "WEB", .3, 1.8],
    ["ring", "RING", .6, 1.4],
    ["beam", "BEAM", .2, 1.8],
    ["glow", "GLOW", .2, 1.8],
    ["cam", "CAM", .2, 1.6]
  ];

  const PRESETS = {
    CALM: { tempo: .8, web: .7, ring: .9, beam: .6, glow: .8, cam: .8 },
    NORMAL: { tempo: 1, web: 1, ring: 1, beam: 1, glow: 1, cam: 1 },
    INTENSE: { tempo: 1.5, web: 1.35, ring: 1.1, beam: 1.5, glow: 1.3, cam: 1.2 }
  };

  function applyKnob(key, value) {
    const cfg = stageCfg();
    if (!cfg) return;
    cfg[key] = value;
    writeStore(Object.assign({}, cfg));
    /* 密度和环径是建缓存时算好的，改完必须重建才看得出 */
    if ((key === "web" || key === "ring") && stage() && stage().rebuild) {
      window.clearTimeout(applyKnob.timer);
      applyKnob.timer = window.setTimeout(() => stage().rebuild(), 160);
    }
  }

  function buildButton() {
    const btn = el("button", "lab-cx-btn");
    btn.type = "button";
    btn.setAttribute("data-lab-console", "");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "打开舞台控制板");
    btn.setAttribute("title", "舞台控制板（C）");
    /* 三根滑杆：比一个方框符号更说得清「这是调参的」 */
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h12M20 17h0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="16" cy="7" r="2" stroke="currentColor" stroke-width="1.6"/>' +
      '<circle cx="10" cy="12" r="2" stroke="currentColor" stroke-width="1.6"/>' +
      '<circle cx="18" cy="17" r="2" stroke="currentColor" stroke-width="1.6"/>' +
      "</svg>";

    const host = document.querySelector(".header-actions");
    const anchor = host && host.querySelector("[data-style-toggle]");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor);
    else document.body.appendChild(btn);
    return btn;
  }

  function buildPanel() {
    const box = el("aside", "lab-cx");
    box.setAttribute("data-lab-cx", "");
    box.setAttribute("aria-label", "舞台控制板");
    box.hidden = true;

    const head = el("header", "lab-cx__head");
    head.appendChild(el("span", null, "HNYZ // STAGE_CONSOLE"));
    const close = el("button", null, "×");
    close.type = "button";
    close.setAttribute("data-lab-cx-close", "");
    close.setAttribute("aria-label", "关闭控制板");
    head.appendChild(close);

    const body = el("div", "lab-cx__body");
    const cfg = stageCfg();
    const saved = readStore();

    KNOBS.forEach(([key, label, min, max]) => {
      const row = el("label", "lab-cx__knob");
      row.appendChild(el("span", null, label));
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(min);
      input.max = String(max);
      input.step = "0.05";
      input.value = String((saved && saved[key]) || (cfg && cfg[key]) || 1);
      input.setAttribute("data-knob", key);
      const out = el("output", null, Number(input.value).toFixed(2));
      input.addEventListener("input", () => {
        out.textContent = Number(input.value).toFixed(2);
        applyKnob(key, Number(input.value));
      });
      row.append(input, out);
      body.appendChild(row);
    });

    const presets = el("div", "lab-cx__presets");
    Object.keys(PRESETS).forEach((name) => {
      const btn = el("button", null, name);
      btn.type = "button";
      btn.addEventListener("click", () => applyPreset(name));
      presets.appendChild(btn);
    });
    const reset = el("button", null, "RESET");
    reset.type = "button";
    reset.addEventListener("click", () => applyPreset("NORMAL"));
    presets.appendChild(reset);

    body.appendChild(presets);
    body.appendChild(el("p", "lab-cx__note", "C 开合 · 改的是页底这块壁纸的密度、环径、光束与运镜，不写进皮肤。"));

    box.append(head, body);
    document.body.appendChild(box);
    return box;
  }

  function applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset || !panel) return;
    KNOBS.forEach(([key]) => {
      const input = panel.querySelector(`[data-knob="${key}"]`);
      if (!input) return;
      input.value = String(preset[key]);
      const out = input.parentNode.querySelector("output");
      if (out) out.textContent = preset[key].toFixed(2);
    });
    const cfg = stageCfg();
    if (!cfg) return;
    Object.keys(preset).forEach((key) => { cfg[key] = preset[key]; });
    writeStore(Object.assign({}, cfg));
    if (stage() && stage().rebuild) stage().rebuild();
  }

  function toggle(force) {
    if (!panel) return;
    const open = typeof force === "boolean" ? force : panel.hidden;
    panel.hidden = !open;
    if (button) button.setAttribute("aria-expanded", String(open));
    if (open) {
      const first = panel.querySelector("input");
      if (first) first.focus({ preventScroll: true });
    }
  }

  /* -------------------------------------------------------
     四、舞台引擎按需加载
     ------------------------------------------------------- */
  function loadStage() {
    if (document.querySelector("script[data-lab-stage]")) {
      linkStage();
      return;
    }
    const script = document.createElement("script");
    script.src = `js/lab-stage.js?v=${VERSION}`;
    script.async = false;
    script.setAttribute("data-lab-stage", "");
    document.body.appendChild(script);
    linkStage();
  }

  /* 引擎是异步落地的：等它挂好再把上一次调好的参数灌回去 */
  function linkStage() {
    if (stageLinked) return;
    stageLinked = true;
    let tries = 0;
    const step = () => {
      const api = stage();
      if (api) {
        const saved = readStore();
        if (saved) {
          Object.keys(saved).forEach((key) => {
            if (typeof saved[key] === "number" && api.cfg[key] != null) api.cfg[key] = saved[key];
          });
        }
        if (api.rebuild) api.rebuild();
        if (api.start) api.start();
        return;
      }
      tries += 1;
      if (tries < 60) window.setTimeout(step, 50);
    };
    window.setTimeout(step, 0);
  }

  /* -------------------------------------------------------
     五、挂载 / 收起
     ------------------------------------------------------- */
  function mount() {
    if (!document.body) return;

    if (!backdrop) backdrop = buildBackdrop();
    backdrop.hidden = false;

    if (!button) button = buildButton();
    if (!panel) panel = buildPanel();

    loadStage();

    const api = stage();
    if (api) {
      if (api.rebuild) api.rebuild();
      if (api.start) api.start();
    }
  }

  function unmount() {
    const api = stage();
    if (api && api.stop) api.stop();

    if (backdrop) backdrop.hidden = true;
    if (panel) {
      panel.remove();
      panel = null;
    }
    if (button) {
      button.remove();
      button = null;
    }
  }

  /* -------------------------------------------------------
     六、开合与生命周期
     ------------------------------------------------------- */
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest("[data-lab-console]")) {
      event.preventDefault();
      toggle();
      return;
    }
    if (target.closest("[data-lab-cx-close]")) {
      event.preventDefault();
      toggle(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel && !panel.hidden) toggle(false);
    if (event.key !== "c" && event.key !== "C") return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
    if (!panel) return;
    event.preventDefault();
    toggle();
  });

  document.addEventListener("hnyz:stylechange", (event) => {
    const next = event.detail && event.detail.style;
    if (next === "hacker") mount();
    else unmount();
  });

  if (document.documentElement.dataset.style === "hacker") {
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });
  }

  window.HNYZ_LAB = { mount: mount, unmount: unmount, toggle: toggle };
})();
