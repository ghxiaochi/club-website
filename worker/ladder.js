/* =========================================================
   HNYZ · DINO_RUN 天梯榜后端
   ---------------------------------------------------------
   跑在 Cloudflare Workers 上，数据存 Workers KV。免费额度：
   每天 10 万次读 / 1000 次写，社团站的量级绰绰有余。

   路由（都在同一个地址下）：
     GET  /          取榜，可选 ?limit=20（上限 50）
     POST /          提交成绩，JSON body：
                     { "name": "阿池", "score": 4820, "level": 12 }
     OPTIONS /       CORS 预检

   存储：一个 key —— board:v1，值是
     { updated: 1700000000000, rows: [ { id, n, s, l, t }, ... ] }
   只留前 200 条，按分数降序。并发写有极小概率互相覆盖，
   排行榜这种场景可以接受（不做分布式锁，免费额度也不值当）。

   KV 绑定变量名必须是 LADDER。
   ========================================================= */

const KEY = "board:v1";
const MAX_ROWS = 200;
const MAX_SCORE = 300000;
const MAX_NAME = 12;
const MAX_BODY = 1024;

/* 60 秒内同一 IP 最多提交几次。挡的是手滑连点和低级刷分脚本，
   真要被盯上，KV 这套东西本来也拦不住，别过度设计。 */
const RATE_WINDOW = 60;
const RATE_LIMIT = 6;

function cors(env, request) {
  /* 默认放开，站点是公开的；想收紧就在 Worker 环境变量里
     配 ALLOW_ORIGIN = https://hnyzbcs.de5.net */
  const allow = (env && env.ALLOW_ORIGIN) || "*";
  const origin = request.headers.get("Origin") || "";
  const value = allow === "*" ? "*" : origin === allow ? allow : allow;
  return {
    "Access-Control-Allow-Origin": value,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function json(body, status, env, request) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...cors(env, request)
    }
  });
}

function cleanName(raw) {
  if (typeof raw !== "string") return "";
  /* 去掉控制字符、零宽字符、方向控制符，压掉连续空白 */
  const s = raw
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(s).slice(0, MAX_NAME).join("");
}

/* 昵称→稳定 id：同名的人共用一条记录，只保留最高分。
   用简单的 hash 而不是明文，key 短一点，也不泄隐私。 */
function nameId(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

async function readBoard(env) {
  const raw = await env.LADDER.get(KEY, "json");
  if (!raw || !Array.isArray(raw.rows)) return { updated: 0, rows: [] };
  return raw;
}

function sortRows(rows) {
  return rows
    .sort((a, b) => b.s - a.s || a.t - b.t)
    .slice(0, MAX_ROWS);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(env, request) });
    }

    if (!env || !env.LADDER) {
      return json({ ok: false, error: "服务端还没绑定 KV（变量名要叫 LADDER）" }, 503, env, request);
    }

    /* ---------- 取榜 ---------- */
    if (request.method === "GET") {
      const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));
      const board = await readBoard(env);
      const rows = board.rows.slice(0, limit).map((r) => ({
        name: r.n,
        score: r.s,
        level: r.l,
        at: r.t
      }));
      return json({ ok: true, updated: board.updated || 0, total: board.rows.length, rows }, 200, env, request);
    }

    /* ---------- 交成绩 ---------- */
    if (request.method === "POST") {
      const type = request.headers.get("Content-Type") || "";
      if (type.indexOf("application/json") < 0) {
        return json({ ok: false, error: "请用 JSON 提交" }, 415, env, request);
      }

      const text = await request.text();
      if (text.length > MAX_BODY) {
        return json({ ok: false, error: "提交内容太长" }, 413, env, request);
      }

      let body;
      try {
        body = JSON.parse(text);
      } catch (e) {
        return json({ ok: false, error: "JSON 格式不对" }, 400, env, request);
      }

      const name = cleanName(body.name);
      const score = Math.floor(Number(body.score));
      const level = Math.floor(Number(body.level));

      if (!name) {
        return json({ ok: false, error: "昵称不能为空" }, 400, env, request);
      }
      if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
        return json({ ok: false, error: "分数不在合理范围内" }, 400, env, request);
      }
      if (!Number.isFinite(level) || level < 1 || level > 100) {
        return json({ ok: false, error: "等级不在合理范围内" }, 400, env, request);
      }

      /* 简单限流：KV 里记一个 60 秒窗口的计数 */
      const ip = request.headers.get("CF-Connecting-IP") || "local";
      const rlKey = "rl:" + nameId(ip);
      const hit = (await env.LADDER.get(rlKey, "json")) || { n: 0, t: 0 };
      const now = Date.now();
      if (now - hit.t < RATE_WINDOW * 1000 && hit.n >= RATE_LIMIT) {
        return json({ ok: false, error: "提交太快了，歇一会儿再试" }, 429, env, request);
      }
      const nextHit = now - hit.t < RATE_WINDOW * 1000
        ? { n: hit.n + 1, t: hit.t }
        : { n: 1, t: now };

      const board = await readBoard(env);
      const id = nameId(name);
      const exist = board.rows.find((r) => r.id === id);
      const prev = exist ? exist.s : -1;

      if (score > prev) {
        if (exist) {
          exist.s = score;
          exist.l = level;
          exist.t = now;
        } else {
          board.rows.push({ id, n: name, s: score, l: level, t: now });
        }
        board.rows = sortRows(board.rows);
        board.updated = now;
        await env.LADDER.put(KEY, JSON.stringify(board));
      }

      /* 写限流计数（和主数据分开，失败不影响成绩） */
      try {
        await env.LADDER.put(rlKey, JSON.stringify(nextHit), { expirationTtl: 600 });
      } catch (e) {
        /* 忽略 */
      }

      const rank = board.rows.findIndex((r) => r.id === id) + 1;
      return json({
        ok: true,
        best: Math.max(prev, score),
        rank: rank || null,
        total: board.rows.length,
        improved: score > prev
      }, 200, env, request);
    }

    return json({ ok: false, error: "只支持 GET / POST" }, 405, env, request);
  }
};
