# HNYZ · 衡南一中编程社

一个没有后端、没有构建步骤的社团官网。纯手写 HTML / CSS / JavaScript，部署在 GitHub Pages。

<https://hnyzbcs.de5.net/>

---

## 功能实现

### 1. 页面

| 文件 | 作用 |
| --- | --- |
| `index.html` | 首页：首屏、关于、项目、活动、资源墙、FAQ、留言板、加入 |
| `projects.html` | 全部项目，按成员折叠 |
| `member.html` | 成员主页，`?u=<GitHub 用户名>` |
| `gallery.html` | 图集，筛选 + 灯箱 |
| `dino.html` | 小恐龙天梯榜 |
| `halo.html` | 「光场」皮肤的独立页面，被 iframe 嵌入 |
| `404.html` | 任意错误路径的兜底页 |

所有页面共用 `css/style.css`（基础层）、`css/type.css`（排版）、`css/skins.css`（皮肤层）与 `js/skins.js`（切换器）。

---

### 2. 六套风格

| 值 | 名称 | 实现 |
| --- | --- | --- |
| `default` | 蓝白科技 | `style.css` + `skins.css` |
| `minimal` | 极简 | `skins.css` 的 `html[data-style="minimal"]` |
| `hacker` | 黑客终端 | `skins.css` + `js/matrix.js`（代码雨） |
| `term` | 终端 | `css/skin-term.css` + `css/term-tui.css` |
| `halo` | 光场 | `css/skin-halo.css` + `halo.html` iframe |
| `bare` | 棍木 | `skins.css` 末尾，整页只留风格按钮 |

**切换与持久化**

- 选择存在 `localStorage` 的 `hnyz:style`，各页面共用。
- `js/skins.js` 暴露 `window.HNYZ_STYLE.apply(name)`，用 `document.documentElement.dataset.style` 驱动全部样式。
- 顶栏方块按钮打开 `<dialog>` 风格面板，支持点击、方向键、滚动吸附。
- 切换时整屏向上擦除（`.style-wipe`），换肤发生在幕布盖住之后；`prefers-reduced-motion` 下直接切换。
- 切到全屏皮肤（term / halo / bare）前记录滚动位置，切回普通页面时恢复。

**按需加载**

`js/skin-boot.js` 在 `<head>` 里同步插入当前皮肤的 CSS，其余皮肤在鼠标移到风格按钮时才预取；`HNYZCSS.ensure(name)` 供切换时兜底。

`js/skins.js` 另外按需创建：黑客风的 `matrix.js`、光场的 iframe、终端风的会话状态条。离开时全部拆除，不留后台动画。

**默认皮肤的底色与气泡**

- 背景是一条纯色（`--bg`），**不在 body 上平铺任何图案**：平铺在长页面上会变成一层灰噪点。
- 装饰是三张气泡图：`images/decor/bubble-a/b/c.svg`（蓝 / 青 / 紫），深色另有一套 `-dark`。圆心都压在视口外，只露一部分，正文区域永远是空的；手机缩到 220–340px。
- 为什么用 SVG 而不是位图：这种「大面积柔光 + 很淡的边」的低对比长渐变，位图的 alpha 只有几十级，放大后是一圈圈色带（WebP 更明显）；SVG 交给浏览器栅格化，渐变自己会抖，单张不到 1KB。重生成用 `scripts/make-bubbles.py`。
- 辅色收在变量里：`--cyan` / `--indigo` / `--violet` / `--mint`。它们只出现在小面积上——标题后半句、主按钮、四个统计数字、四张关键词贴纸、小节编号、封面角标；底色和卡片仍然是白。
- 换底色只改 `--bg` 和三张 SVG 里的 `stop-color`，不用动组件。
- 手机端：首屏圆环挪到右上角外沿只露一段弧，两个按钮横排，首屏能完整看到四张统计卡和四张贴纸。

**皮肤覆盖范围**

