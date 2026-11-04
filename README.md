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
- **Animdustry 角色排**：「全部项目」页顶部按游戏源码复刻了那一排小人：`#accce3 / #57639a` 斜条纹背景、8 个角色（全部解锁）站在深色地台上，贴图里烘焙了一层黑色描边。交互照搬游戏：**鼠标扫过依次跳一下**（`unit.jumping`，手机上手指划过同样会跳）。音高不绑在「第几个小人」上，跟着指针的水平位置走，从左到右滑过整排会连续走完一条大调音阶（1.00 → 2.00 倍，刚好一个八度），滑得再快也不会漏音（触控板横向滑动同样有效）；**右键压扁并换「挨打」表情**（音高也跟着角色所在位置走）；**左键打开角色卡**，动画和游戏一样：人物先以约 1.75 倍出现、2.8 秒内缩到正常，全程上下浮动（背景光晕也跟着浮），先整体高亮再慢慢降回正常，标题/副标题用的是游戏原版像素字体（`fonts/anim-title.ttf` / `anim-pixel.ttf`）。开场背景按 `units.nim` 的绘制顺序重画，bloom 气泡带亮边和高光，线条与暗角也做了分层。音效同样是游戏原版的
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

## 2. 开屏与首屏位置

打开首页时会先显示约 0.8 秒的开屏（`{ }` + HNYZ + 口号），同时脚本把页面**直接定位到「关于」这一块**，不做平滑滚动：

- 通过 `history.scrollRestoration = "manual"` 关掉浏览器的滚动位置恢复，避免刷新后停在页面底部
- 打开时会清掉 URL 里残留的 `#join` 之类锚点，防止一进来就跳到页尾
- 想改成打开时停在顶部首屏，把 `index.html` 里 `place()` 中的 `document.getElementById("about")` 换成 `null` 即可

## 3. 本地预览

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

## 4. 修改项目卡片

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

## 5. 数据与异常兜底

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

## 6. 修改品牌 / 联系方式

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

## 7. 音效

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

## 8. 个性化与彩蛋

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

### 网页风格（六套皮肤）

页面右上角顶栏有一个四格小方块，点开是一块全屏面板：六张竖向卡片，上下滑动 / ↑↓ 切换，中间那张就是当前风格。

切换是**两块幕布的接力**，不是「面板淡出、幕布再升起」两段各走各的：

1. 卡片先在 0.14 秒里散掉，面板底色收到不透明（原来 0.9 的黑幕在上移时会透出 10% 的旧页面，像一块脏玻璃）；
2. 面板整块向上抽走，幕布在同一刻、用同一条曲线从下面顶上来。两者的位移都取 `--wipe-in`，延迟都取 `--wipe-handoff`，所以面板底边与幕布顶边始终是贴着的，中间不会漏出旧页面那一下；
3. 幕布盖满后换皮肤，重排、贴图重烘、画布重建全在这块不透明底下完成，再多等两帧把布局排空才揭幕（少了这两帧，揭幕会和一次几十毫秒的长任务同时起步，看上去「卡一下才开始走」）；
4. 揭幕同样是 0.44 秒，字不淡出，跟着幕布一起滑出去。

幕布颜色比落地页低半档色阶（极简 `#f2f1eb` vs 页面 `#fbfbf8`），否则白幕在白色上滑走等于没有转场；上沿还有一道 8% 的渐隐光，深色皮肤里就是唯一能看出「有东西在移动」的那条边。

时长与曲线统一写在 `:root` 的 `--wipe-in / --wipe-out / --wipe-handoff / --wipe-ease-*` 里，JS 用 `getComputedStyle` 读同一份。之前 JS 写死 430ms、CSS 写 0.46s，幕布还差 30ms 没到位，底下就已经换完了。

| 风格 | 观感 | 实现 |
|---|---|---|
| `default` 蓝白科技 | 原来的样子，光斑、角色排、校徽、动效全保留 | 什么都不改 |
| `minimal` 极简 | 纯黑白灰、直角、去阴影，隐藏光斑 / 装饰图标 / 贴纸 / 校徽 | `html[data-style="minimal"]` 变量 + 隐藏清单 |
| `hacker` 黑客终端 | 纯黑底，背景只有一整屏代码雨和一层漂浮的气泡，等宽字 + 荧光绿；跑道里的天也永远是纯黑，太阳、月亮统一荧光绿（金币仍是琥珀色） | `html[data-style="hacker"]` 变量 + `js/matrix.js` 画布 + `.skin-bubbles` + `skyPal` |
| `term` 终端 | 首页是一整台「多窗口终端」HNYZ TTY：tmux 式窗口条挂着 0:main～7:join 八个窗口，底部一条真能敲命令的 shell，按键图例常驻；雾蓝双版（浅色白面板 #F6F3ED / 深色 #242B3A，主蓝 #3F6CC4 / #7DA1DE），Deepy 像素鲸鱼 + 像素字标；窗口文案是终端味重写的，不与其它皮肤共用；内页退回同色纸带，方块摊平成记录行 | `css/skin-term.css` + `css/term-tui.css` + `js/term-tui.js`，由 `js/skins.js` 的 `syncTerm()` 通知进退场；五套老皮肤一条规则都没动 |
| `halo` 光场 | 整屏换成 HALOFLUX：节拍驱动的深色光场、中央数据环带、外侧光束、底部八块数据面板（文案已全部换成社团内容）；站点自己的内容全部让位，顶栏收缩成右上角一枚风格按钮，随时能切回来 | `css/skin-halo.css` + 全屏 iframe 挂载 `halo.html`，切走即移除 iframe（rAF 真正停掉） |
| `bare` 棍木 | 全白空白页，没有内容、颜色和链接，中间一句灰字，右上角只剩风格按钮 | `html[data-style="bare"]` 隐藏 `body` 下所有节点 + 按钮搬到 `body` |

