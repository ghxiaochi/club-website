/* =========================================================
   HNYZ · 三套文案
   ---------------------------------------------------------
   同一块版面，三种说法，但三套都遵守同一条底线：说清楚。

     default  正常说话：一句一个意思，先结论后细节
     minimal  能两个字说完，不用三个字
     hacker   终端口吻：保留提示符和命令感，但信息必须读得懂

   HTML 里只写 data-copy="键名"，正文由这里统一替换，
   改文案不用翻四个页面。

   写文案的四条规则（新增文案请照做）：
     1. 一句话只讲一件事，超过 40 字就拆开；
     2. 术语第一次出现时，紧跟一句人话解释；
     3. 同一个事实只在一处展开，别处一句带过；
     4. 装饰性的英文标签可以留，但不能让它承担信息。
   ========================================================= */

(() => {
  "use strict";

  const COPY = {
    /* ---------- 首页 · 首屏 ---------- */
    "hero-eyebrow": {
      default: "HNYZ · 衡南一中学生编程社团",
      minimal: "HNYZ",
      hacker: "hnyz@club:~$ whoami"
    },
    "hero-title": {
      default: '把想法<br><span class="accent-text">写成代码</span>',
      minimal: '少<br><span class="accent-text">即是多</span>',
      hacker: '把想法<br><span class="accent-text">跑起来</span>'
    },
    "hero-lead": {
      default:
        "衡南一中编程社（HNYZ），全校学生都能参加。主线是 Arduino 硬件：从点亮第一颗 LED 开始，学会接线、写程序、查问题，再组队把一个小装置做出来。不需要任何基础。",
      minimal: "做硬件。零基础。能跑就行。",
      hacker:
        "衡南一中编程社，全校可加入。主线 Arduino：点亮 LED → 接线写程序 → 组队做出一个能跑的小装置。零基础直接进。"
    },
    "cta-primary": {
      default: '加入我们<span aria-hidden="true">→</span>',
      minimal: '加入<span aria-hidden="true">→</span>',
      hacker: '进群看看<span aria-hidden="true">→</span>'
    },
    "cta-secondary": {
      default: "看看我们的项目",
      minimal: "作品",
      hacker: "看看仓库"
    },
    "quick-title": {
      default: "先加群<br>再一起做点东西",
      minimal: "加群",
      hacker: "先加群<br>再动手"
    },

    /* ---------- 首页 · 各区块 ---------- */
    "about-title": {
      minimal: "做东西",
      hacker: "关于社团<br>一句话说完"
    },
    "about-intro": {
      default:
        "我们做真东西：一个校园小工具、一段硬件程序，或者纯粹好玩的装置。做完比完美重要。",
      minimal: "做真东西。",
      hacker: "// 只做能跑的东西：校园小工具、硬件程序，或者纯粹好玩。"
    },
    "about-p1": {
      default:
        "社团围绕 Arduino 展开。成员里有写代码的、接电路的、画界面的，也有刚让第一颗 LED 亮起来的新同学。",
      minimal: "面向全校。用 Arduino 做东西。",
      hacker:
        "// 主线 Arduino。成员有写程序的、接电路的、画界面的，也有刚点亮第一颗 LED 的。"
    },
    "about-p2": {
      default:
        "不要求你先会写代码，也不要求带着完整项目来。每周把手上那件事往前推一点，卡住了就在群里问。",
      minimal: "不用先会。边做边学。",
      hacker: "// 不设门槛：不会写代码可以来，没有项目也可以来。每周把手上那件事推进一步。"
    },
    "about-quote": {
      default: "先做一个能跑起来的小东西，再慢慢把它做好。",
      minimal: "先能跑，再做好。",
      hacker: "// 先让它跑起来，再让它变好。"
    },
    "quick-note": {
      default: "加群请备注「班级 + 姓名」。零基础、非技术方向的同学都欢迎。",
      minimal: "备注班级 + 姓名。",
      hacker: "// 加群备注「班级 + 姓名」。零基础、非技术方向都欢迎。"
    },
    "doing-title": {
      minimal: "从零<br>到一",
      hacker: "从第一行代码<br>到第一个作品"
    },
    "doing-intro": {
      default:
        "会多少都能找到位置：写程序、接电路、做结构、写文档、拍照片，都算参与。",
      minimal: "一步一步。",
      hacker: "// 写程序、接电路、做结构、写文档、拍照片，都算参与。"
    },
    "projects-title": {
      minimal: "作品。",
      hacker: "仓库里的<br>东西"
    },
    "projects-intro": {
      default:
        "这里是我们开源的仓库，描述、语言和 star 都直接读 GitHub。想立刻看到最新状态，点右上角的刷新按钮。首页放 6 个，更多在「全部项目」里按成员分组。",
      minimal: "在 GitHub 上。",
      hacker:
        "// 仓库描述、语言、star 都从 GitHub 读。要最新数据，点右上角刷新；首页 6 个，其余按成员归档。"
    },
    "schedule-title": {
      minimal: "每周两次",
      hacker: "每周两次<br>每次一小时"
    },
    "schedule-intro": {
      default:
        "每周两次，每次 60 分钟：一次讲一个小主题，讲完就结对动手；一次带来自己的项目，集中解决问题。时间地点在 QQ 群公告，考试周会减量。",
      minimal: "一次分享，一次写。",
      hacker:
        "// 每周 2 次 × 60 分钟：一次讲 + 结对，一次自由开发 + 排错。时间地点看群公告，考试周减量。"
    },
    "wall-title": {
      minimal: "入口",
      hacker: "学习入口<br>都在这里"
    },
    "wall-intro": {
      default:
        "不知道从哪开始，就点下面的链接。C++ 语法看菜鸟教程，ESP32 看微雪 Wiki，Arduino 的函数和示例查官方文档。",
      minimal: "从这进。",
      hacker: "// C++ 语法看菜鸟教程，ESP32 看微雪 Wiki，函数和示例查 Arduino 官方文档。"
    },
    "faq-title": {
      minimal: "问题",
      hacker: "加入之前<br>先看这几条"
    },
    "guestbook-title": {
      minimal: "留言",
      hacker: "留一句话<br>给下一个人"
    },
    "guestbook-note": {
      default: "留言用 GitHub 账号发表，存在仓库的 Discussions 里。不设匿名，也没有第三方服务器。",
      minimal: "GitHub 账号发表，存进 Discussions。",
      hacker: "// 用 GitHub 账号发表，存在仓库的 Discussions 里。没有匿名，也没有第三方服务器。"
    },
    "join-title": {
      minimal: "加入",
      hacker: "下一次活动<br>来坐坐"
    },
    "join-lead": {
      default:
        "不限年级和班级，零基础也欢迎。先进群看看大家在做什么，再决定要不要一起做点什么。",
      minimal: "零基础也行。",
      hacker: "// 不限年级和班级，零基础也欢迎。先进群看看，再决定要不要一起做。"
    },
    "footer-tagline": {
      default: "把想法，写成代码。",
      minimal: "少即是多。",
      hacker: "// 把想法写成代码，再让它跑起来"
    },

    /* ---------- 全部项目页 ---------- */
    "archive-eyebrow": {
      minimal: "项目",
      hacker: "~/repos 目录"
    },
    "archive-title": {
      minimal: "全部项目<br>按成员分组",
      hacker: "全部项目<br>按人分组"
    },
    "archive-intro": {
      default: "按成员分组，点开谁就加载谁的项目。人再多，页面也不会一次铺满。",
      minimal: "一人一组。点开再看。",
      hacker: "// 一个成员一组，展开才加载。人再多也不会一次铺满。"
    },
    "archive-back": {
      minimal: '<span aria-hidden="true">←</span> 回去',
      hacker: '← 回首页项目区'
    },
    "archive-join": {
      minimal: "加入",
      hacker: "加入我们"
    },
    "archive-foot-note": {
      default:
        "想把自己的仓库放进来？在群里发 GitHub 链接就行；自己动手的话，改 <code>js/members.js</code> 里的 <code>HNYZ_MEMBERS</code> 数组。",
      minimal: "想上榜？发链接。",
      hacker:
        "// 想把仓库加进来：群里发 GitHub 链接；自己改的话，动 js/members.js 里的 HNYZ_MEMBERS。"
    },
    "archive-foot-link": {
      minimal: "加入",
      hacker: "加入我们"
    },

    /* ---------- 图集页 ---------- */
    "gallery-eyebrow": {
      minimal: "图集",
      hacker: "~/hnyz/gallery"
    },
    "gallery-title": {
      minimal: "图集",
      hacker: "梗图和<br>社团日常"
    },
    "gallery-intro": {
      default: "群里传的梗图，和随手拍的社团日常。点开看大图，左右方向键翻页。",
      minimal: "点开看。",
      hacker: "// 群里的梗图，和社团日常。点开看大图，方向键翻页。"
    },
    "gallery-back": {
      minimal: '<span aria-hidden="true">←</span> 回去',
      hacker: '← 回首页资源墙'
    },
    "gallery-join": {
      minimal: "加入",
      hacker: "加入我们"
    },
    "gallery-foot-note": {
      default:
        "想加图？把文件放进 <code>images/gallery/</code>，再到 <code>js/gallery-data.js</code> 里加一条。",
      minimal: "放文件，加一行。",
      hacker:
        "// 想加图：文件放进 images/gallery/，在 js/gallery-data.js 追加一条。"
    },
    "gallery-foot-link": {
      minimal: "加入",
      hacker: "加入我们"
    },

    /* ---------- 成员页 ---------- */
    "member-eyebrow": {
      minimal: "作品",
      hacker: "这个成员的仓库"
    },
    "member-github": {
      minimal: "GitHub",
      hacker: "打开 GitHub ↗"
    },
    "member-back": {
      minimal: "← 返回",
      hacker: "← 回全部项目"
    },
    "member-desc-fallback": {
      minimal: "无。",
      hacker: "// 这个成员还没有写简介"
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
