#!/usr/bin/env node
/* =========================================================
   CSS 旧内核降级器
   ---------------------------------------------------------
   为什么需要它：
   Chromium 79 以下的解析器不认识 clamp() / min() / max()，
   遇到就把**整条声明**丢掉（不是只丢那个函数）。本站 109 条
   声明里用到了它们，国产内核（微信/QQ/夸克/UC 常见 7x~9x）
   打开时等于这些声明全部不存在：字号回落到 16px、间距归零、
   标题撑破容器 —— 看起来就是「排版崩成一列」。

   inset 简写（Chromium 87+）同理，48 处定位会一起塌掉。

   做法：在这些声明前面补一条静态值。新浏览器读到第二条时
   会覆盖掉第一条，视觉完全不变；旧浏览器不认识第二条，
   直接用第一条。

   用法：
     node scripts/compat-fallback.mjs          # 写入
     node scripts/compat-fallback.mjs --dry    # 只统计不写

   参考视口取 1024×768 / 根字号 16px，也就是安卓平板横屏，
   旧内核的主要使用场景。可重复运行（幂等）。
   ========================================================= */

import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const CSS_DIR = path.join(process.cwd(), "css");

const VIEW_W = 1024;
const VIEW_H = 768;
const REM = 16;

const UNIT = {
  "": 0,
  px: 1,
  rem: REM,
  em: REM,
  "%": null, // 相对父级，求不出，放弃
  ch: 8,
  ex: 8,
  vw: VIEW_W / 100,
  vh: VIEW_H / 100,
  vmin: Math.min(VIEW_W, VIEW_H) / 100,
  vmax: Math.max(VIEW_W, VIEW_H) / 100
};

/* 把单个长度词求成 px；求不出返回 null */
function toPx(token) {
  const t = token.trim();
  if (t === "0") return 0;
  const m = /^(-?\d*\.?\d+)([a-z%]*)$/i.exec(t);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (!(unit in UNIT) || UNIT[unit] === null) return null;
  return n * UNIT[unit];
}

/* 按顶层逗号切参数，支持嵌套括号 */
function splitArgs(inner) {
  const out = [];
  let depth = 0;
  let buf = "";
  for (const ch of inner) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf);
  return out.map((s) => s.trim());
}

/* 递归求值，支持 clamp/min/max 互相嵌套 */
function evalExpr(expr) {
  const s = expr.trim();
  const fn = /^(clamp|min|max)\(([\s\S]*)\)$/i.exec(s);
  if (fn) {
    const args = splitArgs(fn[2]);
    const nums = args.map(evalExpr);
    if (nums.some((n) => n === null)) return null;
    if (fn[1].toLowerCase() === "clamp") {
      if (nums.length !== 3) return null;
      return Math.max(nums[0], Math.min(nums[1], nums[2]));
    }
    if (fn[1].toLowerCase() === "min") return Math.min(...nums);
    return Math.max(...nums);
  }
  return toPx(s);
}

/* 值里是否含有需要降级的函数（避免误伤 min-width 这类属性名） */
function hasFn(value) {
  return /(?:^|[\s,(])(clamp|min|max)\(/i.test(value);
}

function px(n) {
  // 保留一位小数，整数去掉小数点
  const r = Math.round(n * 10) / 10;
  return `${r}px`;
}

/* ---------- inset 简写展开 ---------- */
function expandInset(value) {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 1 || parts.length > 4) return null;
  const [t, r = t, b = t, l = r] = parts;
  return [
    ["top", t],
    ["right", r],
    ["bottom", b],
    ["left", l]
  ];
}

const MARK = "/* fallback: 旧内核 */";

let total = 0;
const perFile = [];

for (const name of fs.readdirSync(CSS_DIR).filter((f) => f.endsWith(".css")).sort()) {
  const file = path.join(CSS_DIR, name);
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");
  const out = [];
  let hits = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 已经降级过就不重复插入
    const prev = out.length ? out[out.length - 1] : "";
    const already = prev.includes(MARK);

    const decl = /^(\s*)([-a-z]+)\s*:\s*([^;{}]+);\s*$/i.exec(line);
    if (!decl || already) {
      out.push(line);
      continue;
    }

    const [, indent, prop, value] = decl;

    /* 1) clamp / min / max → 前置静态值 */
    if (hasFn(value)) {
      const v = evalExpr(value);
      if (v !== null && Number.isFinite(v)) {
        out.push(`${indent}${prop}: ${px(v)}; ${MARK}`);
        out.push(line);
        hits++;
        continue;
      }
      console.warn(`  跳过（求值失败） ${name}:${i + 1}  ${prop}: ${value.trim()}`);
      out.push(line);
      continue;
    }

    /* 2) inset 简写 → 四条 */
    if (prop.toLowerCase() === "inset") {
      const sides = expandInset(value);
      if (sides && sides.every(([, v]) => !hasFn(v) || evalExpr(v) !== null)) {
        for (const [side, v] of sides) {
          const num = hasFn(v) ? evalExpr(v) : null;
          out.push(`${indent}${side}: ${num !== null ? px(num) : v}; ${MARK}`);
        }
        out.push(line);
        hits++;
        continue;
      }
    }

    out.push(line);
  }

  if (hits > 0) {
    total += hits;
    perFile.push([name, hits]);
    if (!DRY) fs.writeFileSync(file, out.join("\n"), "utf8");
  }
}

console.log(`\n${DRY ? "[预演]" : "[写入]"} 共降级 ${total} 条声明`);
for (const [f, n] of perFile) console.log(`  ${f.padEnd(20)} ${n}`);