- 选择存在 `localStorage`（key：`hnyz:style`），四个带风格切换的页面共用；`<head>` 里有内联脚本做首帧预置（含 `term`、`halo`），刷新不会闪一下默认皮肤。
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

没有等级，也没有终点：分数就是跑过的距离，撞死为止，能跑多远算多远。

| 元素 | 规则 |
|---|---|
| 难度 | 只跟分数走。速度从 240 起随里程涨到 400 封顶，障碍密度靠随机间隔 |
| 翼龙 | 300 分之后出现，三成概率。高空线跑着能过、跳起来会撞（AUTO 会压顶时按兵不动），低空线照常跳 |
| 混编 | 900 分之后三成概率双连仙人掌，金币拱门改成 75% 且出现双排 |
| 金币 | 仙人掌上方三枚拱门（`lift` 26 / 46 / 26），每枚 +20 分并炸五粒金屑；每满 5 连飘 `COMBO xN`；全程静音 |
| 昼夜 | 游戏内 `gameClock`（34 秒一循环）：太阳走前半圈、月亮走后半圈，两头都贴着地平线淡出。日落烧成晚霞（紫 → 玫瑰 → 橙，缓存的 `skyGrad.dusk`），再垫一层冷蓝（`skyGrad.blue`）落进深夜。晚霞窗口收到 ±0.075（约 5 秒），权重直接用 0~1、不再截断，过了峰值立刻退，不会糊成一长段橙天；夜里天压到近乎纯黑，天亮从蓝调透白 |
| TIME ×N | HUD 上的加速按钮，1 / 2 / 4 循环：昼夜轮转肉眼可见地变快，速度也一起乘；×2 起后景速度线，×4 起尘粒加倍、按钮呼吸发光，刷新回 ×1 |
| 死亡 | 爆 18 粒碎片 + 0.34 秒震屏，1.45 秒后自动重开（天梯页不自动重开，等成绩表单） |

羽色固定用皮肤墨色，不再随进度变；跟随龙一直是波浪式跟跳。

早先那套「100 级进化 → 陨石灭绝 → 时间回溯」的演出已经停用：触发点在等级系统里，
等级拿掉之后就到不了了。`startExtinction()` 的代码还在（几百行），
但正常玩法不会走到，留着以后想用再接。

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
- 掉帧治理（跑道是同页面唯一持续重绘的 canvas）：星星从「逐颗 `shadowBlur`」改成两张预渲染小图；日月晕、火光、烟、焦痕、墓碑、陨石全部烘成离屏 canvas；天空渐变按尺寸缓存，每帧只算一次 `skyPhases()`；障碍 / 金币 / 粒子改用就地压缩（`compact()`）而不是每帧 `filter()` 新建数组。贴图烘焙延后到跑道第一次进入视口；`dino.js` 本身也不在首屏解析：四页都改成 `load` 之后交给 `requestIdleCallback` 注入脚本（3 秒兜底，用户提前滚动则立刻加载），绕开首屏那段交互窗口，最高分落盘按 2.5 秒节流（原先每涨一分就写一次 `localStorage`）。`window.__HNYZ_DINO__().perf` 会给出平滑后的 `update / draw` 毫秒数。

### 主题按钮：月亮 / 太阳的变形

顶栏那颗按钮不再是两张静态 SVG，而是一张 60 帧雪碧图（`assets/moon-sun-sprite.png`，3240×54，每帧 54px，显示 18px）：

- 动效本身是「月亮 → 收缩成圆 → 张开成太阳 → 再收回去」，原素材两秒一循环
- 静止时**不空转**：浅色主题停在第 40 帧（太阳），深色主题停在第 0 帧（月亮）
- 点击切换时沿雪碧图走最近的一头：月 → 日正放，日 → 月倒放，约 0.36 秒走完（40 帧 × 9ms，帧号按 ease-out 走，收尾慢下来），中途能看见收缩和张开
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

**黑客风没有白天**：主题被锁死在深色，日间那套浅色覆盖只作为兜底留在 `skins.css` 里。锁定分三处，任何一条路径进来都逃不掉：

- 四个页面 `<head>` 的预置内联脚本：`localStorage` 里风格是 `hacker` 就直接把 `data-theme` 写成 `dark`，首帧不会闪浅色
- `theme.js` 初始化兜底：内联脚本被拦时再压一次
- `theme.js` 监听 `hnyz:stylechange`：切进黑客风立刻 `apply("dark")`；切出去时读回 `localStorage` 里用户自己选的那档深浅色（黑客风不覆盖这个偏好）

