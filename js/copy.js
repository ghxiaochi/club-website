/* =========================================================
   HNYZ · 两套文案
   ---------------------------------------------------------
   同一块版面，两种说法，但两套都遵守同一条底线：说清楚。

     default  正常说话：一句一个意思，先结论后细节
     hacker   终端口吻：密度高、带点自负，用术语讲同一件事
              （2026-11-04 之前那版，标题「把混沌编译成秩序」）

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
      hacker: "whoami --verbose"
    },
    "hero-title": {
      default: '把想法<br><span class="accent-text">写成代码</span>',
      hacker: '把混沌<br><span class="accent-text">编译成秩序</span>'
    },
    "hero-lead": {
      default:
        "衡南一中编程社（HNYZ），全校学生都能参加。主线是 Arduino 硬件：从点亮第一颗 LED 开始，学会接线、写程序、查问题，再组队把一个小装置做出来。不需要任何基础。",
      hacker:
        "// 我们不提供「教学」，只做接口对齐。Arduino 只是最低限度的语法糖；真正的命题，是在 0 与 1 的缝隙里重新定义「可被运行」。零基础不过是一份尚未编译的源文件，链接器会处理剩下的事。"
    },
    "cta-primary": {
      default: '加入我们<span aria-hidden="true">→</span>',
      hacker: '对齐意图<span aria-hidden="true">→</span>'
    },
    "cta-secondary": {
      default: "看看我们的项目",
      hacker: "cat ./manifest"
    },
    "quick-title": {
      default: "先加群<br>再一起做点东西",
      hacker: "ssh club@hnyz<br># 先握手 再动手"
    },

    /* ---------- 首页 · 各区块 ---------- */
    "about-title": {
      hacker: "关于我们<br>一段可执行的自述"
    },
    "about-intro": {
      default:
        "我们做真东西：一个校园小工具、一段硬件程序，或者纯粹好玩的装置。做完比完美重要。",
      hacker: "// 我们不维护「兴趣」，只维护依赖：好奇心是入口，作品是唯一可观测的输出。其余讨论，一律视为未提交的缓存。"
    },
    "about-p1": {
      default:
        "社团围绕 Arduino 展开。成员里有写代码的、接电路的、画界面的，也有刚让第一颗 LED 亮起来的新同学。",
      hacker:
        "// HNYZ 是一个面向全校的技术社团，主线是 Arduino：把抽象的电信号压成可观测的行为。成员构成跨专业，从写代码到焊板子，接口各不相同。"
    },
    "about-p2": {
      default:
        "不要求你先会写代码，也不要求带着完整项目来。每周把手上那件事往前推一点，卡住了就在群里问。",
      hacker: "// 不设前置依赖。不会写代码不是阻塞项，没有完整项目也不是。我们只要求一件事：每周把手上那条分支往前推一点。"
    },
    "about-quote": {
      default: "先做一个能跑起来的小东西，再慢慢把它做好。",
      hacker: "// 先让它跑起来，再让它值得被运行。"
    },
    "quick-note": {
      default: "加群请备注「班级 + 姓名」。零基础、非技术方向的同学都欢迎。",
      hacker: "// 加群请备注「班级 + 姓名」。零基础与非技术方向同样开放，准入不设白名单。"
    },
    "doing-title": {
      hacker: "从第一行<br>到可运行"
    },
    "doing-intro": {
      default:
        "会多少都能找到位置：写程序、接电路、做结构、写文档、拍照片，都算参与。",
      hacker: "// 不假设初始状态。任何人以任意版本接入，我们在同一条流水线上做增量编译；角色不是分工，是接口。"
    },
    "projects-title": {
      hacker: "所有产出<br>皆有 commit"
    },
    "projects-intro": {
      default:
        "这里是我们开源的仓库，描述、语言和 star 都直接读 GitHub。想立刻看到最新状态，点右上角的刷新按钮；完整列表按成员分组，最后一张卡就是入口。",
      hacker:
        "// 仓库是唯一可信的叙事。元数据由每日构建的静态快照喂给页面，API 只在前者缺失时兜底；首页暴露前 6 个入口，其余按作者归档，等待被索引。"
    },
    "schedule-title": {
      hacker: "每周 2 × 1h<br>固定调度"
    },
    "schedule-intro": {
      default:
        "每周两次，每次 60 分钟：一次讲一个小主题，讲完就结对动手；一次带来自己的项目，集中解决问题。时间地点在 QQ 群公告，考试周会减量。",
      hacker:
        "// 两个固定窗口：一次对齐上下文，一次消解阻塞。时间盒是硬约束，产出可以软着陆；具体时区与物理坐标以群公告为准。"
    },
    "wall-title": {
      hacker: "外部依赖<br>已列入白名单"
    },
    "wall-intro": {
      default:
        "不知道从哪开始，就点下面的链接。C++ 语法看菜鸟教程，ESP32 看微雪 Wiki，Arduino 的函数和示例查官方文档。",
      hacker: "// 不重复造文档。语法层交给菜鸟教程，硬件层指向微雪 Wiki；其余入口按需增量接入，不做无意义的镜像。"
    },
    "faq-title": {
      hacker: "接入之前<br>先读文档"
    },
    "guestbook-title": {
      hacker: "把评论<br>提交到 upstream"
    },
    "guestbook-note": {
      default: "留言用 GitHub 账号发表，存在仓库的 Discussions 里。不设匿名，也没有第三方服务器。没有账号也能留，下面写了办法。",
      hacker: "// 无匿名、无中间层。每条评论都是仓库里的一条 discussion，删库才会消失。"
    },
    "join-title": {
      hacker: "下一次调度<br>留了你的位置"
    },
    "join-lead": {
      default:
        "不限年级和班级，零基础也欢迎。先进群看看大家在做什么，再决定要不要一起做点什么。",
      hacker: "// 不限年级与初始版本。零基础只是一份未编译的源文件；先进群观察一轮，再决定是否把 fork 指向这里。"
    },
    "footer-tagline": {
      default: "把想法，写成代码。",
      hacker: "// 一切可运行的，都值得被重写"
    },

    /* ---------- 全部项目页 ---------- */
    "archive-eyebrow": {
      hacker: "find ./projects -maxdepth 2"
    },
    "archive-title": {
      hacker: "所有仓库<br>皆可追溯"
    },
    "archive-intro": {
      default: "按成员分组，点开谁就加载谁的项目。",
      hacker: "// 归档不做分页。每个成员是一个命名空间，展开才拉取远端索引；仓库数量继续膨胀，首屏也不会被一次性渲染拖垮。"
    },
    "archive-back": {
      hacker: "cd ../home"
    },
    "archive-join": {
      hacker: "sudo join"
    },
    "archive-foot-note": {
      default:
        "想把自己的仓库放进来？在群里发 GitHub 链接就行；自己动手的话，改 <code>js/members.js</code> 里的 <code>HNYZ_MEMBERS</code> 数组。",
      hacker:
        "// 想把自己的仓库并入索引？在群里丢一个远端地址，或者直接改 js/members.js 里的 HNYZ_MEMBERS。"
    },
    "archive-foot-link": {
      hacker: "sudo join"
    },

    /* ---------- 图集页 ---------- */
    "gallery-eyebrow": {
      hacker: "ls -la ~/hnyz/gallery"
    },
    "gallery-title": {
      hacker: "未索引的<br>视觉残留"
    },
    "gallery-intro": {
      default: "群里传的梗图，和随手拍的社团日常。点开看大图，左右方向键翻页。",
      hacker: "// 群聊里的像素碎片，和社团现场的侧写。点击进入全屏上下文，方向键切换相邻节点。"
    },
    "gallery-back": {
      hacker: "cd ../wall"
    },
    "gallery-join": {
      hacker: "sudo join"
    },
    "gallery-foot-note": {
      default:
        "想加图？把文件放进 <code>images/gallery/</code>，再到 <code>js/gallery-data.js</code> 里加一条。",
      hacker:
        "// 投稿：把文件放进 images/gallery/，在 js/gallery-data.js 追加一条记录。合并前请先 rebase。"
    },
    "gallery-foot-link": {
      hacker: "sudo join"
    },

    /* ---------- 成员页 ---------- */
    "member-eyebrow": {
      hacker: "gh repo list --author"
    },
    "member-github": {
      hacker: "./open --github"
    },
    "member-back": {
      hacker: "cd ../projects"
    },
    "member-desc-fallback": {
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