`skins.css` / `skin-term.css` 覆盖顶栏、按钮、卡片、表单、FAQ、项目卡、成员页、图集、页脚、桌宠。图集页的深蓝底板与白色卡片也各有对应版本，不会在暗色皮肤里留一块亮斑。

新增皮肤：加一个 `[data-style="xxx"]` 变量块，按现有皮肤补齐组件覆盖，在 `skins.js` 的 `STYLES` / `LABELS` / `NAMES` 和面板模板里登记；需要独立 CSS 时写进 `skin-boot.js` 的 `SKINS`。

---

### 3. 首页的终端工作台（`term`）

`js/term-tui.js` + `css/term-tui.css`。只在首页（存在 `section.hero`）启用，内页保持普通排版。

- **布局**：左栏四个板块（概览 / 关于 / 作品 / 加入），中区 12 列方块矩阵，右栏当前板块的方块索引，底部命令行与状态条。
- **方块**：`tile(编号, 标题, 列数, 角标, 内容)`，每块用 `--c` 指定占几列（7+5、5+4+3、8+4、4+4+4），行高 `minmax(min-content, 1fr)`。
- **切换板块**：旧矩阵 `scale(.94)` 淡出，新矩阵从 `scale(1.045)` 缩回，方块按 26ms 错峰浮起。
- **命令行**：`overview` / `about` / `work` / `join`、`0-3`、`[` `]`、`h` `l`、方向键；别名 `main` `build` `git` `man` `sched` `faq` `msg` `ssh`；还有 `ls` `whoami` `clear` `help`。
- **Deepy 鲸鱼**：`data/deepy.json` 存 42×30 的七组帧，离屏 canvas 预渲染 + `drawImage` 播放；静态首帧 `images/deepy/idle.webp` 兜底，待机随机插播，点击换表情。

---

### 4. 项目数据

**三层数据源**

1. `localStorage` 的 `hnyz:github-repo-cache:v1`（10 分钟 TTL，最多 40 条）。
2. `data/repos.json`：GitHub Actions 每天 21:17 UTC 抓一次的静态快照，不消耗访客的 API 额度。
3. `https://api.github.com/repos/{user}/{repo}`：前两层都没有这个仓库时才实时请求。

三层都失败时渲染降级卡片，页面不会空白。卡片角标说明当前来源：`每日快照` / `本地缓存` / `实时接口` / `部分降级` / `刚刚刷新`。

**项目清单**

只改 `js/members.js` 的 `HNYZ_MEMBERS`：

```js
{
  user: "ghxiaochi",          // GitHub 用户名
  repo: "club-website",       // 仓库名
  coverImg: "images/x.svg",   // 可留空，自动生成网格占位图
  title: "社团官网 HNYZ",      // 卡片标题
  desc: "本地简介",            // 仓库没写 About 时兜底
  language: "CSS",            // API 不可用时降级显示
  external: true              // 可选：外站项目，不请求 API
}
```

首页取前 6 个；`projects.html` 按 `user` 分组，展开某位成员时才请求他的仓库。

**一键刷新**

`js/repo-sync.js` 监听顶栏的圆形箭头按钮：跳过快照与 10 分钟缓存，直接向 GitHub 拉全部仓库，写回同一个缓存键。

- 点下去先弹进度（`0 / 5 · 正在刷新`），不等网络；3 秒没回会补一句「网络有点慢」。
- 每个仓库同时问 `api.github.com` 和 `ungh.cc` 镜像，谁先回先用谁：镜像通常 300ms 内到，卡片立刻更新；api 后到再补 language 这类镜像没有的字段。
- 单个仓库回来就单独重画那张卡（`hnyz:repo-updated` → `patchCard`），只改文字不重建 DOM，封面不闪；全部回来后 `hnyz:repos-synced` 只补一次状态角标。
- 并发上限 10，五个仓库一次发完，不再分两批。
- 撞上 403 限流只提示，不删除已有数据。

---

### 5. 图集

`js/gallery-data.js` 是清单：

