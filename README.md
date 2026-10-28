# HNYZ · 衡南一中编程社官网

一个纯静态的社团官网：**HTML + CSS + 原生 JavaScript**，没有后端、没有数据库、没有构建步骤。

整体是蓝白科技风：浅蓝底、白色卡片、深海军蓝文字。教学内容以 **Arduino 硬件编程**为主线。右下角有一个不署名的校徽，随页面滚动旋转，点击会说一句社团台词；「全部项目」页左下角还有 ghxiaochi 的像素头像彩蛋，点击若干次会出现隐藏台词。「全部项目」页的 ghxiaochi 分组顶部有个人主页横幅和三张贴纸；成员个人页里也有这只桌宠；独立「图集」页放着社团梗图；背景里还散着一层灰度小图标（校徽 / Arduino / token）缓慢浮动。项目卡片通过 **GitHub API** 读取仓库信息；首页展示前 6 个，完整列表在单独的「全部项目」页按成员折叠。遇到 403 限流、404 或网络异常会自动切换到本地缓存或降级卡片。

- **线上地址**：<https://ghxiaochi.github.io/club-website/>
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
├── css/
│   ├── style.css           # 全站样式（蓝白科技风）
│   ├── personal.css        # 深色主题、动效、彩蛋样式（在 style.css 之后加载）
│   ├── skins.css           # 四套网页风格（默认 / 极简 / 黑客 / 棍木）的皮肤层
│   ├── dino.css            # 页脚小恐龙跑道、日间/夜间配色
│   ├── type.css            # 三套风格的字体栈（标题衬线 / 等宽 / 几何无衬线；棍木只有一行灰字）
│   ├── motion.css          # 弹性动效层（统一回弹曲线，最后加载）
│   ├── pet.css             # 右下角校徽背景板样式
│   └── avatar-pet.css      # 左下角像素头像彩蛋样式
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
│   └── avatar-pet.js       # 头像点击台词与彩蛋
├── images/
│   ├── favicon.svg
│   ├── og-cover.png        # 1200×630 分享图
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

在 `club-website/` 目录执行：

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

页面右上角顶栏有一个四格小方块，点开是一块全屏面板：四张竖向卡片，上下滑动 / ↑↓ 切换，中间那张就是当前风格。切换时整屏向上擦一次，擦到中间完成换肤，再滑走。

| 风格 | 观感 | 实现 |
|---|---|---|
| `default` 蓝白科技 | 原来的样子，光斑、角色排、校徽、动效全保留 | 什么都不改 |
| `minimal` 极简 | 纯黑白灰、直角、去阴影，隐藏光斑 / 装饰图标 / 贴纸 / 校徽 | `html[data-style="minimal"]` 变量 + 隐藏清单 |
| `hacker` 黑客终端 | 纯黑底，背景只有一整屏代码雨和一层漂浮的气泡，等宽字 + 荧光绿 | `html[data-style="hacker"]` 变量 + `js/matrix.js` 画布 + `.skin-bubbles` |
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
| 昼夜 | 游戏内 `gameClock`（60 秒一循环）在日间 / 黄昏 / 夜间平滑过渡：天色叠色、太阳月亮沿弧线巡天、云入夜淡出；网站主题仍作为基准色调 |
| TIME ×N | HUD 上的加速按钮，1 / 2 / 4 循环：昼夜轮转肉眼可见地变快，速度与升级同步加快；×2 起后景速度线，×4 起尘粒加倍、按钮呼吸发光；演出期间置灰锁死，刷新回 ×1 |
| 死亡 | 爆 18 粒碎片 + 0.34 秒震屏，1.45 秒后自动重开 |
| 灭绝 | 100 级触发：天染血色 → 带尾焰的陨石斜坠 → 白闪强震 + `MASS EXTINCTION // THIS IS THE TRUTH OF THE DINOSAURS` → `TIME REWIND` 碎片倒飞、分数倒卷 → `REBORN // AGAIN` 回到 LV.1（最高分不清零）；`prefers-reduced-motion` 下简化为两行文案 |

实现约束都还在：主循环先乘 `timeScale` 再按 0.034s 分步跑物理（×4 跳弧线不糊）；新障碍一律走「字符点阵 → 离屏 canvas 预渲染」；`window.__HNYZ_DINO__()` 快照新增 `gameClock / timeScale / starTimer / cine` 字段。

- 金币是四帧（宽 8 / 6 / 3 / 6）的旋转循环，`--dino-gold` / `--dino-gold-lit` 跟着风格走：日间暗金、夜间亮金、极简黑白、黑客风琥珀（不跟着变绿，否则和仙人掌糊在一起）
- 月亮不能拿两个 `arc` 走 `evenodd` 画：两圆不互相包含时会多填一块，形状歪成「环 + 尾巴」。改成离屏 canvas 里先填整圆、再用 `destination-out` 啃掉偏心的圆，配色变了（`--dino-moon`）随 `buildSprites()` 重画
- 跑道上没有任何音效：`dino.js` 不再引用 `HNYZ_SFX`，跳跃、被撞、连击都只靠画面反馈

- 小恐龙是 **44×47 的字符串点阵**（`DINO_FRAMES`，按 Chrome 官方 sprite 逐像素提取），逐格 `fillRect` 预渲染成离屏 canvas，主循环只 `drawImage`；换肤 / 换主题时重新着色，不重算形状。两帧只差一条腿的抬起，跑起来是踏步。
- 后面三只按「领头龙 `间距 ÷ 速度` 秒前的高度」取样，所以看起来是波浪式跟跳，而不是四只黏在一起同时起跳。
- 跑道只在进入视口时跑 `requestAnimationFrame`，离开就停；同时在视口内时右下角校徽整组让位（`body.is-dino-visible`，`.hnyz-pet` 和独立的 `.hnyz-pet__board` 都要隐藏，否则板子会压住跑道右端）。
- 跑道配色跟随主题：日间是浅蓝白底 + 深蓝恐龙，夜间是深底 + 亮恐龙，黑客风是绿色终端，极简风纯黑白。
- 尊重 `prefers-reduced-motion`：开启减少动效时不自动跑，点跑道 / 空格才跳。

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

当前线上地址：

```text
https://ghxiaochi.github.io/club-website/
```

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
