/* =========================================================
   HNYZ · DINO_RUN 天梯榜
   ---------------------------------------------------------
   三件事：
     1. 拉榜（共享后端 → 缓存 → 内置档案）
     2. 渲染榜首那句话 + TOP N 列表
     3. 死亡后提交成绩

   降级顺序很重要：后端没配、被墙、超时，都不能让页面空着。
   endpoint 为空 → 直接用内置档案 + 本地成绩，页面照常能玩能上榜。
   ========================================================= */

(() => {
  "use strict";

  const root = document.querySelector("[data-ladder]");
  if (!root) return;

  /* 后端地址。留空就走本地档（站点刚上线没配 Worker 时是这个状态）。
     配好 Worker 后把地址写进 dino.html 的
     <meta name="ladder-endpoint" content="https://xxx.workers.dev/">。
     调试时可以用 ?ladder=http://127.0.0.1:8787 临时指过去。 */
  const meta = document.querySelector('meta[name="ladder-endpoint"]');

  function normalize(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    return s.replace(/\/+$/, "") + "/";
  }

  const qs = /[?&]ladder=([^&]+)/.exec(window.location.search);
  const ENDPOINT = normalize(qs ? decodeURIComponent(qs[1]) : (meta && meta.content));

  const LIMIT = 12;
  const KEY_NAME = "hnyz:dino-name";
  const KEY_LOCAL = "hnyz:dino-ladder-local";
  const KEY_CACHE = "hnyz:dino-board-cache";
  const SEED_URL = "data/ladder-seed.json";

  const leadEl = root.querySelector("[data-ladder-lead]");
  const listEl = root.querySelector("[data-ladder-list]");
  const metaEl = root.querySelector("[data-ladder-meta]");
  const formEl = root.querySelector("[data-ladder-form]");
  const nameInput = root.querySelector("[data-ladder-name]");
  const submitBtn = root.querySelector("[data-ladder-submit]");
  const toastEl = root.querySelector("[data-ladder-toast]");
  const mineEl = root.querySelector("[data-ladder-mine]");

  const strip = document.querySelector("[data-dino-run]");

  let board = [];        /* [{ name, score, level, at, bot }] */
  let seedRows = [];     /* 内置对手，合并时反复要用 */
  let source = "none";   /* remote | cache | local */
  let pending = null;    /* 待提交的成绩 */
  let toastTimer = 0;

  /* ---------- 小工具 ---------- */

  function readJSON(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* 隐私模式 / 空间满，忽略 */
    }
  }

  function readText(key, fallback) {
    try {
      return window.localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function num(n) {
    const v = Math.floor(Number(n) || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function toast(text, tone) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.dataset.tone = tone || "info";
    toastEl.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.hidden = true;
    }, 4200);
  }

  /* ---------- 榜单装配 ---------- */

  function mergeRows(remote, local, seed) {
    const out = [];
    const seen = {};

    function push(row, bot) {
      const key = String(row.name || "").toLowerCase();
      if (!key) return;
      if (seen[key]) {
        if ((row.score || 0) > seen[key].score) {
          seen[key].score = row.score;
          seen[key].level = row.level;
        }
        return;
      }
      const item = {
        name: String(row.name || "").slice(0, 12),
        score: Math.max(0, Math.floor(Number(row.score) || 0)),
        level: Math.max(1, Math.floor(Number(row.level) || 1)),
        at: Number(row.at) || 0,
        bot: !!bot
      };
      seen[key] = item;
      out.push(item);
    }

    /* 真人优先于内置档案：同名时以真人成绩为准 */
    (remote || []).forEach(function (r) { push(r, false); });
    (local || []).forEach(function (r) { push(r, false); });
    (seed || []).forEach(function (r) { push(r, true); });

    out.sort(function (a, b) {
      return b.score - a.score || a.at - b.at;
    });
    return out;
  }

  function renderLead() {
    if (!leadEl) return;
    if (!board.length) {
      leadEl.textContent = "天梯还是空的。跑一局，第一名就是你。";
      return;
    }
    const top = board[0];
    const second = board[1];
    let text = "当前榜首 " + top.name + "，";
    text += num(top.score) + " 分";
    if (top.level > 1) text += "（LV." + top.level + "）";
    if (second && second.score < top.score) {
      text += "，领先第二名 " + num(top.score - second.score) + " 分";
    }
    leadEl.textContent = text + "。";
  }

  function rankBadge(i) {
    const span = document.createElement("span");
    span.className = "ladder-row__rank" + (i < 3 ? " is-top" : "");
    span.textContent = i < 3 ? ["★", "◆", "▲"][i] : String(i + 1);
    return span;
  }

  function renderList() {
    if (!listEl) return;
    listEl.textContent = "";

    const rows = board.slice(0, LIMIT);
    if (!rows.length) {
      const li = document.createElement("li");
      li.className = "ladder-row is-empty";
      li.textContent = "还没有记录";
      listEl.appendChild(li);
      return;
    }

    const mine = readJSON(KEY_LOCAL, []);
    const mineNames = {};
    (mine || []).forEach(function (r) {
      if (r && r.name) mineNames[String(r.name).toLowerCase()] = true;
    });

    rows.forEach(function (row, i) {
      const li = document.createElement("li");
      li.className = "ladder-row";
      if (i === 0) li.classList.add("is-first");
      if (mineNames[row.name.toLowerCase()]) li.classList.add("is-mine");

      li.appendChild(rankBadge(i));

      /* 名字和 BOT 标签要在同一格里，否则网格的第三列会被标签占掉，
         分数和等级挤到下一行去 */
      const who = document.createElement("span");
      who.className = "ladder-row__who";

      const name = document.createElement("span");
      name.className = "ladder-row__name";
      name.textContent = row.name;
      who.appendChild(name);

      if (row.bot) {
        const tag = document.createElement("span");
        tag.className = "ladder-row__tag";
        tag.textContent = "BOT";
        tag.title = "内置的电脑对手，不是真人成绩";
        who.appendChild(tag);
      }

      li.appendChild(who);

      const score = document.createElement("span");
      score.className = "ladder-row__score";
      score.textContent = num(row.score);
      li.appendChild(score);

      const lv = document.createElement("span");
      lv.className = "ladder-row__lv";
      lv.textContent = "LV." + row.level;
      li.appendChild(lv);

      listEl.appendChild(li);
    });
  }

  function renderMeta() {
    if (!metaEl) return;
    if (source === "remote") {
      metaEl.textContent = "共享天梯 · 所有人的成绩";
      metaEl.dataset.tone = "live";
    } else if (source === "cache") {
      metaEl.textContent = "暂时连不上，显示上次缓存";
      metaEl.dataset.tone = "warn";
    } else if (ENDPOINT) {
      metaEl.textContent = "本地档案 · 共享天梯没响应";
      metaEl.dataset.tone = "warn";
    } else {
      metaEl.textContent = "本地档案";
      metaEl.dataset.tone = "local";
    }
  }

  function renderMine() {
    if (!mineEl) return;
    const mine = readJSON(KEY_LOCAL, []);
    let best = 0;
    (mine || []).forEach(function (r) {
      if (r && Number(r.score) > best) best = Number(r.score);
    });
    if (best > 0) {
      mineEl.textContent = "我的最好成绩：" + num(best) + " 分";
      mineEl.hidden = false;
    } else {
      mineEl.hidden = true;
    }
  }

  function paint() {
    renderLead();
    renderList();
    renderMeta();
    renderMine();
  }

  /* ---------- 数据来源 ---------- */

  function loadSeed() {
    return fetch(SEED_URL, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  function loadRemote() {
    if (!ENDPOINT) return Promise.resolve(null);

    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = window.setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, 6000);

    return fetch(ENDPOINT + "?limit=" + LIMIT, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.rows)) throw new Error("bad payload");
        window.clearTimeout(timer);
        writeJSON(KEY_CACHE, { at: Date.now(), rows: data.rows });
        return data.rows;
      })
      .catch(function () {
        window.clearTimeout(timer);
        return null;
      });
  }

  function boot() {
    const local = readJSON(KEY_LOCAL, []);

    Promise.all([loadRemote(), loadSeed()]).then(function (result) {
      const remote = result[0];
      const seed = result[1];
      seedRows = seed || [];

      if (remote) {
        source = "remote";
        board = mergeRows(remote, local, seed);
      } else if (ENDPOINT) {
        const cache = readJSON(KEY_CACHE, null);
        if (cache && Array.isArray(cache.rows) && cache.rows.length) {
          source = "cache";
          board = mergeRows(cache.rows, local, seed);
        } else {
          source = "local";
          board = mergeRows(null, local, seed);
        }
      } else {
        source = "local";
        board = mergeRows(null, local, seed);
      }

      paint();
      retryPending();
    });
  }

  /* ---------- 提交 ---------- */

  function saveLocal(name, score, level) {
    const local = readJSON(KEY_LOCAL, []);
    const key = String(name).toLowerCase();
    const exist = local.filter(function (r) {
      return r && String(r.name).toLowerCase() === key;
    })[0];

    if (exist) {
      if (score > exist.score) {
        exist.score = score;
        exist.level = level;
      }
    } else {
      local.push({ name: name, score: score, level: level, at: Date.now() });
    }

    local.sort(function (a, b) { return b.score - a.score; });
    writeJSON(KEY_LOCAL, local.slice(0, 20));
  }

  function submitScore(name, score, level) {
    saveLocal(name, score, level);
    writePending({ name: name, score: score, level: level, at: Date.now() });

    if (!ENDPOINT) {
      toast("已记在本地档案", "info");
      return Promise.resolve(false);
    }

    return send({ name: name, score: score, level: level }).then(function (res) {
      if (!res || !res.ok) {
        toast((res && res.error) || "提交失败，已存在本地，下次打开再试", "warn");
        return false;
      }

      clearPending();

      /* 名次不能直接用 res.rank：服务端只知道自己那份，
         榜上还有内置对手和别人的记录。拉回最新数据合并后再算。 */
      return loadRemote().then(function (rows) {
        if (rows) {
          source = "remote";
          board = mergeRows(rows, readJSON(KEY_LOCAL, []), seedRows);
          paint();
        }
        const key = name.toLowerCase();
        let rank = 0;
        for (let i = 0; i < board.length; i++) {
          if (board[i].name.toLowerCase() === key) {
            rank = i + 1;
            break;
          }
        }
        toast(
          res.improved
            ? "上榜成功，当前第 " + (rank || "?") + " 名"
            : "这次没超过你的最好成绩（" + num(res.best) + " 分）",
          res.improved ? "ok" : "info"
        );
        return true;
      });
    });
  }

  function send(payload) {
    if (!ENDPOINT) return Promise.resolve(null);

    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = window.setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, 8000);

    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (data) {
        window.clearTimeout(timer);
        return data;
      })
      .catch(function () {
        window.clearTimeout(timer);
        return null;
      });
  }

  function writePending(item) {
    pending = item;
    writeJSON("hnyz:dino-pending", item);
  }

  function clearPending() {
    pending = null;
    try {
      window.localStorage.removeItem("hnyz:dino-pending");
    } catch (error) {
      /* 忽略 */
    }
  }

  /* 上次没提交成功的成绩，这次打开悄悄补交 */
  function retryPending() {
    const saved = readJSON("hnyz:dino-pending", null);
    if (!saved || !ENDPOINT) return;
    send(saved).then(function (res) {
      if (res && res.ok) {
        clearPending();
        loadRemote().then(function (rows) {
          if (rows) {
            source = "remote";
            board = mergeRows(rows, readJSON(KEY_LOCAL, []), seedRows);
            paint();
          }
        });
      }
    });
  }

  /* ---------- 表单 ---------- */

  function showForm(score, level) {
    if (!formEl) return;
    formEl.hidden = false;

    const row = formEl.querySelector(".ladder-form__row");
    if (row) row.hidden = false;
    if (submitBtn) submitBtn.disabled = false;

    formEl.dataset.score = String(score);
    formEl.dataset.level = String(level);
    if (nameInput) {
      nameInput.value = readText(KEY_NAME, "");
      nameInput.focus({ preventScroll: true });
    }
    const hint = formEl.querySelector("[data-ladder-formhint]");
    if (hint) hint.textContent = "本局 " + num(score) + " 分 · LV." + level + "，留个名字上榜";
  }

  /* 交完成绩只收起输入框，把「再来一局」留下。
     整块藏掉的话，玩家会盯着 SIGNAL LOST 的画面无路可走。 */
  function collapseForm(text) {
    if (!formEl) return;
    formEl.hidden = false;
    const row = formEl.querySelector(".ladder-form__row");
    if (row) row.hidden = true;
    const hint = formEl.querySelector("[data-ladder-formhint]");
    if (hint) hint.textContent = text || "已记录，再来一局？";
  }

  function hideForm() {
    if (formEl) formEl.hidden = true;
  }

  if (formEl) {
    formEl.addEventListener("submit", function (event) {
      event.preventDefault();
      const score = Number(formEl.dataset.score) || 0;
      const level = Number(formEl.dataset.level) || 1;
      let name = nameInput ? nameInput.value.trim() : "";

      if (!name) {
        name = "匿名恐龙";
      }
      name = Array.from(name).slice(0, 12).join("");

      try {
        window.localStorage.setItem(KEY_NAME, name);
      } catch (error) {
        /* 忽略 */
      }

      if (submitBtn) submitBtn.disabled = true;
      submitScore(name, score, level).then(function () {
        if (submitBtn) submitBtn.disabled = false;
        collapseForm("本局 " + num(score) + " 分 · LV." + level + "，已记录");
      });
    });
  }

  /* ---------- 接小恐龙 ---------- */

  /* 「再来一局」：dino.js 在天梯页上不自动重开，等这里发号施令 */
  const againBtn = root.querySelector("[data-ladder-again]");
  if (againBtn && strip) {
    againBtn.addEventListener("click", function () {
      hideForm();
      if (nameInput) nameInput.blur();
      try {
        strip.dispatchEvent(new CustomEvent("dino:restart", { bubbles: true }));
      } catch (error) {
        /* 老内核没有 CustomEvent */
      }
    });
  }

  if (strip) {
    strip.addEventListener("dino:die", function (event) {
      const detail = (event && event.detail) || {};
      const score = Number(detail.score) || 0;
      const level = Number(detail.level) || 1;
      if (score < 20) return; /* 一开局就撞，别往榜上塞 */
      showForm(score, level);
    });

    strip.addEventListener("dino:start", function () {
      hideForm();
    });
  }

  boot();
})();
