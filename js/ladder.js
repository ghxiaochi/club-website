/* =========================================================
   HNYZ · DINO_RUN 天梯榜
   ---------------------------------------------------------
   榜来自 data/ladder.json（静态文件，所有人看到的是同一份）。
   这个文件由 GitHub Actions 汇总 Issues 生成：
     玩家点「提交到天梯」→ 打开预填好的 Issue 页面 →
     用 GitHub 账号发布 → Actions 解析、重排、写回 JSON。

   页面这边只做三件事：
     1. 读 JSON 渲染榜
     2. 渲染榜首那句话
     3. 死亡后组织一条 Issue 链接
   ========================================================= */

(() => {
  "use strict";

  const root = document.querySelector("[data-ladder]");
  if (!root) return;

  const BOARD_URL = "data/ladder.json";
  const REPO = "ghxiaochi/club-website";
  const ISSUE_LABEL = "score";

  const LIMIT = 12;
  const KEY_NAME = "hnyz:dino-name";
  const KEY_LOCAL = "hnyz:dino-ladder-local";

  const leadEl = root.querySelector("[data-ladder-lead]");
  const listEl = root.querySelector("[data-ladder-list]");
  const metaEl = root.querySelector("[data-ladder-meta]");
  const formEl = root.querySelector("[data-ladder-form]");
  const nameInput = root.querySelector("[data-ladder-name]");
  const submitBtn = root.querySelector("[data-ladder-submit]");
  const toastEl = root.querySelector("[data-ladder-toast]");
  const mineEl = root.querySelector("[data-ladder-mine]");

  const strip = document.querySelector("[data-dino-run]");

  let board = [];
  let loaded = false;
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
    }, 5200);
  }

  /* ---------- 榜单装配 ---------- */

  /* 静态榜是权威数据；本地那份是「刚提交、还没被 GitHub 收录」的记录，
     同名时以静态榜为准（说明已经收进去了）。 */
  function mergeRows(staticRows, localRows) {
    const out = [];
    const seen = {};

    function push(row, pending) {
      const key = String(row.name || "").toLowerCase();
      if (!key) return;
      if (seen[key]) {
        if ((row.score || 0) > seen[key].score) {
          seen[key].score = Math.floor(row.score);
        }
        return;
      }
      const item = {
        name: String(row.name || "").slice(0, 12),
        score: Math.max(0, Math.floor(Number(row.score) || 0)),
        pending: !!pending
      };
      seen[key] = item;
      out.push(item);
    }

    (staticRows || []).forEach(function (r) { push(r, false); });
    (localRows || []).forEach(function (r) { push(r, true); });

    out.sort(function (a, b) { return b.score - a.score; });
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
    let text = "当前榜首 " + top.name + "，" + num(top.score) + " 分";
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
      li.textContent = loaded ? "还没有记录，第一名空着" : "读取中…";
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

      const who = document.createElement("span");
      who.className = "ladder-row__who";

      const name = document.createElement("span");
      name.className = "ladder-row__name";
      name.textContent = row.name;
      who.appendChild(name);

      if (row.pending) {
        const tag = document.createElement("span");
        tag.className = "ladder-row__tag";
        tag.textContent = "待收录";
        tag.title = "这条还在你的浏览器里，GitHub 收录后所有人可见";
        who.appendChild(tag);
      }

      li.appendChild(who);

      const score = document.createElement("span");
      score.className = "ladder-row__score";
      score.textContent = num(row.score);
      li.appendChild(score);

      listEl.appendChild(li);
    });
  }

  function renderMeta() {
    if (!metaEl) return;
    if (!loaded) {
      metaEl.textContent = "读取中…";
      metaEl.dataset.tone = "local";
    } else if (board.length) {
      metaEl.textContent = "GitHub 汇总 · 提交后约 1 分钟更新";
      metaEl.dataset.tone = "live";
    } else {
      metaEl.textContent = "榜还没生成，等你来占第一位";
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
      mineEl.textContent = "我这台设备的最好成绩：" + num(best) + " 分";
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

  /* ---------- 读榜 ---------- */

  /* 静态文件走 GitHub Pages 的 CDN，直接用缓存会看到旧榜；
     带上时间戳每次都取最新的那一份 */
  function loadBoard() {
    return fetch(BOARD_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function () { return null; });
  }

  function boot() {
    loadBoard().then(function (rows) {
      loaded = true;
      const local = readJSON(KEY_LOCAL, []);
      board = mergeRows(rows || [], local);
      paint();
    });
  }

  /* ---------- 提交：组织一条 GitHub Issue ---------- */

  function issueUrl(name, score) {
    const title = "[DINO] " + name + " · " + score + " 分";
    const body = [
      "<!-- 这一行别删：Actions 靠它认成绩 -->",
      "score: " + score,
      "",
      "name: " + name
    ].join("\n");

    return "https://github.com/" + REPO + "/issues/new"
      + "?labels=" + encodeURIComponent(ISSUE_LABEL)
      + "&title=" + encodeURIComponent(title)
      + "&body=" + encodeURIComponent(body);
  }

  function saveLocal(name, score) {
    const local = readJSON(KEY_LOCAL, []);
    const key = String(name).toLowerCase();
    const exist = local.filter(function (r) {
      return r && String(r.name).toLowerCase() === key;
    })[0];

    if (exist) {
      if (score > exist.score) exist.score = score;
    } else {
      local.push({ name: name, score: score });
    }

    local.sort(function (a, b) { return b.score - a.score; });
    writeJSON(KEY_LOCAL, local.slice(0, 20));
  }

  /* ---------- 表单 ---------- */

  function showForm(score) {
    if (!formEl) return;
    formEl.hidden = false;

    const row = formEl.querySelector(".ladder-form__row");
    if (row) row.hidden = false;
    if (submitBtn) submitBtn.disabled = false;

    formEl.dataset.score = String(score);
    if (nameInput) {
      nameInput.value = readText(KEY_NAME, "");
      nameInput.focus({ preventScroll: true });
    }
    const hint = formEl.querySelector("[data-ladder-formhint]");
    if (hint) hint.textContent = "本局 " + num(score) + " 分 —— 填个名字，去 GitHub 发布";
  }

  /* 交完成绩只收起输入框，把「再来一局」留下 */
  function collapseForm(text) {
    if (!formEl) return;
    formEl.hidden = false;
    const row = formEl.querySelector(".ladder-form__row");
    if (row) row.hidden = true;
    const hint = formEl.querySelector("[data-ladder-formhint]");
    if (hint) hint.textContent = text || "已提交，再来一局？";
  }

  function hideForm() {
    if (formEl) formEl.hidden = true;
  }

  if (formEl) {
    formEl.addEventListener("submit", function (event) {
      event.preventDefault();
      const score = Number(formEl.dataset.score) || 0;
      let name = nameInput ? nameInput.value.trim() : "";

      if (!name) name = "匿名恐龙";
      name = Array.from(name).slice(0, 12).join("");

      try {
        window.localStorage.setItem(KEY_NAME, name);
      } catch (error) {
        /* 忽略 */
      }

      saveLocal(name, score);
      board = mergeRows(
        board.filter(function (r) { return !r.pending; }),
        readJSON(KEY_LOCAL, [])
      );
      paint();

      const win = window.open(issueUrl(name, score), "_blank");
      if (!win) {
        toast("新窗口被拦了，允许弹窗再点一次", "warn");
        return;
      }

      collapseForm("已在新窗口打开 GitHub，点 Submit 就上榜（约 1 分钟）");
      toast("这条先记在本机，GitHub 收录后所有人可见", "ok");
    });
  }

  /* ---------- 接小恐龙 ---------- */

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
      if (score < 20) return; /* 一开局就撞，别往榜上塞 */
      showForm(score);
    });

    strip.addEventListener("dino:start", function () {
      hideForm();
    });
  }

  boot();
})();
