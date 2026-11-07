/* =========================================================
   HNYZ · Service Worker
   ---------------------------------------------------------
   目标：学校 WiFi 抽风、或者干脆断网的时候，
   官网还能打开、资源墙还能看、小恐龙还能玩。

   预缓存分两批，装得快、离线也全：
     核心（安装时）—— 六个页面、全部 CSS/JS、字体、图标、数据。
                      这些不齐，离线就是白屏，必须等它下完。
     扩展（激活后）—— 角色立绘、贴纸、音频。少一张不影响打开，
                      放后台慢慢补，不拖慢安装。

   运行时三条策略，按资源类型分工：
     1. 页面（HTML）   —— 网络优先。发版后用户第一次打开就是新的；
                          网络 4.5 秒没回应就先给缓存，不让人对着白屏。
     2. 带 ?v= 的资源  —— 缓存优先。版本号是手工打的，URL 变内容必变，
                          命中就是 0ms。
     3. 其余静态资源   —— 先给缓存，同时后台拉一份新的（stale-while-revalidate），
                          下次打开生效。图片、音频、字体都属于这类。

   换版时不再把旧缓存一把火烧掉：
     上一次发版留下的那份要留着。最常见的故障是新 HTML 还没送到，
     旧页面问的是 ?v=旧版本，而新缓存里只有新版本号——旧的一删，
     这个请求就无处可去，网络一慢整页就退成没有样式的裸 HTML。
     现在保留最近两版，并且允许跨缓存按「同路径、忽略版本号」找一份
     救急；找到的那份只用来顶这一下，绝不写进新版本号的地址，
     免得旧内容把新地址占住、以后永远拿不到新版。

   跨域请求（giscus、api.github.com）一律放行，不进缓存：
   第三方的响应头我们控制不了，缓存下来只会制造难以排查的怪问题。
   音频拖进度条会带 Range 头，也不进缓存——缓存整段响应喂不了分段请求。

   发版时改 VERSION，更老的缓存在 activate 里被清掉。
   ========================================================= */

const VERSION = "20261105v";
const CACHE = `hnyz-v${VERSION}`;

/* 站内根路径：用 "./" 就地解析，
   不管挂在自定义域名的根目录，还是 ghxiaochi.github.io/club-website/ 子目录，
   都不用改这一行 */
const ROOT = new URL("./", self.location.href).href;

/* 预缓存的 URL 必须和页面里引用的一模一样（连 ?v= 一起），
   否则 cache.match 精确匹配不到，离线时还是一张白页。
   所以版本号只在这里写一次，下面统一拼上去。 */
const V = `?v=${VERSION}`;

/* 保留几版缓存。2 = 当前 + 上一版：
   上一版是旧页面请求旧 ?v= 时的唯一救命稻草，再往前就没用了。 */
const KEEP_VERSIONS = 2;

/* 页面等网络的时间。GitHub Pages 的 CDN 正常 1 秒内就回，
   4.5 秒还没回多半是线路问题，先把缓存给出去，页面不至于空着。 */
const PAGE_TIMEOUT = 4500;

/* 单个静态资源的最长等待。比页面宽松：字体、音频大一点正常。 */
const ASSET_TIMEOUT = 12000;

/* 安装时一次并发下载几个。全并发 60 个会把首屏请求挤到后面。 */
const INSTALL_BATCH = 8;

/* 第一批：打开任何一页都需要的骨架 */
const CORE = [
  "./",
  "./index.html",
  "./projects.html",
  "./gallery.html",
  "./member.html",
  "./dino.html",
  "./404.html",
  "./manifest.webmanifest",
  "./data/repos.json",
  "./data/ladder.json",
  `./css/style.css${V}`,
  `./css/type.css${V}`,
  `./css/motion.css${V}`,
  `./css/skins.css${V}`,
  `./css/lite.css${V}`,
  `./css/personal.css${V}`,
  `./css/pet.css${V}`,
  `./css/avatar-pet.css${V}`,
  `./css/characters.css${V}`,
  `./css/member.css${V}`,
  `./css/dino.css${V}`,
  `./css/ladder.css${V}`,
  `./css/guestbook.css${V}`,
  `./js/main.js${V}`,
  `./js/repo-sync.js${V}`,
  `./js/members.js${V}`,
  `./js/copy.js${V}`,
  `./js/theme.js${V}`,
  `./js/theme-icon.js${V}`,
  `./js/skins.js${V}`,
  `./js/fullscreen.js${V}`,
  `./js/lite.js${V}`,
  `./js/skin-boot.js${V}`,
  `./js/pwa.js${V}`,
  `./js/sfx.js${V}`,
  `./js/click-fx.js${V}`,
  `./js/pet.js${V}`,
  `./js/avatar-pet.js${V}`,
  `./js/personal.js${V}`,
  `./js/characters.js${V}`,
  `./js/splash-scene.js${V}`,
  `./js/gallery-data.js${V}`,
  `./js/gallery.js${V}`,
  `./js/member.js${V}`,
  `./js/guestbook.js${V}`,
  `./js/ladder.js${V}`,
  /* 光场是整页 iframe，地址里带同一个版本号；预缓存要连 ?v= 一起写 */
  `./halo.html${V}`,
  "./fonts/anim-title.woff2",
  "./fonts/anim-pixel.woff2",
  "./images/favicon.svg",
  "./images/icon-192.png",
  "./images/icon-512.png",
  "./images/icon-maskable-512.png"
];

