/* =========================================================
   HNYZ · Service Worker
   ---------------------------------------------------------
   目标只有一个：学校 WiFi 抽风、或者干脆断网的时候，
   官网还能打开、资源墙还能看。

   三条策略，按资源类型分工：
     1. 页面（HTML）   —— 网络优先。发版后用户第一次打开就是新的；
                          网络超过 3.5 秒没回应，退回缓存，不让人对着白屏。
     2. 带 ?v= 的资源  —— 缓存优先。版本号是手工打的，URL 变内容必变，
                          缓存永远不会拿到错版本，命中就是 0ms。
     3. 其余静态资源   —— 先给缓存，同时后台拉一份新的（stale-while-revalidate），
                          下次打开生效。图片、音频、字体都属于这类。

   跨域请求（giscus、api.github.com）一律放行，不进缓存：
   第三方的响应头我们控制不了，缓存下来只会制造难以排查的怪问题。

   发版时改 VERSION，旧缓存会在 activate 里被清掉。
   ========================================================= */

const VERSION = "v20261099";
const CACHE = `hnyz-${VERSION}`;

/* 站内根路径：GitHub Pages 上站点在 /club-website/ 子目录下，
   直接用 "./" 解析，换域名或换仓库都不用改这里 */
const ROOT = new URL("./", self.location.href).href;

const CORE = [
  "./",
  "./index.html",
  "./projects.html",
  "./gallery.html",
  "./member.html",
  "./404.html",
  "./manifest.webmanifest",
  "./data/repos.json",
  "./css/style.css",
  "./css/type.css",
  "./css/motion.css",
  "./css/skins.css",
  "./css/personal.css",
  "./css/pet.css",
  "./css/avatar-pet.css",
  "./css/guestbook.css",
  "./js/main.js",
  "./js/members.js",
  "./js/copy.js",
  "./js/theme.js",
  "./js/skins.js",
  "./js/pwa.js",
  "./js/guestbook.js",
  "./images/favicon.svg",
  "./images/icon-192.png"
];

/* 离线时用来兜底的页面：优先首页，其次是那几张卡片页 */
const OFFLINE_FALLBACK = ["./index.html", "./"];

/* ---------- 安装：预缓存核心资源 ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    /* 逐个 add，而不是 addAll：addAll 是「一个失败全部作废」，
       某个文件改名或 404 会让整个 SW 装不上，也就没有离线能力。
       这里允许个别失败，能缓多少缓多少。 */
    await Promise.all(CORE.map(async (path) => {
      const url = new URL(path, self.location.href).href;
      try {
        const res = await fetch(url, { cache: "reload" });
        if (res && res.ok) await cache.put(url, res);
      } catch (error) {
        /* 单个资源拉不到就算了，不影响安装 */
      }
    }));

    /* 新版本装好立即接管，不用等用户关掉所有标签页 */
    await self.skipWaiting();
  })());
});

/* ---------- 激活：清掉旧版本缓存 ---------- */
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("hnyz-") && key !== CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

/* ---------- 工具 ---------- */
function isHTML(request, url) {
  if (request.mode === "navigate" || request.destination === "document") return true;
  return url.pathname.endsWith("/") || url.pathname.endsWith(".html");
}

function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(null); }
    );
  });
}

async function offlineDocument(cache, request) {
  for (const path of OFFLINE_FALLBACK) {
    const hit = await cache.match(new URL(path, self.location.href).href);
    if (hit) return hit;
  }
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  return new Response("离线，且这一页还没被缓存。", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

/* ---------- 请求拦截 ---------- */
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  /* 跨域：giscus、GitHub API、外部图片，全部原样放行 */
  if (url.origin !== self.location.origin) return;

  /* 站内但不在作用域里的路径（理论上不该有），也放行 */
  if (!url.href.startsWith(ROOT)) return;

  /* 1. 页面：网络优先，弱网超时回退缓存 */
  if (isHTML(request, url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const network = fetch(request).then((res) => {
        if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
        return res;
      }).catch(() => null);

      /* 3.5 秒：够 GitHub Pages 的 CDN 回一次，又不至于让人以为点了没反应 */
      const fresh = await withTimeout(network, 3500);
      if (fresh && fresh.ok) return fresh;

      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;

      return (await network) || offlineDocument(cache, request);
    })());
    return;
  }

  /* 2. 带版本号的资源：缓存优先，URL 变即内容变 */
  if (url.search.includes("v=")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      try {
        const res = await fetch(request);
        if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
        return res;
      } catch (error) {
        return new Response("", { status: 504, statusText: "offline" });
      }
    })());
    return;
  }

  /* 3. 其余静态资源：先给缓存，后台更新 */
  const isStatic = /\.(png|jpe?g|webp|avif|svg|gif|mp3|ogg|mp4|webm|ttf|otf|woff2?|json|xml|txt|webmanifest)$/i.test(url.pathname);
  if (!isStatic) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request);

    const refresh = fetch(request).then((res) => {
      /* data/repos.json 每天更新一次，也走这条：本次给旧值，下次给新值 */
      if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);

    if (hit) return hit;

    /* 必须有兜底响应：refresh 失败时返回 null 的话，
       respondWith(null) 会抛 TypeError，控制台里是一串看不懂的报错 */
    const fresh = await refresh;
    if (fresh) return fresh;
    return new Response("", { status: 504, statusText: "offline" });
  })());
});
