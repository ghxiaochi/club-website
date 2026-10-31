# HNYZ · 衡南一中编程社官网

一个纯静态的社团官网：**HTML + CSS + 原生 JavaScript**，没有后端、没有数据库、没有构建步骤。

整体是蓝白科技风：浅蓝底、白色卡片、深海军蓝文字。教学内容以 **Arduino 硬件编程**为主线。右下角有一个不署名的校徽，随页面滚动旋转，点击会说一句社团台词；「全部项目」页左下角还有 ghxiaochi 的像素头像彩蛋，点击若干次会出现隐藏台词。「全部项目」页的 ghxiaochi 分组顶部有个人主页横幅和三张贴纸；成员个人页里也有这只桌宠；独立「图集」页放着社团梗图；背景里还散着一层灰度小图标（校徽 / Arduino / token）缓慢浮动。项目卡片通过 **GitHub API** 读取仓库信息；首页展示前 6 个，完整列表在单独的「全部项目」页按成员折叠。遇到 403 限流、404 或网络异常会自动切换到本地缓存或降级卡片。

- **线上地址**：<https://hnyzbcs.de5.net/>（自定义域名，`ghxiaochi.github.io/club-website/` 会 301 过来）
- **仓库地址**：<https://github.com/ghxiaochi/club-website>
- **QQ 群**：`1098931492`
- **邮箱**：`483677268@qq.com`

---

## 1. 页面内容

- **首屏**：HNYZ 品牌、`把想法，写成代码。`、每周两次 / 每次一小时、QQ 群 / 邮箱快捷复制
- **关于社团**：社团介绍、基本信息、活动频率
- **我们做什么**：Arduino 入门、硬件项目实战、程序与调试、分享与协作
- **项目展示**：首页展示 `members` 前 6 个仓库，渲染 16:9 封面卡片；更多项目跳转到 `projects.html`
- **活动节奏**：每周两次、每次 60 分钟，以及一次活动的流程
- **资源墙**：C++ 菜鸟教程、微雪 ESP32 Wiki
- **成员个人页**（`member.html?u=用户名`）：每个成员一个独立页面，横幅、简介、个性色（`HNYZ_PROFILES` 里的 `accent`）和 TA 的项目都在这里；「全部项目」页每个分组右侧有「个人主页 ↗」入口；页面左下角有桌宠，简介里点「（这里有一句话被涂掉了）」会露出彩蛋文案（`HNYZ_PROFILES` 的 `secret` 字段）
- **Animdustry 角色排**：「全部项目」页顶部按游戏源码复刻了那一排小人——`#accce3 / #57639a` 斜条纹背景、8 个角色（全部解锁）站在深色地台上，贴图里烘焙了一层黑色描边。交互照搬游戏：**鼠标扫过依次跳一下**（`unit.jumping`，手机上手指划过同样会跳），音高不绑在「第几个小人」上，而是跟着指针的水平位置走——从左到右滑过整排会连续走完一条大调音阶（1.00 → 2.00 倍，刚好一个八度），滑得再快也不会漏音（触控板横向滑动同样有效）；**右键压扁并换「挨打」表情**（音高也跟着角色所在位置走）；**左键打开角色卡**——和游戏一样：人物先以约 1.75 倍出现、2.8 秒内缩到正常，全程上下浮动（背景光晕也跟着浮），先整体高亮再慢慢降回正常，标题/副标题用的是游戏原版像素字体（`fonts/anim-title.ttf` / `anim-pixel.ttf`）。开场背景按 `units.nim` 的绘制顺序重画，bloom 气泡带亮边和高光，线条与暗角也做了分层。音效同样是游戏原版的
- **图集**（独立页 `gallery.html`）：瀑布流照片墙，可按梗图 / 社团筛选，点击开灯箱，← → 翻页、Esc 关闭；入口在首页最下方（加入区之后），一条细长长的横条
- **常见问题**：原生 `<details>` FAQ
- **加入我们**：QQ 群、邮箱、三步加入流程

### 项目卡片结构

从上到下：

1. **16:9 封面**：`coverImg` 有值就显示图片，`object-fit: cover`；为空显示科技网格占位图
2. **标题 + 所有者**：粗体亮色项目名，灰色 `@用户名`
3. **简介**：最多 3 行，超出显示省略号
4. **底部数据栏**：等宽字体展示 `LANG / 🌟 Stars / 🍴 Forks`
5. **查看源码**：带边框的科技风按钮

卡片 Hover 时边框变科技蓝，出现柔和的蓝色投影，并轻微上浮。

---

## 2. 文件结构

```text
club-website/
├── index.html              # 首页
├── projects.html           # 全部项目页（按成员折叠）
├── gallery.html            # 图集页（瀑布流 + 灯箱）
├── member.html             # 成员页
├── dino.html               # 天梯页：可玩的小恐龙 + 排行榜
├── 404.html                # 终端风 404（Pages 找不到路径时返回，站内任意深度都能用）
├── manifest.webmanifest    # PWA 清单（名称、图标、快捷方式）
├── sw.js                   # Service Worker：页面网络优先、资源缓存优先
├── css/
│   ├── style.css           # 全站样式（蓝白科技风）
│   ├── personal.css        # 深色主题、动效、彩蛋样式（在 style.css 之后加载）
│   ├── skins.css           # 四套网页风格（默认 / 极简 / 黑客 / 棍木）的皮肤层
│   ├── dino.css            # 页脚小恐龙跑道、日间/夜间配色
│   ├── type.css            # 三套风格的字体栈（标题衬线 / 等宽 / 几何无衬线；棍木只有一行灰字）
│   ├── motion.css          # 弹性动效层（统一回弹曲线，最后加载）
│   ├── pet.css             # 右下角校徽背景板样式
│   ├── avatar-pet.css      # 左下角像素头像彩蛋样式
│   ├── characters.css      # 音游角色舞台与立绘
│   ├── guestbook.css       # 留言板外框（终端风的标题条、等待态、降级文案）
│   └── ladder.css          # 天梯页两栏布局与榜单（刻意不用 clamp/inset，照顾旧内核）
├── assets/
│   └── moon-sun-sprite.png # 60 帧月亮/太阳雪碧图（3240×54）
├── fonts/                  # 游戏原版像素字体（来自 assets.7z）
│   ├── anim-title.ttf      # 大标题
│   └── anim-pixel.ttf      # 副标题 / 小字
├── audio/                  # 游戏原版音效（MP3 单声道，共约 104KB）
│   ├── jump / pat / hit    # 扫过跳一下 / 右键戳 / 未解锁
│   ├── back / view         # 关闭角色卡 / 打开角色卡的小曲
├── js/
│   ├── sfx.js              # 音效池与开关（跟随鼠标点击播放，可静音）
│   ├── members.js          # 项目清单 + 成员主页横幅配置（唯一需要手动维护的数据）
│   ├── main.js             # GitHub API、缓存、卡片渲染、折叠、交互
│   ├── gallery-data.js     # 图集清单（加图改这里）
│   ├── gallery.js          # 图集渲染与灯箱
│   ├── theme.js            # 深浅色主题切换与记忆
│   ├── skins.js            # 网页风格切换面板、竖向卡片、擦除转场、棍木的按钮搬运
│   ├── dino.js             # 页脚像素小恐龙（金币 / 连击 / 档位 / 星空）
│   ├── matrix.js           # 黑客风的数字雨（只在 hacker 皮肤下启动）
│   ├── copy.js             # 三套文案，按风格替换 data-copy 节点（棍木没有文案可换）
│   ├── theme-icon.js       # 主题按钮的月亮 / 太阳雪碧图帧动画
│   ├── personal.js         # 打字机标语、滚动渐显、卡片倾斜、彩蛋
│   ├── pet.js              # 校徽滚动旋转、点击说话
│   ├── avatar-pet.js       # 头像点击台词与彩蛋
│   ├── guestbook.js        # 留言板：滚动到附近才加载 giscus，并跟随皮肤换主题
│   ├── pwa.js              # Service Worker 注册（load 之后空闲时）
│   └── ladder.js           # 天梯：拉榜（远程→缓存→本地）、渲染、死亡后交成绩
├── data/
│   ├── repos.json          # 项目快照（每天由 GitHub Actions 重写，前端优先读它）
│   └── ladder-seed.json    # 天梯的内置对手（带 BOT 标签，不是真人成绩）
├── scripts/
│   ├── fetch-repos.mjs     # 抓取仓库数据 → data/repos.json
│   └── compat-fallback.mjs # 给 clamp/min/max/inset 补旧内核 fallback（幂等）
├── worker/
│   ├── ladder.js           # 天梯后端本体（Cloudflare Worker + KV）
│   ├── wrangler.toml       # 单独部署成 Worker 时才用：KV 绑定
│   └── dev-server.mjs      # 本地内存版后端，不用注册账号就能联调
├── functions/
│   └── api/ladder.js       # Pages Functions：把上面的后端挂到同域 /api/ladder（6 行）
├── .github/
│   └── workflows/
│       └── refresh-repos.yml  # 每天 05:17 跑一次上面的脚本
├── images/
│   ├── favicon.svg
│   ├── icon-192.png        # PWA 图标
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   ├── apple-touch-icon.png
│   ├── og-cover.jpg        # 1200×630 分享图（76KB，原来是 305KB 的 PNG）
│   ├── project-website.svg # 社团官网封面
│   ├── project-zaco.svg    # Zaco 猜数字封面
│   ├── characters/          # 角色素材
│   │   ├── art-*.webp       # 高精度立绘（结果页用，8 张约 400KB）
│   │   ├── unit-*.webp      # 像素站位图（游戏原版，每个 300B 左右）
│   │   ├── unit-alpha.webp  # 已解锁的 4 个 + 各自的 -hit 挨打帧
│   │   ├── unit-mono.webp
│   │   ├── unit-oct.webp
│   │   ├── unit-crawler.webp
│   │   └── unit-zenith / quad / oxynoe / sei.webp  # 未解锁角色
│   ├── decor/               # 背景图标（灰度、已去底）
│   │   ├── icon-badge.webp
│   │   ├── icon-arduino.webp
│   │   └── icon-token.webp
│   ├── gallery/             # 图集素材
│   │   ├── meme-cup.webp    # 梗图（已去底）
│   │   ├── meme-dizzy.webp
│   │   ├── meme-wink.webp
│   ├── personal/
│   │   ├── sticker-2.webp   # ghxiaochi 主页贴纸（已去底）
│   │   ├── sticker-3.webp
│   │   ├── sticker-4.webp
│   │   ├── chibi-1.jpg      # 早期贴纸（未再使用）
│   │   └── chibi-2.jpg      # ghxiaochi 主页贴纸
│   └── pet/
│       ├── badge-school-hd.webp  # 高清校徽
│       └── ghxiaochi-avatar.webp # 像素头像彩蛋
├── robots.txt
├── sitemap.xml
└── README.md
```

