/* =========================================================
   本地联调用的假 Worker
   ---------------------------------------------------------
   Cloudflare 的 KV 要登录才给用，本地开发没必要绕着它转。
   这个文件用 Node 原生 http 起一个内存版，行为和 worker/ladder.js
   对齐（同样的路由、校验、排序、限流），只是数据存在内存里，
   进程一停就没了。

   用法：
     node worker/dev-server.mjs            # 默认 8787
     PORT=9000 node worker/dev-server.mjs

   然后把 js/ladder.js 里的 CONFIG.endpoint 临时指到
     http://127.0.0.1:8787/
   ========================================================= */

import http from "node:http";

const PORT = Number(process.env.PORT) || 8787;
const MAX_ROWS = 200;
const MAX_SCORE = 300000;
const MAX_NAME = 12;

let board = { updated: 0, rows: [] };
const rate = new Map();

const cleanName = (raw) =>
  typeof raw === "string"
    ? Array.from(
        raw
          .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, "")
          .replace(/\s+/g, " ")
          .trim()
      ).slice(0, MAX_NAME).join("")
    : "";

const nameId = (name) => {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

const send = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(body));
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      return res.end();
    }

    if (req.method === "GET") {
      const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));
      return send(res, 200, {
        ok: true,
        updated: board.updated,
        total: board.rows.length,
        rows: board.rows.slice(0, limit).map((r) => ({
          name: r.n,
          score: r.s,
          level: r.l,
          at: r.t
        }))
      });
    }

    if (req.method !== "POST") return send(res, 405, { ok: false, error: "只支持 GET / POST" });

    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 4096) req.destroy();
    });
    req.on("end", () => {
      let body;
      try {
        body = JSON.parse(raw);
      } catch (e) {
        return send(res, 400, { ok: false, error: "JSON 格式不对" });
      }

      const name = cleanName(body.name);
      const score = Math.floor(Number(body.score));
      const level = Math.floor(Number(body.level));

      if (!name) return send(res, 400, { ok: false, error: "昵称不能为空" });
      if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE)
        return send(res, 400, { ok: false, error: "分数不在合理范围内" });
      if (!Number.isFinite(level) || level < 1 || level > 100)
        return send(res, 400, { ok: false, error: "等级不在合理范围内" });

      const ip = req.socket.remoteAddress || "local";
      const now = Date.now();
      const hit = rate.get(ip) || { n: 0, t: 0 };
      if (now - hit.t < 60000 && hit.n >= 30) {
        return send(res, 429, { ok: false, error: "提交太快了，歇一会儿再试" });
      }
      rate.set(ip, now - hit.t < 60000 ? { n: hit.n + 1, t: hit.t } : { n: 1, t: now });

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
        board.rows = board.rows.sort((a, b) => b.s - a.s || a.t - b.t).slice(0, MAX_ROWS);
        board.updated = now;
      }

      const rank = board.rows.findIndex((r) => r.id === id) + 1;
      send(res, 200, {
        ok: true,
        best: Math.max(prev, score),
        rank: rank || null,
        total: board.rows.length,
        improved: score > prev
      });
    });
  })
  .listen(PORT, () => {
    console.log(`假天梯后端已启动：http://127.0.0.1:${PORT}/`);
  });