/* 第二批：装完再补，失败无所谓。离线看图集/角色排/听音效时才用到。
   逐个串行 fetch，不一次并发几十个请求，免得装完 SW 就把带宽占满。

   立绘（art-*）和图集原图（gallery/*）不在这里：它们加起来八百多 KB，
   而且只在点开角色卡/灯箱时才用。装完 SW 就把这些拉一遍，等于替每个
   访客预付了流量。现在交给 fetch 里的运行时缓存，看过哪张留哪张。 */
const EXTRA = [
  /* 皮肤与按需脚本：不切这套皮肤就不下载 */
  `./css/skin-halo.css${V}`,
  `./css/skin-term.css${V}`,
  `./css/term-tui.css${V}`,
  `./js/term-tui.js${V}`,
  `./js/matrix.js${V}`,
  `./js/dino.js${V}`,
  "./images/characters/unit-alpha-hit.webp",
  "./images/characters/unit-alpha.webp",
  "./images/characters/unit-crawler-hit.webp",
  "./images/characters/unit-crawler.webp",
  "./images/characters/unit-mono-hit.webp",
  "./images/characters/unit-mono.webp",
  "./images/characters/unit-oct-hit.webp",
  "./images/characters/unit-oct.webp",
  "./images/characters/unit-oxynoe-hit.webp",
  "./images/characters/unit-oxynoe.webp",
  "./images/characters/unit-quad-hit.webp",
  "./images/characters/unit-quad.webp",
  "./images/characters/unit-sei-hit.webp",
  "./images/characters/unit-sei.webp",
  "./images/characters/unit-zenith-hit.webp",
  "./images/characters/unit-zenith.webp",
  "./images/personal/sticker-2.webp",
  "./images/personal/sticker-3.webp",
  "./images/personal/sticker-4.webp",
  "./images/decor/animdustry.webp",
  /* 首页背景那三颗气泡（深色另有三张）：一张不到 1KB，顺手收进来 */
  "./images/decor/bubble-a.svg",
  "./images/decor/bubble-b.svg",
  "./images/decor/bubble-c.svg",
  "./images/decor/bubble-a-dark.svg",
  "./images/decor/bubble-b-dark.svg",
  "./images/decor/bubble-c-dark.svg",
  "./images/decor/icon-arduino.webp",
  "./images/decor/icon-badge.webp",
  "./images/decor/icon-token.webp",
  "./images/deepy/idle.webp",
  "./images/pet/badge-school-hd.webp",
  "./images/pet/ghxiaochi-avatar.webp",
  "./images/project-fx.svg",
  "./images/project-website.svg",
  "./images/project-zaco.svg",
  "./assets/moon-sun-sprite.webp",
  "./audio/back.mp3",
  "./audio/hit.mp3",
  "./audio/jump.mp3",
  "./audio/pat.mp3",
  "./audio/view.mp3"
];

/* 离线时用来兜底的页面：优先首页，其次是缓存里任意一页 */
const OFFLINE_FALLBACK = ["./index.html", "./"];

/* 运行时缓存最多留多少条图片，超了从最早放的开始删 */
const IMAGE_CACHE_LIMIT = 120;

/* 清理不必每次写入都做：遍历上千条 key 是要花时间的。
   30 秒内重复写入只清一次。 */
const TRIM_INTERVAL = 30000;

/* ---------- 小工具 ---------- */
function abs(path) {
  return new URL(path, self.location.href).href;
}

function isCacheName(name) {
  return name.startsWith("hnyz-v");
}

/* 从缓存名里取版本号：hnyz-v20261105v → 20261105v */
function versionOf(name) {
  return name.replace(/^hnyz-v/, "");
}