---

## 3. 开屏与首屏位置

打开首页时会先显示约 0.8 秒的开屏（`{ }` + HNYZ + 口号），同时脚本把页面**直接定位到「关于」这一块**，不做平滑滚动：

- 通过 `history.scrollRestoration = "manual"` 关掉浏览器的滚动位置恢复，避免刷新后停在页面底部
- 打开时会清掉 URL 里残留的 `#join` 之类锚点，防止一进来就跳到页尾
- 想改成打开时停在顶部首屏，把 `index.html` 里 `place()` 中的 `document.getElementById("about")` 换成 `null` 即可

## 4. 本地预览

### 方式 A：直接打开

双击 `index.html` 即可预览。GitHub API 支持跨域请求，通常可以直接加载；如果断网或 API 被限流，会显示本地兜底数据。

### 方式 B：本地服务器（推荐）

在站点根目录执行：

```bash
# Python 3
python3 -m http.server 8765

# 或 Node.js
npx serve .
```

然后访问 <http://127.0.0.1:8765/>。

---

## 5. 修改项目卡片

打开 `js/members.js`，只改 `window.HNYZ_MEMBERS` 数组：

```js
window.HNYZ_MEMBERS = [
  {
    user: "ghxiaochi",
    repo: "club-website",
    coverImg: "images/project-website.svg",
    title: "社团官网 HNYZ",
    desc: "HNYZ 社团官网：纯手写 HTML / CSS / JavaScript，部署在 GitHub Pages。",
    language: "CSS"
  },
  {
    user: "ghxiaochi",
    repo: "zaco-guess-number",
    coverImg: "images/project-zaco.svg",
    title: "Zaco 猜数字",
    desc: "运行在 Arduino 上的猜数字小游戏，练习随机数、循环和串口交互。",
    language: "C++"
  },
  {
    user: "ghxiaochi",
    repo: "led",
    coverImg: "",
    title: "LED 硬件实验",
    desc: "从点亮第一颗 LED 开始，练习 GPIO、基础电路和嵌入式程序结构。",
    language: "C++"
  }
];
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `user` | 是 | GitHub 用户名或组织名 |
| `repo` | 是 | 仓库名 |
| `coverImg` | 否 | 封面图 URL；可填 `images/xxx.svg` 或 `https://...`；留空显示科技网格占位 |
| `title` | 否 | 卡片上显示的中文名；不填就用仓库名 |
| `desc` | 否 | 本地简介；GitHub 仓库没写简介时用它兜底 |
| `language` | 否 | 语言名；GitHub API 不可用时用于降级显示 |

新增项目时，在数组里追加一项即可，卡片会按数组顺序渲染。

### 首页 6 个上限与「全部项目」页

- `members` **没有数量上限**，可以写很多人的很多仓库。
- 首页最多请求并展示前 6 个，避免一次消耗太多 GitHub API 配额；第 7 个开始会自动出现「查看全部 N 个项目」入口。
- `projects.html` 会按 `user`（GitHub 用户名）自动分组，每个成员是一个原生 `<details>` 折叠面板。
- 折叠面板**展开时才请求该组仓库**，不会一进页面就把 API 配额打满；第一组默认展开。
- 想调整首页数量，改 `js/main.js` 顶部的 `const HOME_LIMIT = 6;`。

### 封面图

- 推荐 16:9，例如 1600×900
- 本地图片放到 `images/`，`coverImg` 写相对路径
- 也可以直接用远程图片 URL
- 图片加载失败会自动替换成科技网格占位图，不会出现破图

---

## 6. 数据与异常兜底

首页使用 `Promise.all` 并发请求前 6 个仓库：

```js
const shown = members.slice(0, HOME_LIMIT);
const projects = await Promise.all(shown.map((member) => fetchRepo(member)));
```

全部项目页按成员分组，点开某一组时才请求该组：

```js
const projects = await Promise.all(list.map((member) => fetchRepo(member)));
```

本地 `desc` 优先于 GitHub 仓库自带的简介；只有两者都为空时，卡片才会显示「这个仓库还没有填写简介」。

每个请求内部处理异常，所以一个仓库失败不会影响其他卡片：

| 情况 | 处理 |
| --- | --- |
| `200` | 正常读取 `name / description / language / stargazers_count / forks_count / html_url` |
| `403` | 未登录 API 限流（60 次 / 小时 / IP）；优先使用本地缓存，没有缓存时显示降级卡片和提示 |
| `404` | 仓库不存在、改名或私有，显示 404 提示卡片 |
| 网络错误 | 优先使用本地缓存，没有缓存时显示降级卡片 |

项目区右侧的 `REPOS // GITHUB_API` 表示实时数据；出现 `DEGRADED` 表示用了兜底数据，页面顶部会出现黄色提示条。

为减少 GitHub API 限流影响，`js/main.js` 会把成功返回的仓库数据写入 `localStorage`，缓存 10 分钟（key：`hnyz:github-repo-cache:v1`）。同一浏览器 10 分钟内重复打开页面不会重复请求 API；缓存不可用时会自动忽略，不影响页面加载。

降级卡片只使用 `js/members.js` 里的本地字段（标题、简介、语言），不再维护第二份硬编码的 stars / forks 快照；数据未知时显示 `—`，避免展示过时数字。

---

## 7. 修改品牌 / 联系方式

全局搜索替换即可：

| 内容 | 出现位置 |
| --- | --- |
| `HNYZ` | `index.html`、`README.md`、封面 SVG |
| `1098931492` | `index.html` 中 `data-copy-value` 和文本 |
| `483677268@qq.com` | `index.html` 的 `mailto:` 和 `data-copy-value` |
| `ghxiaochi` | `index.html` 的 GitHub 链接、`js/members.js` 的 `HNYZ_MEMBERS` |

活动频率和每次 60 分钟在 `index.html` 里搜索 `每周 2 次` / `每周两次` / `60 MIN`，涉及首屏数据、社团信息、活动节奏和 FAQ。

资源墙链接在 `index.html` 的 `#wall` 区块中，直接改 `href` 即可。ESP32 目前指向微雪 ESP32-S3-DEV-KIT-N8R8 Wiki。

---

## 8. 音效

