/* =========================================================
   HNYZ · 三套文案
   ---------------------------------------------------------
   同一块版面，三种说法：
     default  社团自我介绍，正常语气
     minimal  短句、留白，什么都不多说
     hacker   终端命令口吻，带一点自嘲
   HTML 里只写 data-copy="键名"，正文由这里统一替换，
   改文案不用翻四个页面。
   ========================================================= */

(() => {
  "use strict";

  const COPY = {
    "hero-eyebrow": {
      default: "HNYZ // 衡南一中 · 学生编程社团",
      minimal: "HNYZ · 衡南一中",
      hacker: "root@hnyz:~/site — whoami"
    },
    "hero-title": {
      default: '把想法，<br><span class="accent-text">写成代码。</span>',
      minimal: '少一点，<br><span class="accent-text">做深一点。</span>',
      hacker: '编译想法，<br><span class="accent-text">输出作品。</span>'
    },
    "hero-lead": {
      default:
        "衡南一中编程社（HNYZ）是一个面向全校学生的极客技术社团，教学内容以 Arduino 为主线。我们从点亮第一颗 LED 开始，组队做项目、一起学习，把脑子里的点子变成真正能运行的作品。",
      minimal:
        "一个用硬件和代码做东西的社团。每周两小时，从点亮一颗 LED 开始，把想法做成能跑起来的东西。",
      hacker:
        "// 内核：Arduino + 一群人 + 每周 2h 的 commit。零基础可直接接入，不用 fork 别人的路子。"
    },
    "cta-primary": {
      default: '加入我们<span aria-hidden="true">→</span>',
      minimal: '加入<span aria-hidden="true">→</span>',
      hacker: 'join --now<span aria-hidden="true">→</span>'
    },
    "cta-secondary": {
      default: "看看我们的项目",
      minimal: "看项目",
      hacker: "ls ./projects"
    },
    "quick-title": {
      default: "先加群，<br>再一起做点东西。",
      minimal: "先加群，<br>再慢慢聊。",
      hacker: "ssh club@hnyz<br># 先握手，再动手"
    },
    "footer-tagline": {
      default: "把想法，写成代码。",
      minimal: "少一点，做深一点。",
      hacker: "// build · flash · ship"
    }
  };

  const root = document.documentElement;
  const nodes = Array.from(document.querySelectorAll("[data-copy]"));

  function apply(style) {
    nodes.forEach((el) => {
      const entry = COPY[el.dataset.copy];
      if (!entry) return;

      const next = entry[style] || entry.default;
      /* 只在内容真的变了才写，避免无谓的重排 */
      if (el.innerHTML.trim() !== next) el.innerHTML = next;
    });
  }

  apply(root.dataset.style || "default");

  document.addEventListener("hnyz:stylechange", (event) => {
    const style = event.detail && event.detail.style;
    apply(style || root.dataset.style || "default");
  });
})();
