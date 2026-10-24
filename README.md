# HNYZ · 衡南一中编程社官网

一个纯静态的社团官网：**HTML + CSS + 原生 JavaScript**，没有后端、没有数据库、没有构建步骤。

整体是蓝白科技风：浅蓝底、白色卡片、深海军蓝文字。右下角有一个不署名的原创蓝白机器人桌宠，徽章随页面滚动旋转，点击会说一句社团台词。项目卡片通过 **GitHub API** 读取仓库信息；首页展示前 6 个，完整列表在单独的「全部项目」页按成员折叠。遇到 403 限流、404 或网络异常会自动切换到本地兜底数据。

- **线上地址**：<https://ghxiaochi.github.io/club-website/>
- **仓库地址**：<https://github.com/ghxiaochi/club-website>
- **QQ 群**：`1098931492`
- **邮箱**：`483677268@qq.com`

---

## 1. 页面内容

- **首屏**：HNYZ 品牌、`把想法，写成代码。`、每周两次 / 每次一小时、QQ 群 / 邮箱快捷复制
- **关于社团**：社团介绍、基本信息、活动频率
- **我们做什么**：编程入门、项目实战、算法与竞赛、分享与协作
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
│   └── pet.css             # 右下角桌宠样式
├── js/
│   ├── main.js             # GitHub API、卡片渲染、折叠、交互
│   └── pet.js              # 桌宠滚动旋转、点击说话
├── images/
│   ├── favicon.svg
│   ├── project-website.svg # 社团官网封面
│   ├── project-zaco.svg    # Zaco 猜数字封面
│   └── pet/
│       ├── figure.svg      # 原创蓝白机器人
│       └── badge.svg       # 自绘 HNYZ 徽章
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

打开 `js/main.js`，只改顶部的 `members` 数组：

```js
const members = [
  {
    user: "ghxiaochi",
    repo: "club-website",
    coverImg: "images/project-website.svg",
    title: "社团官网 HNYZ",
    desc: "HNYZ 社团官网：纯手写 HTML / CSS / JavaScript，部署在 GitHub Pages。"
  },
  {
    user: "ghxiaochi",
    repo: "zaco-guess-number",
    coverImg: "images/project-zaco.svg",
    title: "Zaco 猜数字",
    desc: "运行在 Arduino 上的猜数字小游戏，练习随机数、循环和串口交互。"
  },
  {
    user: "ghxiaochi",
    repo: "led",
    coverImg: "",
    title: "LED 硬件实验",
    desc: "从点亮第一颗 LED 开始，练习 GPIO、基础电路和嵌入式程序结构。"
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
| `403` | 未登录 API 限流（60 次 / 小时 / IP），显示本地兜底数据和提示 |
| `404` | 仓库不存在、改名或私有，显示 404 提示卡片 |
| 网络错误 | 显示本地兜底数据 |

项目区右侧的 `REPOS // GITHUB_API` 表示实时数据；出现 `DEGRADED` 表示用了兜底数据，页面顶部会出现黄色提示条。

> 想减少限流影响，可以给 `fetch` 增加 GitHub Token，或把常用数据缓存到 `localStorage`。当前版本保持简单，不引入 Token。

---

## 6. 修改品牌 / 联系方式

全局搜索替换即可：

| 内容 | 出现位置 |
| --- | --- |
| `HNYZ` | `index.html`、`README.md`、封面 SVG |
| `1098931492` | `index.html` 中 `data-copy-value` 和文本 |
| `483677268@qq.com` | `index.html` 的 `mailto:` 和 `data-copy-value` |
| `ghxiaochi` | `index.html` 的 GitHub 链接、`js/main.js` 的 `members` |

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
  --muted: #5b7594;       /* 次要文字 */
  --blue: #2563eb;        /* 主蓝 */
  --green: #0369a1;       /* 深天蓝辅助色 */
}
```

改这几个变量即可整体换色，不需要逐个改选择器。

桌宠位于 `index.html` 的 `.hnyz-pet`，样式在 `css/pet.css`，交互在 `js/pet.js`。它使用原创机器人形象和自绘 HNYZ 徽章，不使用真实人物照片或学校官方校徽；如需停用，删除 `index.html` 中的 `.hnyz-pet` 结构即可。

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
- [ ] QQ 群号 / 邮箱可以一键复制
- [ ] 资源墙的 C++ 和微雪 ESP32 链接可跳转
- [ ] 断网或 403 时页面仍能显示兜底卡片
- [ ] 不依赖任何后端

---

## 10. FAQ

**Q：为什么卡片显示 `DEGRADED`？**  
A：GitHub API 返回了 403（限流）、404 或网络异常，页面自动用了 `main.js` 里的 `FALLBACK_REPOS` 兜底数据。

**Q：为什么改了 `members` 但页面没变化？**  
A：先强制刷新；确认改的是 `js/main.js` 顶部的 `members`，不是旧版 `projects.json`。当前版本已经不再读取 `projects.json`。

**Q：Star / Fork 数量不更新？**  
A：数据来自 GitHub API 实时请求，可能有几分钟缓存。确认仓库是公开的，且没有触发 403 限流。

**Q：可以加更多仓库吗？**  
A：可以，`members` 没有数量上限。首页只展示前 6 个；更多项目会自动进入 `projects.html`，按成员折叠展示。