`js/sfx.js` 是一个小音效池：每个音效预载 1–3 个实例，轮着播，所以快速连点不会互相打断。素材是 Animdustry 原版 `assets/sounds` 与 `assets/music`，转成单声道 MP3（96kbps，iOS 也能放）后总共约 104KB，全部懒加载。

| 动作 | 音效 |
|---|---|
| 鼠标扫过角色 | `jump`（按站位升调） |
| 右键戳角色 | `pat`（按站位升调） |
| 点未解锁角色 | `hit` |
| 打开角色卡 | `view`（5 秒小曲，关闭时停止） |
| 关闭角色卡 | `back` |
| 敲墓碑 | `hit`（一下升一度） |
| 复活 | `get` |

浏览器要求先有用户操作才允许播声音，所以第一次点击之后才会出声。头部有一个喇叭按钮，可以全局静音，状态存在 `localStorage`（`hnyz:sound`）。

### 性能上做了什么

- 背景小图标等页面空闲（`requestIdleCallback`）再生成，数量 30 → 20，不抢首屏
- 抽卡结果页的放射线层从 220vmax 缩到 150vmax、转速减半
- 立绘等 `decode()` 完成再显示，且在空闲时预载，点开不卡
- 暴走、弹球期间自动暂停背景动画并关闭头部毛玻璃（见「个性化与彩蛋」）

## 9. 个性化与彩蛋

这一层由 `css/personal.css` + `js/theme.js` + `js/personal.js` 组成，**不改动 `style.css`**，删掉这三行引用即可完全回到原版。

| 功能 | 说明 | 位置 |
|---|---|---|
| 深浅色切换 | 首次访问跟随系统偏好；点击头部太阳/月亮按钮切换，选择存 `localStorage`（key：`hnyz:theme`）；页面 `<head>` 内联脚本负责首帧预置，避免刷新白闪 | `js/theme.js` |
| 打字机标语 | 首屏按当前时段问候（「晚上好，这里是衡南一中编程社。」），随后轮播社团口号 | `js/personal.js` |
| 滚动渐显 | 各区块、卡片进入视口时淡入上浮；`main.js` 动态渲染的项目卡片也会被 `MutationObserver` 捕获 | `js/personal.js` |
| 数字滚动 | 首屏 `data-count` 的统计数字从 0 滚到目标值 | `index.html` + `js/personal.js` |
| 全站光标光晕 | 一层 fixed 柔光跟随鼠标，覆盖所有板块；浅色用 multiply、深色用 screen，触屏和减少动效时关闭 | `js/personal.js` |
| 技术跑马灯 | 首屏下方的关键词带，自动复制到足够宽后按一组宽度循环，悬停暂停 | `js/personal.js` + `index.html` |
| 图集 / 灯箱 | 照片墙卡片 + 点击看大图，支持键盘 ← → 翻页、Esc 关闭、焦点回到原卡片 | `js/gallery.js` |
| 背景层 | body 多层柔光 + 点阵，加一层 fixed 光斑（静态，避免大尺寸动画在不同 GPU 上出现棋盘格） | `css/personal.css`
| 手账感 | 卡片轻微倾斜 + 顶部胶带、引言做成便签、主按钮带厚度 | `css/personal.css` |
| 首页贴纸 | 首屏关键词胶囊（#零基础友好 等），带轻微旋转 | `index.html` |
| 卡片 3D 倾斜 | 仅精确指针（鼠标）启用，触屏不触发 | `js/personal.js` |
| 连点 Logo | 2.6 秒内连点 5 次品牌区，弹出一条随机台词 | `js/personal.js` |
| 黑客模式 | 键盘输入 ↑↑↓↓←→←→BA，配色转绿 + 扫描线，9 秒后自动退出 | `js/personal.js` |
| 访问次数 | 页脚显示「这是你第 N 次打开这里」，存 `localStorage`（key：`hnyz:visits`） | `js/personal.js` |
| 控制台签名 | 打开 DevTools 能看到 ASCII 标志、群号和彩蛋提示 | `js/personal.js` |

> 所有动效都尊重 `prefers-reduced-motion`：系统开启「减少动态效果」时，渐显、打字机、倾斜、光晕全部停用，内容直接可见。

### 网页风格（四套皮肤）

页面右上角顶栏有一个四格小方块，点开是一块全屏面板：四张竖向卡片，上下滑动 / ↑↓ 切换，中间那张就是当前风格。

切换是**两块幕布的接力**，不是「面板淡出、幕布再升起」两段各走各的：

1. 卡片先在 0.14 秒里散掉，面板底色收到不透明（原来 0.9 的黑幕在上移时会透出 10% 的旧页面，像一块脏玻璃）；
2. 面板整块向上抽走，幕布在同一刻、用同一条曲线从下面顶上来——两者的位移都取 `--wipe-in`，延迟都取 `--wipe-handoff`，所以面板底边与幕布顶边始终是贴着的，中间不会漏出旧页面那一下；
3. 幕布盖满后换皮肤，重排、贴图重烘、画布重建全在这块不透明底下完成，再多等两帧把布局排空才揭幕（少了这两帧，揭幕会和一次几十毫秒的长任务同时起步，看上去「卡一下才开始走」）；
4. 揭幕同样是 0.44 秒，字不淡出，跟着幕布一起滑出去。

幕布颜色比落地页低半档色阶（极简 `#f2f1eb` vs 页面 `#fbfbf8`），否则白幕在白色上滑走等于没有转场；上沿还有一道 8% 的渐隐光，深色皮肤里就是唯一能看出「有东西在移动」的那条边。

时长与曲线统一写在 `:root` 的 `--wipe-in / --wipe-out / --wipe-handoff / --wipe-ease-*` 里，JS 用 `getComputedStyle` 读同一份——之前 JS 写死 430ms、CSS 写 0.46s，幕布还差 30ms 没到位，底下就已经换完了。

| 风格 | 观感 | 实现 |
|---|---|---|
| `default` 蓝白科技 | 原来的样子，光斑、角色排、校徽、动效全保留 | 什么都不改 |
| `minimal` 极简 | 纯黑白灰、直角、去阴影，隐藏光斑 / 装饰图标 / 贴纸 / 校徽 | `html[data-style="minimal"]` 变量 + 隐藏清单 |
| `hacker` 黑客终端 | 纯黑底，背景只有一整屏代码雨和一层漂浮的气泡，等宽字 + 荧光绿；跑道里的天也永远是纯黑，太阳、月亮统一荧光绿（金币仍是琥珀色） | `html[data-style="hacker"]` 变量 + `js/matrix.js` 画布 + `.skin-bubbles` + `skyPal` |
| `bare` 棍木 | 全白空白页，没有内容、颜色和链接，中间一句灰字，右上角只剩风格按钮 | `html[data-style="bare"]` 隐藏 `body` 下所有节点 + 按钮搬到 `body` |

- 选择存在 `localStorage`（key：`hnyz:style`），四个页面共用；`<head>` 里有内联脚本做首帧预置，刷新不会闪一下默认皮肤。
- 切到 `hacker` 时如果当前是浅色主题，会自动切到深色（否则只有半屏是黑的），并同步写 `hnyz:theme`。
- 换肤会派发 `hnyz:stylechange` 事件，小恐龙、Canvas 相关组件收到后按新的 CSS 变量重画贴图。
- 键盘 `Esc` 关闭面板；面板打开时背景滚动锁定。

`bare`（棍木）是故意做成「什么都没有」的：`html[data-style="bare"] body > *:not(.style-toggle):not(.style-deck):not(.style-wipe):not(.bare-note)` 一条规则把正文、顶栏、页脚、跑道、校徽、装饰层全部 `display: none`，`html` 与 `body` 锁死一屏并强制白底（深色主题在这里也压成白）。按钮本身在 `<header>` 里，父级一藏它也跟着没了，所以 `skins.js` 在进入这个风格时把 `[data-style-toggle]` 挪到 `body` 下、固定到右上角，切走时再按记下的原位置插回顶栏。

面板里这张卡也遵守同一条规矩：**不写简介**（其余三张都有一句说明），内容整体居中，配色只用白和灰——空出来的那片地方就是它要说的东西。

### 页脚小恐龙

每个页面最下方（页脚之后）有一条 `DINO_RUN` 跑道：四只像素小恐龙排队往前跑（窄屏两只），跑道占满整行，右侧不再挂按钮。