在黑客风里点主题按钮不会切换，而是弹一个**拒绝终端**（`theme.js` 的 `openDeniedTerminal` + `skins.css` 的 `.hacker-term*`）。外观对齐真实终端：标题栏红黄绿三个圆点、`guest@hnyz-darknet: ~/theme` 路径、近黑底等宽字。第一行 `$ themectl set-mode light --force` 逐字敲出，然后十四行全英文报错按不均匀的间隔一行一行滚出（`permission denied`、`kernel: ioctl(THEME_SET_LIGHT) failed`、`fatal: the dark does not negotiate`……），最后逐字打出「黑客的世界，隐藏于暗网之下。」，停两秒自动关窗；Esc 或点击任意处也能提前关。期间 `overflow` 锁滚动，关窗时恢复，主题始终没变。

### 弹性动效

`css/motion.css` 用一条统一曲线 `cubic-bezier(0.34, 1.56, 0.64, 1)`。第二控制点大于 1，位移会先冲过头再落回来，所以是「弹」的，不是「滑」的。

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

## 9. 往图集里加图

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

## 10. 换主题色

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

## 11. 部署到 GitHub Pages

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

## 12. 验收清单

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
- [ ] 顶栏四格方块能打开风格面板，六张竖卡上下滑动、点「切换」整屏擦除后换肤；点卡片本体也会滚动居中并高亮
- [ ] 切到「光场」后整屏是深色光场动画，右上角只剩一枚风格按钮，能随时切回来；切走后 iframe 被移除（DevTools 里搜不到 `.halo-frame`）
- [ ] 切到「终端」：首页变成一台多窗口终端，启动页有 Deepy 鲸鱼与 HNYZ 字标，停一会儿它会喷水或游一下，点一下会换表情；`0-7` 或点窗口条能切窗口、每个窗口滚动位置各自保留，活动窗口边框转主蓝；底部命令行敲 `help` 有命令列表、敲 `gallery` 能跳图集页、敲错的命令会报 `command not found`；复制按钮点了闪「已复制 ✓」；内页仍是同色系纸带；切走后 TTY 从 DOM 里拆干净、顶栏按钮搬回原位
- [ ] 终端风明暗两版都过一遍：白面板 / 深面板、主蓝 `#3F6CC4` / `#7DA1DE`，鲸鱼和字标在两种底色上都清晰，状态条不换行
- [ ] 性能：默认风首屏不请求 `skin-term.css` / `term-tui.css` / `skin-halo.css`；鼠标移到「风格」按钮前后再切终端风不闪白；滚动到页面中段，区块正常显示（`content-visibility` 生效）；图集图片是懒加载
- [ ] 顶栏的全屏按钮能进能出，图标在「四角向外 / 向内」之间切换，Esc 退出后按钮状态跟着回来
- [ ] 切到「棍木」后整页只剩白底、一行灰字和右上角按钮，按钮仍能打开面板切回来
- [ ] 切到极简风后没有光斑 / 贴纸 / 发光；切到黑客风整屏变深绿终端，刷新后保持
- [ ] 页脚小恐龙会跑，能自己跳过仙人掌，点跑道 / 空格也能跳，撞到会重开
- [ ] 首屏标语会打字轮播，输入 ↑↑↓↓←→←→BA 能进入黑客模式并自动退出
- [ ] 系统开启「减少动态效果」时，所有内容立即可见、无动画
- [ ] 访问一个不存在的路径（如 `/nope`）会看到终端风 404，回车能回首页
- [ ] 手机浏览器菜单里有「添加到主屏幕」，装好后打开是无地址栏的独立窗口
- [ ] 打开过一次之后断网刷新，首页 / 项目 / 图集 / 成员 / 天梯 / 404 六页都能正常显示，图集里的图也不缺（Service Worker 两批预缓存）
- [ ] 断网时底部弹一次「已离线，正在用缓存打开页面」；发新版本后打开会弹「站点有新版本」
- [ ] 首屏项目卡片角标显示 `STATIC`（说明读的是 `data/repos.json`，没打 GitHub API）
- [ ] 留言板：滚到区块附近才加载；登录后能直接发评论；切皮肤时 iframe 跟着换主题
- [ ] 留言板连不上时显示「群号 + Discussions 链接」，不是白色空框（`?debug=1` 看原始错误）
- [ ] 页脚跑道右上角的「天梯 →」能进 `dino.html`
- [ ] 天梯页能自己跳（空格 / ↑ / 点画布），撞死之后弹出留名框
- [ ] 榜首那句话读得通：`当前榜首 东方马也，999,999 分。`
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

## 13. FAQ

**Q：为什么卡片显示 `DEGRADED`？**  
A：GitHub API 返回了 403（限流）、404 或网络异常，页面自动用了本地缓存或 `js/members.js` 里的字段降级渲染。stars / forks 未知时显示 `—`，不会假装成 0。

**Q：为什么改了 `members` 但页面没变化？**  
A：先强制刷新；确认改的是 `js/members.js` 里的 `window.HNYZ_MEMBERS`，不是旧版 `projects.json`。当前版本已经不再读取 `projects.json`。

**Q：Star / Fork 数量不更新？**  
A：成功请求会缓存 10 分钟，所以短时间内看到的是缓存值；超过 10 分钟或强制刷新后会重新请求。确认仓库是公开的，且没有触发 403 限流。

**Q：可以加更多仓库吗？**  
A：可以，`members` 没有数量上限。首页只展示前 6 个；更多项目会自动进入 `projects.html`，按成员折叠展示。