/* 按名字挑出要保留的缓存：当前这版优先，其余按版本号从新到旧，
   只留 KEEP_VERSIONS - 1 个。旧格式（不是 hnyz-v 开头）不认识，
   交给 activate 一并清掉。 */
function pickKeep(keys) {
  const others = keys
    .filter((key) => key !== CACHE)
    .sort((a, b) => versionOf(b).localeCompare(versionOf(a)));
  return [CACHE, ...others.slice(0, KEEP_VERSIONS - 1)];
}

async function putSafe(cache, url, request) {
  try {
    const res = await fetch(request || url, { cache: "reload" });
    /* 只回收 200 的完整响应；opaque / 206 一律不要 */
    if (res && res.status === 200) await cache.put(url, res);
    return res;
  } catch (error) {
    return null;
  }
}

/* 写入缓存。带 ?r= 这种纯时间戳的地址先摘掉参数，
   否则样式表自愈重挂一次就多一条重复条目。 */
async function cachePut(cache, request, res) {
  try {
    if (!res || res.status !== 200) return;
    let key = request;
    const url = new URL(request.url);
    const params = Array.from(url.searchParams.keys());
    if (params.length === 1 && params[0] === "r") {
      url.searchParams.delete("r");
      key = new Request(url.href, { method: "GET" });
    }
    await cache.put(key, res);
  } catch (error) {
    /* 配额满、响应已被消费，都不影响这次请求 */
  }
}

/* 跨缓存找一份能用的：当前版本优先，然后从新到旧翻上一版。
   先按原地址精确匹配，再按「同路径、忽略 ?v=」找。 */
async function findInCaches(request) {
  const keys = (await caches.keys()).filter(isCacheName);
  const keep = pickKeep(keys);
  const ordered = keep.concat(keys.filter((key) => !keep.includes(key)));

  for (const name of ordered) {
    let cache;
    try {
      cache = await caches.open(name);
    } catch (error) {
      continue;
    }
    const exact = await cache.match(request);
    if (exact) return exact;
    const loose = await cache.match(request, { ignoreSearch: true });
    if (loose) return loose;
  }
  return null;
}

/* 图片缓存无限长会把存储撑爆（十几张帖子、头像、截图），
   超过上限就按放入顺序删最老的一批。 */
let lastTrim = 0;

async function trimCache(cache, force) {
  const now = Date.now();
  if (!force && now - lastTrim < TRIM_INTERVAL) return;
  lastTrim = now;

  try {
    const keys = await cache.keys();
    const images = keys.filter((req) => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(new URL(req.url).pathname));
    if (images.length <= IMAGE_CACHE_LIMIT) return;
    await Promise.all(images.slice(0, images.length - IMAGE_CACHE_LIMIT).map((req) => cache.delete(req)));
  } catch (error) {
    /* 清理失败不影响返回结果 */
  }
}

async function offlineDocument(cache, request) {
  for (const path of OFFLINE_FALLBACK) {
    const hit = await cache.match(abs(path));
    if (hit) return hit;
  }
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  return new Response("离线，且这一页还没被缓存。", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

/* ---------- 安装：预缓存核心资源 ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    /* 分批 add，而不是 addAll：
       addAll 是「一个失败全部作废」，某个文件改名或 404 会让整个 SW
       装不上，也就没有离线能力。分批则允许个别失败，能缓多少缓多少；
       每批 8 个，也不至于一装就占满带宽、把首屏挤在后面。 */
    let ok = 0;
    for (let i = 0; i < CORE.length; i += INSTALL_BATCH) {
      const slice = CORE.slice(i, i + INSTALL_BATCH);
      const results = await Promise.all(slice.map((path) => putSafe(cache, abs(path))));
      ok += results.filter((res) => res && res.status === 200).length;
    }

    /* 一大半都下不到，说明这会儿网络根本不通。宁可这次装失败、
       继续用旧的 SW（缓存是完整的），也不要装一个空壳进来接管页面——
       空壳 + 弱网 = 满屏 504。 */
    if (ok < CORE.length / 3) {
      throw new Error(`precache failed: ${ok}/${CORE.length}`);
    }

    /* 新版本装好立即接管，不用等用户关掉所有标签页 */
    await self.skipWaiting();
  })());
});

/* 换版时把旧缓存里还能用的条目搬过来。
   带 ?v= 的是版本化资源，旧版内容不能混进新版本；
   图片、音频、字体这些没有版本号，文件本身没变，直接复制，
   省掉几十兆的重复下载，也让离线能力在新版装好的一瞬间就是完整的。 */