- 恐龙恒定自动跑：按仙人掌距离自己起跳；最高分存 `localStorage`（key：`hnyz:dino-hi`）
- 想自己玩也可以：点跑道、空格、↑ 都能让它跳一下，撞到仙人掌会显示 `SIGNAL LOST // REBOOT`，1.4 秒后自动重开
- 按钮去掉后 `js/dino.js` 用 `hasControls` 判断：没有 `[data-dino-mode]` 就不读 `localStorage` 里的旧模式，避免之前存过 `manual` 导致恐龙站着不动

跑道上的玩法：

跑道是一条「进化剧场」：`LEVEL_CAP = 100`，×1 速度下约 2 分半看完从 LV.1 到灭绝再回溯的整场演出。

| 元素 | 规则 |
|---|---|
| 升级 | 增量 `40 + level × 0.8` 分起步缓慢变厚，每级徽章弹一下；每 10 级大里程碑：飘 `EVOLUTION // STAGE N` + 全屏轻闪 + 领队短暂发亮 |
| 羽色 | 20 级起随等级渐变：墨绿 → 深绿 → 墨蓝 → 暗金，与皮肤底色 3:1 调和（`dinoTone()` + `buildSprites()` 重建） |
| 翼龙 | 10 级解锁，三成概率出翼龙（`PTERO_FRAMES` 两帧扇翅），比世界快 18%；高空线跑着能过、跳起来会撞（AUTO 会压顶时按兵不动），低空线照常跳 |
| 混编 | 30 级起三成概率双连仙人掌、金币拱门 75% 且出现双排 |
| 阵型 | 40 级起跟随龙从波浪跟跳收紧成衔尾式齐冲（`trailY` 采样延迟压到 0.07s 内） |
| 无敌星 | 50 级解锁：每 16~28 秒落一颗金星（9×8 点阵 + 金晕），吃到 `STAR POWER // 3S`，3 秒金身穿墙，撞上的障碍直接炸碎 +25 分 |
| 金币 | 仙人掌上方三枚拱门（`lift` 26 / 46 / 26），每枚 +20 分并炸五粒金屑；每满 5 连飘 `COMBO xN`；全程静音 |
| 昼夜 | 游戏内 `gameClock`（34 秒一循环）：太阳走前半圈、月亮走后半圈，两头都贴着地平线淡出。日落烧成晚霞（紫 → 玫瑰 → 橙，缓存的 `skyGrad.dusk`），再垫一层冷蓝（`skyGrad.blue`）落进深夜。晚霞窗口收到 ±0.075（约 5 秒），权重直接用 0~1、不再截断，过了峰值立刻退，不会糊成一长段橙天；夜里天压到近乎纯黑，天亮从蓝调透白 |
| TIME ×N | HUD 上的加速按钮，1 / 2 / 4 循环：昼夜轮转肉眼可见地变快，速度与升级同步加快；×2 起后景速度线，×4 起尘粒加倍、按钮呼吸发光；演出期间置灰锁死，刷新回 ×1 |
| 死亡 | 爆 18 粒碎片 + 0.34 秒震屏，1.45 秒后自动重开 |
| 灭绝 | 100 级触发：天压黑染血、日月被吞 → 轮廓由 26 个不规则顶点咬出来、坑坑洼洼的巨型陨石斜坠（直径 ≈ 跑道宽的 1/4，受高度封顶）→ 落地白闪 + 火球 / 贴地冲击波 / 火星 / 烟 → 恐龙消失，地面撕开陨石坑、立起四块墓碑、灰烬往下飘 |
| 结局 | 砸完就停住：画面中间一块**占跑道 2/3** 的中文压屏「这就是恐龙灭绝的真相」，左边从画外滑进一颗「时间回溯」。**不点它就一直停在这一帧**（半速渲染省电），点画布也不会重开 |
| 时间回溯 | 用户点按钮才走：日月倒着走大半圈（中途能看到月亮沉下去、太阳升上来）→ 墓碑沉回土里、坑口合上、碎片倒飞 → 分数倒卷回 LV.1（最高分不清零）|

实现约束都还在：主循环先乘 `timeScale` 再按 0.034s 分步跑物理（×4 跳弧线不糊）；新障碍一律走「字符点阵 → 离屏 canvas 预渲染」；`window.__HNYZ_DINO__()` 快照新增 `gameClock / timeScale / starTimer / cine` 字段。

- 金币是四帧（宽 8 / 6 / 3 / 6）的旋转循环，`--dino-gold` / `--dino-gold-lit` 跟着风格走：日间暗金、夜间亮金、极简黑白、黑客风琥珀（不跟着变绿，否则和仙人掌糊在一起）
- 月亮不能拿两个 `arc` 走 `evenodd` 画：两圆不互相包含时会多填一块，形状歪成「环 + 尾巴」。改成离屏 canvas 里先填整圆、再用 `destination-out` 啃掉偏心的圆，配色变了（`--dino-moon`）随 `buildSprites()` 重画
- 跑道上没有任何音效：`dino.js` 不再引用 `HNYZ_SFX`，跳跃、被撞、连击都只靠画面反馈

- 小恐龙是 **44×47 的字符串点阵**（`DINO_FRAMES`，按 Chrome 官方 sprite 逐像素提取），逐格 `fillRect` 预渲染成离屏 canvas，主循环只 `drawImage`；换肤 / 换主题时重新着色，不重算形状。两帧只差一条腿的抬起，跑起来是踏步。
- 后面三只按「领头龙 `间距 ÷ 速度` 秒前的高度」取样，所以看起来是波浪式跟跳，而不是四只黏在一起同时起跳。
- 跑道只在进入视口时跑 `requestAnimationFrame`，离开就停；同时在视口内时右下角校徽整组让位（`body.is-dino-visible`，`.hnyz-pet` 和独立的 `.hnyz-pet__board` 都要隐藏，否则板子会压住跑道右端）。
- 跑道配色跟随主题：日间是浅蓝白底 + 深蓝恐龙，夜间是深底 + 亮恐龙，黑客风是绿色终端，极简风纯黑白。
- 夜空星星用独立的月光白（`#e2ecff`；黑客风取荧光绿混白）：早先跟着 `--dino-ink` 走，而浅色主题的墨色是深蓝，压在纯黑夜空上等于没有。星星铺满整片天（不再挤在顶部一条缝），晚霞期间按 `duskAmt` 压到看不见，等天真的黑了才亮。
- 尊重 `prefers-reduced-motion`：开启减少动效时不自动跑，点跑道 / 空格才跳；100 级直接给结局画面（不演陨石与爆炸），点「时间回溯」立刻重开。
- 掉帧治理（跑道是同页面唯一持续重绘的 canvas）：星星从「逐颗 `shadowBlur`」改成两张预渲染小图；日月晕、火光、烟、焦痕、墓碑、陨石全部烘成离屏 canvas；天空渐变按尺寸缓存，每帧只算一次 `skyPhases()`；障碍 / 金币 / 粒子改用就地压缩（`compact()`）而不是每帧 `filter()` 新建数组。贴图烘焙延后到跑道第一次进入视口；`dino.js` 本身也不在首屏解析——四页都改成 `load` 之后交给 `requestIdleCallback` 注入脚本（3 秒兜底，用户提前滚动则立刻加载），绕开首屏那段交互窗口，最高分落盘按 2.5 秒节流（原先每涨一分就写一次 `localStorage`）。`window.__HNYZ_DINO__().perf` 会给出平滑后的 `update / draw` 毫秒数。

### 主题按钮：月亮 / 太阳的变形

顶栏那颗按钮不再是两张静态 SVG，而是一张 60 帧雪碧图（`assets/moon-sun-sprite.png`，3240×54，每帧 54px，显示 18px）：

- 动效本身是「月亮 → 收缩成圆 → 张开成太阳 → 再收回去」，原素材两秒一循环
- 静止时**不空转**：浅色主题停在第 40 帧（太阳），深色主题停在第 0 帧（月亮）
- 点击切换时沿雪碧图走最近的一头——月 → 日正放，日 → 月倒放，约 0.36 秒走完（40 帧 × 9ms，帧号按 ease-out 走，收尾慢下来），中途能看见收缩和张开
- 极简风加 `grayscale`，黑客风用 `hue-rotate(-90deg)` 把蓝转到荧光绿
- 帧号由 `js/theme-icon.js` 用 `requestAnimationFrame` 推进；主题变更来自按钮、系统偏好或风格脚本都能接住（监听 `data-theme`）

切换本身用 View Transitions：新界面从按钮中心长成一个盖住视口的圆（`clip-path: circle()`，半径按视口对角线算）。两个细节是为了让画面「稳」：