```js
{
  src: "images/gallery/meme-01.webp",          // 原图，灯箱用
  thumb: "images/gallery/thumb/meme-01.webp",  // 560px，网格用
  title: "这支笔", tag: "梗图", w: 1080, h: 1172
}
```

- 网格加载 `thumb`（长边 560px，约为原图 43%），点开灯箱才要 `src`。新图记得跑一遍 `python3 scripts/make-thumbs.py`。
- 首屏只加载前 4 张，其余用 `IntersectionObserver` 在进入视口前 300px 时再给 `src`；占位靠 `w` / `h` 撑住，不抖。
- 灯箱先显示已经缓存好的 `thumb`，原图到了再换上，中间不白屏；方向键 / 左右滑动翻页，`Esc` 关闭，底部显示「3 / 14」。
- 筛选按钮只切换 `hidden`，不重建 DOM。

---

### 6. 成员主页

`member.html?u=ghxiaochi`。`js/member.js` 从 `js/members.js` 读取：

- `HNYZ_MEMBERS`：这个人的仓库，渲染项目卡。
- `HNYZ_PROFILES`：横幅文案（`kicker` / `title` / `desc` / `intro`）、个性色 `accent`、贴纸 `sprites`、外链 `link`、点击简介才显示的 `secret`。

没有该用户时显示兜底文案与返回入口。

---

### 7. 小恐龙天梯

- `dino.html` 是街机式跑道，`js/dino.js` 驱动；首页与内页的页脚也各有一条自动模式的小跑道。
- 页脚跑道只在进入视口前 600px 才注入 `dino.js`（88KB），首屏不为它付费。
- 榜单 `data/ladder.json` 由 `.github/workflows/ladder.yml` 汇总标题带 `[DINO]` 的 Issues 生成，分数有上限与去重。
- 提交入口在 `dino.html` 的说明区，按模板开 Issue 即可。

---

### 8. 留言板

`js/guestbook.js`，giscus + GitHub Discussions。

- 滚动到留言区附近才插入 giscus 的 `<script>`，首屏不加载第三方 iframe。
- 把当前皮肤 / 主题映射成 giscus 主题，切一次跟一次。
- 监听 `postMessage` 拿高度与错误；没有 Discussion 时提示「发第一条」。
- giscus 只认 GitHub 登录，所以留言框下面固定一条替代路径：复制群号或发邮件，由社团代贴。不为了留言逼人注册账号。

