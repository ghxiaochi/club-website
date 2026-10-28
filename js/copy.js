/* =========================================================
   HNYZ · 三套文案
   ---------------------------------------------------------
   同一块版面，三种说法：
     default  说人话，但把话说得讲究一点
     minimal  极简：句子短，语气冷，留白比字多
     hacker   终端口吻，术语堆到看不懂，读完只觉得这人很装
   HTML 里只写 data-copy="键名"，正文由这里统一替换，
   改文案不用翻四个页面。
   ========================================================= */

(() => {
  "use strict";

  const COPY = {
    "hero-eyebrow": {
      default: "HNYZ // 衡南一中 · 学生编程社团",
      minimal: "HNYZ · 一个做减法的容器",
      hacker: "whoami --verbose"
    },
    "hero-title": {
      default: '把想法，<br><span class="accent-text">写成代码。</span>',
      minimal: '少即是，<br><span class="accent-text">全部。</span>',
      hacker: '把混沌，<br><span class="accent-text">编译成秩序。</span>'
    },
    "hero-lead": {
      default:
        "衡南一中编程社（HNYZ）是一个以 Arduino 为主线的高中技术社团。我们不生产课件，只维护一套可以反复失败的实验环境：从点亮第一颗 LED，到让一整台设备跑起来，中间那些没人讲清楚的部分，我们一件件拆开看。",
      minimal:
        "我们用减法做硬件。删到只剩必要的那一行，它就自己跑起来了——多余的装饰、多余的解释，都在编译期被优化掉。",
      hacker:
        "// 我们不提供「教学」，只做接口对齐。Arduino 只是最低限度的语法糖；真正的命题，是在 0 与 1 的缝隙里重新定义「可被运行」。零基础不过是一份尚未编译的源文件，链接器会处理剩下的事。"
    },
    "cta-primary": {
      default: '加入我们<span aria-hidden="true">→</span>',
      minimal: '进入<span aria-hidden="true">→</span>',
      hacker: '对齐意图<span aria-hidden="true">→</span>'
    },
    "cta-secondary": {
      default: "看看我们的项目",
      minimal: "看作品",
      hacker: "cat ./manifest"
    },
    "quick-title": {
      default: "先加群，<br>再一起做点东西。",
      minimal: "先同频，<br>再谈别的。",
      hacker: "先握手，<br>再谈拓扑。"
    },
    "footer-tagline": {
      default: "把想法，写成代码。",
      minimal: "减法，是唯一诚实的语法。",
      hacker: "// 一切可运行的，都值得被重写"
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