- 快照层显式写成 `width/height: 100%` + `object-fit: fill`，并关掉浏览器给 `::view-transition-group(root)` 的默认动画。默认实现会拿快照尺寸和容器尺寸做一次等比缩放，差一两个像素就会让整页看起来「缩一下再弹回去」
- `html { scrollbar-gutter: stable }` 常驻滚动条位置，切换主题、弹层出现时内容宽度不会突然变一下
- 按钮周围不再有放射状光芒（原来的 `themeRays` 一圈竖线已删掉）

按钮自己的反馈也收敛过：原来 `themeBtnPop` 是 0.58 秒放大到 1.16，太抢眼；现在是 0.34 秒、峰值 1.04，配一圈 `box-shadow` 光晕（`0 0 0 7px var(--blue-soft)`），图标在变形中途收到 0.88 再落回 1，整体像「按下去、亮一下」，而不是「弹出来」。

### 三种风格的字体与文案

同一套版式，三种语气。字体在 `css/type.css` 里只换字体栈，不动字号和布局：

| 风格 | 标题 | 正文 | 细节 |
|---|---|---|---|
| 蓝白科技 | 几何无衬线（Inter / SF Pro / Segoe Variable），字距 -0.028em | 系统黑体 | 数字用 tabular-nums，跳动时不抖 |
| 极简 | 衬线（Songti SC / 思源宋体 / SimSun），字重 500，字距 +0.012em | 仍是黑体（小字宋体太糊） | 眉标、标签也换成衬线，不再用等宽 |
| 黑客终端 | 等宽（JetBrains Mono / Cascadia / Sarasa Mono SC） | 同样等宽，中文走等宽回退 | 字距 +0.01em，行高收紧 |

正文用 `--sans`、标题用 `--display`，三套风格只覆盖这两个变量，所以加风格时不用碰具体选择器。

文案在 `js/copy.js` 里集中维护，HTML 只写 `data-copy="键名"`。首页六个区块、项目页、图集页、成员页的标题 / 简介 / 按钮 / 页尾都挂了键名，不再只改首屏：

- 蓝白科技：`把想法 写成代码` / `我们不生产课件，只维护一套可以反复失败的实验环境。`
- 极简：`少 即是多` / `做硬件。删到最少。能跑就行。` / 区块标题只留两三个字
- 黑客：`把混沌 编译成秩序` / `在 0 与 1 的缝隙里重新定义「可被运行」` / `cat ./manifest`，联系卡片保留 `ssh club@hnyz` + `# 先握手 再动手`

**所有风格的标题一律不带标点**：句号、逗号都不出现在 `<h1>` / `<h2>` 里，停顿交给换行（`<br>`）或空格；正文、简介、页尾不受这条约束。

某个风格没写文案时，`copy.js` 会回退 HTML 原文（首次运行时存进 `original` Map），所以新增页面只写 `minimal` / `hacker` 两套也能正常往返默认风格。

切换风格时 `skins.js` 派发 `hnyz:stylechange`，`copy.js` 收到后重写节点内容；页面加载时按 `localStorage` 里的风格先应用一次，不会闪。

首屏那句打字机标语（`[data-rotator]`）也备了三套，写在 `js/personal.js` 的 `ROTATOR` 里：蓝白科技是「零基础也能进来」，极简是「删到只剩必要的那一行」，黑客是「教不是输入，是接口对齐」。切风格时会清掉正在打的那一句、从新的第一句重新打，用一个自增的 `token` 让旧定时器自己作废。

### 黑客风：从配色到终端

背景被清到只剩两样东西：**代码雨**和**气泡**。原来的手绘涂鸦底纹（`skin-doodle`）、扫描线（`skin-scanlines`）、工程网格和背景图标阵列（`bg-icons`）全部删掉，理由是它们在深底上只剩一团说不清是什么的灰影。

`js/matrix.js` 画那层代码雨（片假名 + 数字 + 符号），只在 `data-style="hacker"` 下启动：

- 画布 `fixed` 铺满视口，`z-index: 0`，内容在它上面；用 `destination-out` 逐帧擦淡，所以背景是透明的，字能正常读
- 字符**按格下落**：只有跨过一行（`size × 1.04`）才落一个字。连续坐标会让字形互相压成一团糊，卡在格子里才是清的
- 三档景深：`depth` 随机，远的细（13px）、暗、慢；近的粗（18px）、接近白色、快；近列的字头带 `shadowBlur` 辉光
- 字色在荧光绿 `#46ff94` 和近白 `#e8fff2` 之间按 `depth^1.7` 插值，所以雨幕有前后层次，不是一排同色字
- 限制 30fps；小屏（≤760px）整层压到 `opacity: 0.62`，否则列太密会压住正文；页面不可见 / `prefers-reduced-motion` / 切走皮肤立刻停

气泡在 DOM 里（`skins.js` 生成 16 个 `--r/--x/--dx/--dur/--delay/--a` 全随机的 `<i>`，CSS `skinBubbleRise` 只跑 `transform`）：

- 一颗气泡 = 1px 细边 + 内阴影 + 左上角一点高光（`::after`），才像玻璃泡而不是一块灰斑
- 从视口下方 14vh 外升起，一路上轻微横向漂移，升到 `-122vh` 淡出；单颗 16–34 秒，负 `delay` 让开局就是满屏
- 跟画布互不打扰：气泡走合成层，不占 `requestAnimationFrame`

终端质感都在 `skins.css` 末尾的「质感层」：2px 直角、顶栏毛玻璃、导航下划线从左长出、卡片顶部 1px 内高光、分隔线改虚线、`::selection` 荧光绿。眉标保留小写（`$ whoami --verbose` 比 `$ WHOAMI --VERBOSE` 更像真的终端）。

**黑客风没有白天**：主题被锁死在深色，日间那套浅色覆盖只作为兜底留在 `skins.css` 里。锁定分三处，任何一条路径进来都逃不掉——

- 四个页面 `<head>` 的预置内联脚本：`localStorage` 里风格是 `hacker` 就直接把 `data-theme` 写成 `dark`，首帧不会闪浅色
- `theme.js` 初始化兜底：内联脚本被拦时再压一次
- `theme.js` 监听 `hnyz:stylechange`：切进黑客风立刻 `apply("dark")`；切出去时读回 `localStorage` 里用户自己选的那档深浅色（黑客风不覆盖这个偏好）

在黑客风里点主题按钮不会切换，而是弹一个**拒绝终端**（`theme.js` 的 `openDeniedTerminal` + `skins.css` 的 `.hacker-term*`）：外观对齐真实终端——标题栏红黄绿三个圆点、`guest@hnyz-darknet: ~/theme` 路径、近黑底等宽字。第一行 `$ themectl set-mode light --force` 逐字敲出，然后十四行全英文报错按不均匀的间隔一行一行滚出（`permission denied`、`kernel: ioctl(THEME_SET_LIGHT) failed`、`fatal: the dark does not negotiate`……），最后逐字打出「黑客的世界，隐藏于暗网之下。」，停两秒自动关窗；Esc 或点击任意处也能提前关。期间 `overflow` 锁滚动，关窗时恢复，主题始终没变。

### 弹性动效

`css/motion.css` 用一条统一曲线 `cubic-bezier(0.34, 1.56, 0.64, 1)`——第二控制点大于 1，位移会先冲过头再落回来，所以是「弹」的，不是「滑」的。

| 位置 | 效果 |
|---|---|
| 主按钮 `.button` / `.mini-button` | 悬停抬起 3px，按下压到 `scale(0.975)` |
| 卡片 `.do-card` / `.wall-card` | 悬停抬 6px |
| 顶栏主题按钮 | 悬停转 12° 放大 1.08，按下缩回 |
| 顶栏风格方块 | 悬停抬 2px 转 6° |
| 滚动入场 | 从 22px 收到 20px 并带轻微过冲 |

卡片悬停用的是独立 `translate` 属性而不是 `transform`：滚动入场的 `.is-revealed` 会写 `transform: none`，优先级比 `:hover` 高，用 `transform` 会被压掉。

开启「减少动效」时全部退化为瞬时。

### 深色主题

深色配色是 `css/personal.css` 顶部的 `[data-theme="dark"]` 变量块，覆盖 `style.css` 里 `:root` 的同名变量。改深色只需要动这一块；少数组件在 `style.css` 里写死了浅色，已在 `personal.css` 里单独覆盖：次要按钮、联系卡标题栏、占位封面、校徽底板、页脚、移动端菜单，以及 **`.section--soft` 区块底色**（这一条曾经导致深色模式下出现一块灰白板、白字看不清，已修复）。

## 10. 往图集里加图