换仓库或分类：去 [giscus.app](https://giscus.app/zh-CN) 重新生成，替换 `guestbook.js` 顶部的 `data-repo` / `data-category-id`。

---

### 9. PWA 与离线

- `manifest.webmanifest`：名称、图标、主题色、`display: standalone`。
- `sw.js`：`VERSION` 控制缓存名，发版必须改。
  - 安装时分两批：`CORE`（页面、基础 CSS/JS、字体、图标、数据）与 `EXTRA`（皮肤、按需脚本、角色图、图集、音频）。`EXTRA` 串行补，失败不影响安装。
  - 页面网络优先，3.5 秒超时回缓存；带 `?v=` 的资源缓存优先；其余静态资源 stale-while-revalidate。
  - 跨域请求（giscus、GitHub API）不缓存。
- 皮肤 CSS 与按需脚本不在 `CORE` 里，离线切到没访问过的皮肤可能缺样式；访问过一次就会被运行时缓存接住。

---

### 10. 页面级小功能

| 功能 | 实现 |
| --- | --- |
| 深浅色 | `js/theme.js`，`hnyz:theme`，黑客风强制深色 |
| 音效开关 | `js/sfx.js` + `audio/`，状态存 `hnyz:sound` |
| 全屏 | `js/fullscreen.js`，`requestFullscreen` |
| 桌宠与校徽 | `js/pet.js`、`js/avatar-pet.js`；常驻的左下角头像在 ≤560px 收起，但首页那颗「召唤」出来的照常显示 |
| 点击特效 | `js/click-fx.js`，换肤期间关闭 |
| 404 | 自包含页面，按 `data-style` 适配蓝白 / 黑客 / 极简 / 终端 |
| 一键复制 | `js/main.js` 的 `[data-copy]` 按钮，QQ 群与邮箱 |
| 导航与滚动 | 移动端抽屉（遮罩 + 锁 body 滚动 + 点遮罩关闭）、顶栏滚动态、页脚年份 |

---

### 11. 性能

- **脚本按需**：`dino.js` 进视口才加载；`matrix.js` 切到黑客风才加载；`term-tui.js` 只在首页；内页不加载终端工作台。
- **样式按需**：皮肤 CSS 由 `skin-boot.js` 管理，当前皮肤同步、其余空闲预取。
- **图片**：图集视口懒加载 + 固定宽高；项目封面与成员头像 `loading="lazy"`；图片统一 WebP。
- **动画**：只动 `transform` / `opacity`；滚动监听合并到 `requestAnimationFrame`；`prefers-reduced-motion` 关闭非必要动效。
- **缓存**：仓库数据 10 分钟、Service Worker 分版本；离线优先返回缓存页面。

发版时改三处版本号：HTML 里的 `?v=`、`sw.js` 的 `VERSION`、`skin-boot.js` 的 `V`。

---

### 12. 本地运行与部署

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

直接双击 `index.html` 也能看，但 Service Worker 与相对路径行为不完整，建议起服务器。

部署：推到 `main`，GitHub Pages 自动发布。自定义域名写在 `CNAME`。两个 Actions：

- `refresh-repos.yml`：每天抓仓库快照，写入 `data/repos.json`。
- `ladder.yml`：汇总 Issues，写入 `data/ladder.json`。

---

### 13. 目录

```
.
├─ index.html / projects.html / member.html / gallery.html / dino.html / 404.html / halo.html
├─ css/        style · type · skins · skin-term · skin-halo · term-tui · 各页面样式
├─ js/         main · skins · skin-boot · term-tui · repo-sync · gallery · member · dino …
├─ data/       repos.json（仓库快照）· ladder.json（天梯）· deepy.json（鲸鱼帧）
├─ images/     项目封面、角色、图集、图标、Deepy 首帧
├─ fonts/      Animdustry 像素字体
├─ audio/      音效
├─ sw.js / manifest.webmanifest
└─ .github/workflows/  refresh-repos.yml · ladder.yml
```

---

## 致谢

**[HALOFLUX](https://github.com/Ryder191/haloflux) by Ryder191**（RYDER CODE / Ms MAIKEBAIs CAT）
「光场」皮肤的本体，Copyright (c) 2026，按 [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/) 授权，仅限非商业使用。`halo.html` 文件头保留原始声明；本站是学校社团的非营利站点，在授权范围内。转载或二创请保留声明并注明出处。

**[Animdustry](https://github.com/Anuken/animdustry) by Anuken**
「全部项目」页的角色立绘、像素字体（`fonts/anim-title.ttf`、`anim-pixel.ttf`）与部分音效取自这个游戏，仅用于社团非营利展示。原作以 GPL-3.0 发布，商用或再分发请遵守其条款。

**[dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) by ccch1mneyyy**（MIT）
终端风的 Deepy 小鲸鱼来自这个仓库的 `assets/deepy/frames.json`（42×30，七组动画），本项目转成 `data/deepy.json` 用 canvas 播放；左侧板块栏、右侧索引、底部输入行与状态条的交互骨架也参照了它的界面，代码为重写。原仓库说明这是一份非官方粉丝作品。

**[歸藏设计](https://github.com/op7418/dsh-guizang-design) by op7418**（AGPL-3.0）
字号阶梯、间距刻度与中文排版规则参考了它的网页排版 skill；只借鉴规则与取值，没有引入任何代码、样式文件或字体，本站仍是纯手写 CSS。

其余代码由社团成员手写。想复刻其中任何一部分，请先阅读上面各项目的授权条款。
