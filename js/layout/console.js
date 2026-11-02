/* =========================================================
   HNYZ · 控制台（调参面板）
   ---------------------------------------------------------
   「控制台」不是一套皮肤，是舞台引擎的调参台。任何皮肤下
   按 C（或点顶栏 CONSOLE）都能拉出来：

     · 节拍、编织密度、环径、光束、辉光、运镜，六个旋钮
     · 三档预设 + RESET，值存在本机，刷新还在
     · 不在黑客风时照样能打开，只是面板里会说明「舞台只在黑客风」

   参数写进 window.HNYZ_STAGE.cfg，引擎每帧读这个对象，
   所以拖动滑块是即时的；密度类参数要重建缓存，走 rebuild()。
   ========================================================= */

(() => {
  "use strict";

  const KEY = "hnyz:console:stage";
  const root = document.documentElement;

  /* -------------------------------------------------------
     参数表
     -------------------------------------------------------
     rebuild  改完要不要重建（密度 / 环径动了，缓存得重算）
     ------------------------------------------------------- */
  const PARAMS = [
    { k: "tempo", label: "TEMPO", grp: "节拍", min: 0.4, max: 2.4, step: 0.05, def: 1, unit: "×" },
    { k: "web",   label: "WEB",   grp: "结构", min: 0.2, max: 2.0, step: 0.05, def: 1, unit: "×", rebuild: true },
    { k: "ring",  label: "RING",  grp: "结构", min: 0.7, max: 1.4, step: 0.01, def: 1, unit: "×", rebuild: true },
    { k: "beam",  label: "BEAM",  grp: "结构", min: 0.2, max: 1.8, step: 0.02, def: 1, unit: "×", rebuild: true },
    { k: "glow",  label: "GLOW",  grp: "画面", min: 0.3, max: 1.8, step: 0.05, def: 1, unit: "×" },
    { k: "cam",   label: "CAM",   grp: "画面", min: 0, max: 1, step: 1, def: 1, sw: true }
  ];

  const PRESETS = {
    calm:    { tempo: 0.8, web: 0.55, ring: 1.12, beam: 0.45, glow: 0.75, cam: 0 },
    normal:  { tempo: 1,   web: 1,    ring: 1,    beam: 1,    glow: 1,    cam: 1 },
    intense: { tempo: 1.55, web: 1.7, ring: 0.92, beam: 1.75, glow: 1.35, cam: 1 }
  };

  const state = {};

  function readStored() {
    try {
      const raw = window.localStorage.getItem(KEY);
      const val = raw ? JSON.parse(raw) : null;
      if (val && typeof val === "object") return val;
    } catch (error) { /* 隐私模式下忽略 */ }
    return {};
  }

  const stored = readStored();
  PARAMS.forEach((p) => {
    const v = Number(stored[p.k]);
    state[p.k] = Number.isFinite(v) ? Math.min(p.max, Math.max(p.min, v)) : p.def;
  });

  function save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (error) { /* 忽略 */ }
  }

  /* -------------------------------------------------------
     写进引擎
     ------------------------------------------------------- */
  function engine() {
    return window.HNYZ_STAGE || null;
  }

  function push(p, immediate) {
    const stage = engine();
    if (!stage) return;
    stage.cfg[p.k] = state[p.k];
    if (p.rebuild) {
      /* 拖滑块时每一帧都重建太重，等手松开再算 */
      if (immediate) stage.rebuild();
      else {
        clearTimeout(push.timer);
        push.timer = window.setTimeout(() => stage.rebuild(), 160);
      }
    }
  }

  function applyAll(rebuild) {
    const stage = engine();
    if (!stage) return;
    PARAMS.forEach((p) => {
      stage.cfg[p.k] = state[p.k];
    });
    if (rebuild) stage.rebuild();
    else stage.redraw();
  }

  /* -------------------------------------------------------
     DOM
     ------------------------------------------------------- */
  const sys = document.querySelector(".ck-sys");
  let trigger = document.querySelector("[data-ck-console]");

  if (!trigger && sys) {
    trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ck-sys__btn ck-cx-btn";
    trigger.dataset.ckConsole = "";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", "打开舞台控制台");
    trigger.title = "舞台控制台（C）";
    trigger.textContent = "CONSOLE";
    const anchor = sys.querySelector("[data-style-toggle]");
    sys.insertBefore(trigger, anchor || sys.firstChild);
  }

  const groups = [];
  PARAMS.forEach((p) => {
    if (!groups.includes(p.grp)) groups.push(p.grp);
  });

  const panel = document.createElement("div");
  panel.className = "ck-cx";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-labelledby", "ck-cx-title");

  const rowsHtml = groups.map((g) => {
    const rows = PARAMS.filter((p) => p.grp === g).map((p) => {
      if (p.sw) {
        return `
          <div class="ck-cx__row ck-cx__row--sw" data-row="${p.k}">
            <label id="ck-cx-l-${p.k}">${p.label}</label>
            <button class="ck-cx__sw" type="button" role="switch" aria-checked="true"
                    aria-labelledby="ck-cx-l-${p.k}" data-sw="${p.k}"><i></i></button>
            <output data-out="${p.k}">ON</output>
          </div>`;
      }
      return `
        <div class="ck-cx__row" data-row="${p.k}">
          <label for="ck-cx-${p.k}">${p.label}</label>
          <input type="range" id="ck-cx-${p.k}" data-range="${p.k}"
                 min="${p.min}" max="${p.max}" step="${p.step}" value="${p.def}">
          <output data-out="${p.k}">${p.def.toFixed(2)}${p.unit}</output>
        </div>`;
    }).join("");
    return `<div class="ck-cx__grp"><h4>${g}</h4>${rows}</div>`;
  }).join("");

  panel.innerHTML = `
    <div class="ck-cx__head">
      <div class="ck-cx__id">
        <b id="ck-cx-title">HNYZ // CONSOLE</b>
        <span>STAGE PARAMETERS · LIVE</span>
      </div>
      <button class="ck-cx__x" type="button" aria-label="关闭控制台">✕</button>
    </div>
    <div class="ck-cx__presets">
      <button type="button" data-preset="calm">CALM</button>
      <button type="button" data-preset="normal">NORMAL</button>
      <button type="button" data-preset="intense">INTENSE</button>
      <button type="button" data-preset="off">OFF</button>
    </div>
    <div class="ck-cx__body">
      ${rowsHtml}
      <p class="ck-cx__note" data-note hidden>
        舞台只挂在<b>黑客风</b>上。切到 HACKER 再回来，这里的旋钮才有东西可调。
      </p>
    </div>
    <div class="ck-cx__foot">
      <span><kbd>C</kbd> 开合 · <kbd>ESC</kbd> 关闭</span>
      <button class="ck-cx__reset" type="button">RESET</button>
    </div>`;

  document.body.appendChild(panel);

  const note = panel.querySelector("[data-note]");
  const body = panel.querySelector(".ck-cx__body");

  /* -------------------------------------------------------
     渲染
     ------------------------------------------------------- */
  function paint(p) {
    const row = panel.querySelector(`[data-row="${p.k}"]`);
    const out = panel.querySelector(`[data-out="${p.k}"]`);
    if (!row || !out) return;

    if (p.sw) {
      const on = state[p.k] >= 0.5;
      row.querySelector("[data-sw]").setAttribute("aria-checked", on ? "true" : "false");
      out.textContent = on ? "ON" : "OFF";
    } else {
      const input = row.querySelector("[data-range]");
      if (input && document.activeElement !== input) input.value = state[p.k];
      out.textContent = state[p.k].toFixed(2) + p.unit;
    }
    row.classList.toggle("is-dirty", Math.abs(state[p.k] - p.def) > 0.001);
  }

  function paintAll() {
    PARAMS.forEach(paint);
    panel.querySelectorAll("[data-preset]").forEach((b) => b.classList.remove("is-on"));
  }

  /* -------------------------------------------------------
     交互
     ------------------------------------------------------- */
  PARAMS.forEach((p) => {
    const row = panel.querySelector(`[data-row="${p.k}"]`);
    if (!row) return;

    if (p.sw) {
      row.querySelector("[data-sw]").addEventListener("click", () => {
        state[p.k] = state[p.k] >= 0.5 ? 0 : 1;
        paint(p);
        push(p, true);
        save();
      });
      return;
    }

    const input = row.querySelector("[data-range]");
    input.value = state[p.k];
    input.addEventListener("input", () => {
      state[p.k] = Number(input.value);
      paint(p);
      push(p, false);
    });
    input.addEventListener("change", () => {
      push(p, true);
      save();
    });
  });

  panel.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.preset;
      paintAll();

      if (name === "off") {
        const stage = engine();
        if (stage) stage.stop();
        btn.classList.add("is-on");
        return;
      }

      const p = PRESETS[name];
      if (!p) return;
      Object.keys(p).forEach((k) => { state[k] = p[k]; });
      paintAll();
      btn.classList.add("is-on");
      applyAll(true);
      save();
    });
  });

  panel.querySelector(".ck-cx__reset").addEventListener("click", () => {
    PARAMS.forEach((p) => { state[p.k] = p.def; });
    paintAll();
    applyAll(true);
    save();
    const stage = engine();
    if (stage) stage.start();
  });

  panel.querySelector(".ck-cx__x").addEventListener("click", () => close(true));

  /* -------------------------------------------------------
     开合
     ------------------------------------------------------- */
  let open = false;

  function syncNote() {
    const has = !!(engine() && document.querySelector("[data-ck-halo]"));
    note.hidden = has;
    body.querySelectorAll(".ck-cx__grp").forEach((el) => {
      el.style.display = has ? "" : "none";
    });
    panel.querySelector(".ck-cx__presets").style.display = has ? "" : "none";
  }

  function show() {
    if (open) return;
    open = true;
    panel.hidden = false;
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    syncNote();
    paintAll();
    /* 首帧参数套一遍：用户上次调过的值要立刻生效 */
    applyAll(false);
  }

  function close(refocus) {
    if (!open) return;
    open = false;
    panel.hidden = true;
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      if (refocus) trigger.focus({ preventScroll: true });
    }
  }

  if (trigger) {
    trigger.addEventListener("click", () => (open ? close() : show()));
  }

  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable);
    if (typing) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      open ? close() : show();
    } else if (e.key === "Escape" && open) {
      close(true);
    }
  });

  /* 换皮肤后：舞台可能刚被注入，按钮要露出来，面板要重算 */
  document.addEventListener("hnyz:stylechange", () => {
    if (open) window.setTimeout(syncNote, 60);
  });

  /* 舞台脚本是异步到的，到了再把上次的参数套上去 */
  let tries = 0;
  const waitStage = window.setInterval(() => {
    tries += 1;
    if (engine()) {
      window.clearInterval(waitStage);
      applyAll(false);
      if (open) syncNote();
    } else if (tries > 60) {
      window.clearInterval(waitStage);
    }
  }, 100);
})();