1. 把图片放进 `images/gallery/`
2. 打开 `js/gallery-data.js`，在数组末尾加一条：

```js
{
  src: "images/gallery/你的文件名.webp",
  title: "标题",
  tag: "梗图"        // 或 社团
}
```

建议短边 ≥ 800px；透明底的贴纸类图片会自动在白色相纸里居中显示，不会变形。想删掉某张，删掉数组里那一项即可（首页 ghxiaochi 个人页的贴纸在 `js/members.js` 的 `HNYZ_PROFILES` 里，两者互不影响）。

## 11. 换主题色

所有颜色集中在 `css/style.css` 顶部的 `:root`：

```css
:root {
  --bg: #f5f9ff;          /* 页面背景 */
  --panel: #ffffff;       /* 卡片背景 */
  --border: #d7e3f4;      /* 边框 */
  --text: #0f2744;        /* 主文字 */
  --muted: #526b89;       /* 次要文字 */
  --blue: #2563eb;        /* 主蓝 */
  --green: #0369a1;       /* 深天蓝辅助色 */
}
```

改这几个变量即可整体换色，不需要逐个改选择器。深色主题的同名变量在 `css/personal.css` 的 `[data-theme="dark"]` 里。

校徽位于两页的 `.hnyz-pet`，样式在 `css/pet.css`，交互在 `js/pet.js`。图片为 `images/pet/badge-school-hd.webp`，放在右下角的浅蓝背景板里；如需停用，删除页面中的 `.hnyz-pet` 结构即可。

桌宠「东方马也」出现在 `projects.html` 和 `member.html?u=ghxiaochi` 的左下角，样式在 `css/avatar-pet.css`，交互在 `js/avatar-pet.js`。

- 点击会**数次数**：第 1 下「干嘛？」，之后每 3 下报一次「你已经点了我 N 次了。」；超过 30 下改成「你又点了我。这是第 N 次了。」
- 每次点击蹦几颗小星星；2.6 秒内连点 6 下会左右晃并说「头有点晕」
- **第 100 下**：整个人放到 2.5 倍，然后在屏幕里像弹球一样四边乱弹（每秒 1000px 以上），中间浮出一个白底黑框、红字粗斜体的弹窗：「谁让你一直点我的。」
- 弹约 7 秒后弹窗放大炸开，白闪 + 冲击波 + 碎片，计数清零，原地立一块**刻着桌宠肖像的墓碑**（R.I.P. 东方马也 / 2026—2026）
- **点 5 下墓碑才复活**：每敲一下石头会抖、裂纹多一条、下面亮一颗点、音调升一度；第 5 下墓碑淡出，桌宠从小弹回来，说「……我回来了。别数了。」
- 性能：暴走时暂停背景图标 / 跑马灯 / 条纹动画、关掉头部毛玻璃、去掉大尺寸滤镜，碎片从 26 片降到 12 片，连点时星星最多同时 12 颗（实测 60fps）
- 拖动、位置记忆、召唤模式都保留；暴走和死亡期间不响应拖动

首页右下角有「召唤东方马也」按钮：点击后桌宠滑入并挥手，停留 26 秒（点击可续时）后自己说「我先回项目区了」再滑走；再次点击按钮可以提前让它回去。它默认在左下角，可以按住拖到任意位置（位置会记住），右下角仍然保留校徽。

ghxiaochi 的个人主页横幅配置在 `js/members.js` 的 `window.HNYZ_PROFILES` 里（key 与成员的 `user` 一致才会显示），由 `js/main.js` 的 `createMemberProfile(user)` 渲染注入，两张贴纸在 `images/personal/`。新增成员想加横幅，在 `HNYZ_PROFILES` 里加一个同 user 的键即可。

---

## 12. 部署到 GitHub Pages

### 首次部署

1. 在 GitHub 新建公开仓库 `club-website`
2. 把本目录所有文件上传到仓库根目录
3. 打开仓库 **Settings → Pages**
4. **Source** 选择 `Deploy from a branch`
5. **Branch** 选择 `main`，目录选 `/ (root)`
6. 点击 **Save**
7. 等 1–2 分钟，访问：

```text
https://你的用户名.github.io/club-website/
```

绑定自定义域名：仓库根放一个 `CNAME` 文件（内容是域名，不带协议），
DNS 那边加一条 CNAME 指向 `你的用户名.github.io`，等 Pages 签好证书即可。
本站现在是 `hnyzbcs.de5.net`，**根路径变成了 `/`**，
所以 `404.html` 的 `<base href>` 和所有 `og:url` / `canonical` 都以它为准。

### 后续更新

```bash
git add .
git commit -m "更新社团官网"
git push origin main
```

Pages 会自动重新构建。如果页面还是旧版本，先强制刷新（`Ctrl/Cmd + Shift + R`），再等 1 分钟。

---

## 13. 验收清单

- [ ] 本地打开 `index.html` 能看到完整首页
- [ ] 首页项目卡片由 GitHub API 渲染，最多 6 张
- [ ] 「查看全部项目」能跳转到 `projects.html`，成员折叠面板可展开 / 收起
- [ ] 封面图正常显示；`coverImg` 为空时显示科技网格占位
- [ ] 卡片 Hover 有蓝色边框、发光和上浮
- [ ] 手机宽度下卡片单列、导航可展开
- [ ] QQ 群号 / 邮箱可以一键复制（加入区已不再放二维码）
- [ ] 资源墙的 C++ 和微雪 ESP32 链接可跳转
- [ ] 断网或 403 时页面仍能显示降级卡片
- [ ] 校徽在首页和全部项目页右下角；像素头像彩蛋在全部项目页左下角，点满 6 次出现隐藏台词
- [ ] 像素头像可以拖动、刷新后停在原处；单击有星星和回弹，连点 12 次出彩蛋
- [ ] 分享链接有 `og:image`（1200×630）和 `twitter:card`
- [ ] 头部太阳/月亮按钮能切换深浅色，刷新后选择仍然保留
- [ ] 顶栏四格方块能打开风格面板，四张竖卡上下滑动、点「切换」整屏擦除后换肤
- [ ] 切到「棍木」后整页只剩白底、一行灰字和右上角按钮，按钮仍能打开面板切回来
- [ ] 切到极简风后没有光斑 / 贴纸 / 发光；切到黑客风整屏变深绿终端，刷新后保持
- [ ] 页脚小恐龙会跑，能自己跳过仙人掌，点跑道 / 空格也能跳，撞到会重开
- [ ] 首屏标语会打字轮播，输入 ↑↑↓↓←→←→BA 能进入黑客模式并自动退出
- [ ] 系统开启「减少动态效果」时，所有内容立即可见、无动画
- [ ] 访问一个不存在的路径（如 `/nope`）会看到终端风 404，回车能回首页
- [ ] 手机浏览器菜单里有「添加到主屏幕」，装好后打开是无地址栏的独立窗口
- [ ] 打开过一次之后断网刷新，首页和项目页仍能正常显示（Service Worker）
- [ ] 首屏项目卡片角标显示 `STATIC`（说明读的是 `data/repos.json`，没打 GitHub API）
- [ ] 留言板：滚到区块附近才加载；登录后能直接发评论；切皮肤时 iframe 跟着换主题
- [ ] 留言板连不上时显示「群号 + Discussions 链接」，不是白色空框（`?debug=1` 看原始错误）
- [ ] 页脚跑道右上角的「天梯 →」能进 `dino.html`
- [ ] 天梯页能自己跳（空格 / ↑ / 点画布），撞死之后弹出留名框
- [ ] 榜首那句话读得通：`当前榜首 XXX，N 分（LV.N），领先第二名 M 分`
- [ ] 交完成绩，名次和榜面对得上（不是永远「第 1 名」）
- [ ] 「再来一局」能重开，且重开后表单收起、分数归零
- [ ] 没配后端时标注「本地档案」，页面照常能玩；配了后端标注「共享天梯」
- [ ] 断网进天梯页：用缓存 / 本地的榜，不白屏、不报错
- [ ] 国产内核（微信 / QQ 浏览器）打开四页：字号正常、卡片不堆成一列、浮层不铺错
- [ ] `node scripts/compat-fallback.mjs --dry` 输出 0 条（说明新加的样式都补过 fallback）
- [ ] 改完 CSS 后 `grep -c 'fallback: 旧内核' css/*.css` 与改动量对得上
- [ ] 发版后刷新，DevTools → Application → Cache Storage 里的键名跟着新版本号变
- [ ] 四页各有且只有一个 `h1`，标题层级不跳级（`h1 → h2 → h3`）
- [ ] 极简风浅色下的小字（`--dim`）对底色至少 4.5:1，别顺手调淡回去
- [ ] 不依赖任何后端

