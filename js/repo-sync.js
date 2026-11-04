/* =========================================================
   HNYZ · 一键同步仓库数据
   ---------------------------------------------------------
   顶部那个圆形箭头按钮。

   平时页面上的项目卡片读的是 data/repos.json —— 一份由
   GitHub Actions 每天凌晨抓好的快照。仓库改了描述、换了
   star 数，最长要等一天才看得到。

   点这个按钮就绕过快照和 10 分钟本地缓存，直接问 GitHub：
   拉回来的数据写进 localStorage（和 main.js 同一个键），
   当前页立刻重渲染，其它页面之后打开也命中新值。

   未登录 API 每小时 60 次 / IP。一次全量同步只花
   「不同仓库数」次 —— 五个仓库就是五次，够用；
   真撞上限流也不会删旧数据，只是提示稍后再试。
   ========================================================= */

(() => {
  "use strict";

  const API_BASE = "https://api.github.com/repos";
  const CACHE_KEY = "hnyz:github-repo-cache:v1";
  const LAST_SYNC_KEY = "hnyz:repo-sync-at";
  const CONCURRENCY = 3;
  const TIMEOUT = 9000;
  const LIMIT_KEEP = 40;

  /* 判断「有没有变化」时只看这些字段：
     卡片和 git 窗口真正会用到的都在里面 */
  const WATCH_FIELDS = [
    "description",
    "homepage",
    "language",
    "stargazers_count",
    "forks_count",
    "open_issues_count",
    "pushed_at",
    "archived"
  ];

  const button = document.querySelector("[data-sync-toggle]");
  if (!button) return;

  const members = Array.isArray(window.HNYZ_MEMBERS) ? window.HNYZ_MEMBERS : [];

  let running = false;
  let toastEl = null;
  let toastTimer = 0;

  /* ---------------------------------------------------------
     缓存读写：优先走 main.js 暴露的接口，这样它内存里那份
     引用也会同步更新；接口不在（脚本被拦截）时自己写一份。
     --------------------------------------------------------- */
  function readCache() {
    const view = window.HNYZ_REPO_VIEW;
    if (view && typeof view.readCache === "function") {
      try {
        return view.readCache() || {};
      } catch (error) {
        /* 继续走下面的兜底 */
      }
    }
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeCache(key, data) {
    const view = window.HNYZ_REPO_VIEW;
    if (view && typeof view.write === "function") {
      try {
        view.write(key, data);
        return;
      } catch (error) {
        /* 继续走下面的兜底 */
      }
    }

    const cache = readCache();
    cache[key] = { savedAt: Date.now(), data };
    const keys = Object.keys(cache);
    if (keys.length > LIMIT_KEEP) {
      keys
        .sort((a, b) => (cache[a].savedAt || 0) - (cache[b].savedAt || 0))
        .slice(0, keys.length - LIMIT_KEEP)
        .forEach((oldKey) => delete cache[oldKey]);
    }
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      /* 配额满或隐私模式：本次会话照常渲染，不拦用户 */
    }
  }

  /* ---------------------------------------------------------
     轻提示：右下角一颗胶囊，几秒后自己收走
     --------------------------------------------------------- */
  function toast(html, kind) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "sync-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }

    toastEl.className = kind === "error" ? "sync-toast is-error" : "sync-toast";
    toastEl.innerHTML = html;
    /* 重新触发过渡：同一个元素连续两次提示时也能淡入 */
    void toastEl.offsetWidth;
    toastEl.classList.add("is-visible");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove("is-visible");
    }, 3800);
  }

  function clockText(date) {
    try {
      return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } catch (error) {
      return "";
    }
  }

  /* ---------------------------------------------------------
     拉单个仓库
     --------------------------------------------------------- */
  async function fetchOne(member, cache) {
    const key = `${member.user}/${member.repo}`;
    const before = cache[key] && cache[key].data ? cache[key].data : null;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(member.user)}/${encodeURIComponent(member.repo)}`,
        {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store",
          signal: controller.signal
        }
      );

      /* 403 / 429：未登录额度用尽，或同一个 IP 上人太多 */
      if (response.status === 403 || response.status === 429) {
        return { key, status: "fail", reason: "rate-limit" };
      }
      if (response.status === 404) {
        return { key, status: "fail", reason: "not-found" };
      }
      if (!response.ok) {
        return { key, status: "fail", reason: "error" };
      }

      const data = await response.json();
      writeCache(key, data);

      const changed = !before || WATCH_FIELDS.some(
        (field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(data[field] ?? null)
      );

      return { key, status: "ok", changed };
    } catch (error) {
      return {
        key,
        status: "fail",
        reason: controller.signal.aborted ? "timeout" : "network"
      };
    } finally {
      window.clearTimeout(timer);
    }
  }

  /* 固定并发，别一次把浏览器连接池占满 */
  async function pool(items, limit, worker) {
    const output = new Array(items.length);
    let cursor = 0;

    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        output[index] = await worker(items[index], index);
      }
    });

    await Promise.all(runners);
    return output;
  }

  /* ---------------------------------------------------------
     按钮状态
     --------------------------------------------------------- */
  function setBusy(on) {
    button.classList.toggle("is-syncing", on);
    button.classList.remove("is-done", "is-failed");
    if (on) {
      button.setAttribute("aria-busy", "true");
      button.setAttribute("aria-label", "正在从 GitHub 刷新项目数据");
    } else {
      button.removeAttribute("aria-busy");
      button.setAttribute("aria-label", "从 GitHub 刷新全部项目数据");
    }
  }

  function flash(kind) {
    button.classList.add(kind);
    window.setTimeout(() => button.classList.remove(kind), 2400);
  }

  /* ---------------------------------------------------------
     同步主流程
     --------------------------------------------------------- */
  async function syncAll() {
    if (running) return;

    if (!members.length) {
      toast("没有可同步的项目，先把仓库写进 <b>js/members.js</b>。", "error");
      return;
    }

    if (navigator.onLine === false) {
      toast("当前处于离线状态，联网后再点。", "error");
      return;
    }

    running = true;
    setBusy(true);

    /* 同一个仓库可能在清单里出现多次，去重后再请求 */
    const unique = new Map();
    members.forEach((member) => {
      if (!member || !member.user || !member.repo) return;
      unique.set(`${member.user}/${member.repo}`, member);
    });
    const list = Array.from(unique.values());

    const cache = readCache();
    const results = await pool(list, CONCURRENCY, (member) => fetchOne(member, cache));

    const ok = results.filter((item) => item.status === "ok");
    const failed = results.filter((item) => item.status !== "ok");
    const changed = ok.filter((item) => item.changed).length;
    const limited = failed.filter((item) => item.reason === "rate-limit").length;

    running = false;
    setBusy(false);

    const now = new Date();
    const time = clockText(now);

    if (ok.length) {
      try {
        window.localStorage.setItem(LAST_SYNC_KEY, String(now.getTime()));
      } catch (error) {
        /* 记不住时间不影响数据 */
      }
      button.setAttribute("title", `刷新项目数据 · 上次 ${time}`);
    }

    /* 只要有仓库更新成功，就让页面把新数据画出来 */
    if (ok.length) {
      window.dispatchEvent(
        new CustomEvent("hnyz:repos-synced", {
          detail: {
            at: now.getTime(),
            total: list.length,
            ok: ok.length,
            changed,
            failed: failed.length
          }
        })
      );
    }

    if (!failed.length) {
      flash("is-done");
      if (changed) {
        toast(`<b>${ok.length}</b> 个仓库已同步，其中 <b>${changed}</b> 个有改动 · ${time}`);
      } else {
        toast(`已是最新：<b>${ok.length}</b> 个仓库都没有变化 · ${time}`);
      }
      return;
    }

    /* 部分或全部失败：说清楚原因，旧数据不会丢 */
    flash("is-failed");
    if (!ok.length) {
      if (limited) {
        toast("GitHub 限流了：未登录每小时 60 次，等一会儿再点。现有数据没有动。", "error");
      } else if (failed.every((item) => item.reason === "not-found")) {
        toast("这些仓库都返回 404：可能已改名或转成私有。", "error");
      } else {
        toast("连不上 GitHub，检查网络后再试。现有数据没有动。", "error");
      }
      return;
    }

    const reason = limited ? "被 GitHub 限流" : "请求失败";
    toast(`已同步 <b>${ok.length}</b> 个，${failed.length} 个${reason}；失败的保留原数据。`, "error");
  }

  /* ---------------------------------------------------------
     绑定
     --------------------------------------------------------- */
  button.addEventListener("click", syncAll);

  /* 从别的页面回来时把上次同步时间补在 tooltip 上 */
  try {
    const last = Number(window.localStorage.getItem(LAST_SYNC_KEY));
    if (Number.isFinite(last) && last > 0) {
      button.setAttribute("title", `刷新项目数据 · 上次 ${clockText(new Date(last))}`);
    }
  } catch (error) {
    /* 忽略 */
  }
})();