---

## 14. PWA、404 与项目快照

这一节的三件事都是「补上缺的那块拼图」，彼此独立，可以单独关掉。

### 14.1 添加到主屏幕（manifest + Service Worker）

`manifest.webmanifest` 提供名称、图标和三个快捷方式（项目 / 图集 / 成员）。
`sw.js` 负责离线。预缓存分两批，装得快、离线也全：

| 批次 | 装什么 | 时机 |
|---|---|---|
| 核心 | 七个页面、全部 CSS/JS、两套像素字体、图标、`data/*.json`（含 `halo.html`，连 `?v=` 一起写） | `install` 事件里逐个 `add` |
| 扩展 | 26 张角色立绘、14 张图集、贴纸、校徽、头像彩蛋、5 个音效，共约 1.3 MB | `activate` 之后串行补，失败不影响已装好的核心 |

用逐个 `add` 而不是 `addAll`：`addAll` 是「一个 404 全部作废」，某个文件改名就会让整个
Service Worker 装不上，离线能力直接没有。现在能缓多少缓多少。

运行时策略按资源类型分工：

| 资源 | 策略 | 为什么 |
|---|---|---|
| HTML（`index.html` 等） | **网络优先，3.5 秒超时回退缓存** | 发版后第一次打开就是新的；弱网也不会对着白屏 |
| 带 `?v=` 的 JS / CSS | **缓存优先** | 版本号是手工打的，URL 变内容必变，缓存不可能拿到错版本，命中就是 0ms |
| 图片 / 音频 / 字体 / `data/repos.json` | **先给缓存，后台更新** | 下次打开生效；改一张图不用等版本号 |
| 带 `Range` 头的请求（音频拖进度条） | 直接走网络 | 缓存里存的是整段响应，喂不了分段请求 |
| 跨域（giscus、api.github.com） | 直接放行 | 第三方响应头我们控制不了，缓存下来只会制造难查的怪问题 |

图片缓存留了上限（120 条），超了从最早放的开始删——图集会一直加图，
不设上限迟早把手机存储撑爆。

装上之后还有两条小提示，都在 `js/pwa.js` 里：

- **有新版本**：底部弹一条「站点有新版本，刷新后生效」+ 刷新按钮，10 秒后自己收起来。
  不弹的话，用户可能一整天都在看旧页面，还以为发版没生效。
- **断网**：弹一条「已离线，正在用缓存打开页面」，只弹一次，恢复网络后重新计。

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
> 不是主脚本，主脚本本来就每次回源。本站 `sw.js` 没有 `import`，
> 所以这个参数目前不改变行为，留着是为了以后加子脚本时不踩坑。

### 14.2 404 页

`404.html` 会被 GitHub Pages 用在**任意深度**的错误路径上，所以它不能用相对路径
（`/foo/bar` 下 `css/style.css` 会被解析到 `/foo/css/…`）。
文件开头用一行 `<base href="/">` 把引用钉在站点根目录：
站点在自定义域名下，根就是 `/`；**如果哪天退回二级路径部署，这一行要跟着改**。

页面本身不依赖 `style.css`，样式全内联（约 4KB gzip），断网也能立刻打开；
配色跟随 `localStorage` 里的主题，黑客风下自动切成纯黑 + 荧光绿。

### 14.3 项目数据不再吃 API 额度

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

## 15. 留言板（Giscus）

留言数据存在仓库的 **Discussions** 里，没有后端、没有数据库，删库才会消失。

### 15.1 接线状态

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

### 15.2 它是怎么加载的

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
  不算失败；iframe 高度已经被撑起来时也不算失败，内容都渲染出来了，
  只是消息迟到，没必要把人推到「连不上」。

---

## 16. 像素小恐龙天梯榜

首页页脚那条跑道是**自动巡航**的装饰：恐龙自己躲仙人掌，你不用管。
想自己跑，点跑道右上角的「天梯 →」，进 `dino.html`。

### 16.1 这个页面有什么

| 区域 | 内容 |
|---|---|
| 左 | 可玩的小恐龙跑酷，空格 / ↑ / 点画布起跳 |
| 左（死亡后） | 填昵称，点「提交到天梯」打开一条 GitHub Issue |
| 右 | 天梯 TOP 12，顶部一句话说明当前榜首 |

榜首那句话是页面主角，形如：

> 当前榜首 东方马也，999,999 分。

没有等级、没有电脑对手。榜上每一条都是真人提交的。

### 16.2 榜是怎么来的

没有后端，也没有数据库。整条链路就三步：

```text
玩家点「提交到天梯」
  → 打开预填好的 GitHub Issue（标题带 [DINO]，body 里有 score 和 name）
  → 玩家用 GitHub 账号点 Submit
  → .github/workflows/ladder.yml 触发
  → 拉取所有标题以 [DINO] 开头的 Issue，解析 score / name
  → 同名取最高分，排序，写回 data/ladder.json
  → Pages 部署完，所有人看到同一张榜
```

页面只读 `data/ladder.json`（普通静态文件），所以：

- 没有跨域、没有限流、没有要一直开机的服务器；
- 地址永远是主站这个，不用另配域名；
- 读取时带 `?t=` 时间戳，绕开 GitHub Pages 的 CDN 缓存。

代价有两个：