---

## 14. FAQ

**Q：为什么卡片显示 `DEGRADED`？**  
A：GitHub API 返回了 403（限流）、404 或网络异常，页面自动用了本地缓存或 `js/members.js` 里的字段降级渲染。stars / forks 未知时显示 `—`，不会假装成 0。

**Q：为什么改了 `members` 但页面没变化？**  
A：先强制刷新；确认改的是 `js/members.js` 里的 `window.HNYZ_MEMBERS`，不是旧版 `projects.json`。当前版本已经不再读取 `projects.json`。

**Q：Star / Fork 数量不更新？**  
A：成功请求会缓存 10 分钟，所以短时间内看到的是缓存值；超过 10 分钟或强制刷新后会重新请求。确认仓库是公开的，且没有触发 403 限流。

**Q：可以加更多仓库吗？**  
A：可以，`members` 没有数量上限。首页只展示前 6 个；更多项目会自动进入 `projects.html`，按成员折叠展示。

---

## 15. PWA、404 与项目快照

这一节的三件事都是「补上缺的那块拼图」，彼此独立，可以单独关掉。

### 15.1 添加到主屏幕（manifest + Service Worker）

`manifest.webmanifest` 提供名称、图标和三个快捷方式（项目 / 图集 / 成员）。
`sw.js` 负责离线，策略按资源类型分工：

| 资源 | 策略 | 为什么 |
|---|---|---|
| HTML（`index.html` 等） | **网络优先，3.5 秒超时回退缓存** | 发版后第一次打开就是新的；弱网也不会对着白屏 |
| 带 `?v=` 的 JS / CSS | **缓存优先** | 版本号是手工打的，URL 变内容必变，缓存不可能拿到错版本，命中就是 0ms |
| 图片 / 音频 / 字体 / `data/repos.json` | **先给缓存，后台更新** | 下次打开生效；改一张图不用等版本号 |
| 跨域（giscus、api.github.com） | 直接放行 | 第三方响应头我们控制不了，缓存下来只会制造难查的怪问题 |

`js/pwa.js` 在 `load` 之后的空闲时间注册，四页共用。调试时可以临时关掉：

```text
https://…/index.html?nosw=1        # 本次不注册
```

想彻底注销（换域名、或者怀疑 SW 在捣乱）：

```js
navigator.serviceWorker.getRegistrations().then(list => list.forEach(r => r.unregister()));
```

**发版清单多了一步**：改四页 `?v=` 的同时，把 `sw.js` 顶部的 `VERSION` 也改掉。
不改也能用（版本号机制保证不错版），只是旧版本的资源会一直留在缓存里。

**为什么注册时是 `sw.js?v=20261108` 而不是 `sw.js`**：Cloudflare 会把 `sw.js`
按 `max-age=14400` 缓存在边缘节点上。浏览器做 SW 更新检查时打到的是这份缓存副本，
字节没变 → 判定「无需更新」→ 页面上的 `?v=` 全换了，SW 还停在上一版，
缓存里存的也是上一版的资源。实测发版后轮询 38 秒，缓存键始终停在旧版本，
`installing` 一直是 `false`。

`sw.js` 没有自己的版本号可加，所以 `js/pwa.js` 会从页面已有的样式表上摘 `?v=`
拼进注册 URL，每次发版 URL 都跟着变，绕过所有中间缓存。scope 仍是站点根目录。

> 顺带记一笔：`updateViaCache: "none"` 管的是 `importScripts` 那一层，
> 不是主脚本——主脚本本来就每次回源。本站 `sw.js` 没有 `import`，
> 所以这个参数目前不改变行为，留着是为了以后加子脚本时不踩坑。

### 15.2 404 页

`404.html` 会被 GitHub Pages 用在**任意深度**的错误路径上，所以它不能用相对路径
（`/foo/bar` 下 `css/style.css` 会被解析到 `/foo/css/…`）。
文件开头用一行 `<base href="/">` 把引用钉在站点根目录——
站点在自定义域名下，根就是 `/`；**如果哪天退回二级路径部署，这一行要跟着改**。

页面本身不依赖 `style.css`，样式全内联（约 4KB gzip），断网也能立刻打开；
配色跟随 `localStorage` 里的主题，黑客风下自动切成纯黑 + 荧光绿。

### 15.3 项目数据不再吃 API 额度

匿名 GitHub API 只有 **60 次/小时/IP**，纳新季一个班同时打开页面就能打光。
现在改成两级：

1. `scripts/fetch-repos.mjs` 每天抓一次仓库元数据，写进 `data/repos.json`；
2. 前端 `js/main.js` 优先读这份同域文件，**一次 API 都不消耗**；
   快照里缺某个仓库、或文件读不到时，才回退到 GitHub API 实时请求。

定时任务是 `.github/workflows/refresh-repos.yml`（21:17 UTC / 05:17 北京时间），
也可以手动触发：仓库 **Actions → refresh-repos → Run workflow**。
本地想跑一次：

```bash
node scripts/fetch-repos.mjs
# 抓不到限流时带上 token
GITHUB_TOKEN=ghp_xxx node scripts/fetch-repos.mjs
```

脚本有一条保护：**一个仓库都没抓到时不覆盖旧文件**，宁可数据旧一天，也不要线上突然全部降级。
卡片的角标会显示 `STATIC`（全部来自快照）/ `CACHE`（本地缓存）/ `GITHUB_API`（实时）/ `DEGRADED`（有降级）。

---

## 16. 留言板（Giscus）

留言数据存在仓库的 **Discussions** 里，没有后端、没有数据库，删库才会消失。

### 16.1 接线状态

已接线（2026-10-30），配置写在 `js/guestbook.js` 的 `CONFIG` 里：

| 项 | 值 |
|---|---|
| 仓库 | `ghxiaochi/club-website` |
| `repoId` | `R_kgDOVVfRIw` |
| 分类 | `General` |
| `categoryId` | `DIC_kwDOVVfRI84DKAf-` |
| 映射 | `pathname` |
| 输入框位置 | `bottom` |

换分类或换仓库时，去 <https://giscus.app/zh-CN> 重新生成后抄这两个值即可，
别的都不用动。把 `category` / `categoryId` 清空，留言板会自动退回
「装修中 + 群号」的提示，**线上不会报错、不会出现白色空 iframe**。

> 分类用 `General` 而不是 `Announcements` 也能跑，区别在于：
> Announcements 类型只有维护者和 giscus 机器人能开新帖，别人没法在
> Discussions 里手动建一条打乱 `pathname` 映射。想更干净就把分类换过去。

> 为什么映射用 `pathname` 而不是官方推荐的 `title`：
> 本站有三套文案，同一个区块的标题在极简 / 黑客风下是不一样的。
> 按标题映射的话，同一个人换个皮肤再来留言，会开出第二个 discussion，评论被劈成两半。

### 16.2 它是怎么加载的

- 用 `IntersectionObserver` 盯着留言板，滚到 500px 以内才插 `giscus.app/client.js`；
  首屏不为它付任何代价。
- giscus 会往父窗口发两种消息：`{giscus:{resizeHeight}}` 和 `{giscus:{error}}`。
  后者（没装 App、分类 ID 不对）会被接住，换成一句人话 + 群号，
  原始错误只在地址后面加 `?debug=1` 时才显示。
- 皮肤 / 主题切换通过 `MutationObserver` 监听 `data-style` 与 `data-theme`，
  再 `postMessage` 给 iframe，留言板跟着整站变色：

  | 皮肤 | 浅色 | 深色 |
  |---|---|---|
  | 默认（蓝白科技） | `light` | `dark_dimmed` |
  | 极简 / 棍木 | `light` | `dark` |
  | 黑客 | — | `dark_high_contrast` |

- giscus 的 iframe 是**透明底**，底色由外层 `--giscus-canvas` 给，
  取的是上面四个主题各自的 canvas 色（`#ffffff` / `#22272e` / `#0d1117` / `#0a0c10`）。
  不补这层的话，深色下会从灰蓝控件里透出一块站点的藏蓝，边界像贴歪的纸。
- 接上之后 `[data-connected]` 会把外框的 padding 收成 0，让 iframe 直接贴住边框；
  iframe 也改成 `display: block`，不然行盒底部会留几像素基线缝。
- 20 秒还没收到 giscus 的响应就判定为连不上，换成降级文案。
  但有两条例外：`Discussion not found`（空站正常状态，giscus 会在第一条评论时自建）
  不算失败；iframe 高度已经被撑起来时也不算失败——内容都渲染出来了，
  只是消息迟到，没必要把人推到「连不上」。

