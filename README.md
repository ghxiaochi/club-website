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
- **Animdustry 角色排**：「全部项目」页顶部按游戏源码复刻了那一排小人——`#accce3 / #57639a` 斜条纹背景、8 个角色（全部解锁）站在深色地台上，贴图里烘焙了一层黑色描边。交互照搬游戏：**鼠标扫过依次跳一下**（`unit.jumping`，手机上手指划过同样会跳），音高按游戏 `calcPitch` 公式（大三和弦 0/4/7 + 八度）从左到右递增（1.00 → 5.04 倍），所以每个小人的声音都不一样；**右键压扁并换「挨打」表情**（音高按 `calcPitch(i mod 2)` 在 1.00 / 1.26 之间交替）；**左键打开角色卡**——和游戏一样：人物先以约 1.75 倍出现、2.8 秒内缩到正常，全程上下浮动（背景光晕也跟着浮），先整体高亮再慢慢降回正常，标题/副标题用的是游戏原版像素字体（`fonts/anim-title.ttf` / `anim-pixel.ttf`）。音效同样是游戏原版的
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
│   ├── pet.css             # 右下角校徽背景板样式
│   └── avatar-pet.css      # 左下角像素头像彩蛋样式
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