- **提交要 GitHub 账号**，而且会离开页面去 GitHub；
- **从提交到上榜约 1 分钟**（Actions 跑一次 + Pages 部署）。

### 16.3 榜单怎么维护

- 榜首那条「东方马也 999999」写死在 `ladder.yml` 的 `SEED` 常量里，每次重算都会带上，
  不来自任何 Issue；
- 想改它：改那个常量，然后 Actions 页面 → 天梯汇总 → Run workflow；
- 想让某条成绩下榜：把对应 Issue 关掉，workflow 会重算；
- 想整个重建：同上，手动跑一次。

因为 Actions 会 `git push` 回仓库，本地改 `data/ladder.json` 只影响你本机，
下次有人提交就被覆盖了。

### 16.4 防刷到什么程度

Issue 的 body 是玩家自己写的，**分数可以随便填**。
能保证的只有「得有一个 GitHub 账号」，拦不住愿意开小号的人。
社团站的量级，这个成本已经够高，所以没做额外校验。

### 16.5 本地怎么看

`data/ladder.json` 就是个静态文件，改完直接打开 `dino.html` 就能看到效果，
不需要任何服务。提交链路要推到 GitHub 才有 Actions，本地测不了。

## 17. 旧内核兼容（国产浏览器 / 老 WebView）

现象是「在 A 浏览器好好的，换个浏览器就排版崩成一列 / 动画乱 / 样式像全丢了」。

### 17.1 根因不是一个，是三个叠在一起

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
后面整段 `@media` 与皮肤定义一起被吞掉，这就是「样式像全丢了」。
已删除。

**二、`clamp()` / `min()` / `max()` 会让整条声明失效。**

Chromium 79 以下不认识这三个函数，处理方式不是「忽略这个函数」，
而是**丢掉整条声明**。本站有 109 处用到，于是：
`font-size` 回落到 16px、`padding` 归零、`left/right` 失效，
版式自然就塌成一列了。

**三、`inset` 简写（Chromium 87+）失效。** 48 处定位一起消失，
全屏层、浮层、装饰角标全部错位。

### 17.2 怎么修的

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
| JS `?.`（2 处） | 改成 `a && a.b` 的老写法。可选链是 ES2020 **语法**，旧解析器整份脚本直接 SyntaxError |
| `ResizeObserver` | 加 `typeof` 判断，没有就退回 `window.resize` |

改完的兼容底线：**Chromium 69 / iOS Safari 12**。

### 17.3 改了 CSS 之后要重跑

```bash
node scripts/compat-fallback.mjs --dry   # 先看会改多少条
node scripts/compat-fallback.mjs         # 写入
```

脚本是幂等的：已经补过 fallback 的声明会跳过，不会越跑越长。

### 17.4 已知没做的两件事

- **flex 的 `gap`**（Chromium 84+）：旧内核里 flex 容器的 `gap` 不生效，
  元素会紧贴。全站 100 处，逐个换成 margin 会污染布局语义，
  且不会造成「崩成一列」，只是间距变小。判断为可接受。
- **`aspect-ratio`**：旧内核下高度由内容决定，封面比例不精确，但不塌。

这两项要真遇上再说，别为了假想的用户把代码写脏。

---

## 18. 光场皮肤（halo）