---

## 17. 像素小恐龙天梯榜

首页页脚那条跑道是**自动巡航**的装饰：恐龙自己躲仙人掌，你不用管。
想自己跑，点跑道右上角的「天梯 →」，进 `dino.html`。

### 17.1 这个页面有什么

| 区域 | 内容 |
|---|---|
| 左 | 可玩的小恐龙跑酷，空格 / ↑ / 点画布起跳 |
| 左（死亡后） | 留名上榜：昵称 + 本局分数 |
| 右 | 天梯 TOP 12，顶部一句话说明当前榜首 |

榜首那句话是页面主角，形如：

> 当前榜首 ALPHA，12,480 分（LV.100），领先第二名 2,840 分。

榜单里带 `BOT` 标签的是**内置对手**（`data/ladder-seed.json`），
不是真人成绩——一个刚上线的站点没有真实数据，空榜比有几个电脑对手更难看。
真人成绩一旦超过就会顶上去，同名的取最高分。

### 17.2 共享榜怎么开

页面默认指向**同域的 `/api/ladder`**：一个 Pages Function，只有 6 行，
把 `worker/ladder.js` 原样转过去：

```text
functions/api/ladder.js  # 同域入口：/api/ladder（GET 取榜 / POST 交成绩）
worker/ladder.js         # 后端本体：校验、排序、限流、KV 读写
worker/wrangler.toml     # 只有「单独部署成 Worker」时才用
worker/dev-server.mjs    # 本地内存版，不用注册账号就能联调
```

选同域而不是独立 Worker，是因为 `*.workers.dev` 在国内经常被干扰，
而 `/api/ladder` 走的是主站这条已经验证可达的链路，也省掉跨域和预检。

**只差一个 KV。** 在 Cloudflare 控制台点两下：

1. Workers & Pages → **KV** → Create namespace（比如叫 `ladder`）
2. Pages 项目 → **Settings → Functions → KV namespace bindings**
   变量名必须填 **`LADDER`**（代码里写死了），Production 和 Preview 都绑上，保存

保存后重新部署一次（推一版代码，或控制台 Retry deployment）。榜头从
「本地档案」变成「共享天梯 · 所有人的成绩」，全站共享生效。

没绑 KV 时接口返回 503 `{"ok":false,"error":"服务端还没绑定 KV…"}`，
页面**不会白屏**，自动退回本地档——所以先发版、后绑 KV 也不会出事。

想指到别处（独立 Worker、本地联调）就改 `dino.html` 的

```html
<meta name="ladder-endpoint" content="https://hnyz-dino-ladder.xxx.workers.dev">
```

**结尾不要带斜杠**：`/api/ladder` 和 `/api/ladder/` 在 Pages Functions 里是两条路由，
只留不带斜杠的那个才稳（`js/ladder.js` 的 `normalize()` 会统一去掉）。

本地想先看看效果，不用部署：

```bash
node worker/dev-server.mjs                 # 起在 8787
# 然后打开 dino.html?ladder=http://127.0.0.1:8787
```

### 17.3 连不上会怎样

排行页**不允许因为后端挂了就白屏**，降级是三级的：

| 情况 | 表现 |
|---|---|
| 后端正常 | 「共享天梯 · 所有人的成绩」 |
| 后端 6 秒没响应 / 报错 | 用上次缓存渲染，标注「暂时连不上，显示上次缓存」 |
| 从没连上过 / 没配地址 | 本地档 + 内置对手，标注「本地档案」 |

提交也一样：交失败就把成绩存在 `localStorage` 的 `hnyz:dino-pending` 里，
下次打开页面自动补交一次。**离线也能玩、也能留下成绩**，只是名次要等联网才对。

### 17.4 后端做了什么校验

`POST` 只收 JSON，body 上限 1KB，字段：

```json
{ "name": "阿池", "score": 4820, "level": 12 }
```

- 昵称：去掉控制字符与零宽字符，最多 12 字；空名前端兜底成「匿名恐龙」
- 分数：整数，`0 ~ 300000`（正常玩到 100 级满级也就 6000 上下，留足余量）
- 等级：`1 ~ 100`
- 同一 IP 60 秒内最多 6 次提交（挡手滑连点和低级脚本）
- 同名（按昵称哈希）只保留最高分，不追加新行

说清楚：**这套校验拦不住会改包的人**。分数是客户端算的，服务端没有回放验证。
社团站被人恶意刷榜的成本远高于收益，所以没做签名和回放——真需要的话，
最小改动是让 Worker 记下开局时间戳，提交时校验「分数 ≤ 经过秒数 × 60」。

### 17.5 排行榜的名次为什么由前端算

Worker 只知道自己库里那份记录，而榜面上还有内置对手（`data/ladder-seed.json`）
和其他人。所以 `POST` 返回的 `rank` 只作参考，前端拿到后会用
`远程 ∪ 本地 ∪ 内置` 重新合并排序，再算真实名次。

一开始直接用服务端的 `rank`，结果 59 分显示「第 1 名」——
因为库里当时只有这一条。这个坑记在这儿，免得以后又改回去。

---

## 18. 旧内核兼容（国产浏览器 / 老 WebView）

现象是「在 A 浏览器好好的，换个浏览器就排版崩成一列 / 动画乱 / 样式像全丢了」。

### 18.1 根因不是一个，是三个叠在一起

**一、`skins.css` 里有一个多余的右花括号。**

```css
.style-wipe.is-out .style-wipe__bar::after {
  transform: scaleX(1);
  transition: none;
}
}          ← 这行（原第 1342 行）
```

Chrome 的 CSS 错误恢复很宽容，跳过它继续解析，所以本地怎么测都正常。
国产内核与旧 WebKit 的恢复策略更粗暴，会把它当成外层块的结束，
后面整段 `@media` 与皮肤定义一起被吞掉——这就是「样式像全丢了」。
已删除。

**二、`clamp()` / `min()` / `max()` 会让整条声明失效。**

Chromium 79 以下不认识这三个函数，处理方式不是「忽略这个函数」，
而是**丢掉整条声明**。本站有 109 处用到，于是：
`font-size` 回落到 16px、`padding` 归零、`left/right` 失效——
版式自然就塌成一列了。

**三、`inset` 简写（Chromium 87+）失效。** 48 处定位一起消失，
全屏层、浮层、装饰角标全部错位。

### 18.2 怎么修的

`scripts/compat-fallback.mjs` 会扫一遍 `css/`，给每条含 `clamp/min/max` 的声明
**在前面补一条静态值**；`inset` 则展开成 `top/right/bottom/left` 四行：

```css
font-size: 59.4px;              /* fallback: 旧内核 */
font-size: clamp(3rem, 5.8vw, 5.15rem);
```

新浏览器读到第二条会覆盖第一条，视觉完全不变；旧浏览器不认识第二条，
直接用第一条。参考视口取 1024×768（安卓平板横屏）。

其他几处手工处理：

| 问题 | 处理 |
|---|---|
| `color-mix()`（5 处） | 前置同属性的纯色值 |
| `aspect-ratio`（4 处） | 容器有内容撑高，不加兜底；封面靠 `img` 自然高度 |
| `paint-order` 不支持 | `@supports not` 里把 `-webkit-text-stroke` 减半，避免描边吃字心 |
| `backdrop-filter` 缺前缀 | 全部补 `-webkit-backdrop-filter` |
| JS `?.`（2 处） | 改成 `a && a.b` 的老写法——可选链是 ES2020 **语法**，旧解析器整份脚本直接 SyntaxError |
| `ResizeObserver` | 加 `typeof` 判断，没有就退回 `window.resize` |

改完的兼容底线：**Chromium 69 / iOS Safari 12**。

### 18.3 改了 CSS 之后要重跑

```bash
node scripts/compat-fallback.mjs --dry   # 先看会改多少条
node scripts/compat-fallback.mjs         # 写入
```

脚本是幂等的：已经补过 fallback 的声明会跳过，不会越跑越长。

### 18.4 已知没做的两件事

- **flex 的 `gap`**（Chromium 84+）：旧内核里 flex 容器的 `gap` 不生效，
  元素会紧贴。全站 100 处，逐个换成 margin 会污染布局语义，
  且不会造成「崩成一列」，只是间距变小。判断为可接受。
- **`aspect-ratio`**：旧内核下高度由内容决定，封面比例不精确，但不塌。

这两项要真遇上再说，别为了假想的用户把代码写脏。