async function carryOver(cache, oldName) {
  let old;
  try {
    old = await caches.open(oldName);
    const keys = await old.keys();
    for (const req of keys) {
      const url = new URL(req.url);
      if (url.search) continue;
      if (await cache.match(req)) continue;
      const res = await old.match(req);
      if (res && res.status === 200) await cache.put(req, res);
    }
  } catch (error) {
    /* 旧缓存读不出来就算了，扩展预热会补上 */
  }
}

/* ---------- 激活：只清更老的版本 ---------- */
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const keep = pickKeep(keys);
    const older = keys.filter((key) => keep.includes(key) && key !== CACHE);

    const cache = await caches.open(CACHE);
    for (const name of older) await carryOver(cache, name);

    await Promise.all(
      keys
        .filter((key) => key.startsWith("hnyz-") && !keep.includes(key))
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();

    /* 第二批不阻塞激活：激活完才有离线能力，图片晚几秒到没关系。
       失败也不影响已经装好的核心。串行 + 30ms 间隔，
       别和用户正在看的页面抢带宽。 */
    (async () => {
      for (const path of EXTRA) {
        const url = abs(path);
        const hit = await cache.match(url);
        if (!hit) {
          await putSafe(cache, url);
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
      }
    })().catch(() => {});
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

  /* 音频拖进度条会带 Range；缓存里是整段响应，喂不了分段请求，直接走网络 */
  if (request.headers.has("range")) return;

  /* 1. 页面：网络优先，弱网超时回退缓存 */
  if (isHTML(request, url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const network = fetch(request).then((res) => {
        if (res && res.ok) cachePut(cache, request, res.clone());
        return res;
      }).catch(() => null);

      const fresh = await withTimeout(network, PAGE_TIMEOUT);
      if (fresh && fresh.ok) return fresh;

      /* 超时或失败：缓存里的页面立刻顶上。跨版本找，
         是因为换版后旧页面可能还在问旧地址。 */
      const cached = (await cache.match(request, { ignoreSearch: true })) ||
        (await findInCaches(request));
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

      /* 刚发版时最常见的一幕：页面还是旧 HTML，问的是 ?v=老版本，
         而新缓存里只有 ?v=新版本。以前这里直接走网络，网络一慢就返回
         空 504 —— CSS 拿不到，整页退成白底黑字的裸 HTML。现在先跨
         缓存按同路径捞一份救急。

         捞到就只返回，不写回这个地址：旧 URL 每换一版就多一个，
         写进去只会让缓存里堆一串永远用不上的副本。下次再请求，
         ignoreSearch 一样能找到。 */
      const rescue = await findInCaches(request);
      if (rescue) return rescue;

      const fresh = await withTimeout(
        fetch(request)
          .then((res) => {
            if (res && res.ok) cachePut(cache, request, res.clone());
            return res;
          })
          .catch(() => null),
        ASSET_TIMEOUT
      );
      if (fresh && fresh.ok) return fresh;

      /* 真没缓存也没网：给一个明确的失败，而不是空白 200 */
      return new Response("", { status: 504, statusText: "offline" });
    })());
    return;
  }

  /* 3. 其余静态资源：先给缓存，后台更新 */
  const isStatic = /\.(png|jpe?g|webp|avif|svg|gif|mp3|ogg|mp4|webm|ttf|otf|woff2?|json|xml|txt|webmanifest)$/i.test(url.pathname);
  if (!isStatic) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    /* 同样允许忽略查询串：样式表兜底重挂时会带 ?r=时间戳，
       这里能直接吃到缓存里那份，不用再赌一次网络 */
    const hit = (await cache.match(request)) ||
      (await cache.match(request, { ignoreSearch: true }));

    const network = fetch(request).then((res) => {
      /* data/repos.json 每天更新一次，也走这条：本次给旧值，下次给新值 */
      if (res && res.ok) {
        cachePut(cache, request, res.clone());
        trimCache(cache);
      }
      return res;
    }).catch(() => null);

    if (hit) return hit;

    const fresh = await withTimeout(network, ASSET_TIMEOUT);
    if (fresh && fresh.ok) return fresh;

    /* 缓存里没有、网络又慢：跨版本再找一次（上一版留下的大图、
       字体都在这里），还是不行才认输 */
    const rescue = await findInCaches(request);
    if (rescue) return rescue;

    /* 必须有兜底响应：返回 null 的话 respondWith(null) 会抛 TypeError，
       控制台里是一串看不懂的报错 */
    return new Response("", { status: 504, statusText: "offline" });
  })());
});
