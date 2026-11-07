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

   —— 为什么改成「两个源一起问」——
   api.github.com 在国内经常要 4–9 秒才回，甚至直接超时。
   以前是等全部仓库都回来才提示，用户点完按钮盯着看七八秒，
   以为按钮坏了。现在：
     1. 点下去立刻弹一条「正在刷新」，进度跟着走；
     2. 每个仓库同时问 api.github.com 和 ungh.cc 镜像，
        谁先回先用谁——镜像 300ms 左右，先把卡片刷新掉；
     3. api 的数据后到就再补一次（镜像没有 language 等字段，
        这些以 api 为准，缺的字段沿用缓存里的旧值）；
     4. 单个仓库回来就单独重画那张卡，不等其它仓库。

   未登录 API 每小时 60 次 / IP。一次全量同步只花
   「不同仓库数」次 —— 五个仓库就是五次，够用；
   真撞上限流也不会删旧数据，只是提示稍后再试。
   ========================================================= */

(() => {
  "use strict";

  /* 极致档只留终端主页：这一层 UI 不会显示，别建 DOM、别发请求 */
  if (document.documentElement.dataset.lite === "2") return;

  const API_BASE = "https://api.github.com/repos";
  const MIRROR_BASE = "https://ungh.cc/repos";
  const CACHE_KEY = "hnyz:github-repo-cache:v1";
  const LAST_SYNC_KEY = "hnyz:repo-sync-at";

  /* 5 个仓库就 5 个并发，不分批。
     以前并发 3，五个仓库要排两轮，白等一个 RTT。 */
  const MAX_PARALLEL = 4;
  /* 国内直连 api.github.com 经常 5 秒才刚握手完，卡在 5 秒会把
     「线路慢」误报成「你断网了」。留到 12 秒，正常网络也等得起；
     这期间卡片显示的是本地缓存，不是空白。 */
  const API_TIMEOUT = 15000;
  const API_FIRST = 10000;
  const MIRROR_TIMEOUT = 9000;
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
     轻提示：右下角一颗胶囊。
     sticky=true 时不自动收（刷新过程中一直显示进度），
     由调用方最后再调一次 toast 收尾。
     --------------------------------------------------------- */
  function toast(html, kind, sticky) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "sync-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }

    toastEl.className = "sync-toast";
    if (kind === "error") toastEl.classList.add("is-error");
    if (kind === "busy") toastEl.classList.add("is-busy");
    toastEl.innerHTML = html;

    /* 重新触发过渡：同一个元素连续两次提示时也能淡入 */
    void toastEl.offsetWidth;
    toastEl.classList.add("is-visible");

    window.clearTimeout(toastTimer);
    if (!sticky) {
      toastTimer = window.setTimeout(() => {
        toastEl.classList.remove("is-visible");
      }, kind === "error" ? 4600 : 3600);
    }
    return toastEl;
  }

  /* 只改文字，不重放淡入动画：进度每回来一个仓库就刷一次，
     每次都重新淡入会闪。 */
  function toastText(html) {
    if (!toastEl) return;
    toastEl.innerHTML = html;
  }

  function clockText(date) {
    try {
      return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } catch (error) {
      return "";
    }
  }

  /* ---------------------------------------------------------
     两个数据源
     --------------------------------------------------------- */

  /* 正式接口：字段全，但慢，偶尔超时 */
  async function fetchApi(member, limit) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), limit || API_TIMEOUT);

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
        return { status: "fail", reason: "rate-limit" };
      }
      if (response.status === 404) {
        return { status: "fail", reason: "not-found" };
      }
      if (!response.ok) {
        return { status: "fail", reason: "error" };
      }

      return { status: "ok", data: await response.json() };
    } catch (error) {
      return {
        status: "fail",
        reason: controller.signal.aborted ? "timeout" : "network"
      };
    } finally {
      window.clearTimeout(timer);
    }
  }

  /* 第一次 10 秒没回话，再给一次 15 秒。
     国内直连 GitHub 的抖动常常是「第一包丢了、重连就通」，
     直接判死会让用户以为自己断网。总等待上限 20 秒，
     期间进度条一直在走，卡片显示的是缓存，不是空白。 */
  async function fetchApiRetry(member) {
    const first = await fetchApi(member, API_FIRST);
    if (first.status !== "fail" || first.reason !== "timeout") return first;
    return fetchApi(member, API_TIMEOUT);
  }

  /* 镜像：ungh.cc，Cloudflare 上的一份 GitHub 只读副本。
     没有 language / homepage / issues，只当「先看一眼」用。
     失败一律返回 null，不参与错误统计——它只是加速手段。 */
  async function fetchMirror(member) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), MIRROR_TIMEOUT);

    try {
      const response = await fetch(
        `${MIRROR_BASE}/${encodeURIComponent(member.user)}/${encodeURIComponent(member.repo)}`,
        { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal }
      );
      if (!response.ok) return null;

      const payload = await response.json();
      const repo = payload && payload.repo;
      if (!repo) return null;

      /* 翻译成 GitHub API 的字段名，后面 merge 的时候不用分源 */
      return {
        status: "ok",
        mirror: true,
        data: {
          name: repo.name || member.repo,
          description: repo.description || "",
          stargazers_count: typeof repo.stars === "number" ? repo.stars : null,
          forks_count: typeof repo.forks === "number" ? repo.forks : null,
          pushed_at: repo.pushedAt || null,
          updated_at: repo.updatedAt || null,
          html_url: `https://github.com/${member.user}/${member.repo}`,
          /* 镜像没有的字段留 null，merge 时不会覆盖缓存里的旧值 */
          language: null,
          homepage: null,
          open_issues_count: null,
          archived: null
        }
      };
    } catch (error) {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  }

  /* 两个请求同时发出，谁先带着数据回来就 resolve 谁。
     都没成功则 resolve null。 */
  function raceFirst(promises) {
    return new Promise((resolve) => {
      let left = promises.length;
      let settled = false;

      const done = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      promises.forEach((promise) => {
        promise
          .then((value) => {
            if (value && value.status === "ok" && value.data) done(value);
          })
          .catch(() => {})
          .then(() => {
            left -= 1;
            if (left === 0) done(null);
          });
      });
    });
  }

  /* 合并：新值里是 null / undefined 的字段保留旧值。
     镜像没有 language，不能让卡片从 JavaScript 变回 TEXT。 */
  function mergeData(before, patch) {
    const merged = Object.assign({}, before || {});
    Object.keys(patch || {}).forEach((field) => {
      const value = patch[field];
      if (value !== null && value !== undefined) merged[field] = value;
    });
    return merged;
  }

  /* 只比对新数据里真的有值的字段，避免「镜像缺字段」被当成有改动 */
  function hasChanged(before, after) {
    if (!before) return true;
    return WATCH_FIELDS.some((field) => {
      if (after[field] === null || after[field] === undefined) return false;
      if (field === "pushed_at" && before[field] && after[field]) {
        return Date.parse(before[field]) !== Date.parse(after[field]);
      }
      return String(before[field] ?? "") !== String(after[field] ?? "");
    });
  }

  /* ---------------------------------------------------------
     单个仓库：先到先画，后到的补
     --------------------------------------------------------- */
  async function syncOne(member) {
    const key = `${member.user}/${member.repo}`;
    const before = (readCache()[key] || {}).data || null;

    const apiPromise = fetchApiRetry(member);
    const mirrorPromise = fetchMirror(member);

    let last = before;
    let firstChanged = false;
    let applied = false;

    const apply = (payload) => {
      const merged = mergeData(last, payload);
      last = merged;
      writeCache(key, merged);
      window.dispatchEvent(
        new CustomEvent("hnyz:repo-updated", { detail: { key, data: merged } })
      );
      applied = true;
    };

    /* 第一轮：谁快用谁 */
    const first = await raceFirst([apiPromise, mirrorPromise]);
    if (first) {
      firstChanged = hasChanged(before, mergeData(before, first.data));
      apply(first.data);
    }

    /* 第二轮：正式的 api 数据通常晚 2–5 秒。
       不能在这里 await——那样进度和总结都要跟着它一起等，
       用户看到的还是「点了没反应」。改成后台补：
       数据到了再单独刷一次那张卡，赶不上就算了。 */
    const mergeApi = (apiResult) => {
      if (!apiResult || apiResult.status !== "ok" || !apiResult.data) return;
      const mergedAgain = mergeData(last, apiResult.data);
      if (applied && !hasChanged(last, mergedAgain)) return;

      last = mergedAgain;
      writeCache(key, mergedAgain);
      window.dispatchEvent(
        new CustomEvent("hnyz:repo-updated", { detail: { key, data: mergedAgain } })
      );
      applied = true;
    };

    if (first) {
      apiPromise.then(mergeApi).catch(() => {});
      return { key, status: "ok", changed: firstChanged, mirror: !!first.mirror };
    }

    /* 两个源都没给数据：这时候 api 一定已经结束，直接拿它的原因 */
    let apiResult = null;
    try {
      apiResult = await apiPromise;
    } catch (error) {
      apiResult = null;
    }
    mergeApi(apiResult);

    if (applied) {
      return { key, status: "ok", changed: firstChanged, mirror: false };
    }

    return {
      key,
      status: "fail",
      reason: (apiResult && apiResult.reason) || "network",
      changed: false
    };
  }

  /* ---------------------------------------------------------
     固定并发：上限 10，实际就是「有几个仓库发几个」
     --------------------------------------------------------- */
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
      toast("项目清单是空的，没有可同步的仓库。", "error");
      return;
    }

    if (navigator.onLine === false) {
      toast("现在离线，联网后再试。", "error");
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

    /* 点下去立刻有反馈：不等网络，先说自己开始干了 */
    const total = list.length;
    let done = 0;
    toast(`<b>0</b> / ${total} · 正在同步…`, "busy", true);

    /* 3 秒还没结果：多半是 GitHub 那边卡住了。
       与其让圈一直转，不如说出来——用户知道在等，就不会以为坏了。 */
    const slowHint = window.setTimeout(() => {
      if (running) toastText(`<b>0</b> / ${total} · GitHub 有点慢，继续等…`);
    }, 4000);

    const results = await pool(list, MAX_PARALLEL, async (member) => {
      const result = await syncOne(member);
      done += 1;
      if (done < total) {
        toastText(`<b>${done}</b> / ${total} · 正在同步…`);
      }
      return result;
    });

    window.clearTimeout(slowHint);

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

    /* 通知页面：所有卡片按最终数据再对一遍（进度里已经逐张刷过了） */
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
        toast(`已更新 <b>${ok.length}</b> 个仓库 · <b>${changed}</b> 个有变化 · ${time}`);
      } else {
        toast(`已是最新 · <b>${ok.length}</b> 个仓库都没变 · ${time}`);
      }
      return;
    }

    /* 部分或全部失败：说清楚原因，旧数据不会丢 */
    flash("is-failed");
    if (!ok.length) {
      if (limited) {
        toast("GitHub 限流了，过几分钟再试。数据没动。", "error");
      } else if (failed.every((item) => item.reason === "not-found")) {
        toast("仓库都找不到了，可能已改名或转私有。", "error");
      } else if (failed.every((item) => item.reason === "timeout")) {
        /* 超时不是断网：浏览器连上了，只是 GitHub 没在 12 秒内回话 */
        toast("GitHub 一直没回应，稍后再试。数据没动。", "error");
      } else if (failed.every((item) => item.reason === "network")) {
        toast("网络不通，检查一下再试。数据没动。", "error");
      } else {
        toast("没连上 GitHub，稍后再试。数据没动。", "error");
      }
      return;
    }

    const timedOut = failed.filter((item) => item.reason === "timeout").length;
    const reason = limited ? "被限流" : timedOut ? "超时" : "失败";
    toast(`已更新 <b>${ok.length}</b> 个，${failed.length} 个${reason}，失败的先用旧数据。`, "error");
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