第五套皮肤，把 [HALOFLUX](https://github.com/Ryder191/haloflux) 整个「抄」了进来。原版是一个节拍驱动的深色光场：中央一圈数据环带、外侧光束、底部一排数据面板，全部在一块 canvas 里跑。我们只动了四刀：

1. **文案全换**：品牌、KPI、面板数据（动态 / 活动 / 代码 / 协作）换成社团自己的——项目 5 个、成员 3 人、板块 8 个、每周活动 2 次，代码面板放的是 Arduino `digitalWrite` 示例
2. **删 BGM**：原版带背景音乐，自动播放那种，整块移除
3. **修空引用**：原版给 `.console` 返回按钮绑事件，嵌入场景里这个按钮不存在，会直接报错，改成判空
4. **手表断点**：≤340px 时 header 改两列、KPI 收缩、次要面板隐藏

### 18.1 怎么挂进来的

`halo.html` 原样保留（单文件，脚本全内嵌），站点这边用 `css/skin-halo.css` + `js/skins.js` 的 `syncHalo()` 挂载：`html[data-style="halo"]` 下站点自己的内容全部 `display:none` 让位，一个 `position:fixed; inset:0` 的全屏 iframe 指向 `halo.html`。切走就 `remove()`，文档销毁，rAF 循环跟着真停，不留后台动画偷偷吃电。顶栏在 halo 下收缩成右上角一枚 32px 的风格按钮（半透明，压在 iframe 上还能点），面板打开时 iframe 压暗到 0.55 亮度。

版本号走 `js/skins.js` 里的 `HALO_VERSION`，与页面引用、`sw.js` 预缓存三处同步 bump。

### 18.2 为什么是 iframe 而不是并进页面

试过直接并：HALOFLUX 是个自成一体的引擎，有自己的 canvas、自己的滚动容器、自己的面板吸附逻辑，跟站点的小恐龙、数字雨、滚动进度条挤在同一个文档里就互相打架（滚动回调互推，面板抽搐）。iframe 一隔，两边互相看不见，代价只是多一层文档。这层隔离换来的稳定，非常值。

### 18.3 修过的两个坑

- **右侧白边**：body 的 `scrollbar-gutter: stable` 会留 15px 槽，iframe 因此窄一截，右边露出一条白。halo 下在 `html` 级把它关掉。
- **首帧闪默认皮肤**：`<head>` 预置脚本原来只认 minimal/hacker，halo 下刷新会先画一遍默认页再换。`halo` 加进预置名单就好。

---

## 19. 终端风（term）

第六套皮肤，和黑客风是两种东西：黑客风在「攻击」你（荧光绿、代码雨、发光边框），
终端风是一台值班的机器——视觉照着 [dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI)
的 Gentle Mist Blue（雾蓝）：白面板、暖白纸底、墨色字、雾蓝主色、像素鲸鱼。
鲸鱼用的是 dsh-TUI 仓库里那只 **Deepy**（`assets/deepy/frames.json`）：42×30 的像素画，
七组动画按下表的时机播放，不再自己拿 CSS 拼一只。

### 19.1 首页不是网页，是一台多窗口终端

首页的正文被整台替换成了 **HNYZ TTY**（`js/term-tui.js` + `css/term-tui.css`）：
一块整屏的终端，从上到下五段——顶栏、窗口条、窗口面板、命令行、底部状态条。
没有「进入板块再回纸带」这一步，八个窗口就是全部内容，滚动只发生在窗口面板里。

交互的骨架抄了几台高星开源 TUI 的作业，但全部自己实现：

- **tmux**：窗口条的形态。`0:main 1:about 2:build 3:sched 4:wall 5:faq 6:msg 7:join`
  一排窗口，数字键或点击切换，**每个窗口的滚动位置各自保留**——这是「复用器」的本分；
- **lazygit（~84k★）**：底部常驻按键图例栏，让键盘流可被发现而不用背文档；
- **btop（~33k★）**：main 窗口里的方角仪表条，以及 sched 窗口里 60 分钟的分段时间轴；
- **dsh-TUI（~6.8k★）**：启动页的「鲸鱼 + 像素字标 + 三行元信息 + 一条细线」骨架，
  以及底部状态条的路径 / 按键 / 运行时长三段式。

### 19.2 窗口里的文案是终端味重写的

八个窗口的内容**不与其它皮肤共用**，是按同样的真实信息（QQ 群、邮箱、活动节奏、
资源链接、FAQ）重新写成的一套终端文体：

- `0:main` — 启动页：像素鲸鱼 + 17×5 的 HNYZ 字标、版本 / 路径 / TIP、标语、
  `whoami`、仪表条、联系方式；
- `1:about` — man page：NAME / SYNOPSIS / DESCRIPTION / SEE ALSO；
- `2:build` — `git log --oneline ~/repos`：仓库列表直接读 `data/repos.json` 快照；
- `3:sched` — `crontab -l`：活动节奏写成三条 cron，配 60 分钟分段条；
- `4:wall` — `ls -la /srv/wall`：资源墙的两个入口；
- `5:faq` — 可折叠的问答；
- `6:msg` — `tail -f guestbook.log`：留言说明 + 跳到真留言板（giscus 需要真页面）；
- `7:join` — `ssh newmember@hnyz`：群号、邮箱、备注，复制按钮齐全。

字标还是 CSS Grid 逐格画的点阵，一格一个 `<i>`：不用字符画，
块字符（█）在不同字体里宽度不稳定，点阵永远清晰，带 `aria-label`。

鲸鱼换成 Deepy 之后是另一套做法（`js/term-tui.js` 的 `deepyBox()` / `stepDeepy()`）：

- **数据**：`data/deepy.json` 存 `idle / idle-spout / swim / happy / notification /
  poke-left / poke-right` 七组帧，每帧一行 1260 字符的调色板索引；gzip 后 2KB；
- **静态先行**：首帧另存成 `images/deepy/idle.webp`（1.2KB），`<img>` 先站着，
  脚本把帧数据取回来、把每一帧预渲染到离屏 canvas 之后，才叠上 `<canvas>` 播放，
  中途失败也只是「鲸鱼不动」，不会留一块空白；
- **待机**：`idle` 循环；每 9–16 秒随机插入一段 `idle-spout` 或 `swim` 再回待机，
  所以它不会像一张贴图；
- **互动**：点一下（或聚焦后按 Enter / 空格）随机播 `happy / poke-left / poke-right /
  idle-spout`，播完回 `idle`；
- **降级**：`prefers-reduced-motion: reduce` 时只留静态首帧，不取动画数据；
  顶栏那只小鲸鱼就是同一张首帧压到 1px 一格（42×30）。

### 19.3 命令行是真的

底部 `guest@hnyz:~$` 后面是一个真的 `<input>`：

- 敲窗口名或编号切窗口；`gallery` / `member` / `projects` 跳对应页面；
- `ls` 列窗口、`whoami` 报身份、`clear` 清回显、`help`（或按 `?`）看全部命令；
- 敲错报 `tty: command not found`，回显区最多留六行，`aria-live="polite"`。

键盘：`0-7` 切窗、`:` 或 `/` 聚焦命令行、`↑↓` / `j k` 滚动当前窗口、`?` 帮助。
焦点不在输入行时才接管按键，输入行里 Esc 只是失焦。

### 19.4 顶栏按钮是「搬」进来的

TTY 打开时把原顶栏的 `.header-actions`（音效 / 全屏 / 风格 / 主题）整块搬进 TTY 顶栏，
关掉时再搬回原位——监听器都在元素上，搬家不影响功能，也不用重绑。
`.nav-toggle` 在终端里没有意义（窗口条就是导航），随 CSS 藏掉。
风格面板平时 z-index 低于 TTY，终端开着时抬到 620，保证切皮肤入口永远可点。

### 19.5 内页还是纸带

内页（项目、图集、成员）凑不满八个窗口，`sync()` 里查 `section.hero`，
不是首页就不建 TTY，维持同色系纸带布局；右下角那行 `hnyz@club ~/ $ cat about.md`
状态栏照旧跟着滚动换命令。

### 19.6 雾蓝是两套，不是一套

`css/skin-term.css` 与 `css/term-tui.css` 都读同一组 `--t-*` / `--tty-*` 变量：
浅色取 dsh 的 light（纸底 `#F6F3ED`、面板 `#FFFFFF`、墨字 `#343945`、主蓝 `#3F6CC4`、
边框 `#ABC2EC`），深色取 dsh 的 dark（面板 `#242B3A`、暖白字 `#E8E6E0`、主蓝 `#7DA1DE`）。
换主题只换变量值，两套的明度关系一致，不会出现「深色版某块忽然看不见」。

语义色沿用 dsh 的角色划分：绿 `#4E9675` 给计划与进度，琥珀 `#C08A3E` 给 man page 字段，
紫 `#9B86B8` 给语言标签，红 `#C65D6B` 只留给报错。

### 19.7 设计上守住的几条

- **每个窗口是一块带边框的 pane**：活动窗口边框转成主蓝，pane 顶部粘着一条
  `▌ 0:main — MOTD` 标题条（`position: sticky`，内容从它底下滚过）——
  框架感来自这些「框」和「线」，不是来自装饰。
- **不用渐变、不用阴影、不用圆角**，表面之间靠白 / 纸 / 蓝灰线三层分层；
  颜色全走变量，框架拆走不留全局规则。
- **一种字体**：全站等宽；**动效只有一行行「打印」出来的错峰淡入**，
  每行延迟 `min(行号, 22) × 34ms`，`prefers-reduced-motion` 时全部直出。
- 切走皮肤时整套 DOM 连监听一起拆掉（`Esc` / `hashchange` / `resize` 只在模块加载时
  绑一次，不会随「切走再切回」累积）。

---

## 20. 顶栏的全屏按钮

右上角功能区里那枚四角图标，用的是浏览器原生 Fullscreen API，不造假全屏。
假全屏（自己把容器撑满）会和站点的 fixed 元素打架：顶栏、终端风的 TTY、光场的整个 iframe
都会各自算错位置。

- 进入后图标从「四角向外」翻成「四角向内」，`aria-pressed` 跟着变，读屏能读出来；
- 不支持的环境直接把按钮藏掉。iOS Safari 的全屏只对 `<video>` 有效，
  留一个点了没反应的按钮比没有更糟；
- 全屏状态变化时监听 `fullscreenchange`（以及各家的前缀版本）同步按钮状态，
  用 Esc 退出也能同步上；
- 全屏会触发一次 `resize`，光场 iframe 靠这个事件重算尺寸（终端风的 TTY 是纯 flex 布局，不用重算），
  不需要额外通知。

---

## 21. 设计系统与中文排版

排版这块借了 [歸藏设计](https://github.com/op7418/dsh-guizang-design)（`op7418/dsh-guizang-design`）
的网页排版 skill：那套东西的价值不在某张页面长什么样，而在它把「字号、间距、行长、
中文规则」收成了一套可复用的 token，PPT、卡片、网页三个出口共用一把尺子。
本站只搬能迁移的部分，版式还是自己的。

### 21.1 字号阶梯

以前全站散着 `0.58rem` 到 `1.04rem` 十几种字号，同一个层级的标签在不同组件里能差 2px。
现在只留七级（`css/style.css` 的 `:root`）：

| Token | 值 | 像素 | 用在哪 |
|---|---|---|---|
| `--fs-display` | `clamp(2.9rem, 5.2vw, 4.4rem)` | 46–70 | 页面大标题（h1） |
| `--fs-heading` | `clamp(1.9rem, 3.4vw, 2.6rem)` | 30–42 | 章节标题（h2） |
| `--fs-subhead` | `1.5rem` | 24 | 卡片标题 |
| `--fs-lead` | `1.125rem` | 18 | 项目名、条目标题 |
| `--fs-body` | `1.0625rem` | 17 | 正文 |
| `--fs-small` | `0.9375rem` | 15 | 卡片简介、次要信息 |
| `--fs-caption` | `0.8125rem` | 13 | 标签、图注 |
| `--fs-meta` | `0.75rem` | 12 | 等宽小字、角标、数据栏 |

12px 是下限：原来 9px 的封面角标、10px 的复制按钮、10.9px 的统计说明都抬到了 12px，
先保证看得清，再谈密度。

### 21.2 间距只走八个刻度

`--space-1` 到 `--space-9`：4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96。
区块上下留白统一到 96px，章节标题与正文之间 48px，卡片内部 24px。
以前 92px、40px、18px 混着用，滚动时节奏是碎的。

### 21.3 中文按中文的规矩排

- 正文 17px / 行高 1.8；行长上限 `36em`（约 612px，36 个汉字），超过就换行；
- `line-break: strict` 避头尾，`text-spacing-trim: normal` 挤掉标点多余的全角空白，
  `hanging-punctuation: allow-end`（Safari）让句号挂在栏外；
- 中文字距归零。之前标题写 `letter-spacing: -0.02em` 到 `-0.045em`，
  汉字是方块，负字距只会让笔画粘在一起；
- 标题字重从 800 降到 700。系统黑体 800 在中文大字号下发死，700 已经够重；
- 中文不用伪斜体（强调靠颜色和字重，不靠斜体），这条和归藏的设计规则一致。

### 21.4 少画线，多留白

- 区块之间不再画上下边框，靠 96px 留白和一层更浅的纸色（`--section--soft`）分开；
- 章节标题原来同时有「标签前短横线」和「标题上边框」两条线挨着，现在只留短横线；
- 大面积纯白换成冷白 `#FCFDFF`（面板）与 `rgba(252, 253, 255, 0.8)`（顶栏），
  纯白在浅蓝底上会发青、发刺眼；
- 全站仍然只有一个强调蓝（`--blue`），绿和橙只做语义色（成功、Arduino），
  不参与装饰。

这些规则全在基础层，六套皮肤的身份色、字体、版式一条没动；
极简黑白、黑客荧光绿、终端雾蓝、光场、空白各自还是原来的样子。

## 22. 性能与加载

这一轮做的是「少下载、少阻塞、少重排」，不靠压缩工具改构建流程：

- **皮肤 CSS 按需加载**：`js/skin-boot.js` 在 `<head>` 里只插入当前皮肤的样式
  （终端风两份、光场一份），默认风与其它皮肤不再为它们付流量；
  鼠标移到「风格」按钮上或键盘聚焦时再预热其余皮肤，切肤不空窗。
  切皮肤的 `commit()` 里还有一层 `HNYZCSS.ensure()` 兜底。
- **图片**：图集 / 贴纸 / 立绘统一重编码（WebP q74–76，长边 ≤1280），
  图片总量 1142KB → 958KB（透明通道原样保留，立绘不糊边）；删掉没人引用的 `animdustry.jpg`（128KB）。
  图片一律带 `loading="lazy"`、`decoding="async"` 与宽高，避免 CLS。
- **首屏以下的区块**用 `content-visibility: auto` + `contain-intrinsic-size` 占位，
  首帧只排版第一屏；`prefers-reduced-motion` 时关闭。
- **背景不再 `fixed`**：滚动时省掉一次大面积重绘，移动端尤其明显。
- 代码雨本就只在黑客风启动、页面不可见就停；光场 iframe 只在切到光场时创建。
- **Deepy 不挡首屏**：静态首帧 1.2KB 跟图片一起预缓存；动画数据
  `data/deepy.json`（83KB，gzip 后 2KB）要等 `requestIdleCallback` 才 fetch，
  并且只取一次、逐帧预渲染到离屏 canvas，播放时每帧只做一次 `drawImage`。
  `prefers-reduced-motion` 下连这次请求都不发。

实测（本地静态服务、禁用缓存、1440×900）：

| 页面 | 之前 | 之后 |
|---|---|---|
| 首页（默认风） | 663KB / 39 请求 / DCL 136ms | 565KB / 34 请求 / DCL 60ms |
| 图集 | 1300KB / 45 请求 | 1114KB / 44 请求 |
| 项目 | 1104KB / 71 请求 | 1015KB / 69 请求 |

终端风因为要加载两份皮肤 CSS，字节数与之前接近（598KB），但换来了其它皮肤用户的按需加载。

---

## 23. 致谢

有两样东西不是我们写的，都在这里说清楚：

**[HALOFLUX](https://github.com/Ryder191/haloflux) by Ryder191**（RYDER CODE / Ms MAIKEBAIs CAT），「光场」皮肤的本体，Copyright (c) 2026。按 [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/) 授权，**只能非商业使用**。`halo.html` 文件头保留了原始声明；本站是学校社团的非营利站点，在授权范围内。转载或二创请保留声明，注明「HALOFLUX by Ryder191」。

**[Animdustry](https://github.com/Anuken/animdustry) by Anuken**。「全部项目」页那排角色、原版像素字体（`fonts/anim-title.ttf` / `anim-pixel.ttf`）和音效（`audio/`）都取自这个游戏，仅用于社团非营利展示。

**[dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) by ccch1mneyyy**（MIT）。终端风的 Deepy 小鲸鱼
（`assets/deepy/frames.json` 的 42×30 帧数据）来自这个仓库，本站只截了七个动画，
转成 `data/deepy.json` 用 canvas 播放；原仓库说明这是一份非官方粉丝作品。
顶栏布局、窗口条、状态条的交互骨架也参照了它的落地页，代码是自己写的。

**[歸藏设计](https://github.com/op7418/dsh-guizang-design) by op7418**（AGPL-3.0）。
第 21 节的字号阶梯、间距刻度与中文排版规则参考了它的网页排版 skill；只借鉴规则和取值，
没有引入它的任何代码、样式文件或字体，站点仍是纯手写 CSS。

其余的代码都是社团手写的。想给自己的网站也加点这样的东西，先去读一遍上面两个项目的授权条款。
