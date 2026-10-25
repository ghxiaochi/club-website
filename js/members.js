/* =========================================================
   HNYZ · 衡南一中编程社 — 项目清单
   ---------------------------------------------------------
   新增成员或项目时，只需要改这个文件。
   字段说明：
   user     GitHub 用户名 / 组织名
   repo     仓库名
   coverImg 封面图路径；留空则自动生成科技网格占位图
   title    卡片上显示的项目名
   desc     本地简介，GitHub 仓库没写简介时兜底
   language 语言名，GitHub API 不可用时用于降级显示
   ========================================================= */

window.HNYZ_MEMBERS = [
  {
    user: "ghxiaochi",
    repo: "club-website",
    coverImg: "images/project-website.svg",
    title: "社团官网 HNYZ",
    desc: "HNYZ 社团官网：纯手写 HTML / CSS / JavaScript，部署在 GitHub Pages，用 GitHub API 实时展示社团仓库。",
    language: "CSS"
  },
  {
    user: "ghxiaochi",
    repo: "zaco-guess-number",
    coverImg: "images/project-zaco.svg",
    title: "Zaco 猜数字",
    desc: "运行在 Arduino 上的猜数字小游戏，练习随机数、循环、串口交互和 C++ 基础语法。",
    language: "C++"
  },
  {
    user: "ghxiaochi",
    repo: "led",
    coverImg: "",
    title: "LED 硬件实验",
    desc: "从点亮第一颗 LED 开始，练习 GPIO、基础电路和嵌入式程序结构。",
    language: "C++"
  },
  {
    user: "vveyin",
    repo: "DrawFunc",
    coverImg: "images/project-drawfunc.svg",
    title: "DrawFunc 手表函数绘图",
    desc: "为 Android 11 手表写的开源函数绘图 App：支持显函数、极坐标、参数方程和隐函数，适配圆屏与旋转表冠。",
    language: "Kotlin"
  }
];

/* =========================================================
   成员主页横幅（projects.html 折叠面板顶部展示）
   ---------------------------------------------------------
   key 必须和上面 HNYZ_MEMBERS 里的 user 一致才会显示；
   不想展示横幅的成员删掉对应键即可。
   kicker / title / desc  卡片文案
   link                   GitHub 主页等外链（留空不显示按钮）
   sprites                装饰贴图列表；modifier 是 CSS 修饰类
   ========================================================= */

window.HNYZ_PROFILES = {
  ghxiaochi: {
    kicker: "MEMBER_PAGE // 2026–2027",
    title: "ghxiaochi 的主页",
    desc: "社团官网维护 · 把想法写成代码。下面的项目都是我的仓库。",
    link: "https://github.com/ghxiaochi",
    sprites: [
      { src: "images/personal/sticker-2.webp", modifier: "member-chibi--a" },
      { src: "images/personal/sticker-3.webp", modifier: "member-chibi--b" },
      { src: "images/personal/sticker-4.webp", modifier: "member-chibi--c" }
    ]
  }
};

