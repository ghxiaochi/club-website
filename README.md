# HNYZ · 衡南一中编程社官网

一个纯静态的社团官网：**HTML + CSS + 原生 JavaScript**，没有后端、没有数据库、没有构建步骤。

整体是蓝白科技风：浅蓝底、白色卡片、深海军蓝文字。教学内容以 **Arduino 硬件编程**为主线。右下角有一个不署名的校徽，随页面滚动旋转，点击会说一句社团台词；「全部项目」页左下角还有 ghxiaochi 的像素头像彩蛋，点击若干次会出现隐藏台词。首页加入区有 2026–2027 QQ 群二维码；「全部项目」页的 ghxiaochi 分组顶部有个人主页横幅和两张 Q 版贴纸。项目卡片通过 **GitHub API** 读取仓库信息；首页展示前 6 个，完整列表在单独的「全部项目」页按成员折叠。遇到 403 限流、404 或网络异常会自动切换到本地缓存或降级卡片。

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
├── css/
│   ├── style.css           # 全站样式（蓝白科技风）
│   ├── pet.css             # 右下角校徽背景板样式
│   └── avatar-pet.css      # 左下角像素头像彩蛋样式
├── js/
│   ├── members.js          # 项目清单（唯一需要手动维护的数据）
│   ├── main.js             # GitHub API、缓存、卡片渲染、折叠、交互
│   ├── pet.js              # 校徽滚动旋转、点击说话
│   └── avatar-pet.js       # 头像点击台词与彩蛋
├── images/
│   ├── favicon.svg
│   ├── og-cover.png        # 1200×630 分享图
│   ├── project-website.svg # 社团官网封面
│   ├── project-zaco.svg    # Zaco 猜数字封面
│   ├── join/
│   │   └── qq-group-qr.svg  # 2026–2027 QQ 群二维码
│   ├── personal/
│   │   ├── chibi-1.jpg      # ghxiaochi 主页贴纸
│   │   └── chibi-2.jpg      # ghxiaochi 主页贴纸
│   └── pet/
│       ├── badge-school-hd.webp  # 高清校徽
│       └── ghxiaochi-avatar.webp # 像素头像彩蛋
├── robots.txt
├── sitemap.xml
└── README.md
```

---

## 3. 本地预览

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

## 7. 换主题色

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

改这几个变量即可整体换色，不需要逐个改选择器。

校徽位于两页的 `.hnyz-pet`，样式在 `css/pet.css`，交互在 `js/pet.js`。图片为 `images/pet/badge-school-hd.webp`，放在右下角的浅蓝背景板里；如需停用，删除页面中的 `.hnyz-pet` 结构即可。

像素头像彩蛋位于 `projects.html` 的 `.hnyz-avatar`，样式在 `css/avatar-pet.css`，交互在 `js/avatar-pet.js`。点击会轮播「干嘛？」等台词，点满 6 次显示「我绝对不会偷偷告诉你，这是AI写的网页」。它固定在左下角，右下角仍然保留校徽。

加入区的 QQ 群二维码图片是 `images/join/qq-group-qr.svg`，群号仍以文本和复制按钮为准，二维码只是更方便手机扫码。ghxiaochi 的个人主页横幅由 `js/main.js` 的 `createMemberProfile()` 注入到「全部项目」页的第一个成员分组里，两张贴纸在 `images/personal/`。

---

## 8. 部署到 GitHub Pages

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

## 9. 验收清单

- [ ] 本地打开 `index.html` 能看到完整首页
- [ ] 首页项目卡片由 GitHub API 渲染，最多 6 张
- [ ] 「查看全部项目」能跳转到 `projects.html`，成员折叠面板可展开 / 收起
- [ ] 封面图正常显示；`coverImg` 为空时显示科技网格占位
- [ ] 卡片 Hover 有蓝色边框、发光和上浮
- [ ] 手机宽度下卡片单列、导航可展开
- [ ] QQ 群号 / 邮箱可以一键复制，加入区二维码可扫码
- [ ] 资源墙的 C++ 和微雪 ESP32 链接可跳转
- [ ] 断网或 403 时页面仍能显示降级卡片
- [ ] 校徽在首页和全部项目页右下角；像素头像彩蛋在全部项目页左下角，点满 6 次出现隐藏台词
- [ ] ghxiaochi 分组有个人主页横幅和两张贴纸，且不遮挡项目卡片
- [ ] 分享链接有 `og:image`（1200×630）和 `twitter:card`
- [ ] 不依赖任何后端

---

## 10. FAQ

**Q：为什么卡片显示 `DEGRADED`？**  
A：GitHub API 返回了 403（限流）、404 或网络异常，页面自动用了本地缓存或 `js/members.js` 里的字段降级渲染。stars / forks 未知时显示 `—`，不会假装成 0。

**Q：为什么改了 `members` 但页面没变化？**  
A：先强制刷新；确认改的是 `js/members.js` 里的 `window.HNYZ_MEMBERS`，不是旧版 `projects.json`。当前版本已经不再读取 `projects.json`。

**Q：Star / Fork 数量不更新？**  
A：成功请求会缓存 10 分钟，所以短时间内看到的是缓存值；超过 10 分钟或强制刷新后会重新请求。确认仓库是公开的，且没有触发 403 限流。

**Q：可以加更多仓库吗？**  
A：可以，`members` 没有数量上限。首页只展示前 6 个；更多项目会自动进入 `projects.html`，按成员折叠展示。
