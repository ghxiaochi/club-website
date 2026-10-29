/* =========================================================
   HNYZ · 三套文案
   ---------------------------------------------------------
   同一块版面，三种说法：
     default  说人话，但把话说得讲究一点
     minimal  极简：能两个字说完，不用三个字
     hacker   终端口吻，术语堆到看不懂，读完只觉得这人很装
   HTML 里只写 data-copy="键名"，正文由这里统一替换，
   改文案不用翻四个页面。
   ========================================================= */

(() => {
  "use strict";

  const COPY = {
    /* ---------- 首页 · 首屏 ---------- */
    "hero-eyebrow": {
      default: "HNYZ // 衡南一中 · 学生编程社团",
      minimal: "HNYZ",
      hacker: "whoami --verbose"
    },
    "hero-title": {
      default: '把想法<br><span class="accent-text">写成代码</span>',
      minimal: '少<br><span class="accent-text">即是多</span>',
      hacker: '把混沌<br><span class="accent-text">编译成秩序</span>'
    },
    "hero-lead": {
      default:
        "衡南一中编程社（HNYZ）是一个以 Arduino 为主线的高中技术社团。我们不生产课件，只维护一套可以反复失败的实验环境：从点亮第一颗 LED，到让一整台设备跑起来，中间那些没人讲清楚的部分，我们一件件拆开看。",
      minimal:
        "做硬件。删到最少。能跑就行。",
      hacker:
        "// 我们不提供「教学」，只做接口对齐。Arduino 只是最低限度的语法糖；真正的命题，是在 0 与 1 的缝隙里重新定义「可被运行」。零基础不过是一份尚未编译的源文件，链接器会处理剩下的事。"
    },
    "cta-primary": {
      default: '加入我们<span aria-hidden="true">→</span>',
      minimal: '加入<span aria-hidden="true">→</span>',
      hacker: '对齐意图<span aria-hidden="true">→</span>'
    },
    "cta-secondary": {
      default: "看看我们的项目",
      minimal: "作品",
      hacker: "cat ./manifest"
    },
    "quick-title": {
      default: "先加群<br>再一起做点东西",
      minimal: "加群",
      hacker: "ssh club@hnyz<br># 先握手 再动手"
    },

    /* ---------- 首页 · 各区块 ---------- */
    "about-title": {
      minimal: "做东西",
      hacker: "关于我们<br>一段可执行的自述"
    },
    "about-intro": {
      minimal: "仅此。",
      hacker:
        "// 我们不维护「兴趣」，只维护依赖：好奇心是入口，作品是唯一可观测的输出。其余讨论，一律视为未提交的缓存。"
    },
    "about-p1": {
      minimal: "面向全校。用 Arduino 做东西。",
      hacker:
        "// HNYZ 是一个面向全校的技术社团，主线是 Arduino：把抽象的电信号压成可观测的行为。成员构成跨专业，从写代码到焊板子，接口各不相同。"
    },
    "about-p2": {
      minimal: "不用先会。边做边学。",
      hacker:
        "// 不设前置依赖。不会写代码不是阻塞项，没有完整项目也不是。我们只要求一件事：每周把手上那条分支往前推一点。"
    },
    "about-quote": {
      minimal: "先能跑，再做好。",
      hacker: "// 先让它跑起来，再让它值得被运行。"
    },
    "quick-note": {
      minimal: "备注班级 + 姓名。",
      hacker:
        "// 加群请备注「班级 + 姓名」。零基础与非技术方向同样开放，准入不设白名单。"
    },
    "doing-title": {
      minimal: "从零<br>到一",
      hacker: "从第一行<br>到可运行"
    },
    "doing-intro": {
      minimal: "一步一步。",
      hacker:
        "// 不假设初始状态。任何人以任意版本接入，我们在同一条流水线上做增量编译；角色不是分工，是接口。"
    },
    "projects-title": {
      minimal: "作品。",
      hacker: "所有产出<br>皆有 commit"
    },
    "projects-intro": {
      minimal: "在 GitHub 上。",
      hacker:
        "// 仓库是唯一可信的叙事。元数据由 API 实时拉取，本地缓存只负责降级；首页暴露前 6 个入口，其余按作者归档，等待被索引。"
    },
    "schedule-title": {
      minimal: "每周两次",
      hacker: "每周 2 × 1h<br>固定调度"
    },
    "schedule-intro": {
      minimal: "一次分享，一次写。",
      hacker:
        "// 两个固定窗口：一次对齐上下文，一次消解阻塞。时间盒是硬约束，产出可以软着陆；具体时区与物理坐标以群公告为准。"
    },
    "wall-title": {
      minimal: "入口",
      hacker: "外部依赖<br>已列入白名单"
    },
    "wall-intro": {
      minimal: "从这进。",
      hacker:
        "// 不重复造文档。语法层交给菜鸟教程，硬件层指向微雪 Wiki；其余入口按需增量接入，不做无意义的镜像。"
    },
    "faq-title": {
      minimal: "问题",
      hacker: "接入之前<br>先读文档"
    },
    "join-title": {
      minimal: "来",
      hacker: "下一次调度<br>留了你的位置"
    },
    "join-lead": {
      minimal: "零基础也行。",
      hacker:
        "// 不限年级与初始版本。零基础只是一份未编译的源文件；先进群观察一轮，再决定是否把 fork 指向这里。"
    },
    "footer-tagline": {
      default: "把想法，写成代码。",
      minimal: "少即是多。",
      hacker: "// 一切可运行的，都值得被重写"
    },

    /* ---------- 全部项目页 ---------- */
    "archive-eyebrow": {
      minimal: "项目",
      hacker: "find ./projects -maxdepth 2"
    },
    "archive-title": {
      minimal: "项目区",
      hacker: "所有仓库<br>皆可追溯"
    },
    "archive-intro": {
      minimal: "一人一组。点开再看。",
      hacker:
        "// 归档不做分页。每个成员是一个命名空间，展开才拉取远端索引；仓库数量继续膨胀，首屏也不会被一次性渲染拖垮。"
    },
    "archive-back": {
      minimal: '<span aria-hidden="true">←</span> 回去',
      hacker: "cd ../home"
    },
    "archive-join": {
      minimal: "加入",
      hacker: "sudo join"
    },
    "archive-foot-note": {
      minimal: "想上榜？发链接。",
      hacker:
        "// 想把自己的仓库并入索引？在群里丢一个远端地址，或者直接改 js/members.js 里的 HNYZ_MEMBERS。"
    },
    "archive-foot-link": {
      minimal: "加入",
      hacker: "sudo join"
    },

    /* ---------- 图集页 ---------- */
    "gallery-eyebrow": {
      minimal: "图集",
      hacker: "ls -la ~/hnyz/gallery"
    },
    "gallery-title": {
      minimal: "图",
      hacker: "未索引的<br>视觉残留"
    },
    "gallery-intro": {
      minimal: "点开看。",
      hacker:
        "// 群聊里的像素碎片，和社团现场的侧写。点击进入全屏上下文，方向键切换相邻节点。"
    },
    "gallery-back": {
      minimal: '<span aria-hidden="true">←</span> 回去',
      hacker: "cd ../wall"
    },
    "gallery-join": {
      minimal: "加入",
      hacker: "sudo join"
    },
    "gallery-foot-note": {
      minimal: "放文件，加一行。",
      hacker:
        "// 投稿：把文件放进 images/gallery/，在 js/gallery-data.js 追加一条记录。合并前请先 rebase。"
    },
    "gallery-foot-link": {
      minimal: "加入",
      hacker: "sudo join"
    },

    /* ---------- 成员页 ---------- */
    "member-eyebrow": {
      minimal: "作品",
      hacker: "gh repo list --author"
    },
    "member-github": {
      minimal: "GitHub",
      hacker: "./open --github"
    },
    "member-back": {
      minimal: "← 返回",
      hacker: "cd ../projects"
    },
    "member-desc-fallback": {
      minimal: "无。",
      hacker: "// 404: bio not found"
    }
  };

  const root = document.documentElement;
  const nodes = Array.from(document.querySelectorAll("[data-copy]"));

  /* 记住 HTML 里的原文：某种风格没写文案时，就退回这一份，
     这样新增页面时不用把默认文案再抄一遍 */
  const original = new Map();
  nodes.forEach((el) => original.set(el, el.innerHTML));

  function apply(style) {
    nodes.forEach((el) => {
      const entry = COPY[el.dataset.copy];
      if (!entry) return;

      const next = entry[style] || original.get(el);
      if (typeof next !== "string") return;

      /* 只在内容真的变了才写，避免无谓的重排 */
      if (el.innerHTML.trim() !== next) el.innerHTML = next;
    });
  }

  window.HNYZ_COPY = { apply };
  apply(root.dataset.style || "default");

  document.addEventListener("hnyz:stylechange", (event) => {
    const style = event.detail && event.detail.style;
    apply(style || root.dataset.style || "default");
  });
})();
