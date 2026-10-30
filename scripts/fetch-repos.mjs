/* =========================================================
   HNYZ · 把项目数据抓成一份静态文件
   ---------------------------------------------------------
   为什么不在浏览器里直接调 GitHub API：
   匿名额度是 60 次/小时/IP，纳新季一个班同时打开页面就把额度打完了，
   之后所有人都会看到降级卡片。改成每天抓一次、写进 data/repos.json，
   前端读同域文件：零限流、零跨域、断网也能看。

   用法（本地）：
     node scripts/fetch-repos.mjs
     GITHUB_TOKEN=xxx node scripts/fetch-repos.mjs

   CI 里由 .github/workflows/refresh-repos.yml 每天跑一次。
   仓库清单只认 js/members.js，不要在这里再维护一份。
   ========================================================= */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const MEMBERS_FILE = resolve(ROOT, "js/members.js");
const OUT_FILE = resolve(ROOT, "data/repos.json");

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

/* 只留前端真正用得到的字段：完整响应有 100 多个键，
   其中大部分是 URL 模板，写进文件里纯属浪费流量 */
function slim(data) {
  return {
    name: data.name,
    full_name: data.full_name,
    description: data.description ?? null,
    html_url: data.html_url,
    homepage: data.homepage ?? null,
    language: data.language ?? null,
    stargazers_count: data.stargazers_count ?? 0,
    forks_count: data.forks_count ?? 0,
    open_issues_count: data.open_issues_count ?? 0,
    pushed_at: data.pushed_at ?? null,
    updated_at: data.updated_at ?? null,
    archived: Boolean(data.archived),
    topics: Array.isArray(data.topics) ? data.topics : [],
    owner: data.owner ? { login: data.owner.login } : null
  };
}

async function readMembers() {
  const source = await readFile(MEMBERS_FILE, "utf8");
  /* members.js 是给浏览器写的：挂到 window 上就行，
     给它一个假的 window 就能在 node 里跑，不用改文件格式 */
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "members.js" });

  const list = sandbox.window.HNYZ_MEMBERS;
  if (!Array.isArray(list)) throw new Error("js/members.js 里没有 HNYZ_MEMBERS 数组");
  return list.filter((item) => item && item.user && item.repo);
}

async function fetchOne(member, attempt = 0) {
  const url = `https://api.github.com/repos/${encodeURIComponent(member.user)}/${encodeURIComponent(member.repo)}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "hnyz-club-website/refresh"
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const response = await fetch(url, { headers });

  /* 401/403：额度用完或 token 失效。等一下再试一次，
     仍然不行就记进 missing，交给前端回退到 API */
  if ((response.status === 403 || response.status === 429) && attempt < 2) {
    const retryAfter = Number(response.headers.get("retry-after")) || 3;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return fetchOne(member, attempt + 1);
  }

  if (!response.ok) {
    return { key: `${member.user}/${member.repo}`, error: `HTTP ${response.status}` };
  }

  const data = await response.json();
  return { key: `${member.user}/${member.repo}`, data: slim(data) };
}

function stamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function readPrevious() {
  try {
    const raw = await readFile(OUT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.repos === "object" && parsed.repos ? parsed.repos : {};
  } catch (error) {
    return {};
  }
}

async function main() {
  const members = await readMembers();
  const unique = [...new Map(members.map((m) => [`${m.user}/${m.repo}`, m])).values()];

  console.log(`[repos] ${unique.length} 个仓库，token=${TOKEN ? "有" : "无"}`);

  const repos = {};
  const missing = [];

  for (const member of unique) {
    const key = `${member.user}/${member.repo}`;
    try {
      const result = await fetchOne(member);
      if (result.error) {
        missing.push({ key, reason: result.error });
        console.warn(`[repos] ✗ ${key} ${result.error}`);
      } else {
        repos[key] = result.data;
        console.log(`[repos] ✓ ${key}`);
      }
    } catch (error) {
      missing.push({ key, reason: String(error && error.message) });
      console.warn(`[repos] ✗ ${key} ${error && error.message}`);
    }
  }

  /* 和上一次的结果合并：这次没抓到的仓库，保留上次的条目。
     额度用光时跑一次不会把整个文件清空，多跑几次还能慢慢补齐。 */
  const previous = await readPrevious();
  const merged = { ...previous };
  Object.keys(repos).forEach((key) => { merged[key] = repos[key]; });

  if (Object.keys(merged).length === 0) {
    console.error("[repos] 一个都没抓到，且没有旧数据可留，放弃写文件");
    process.exitCode = 1;
    return;
  }

  const payload = {
    generatedAt: stamp(),
    generator: "scripts/fetch-repos.mjs",
    count: Object.keys(merged).length,
    repos: merged,
    missing
  };

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[repos] 写入 ${OUT_FILE}（共 ${payload.count} 个，本次缺 ${missing.length} 个）`);

  /* 部分失败不算 CI 失败：文件已经更新了，缺的那些下次会补上 */
  if (Object.keys(repos).length === 0) {
    console.warn("[repos] 本次一个都没抓到，沿用了旧数据");
  }
}

main().catch((error) => {
  console.error("[repos] 失败：", error);
  process.exitCode = 1;
});
