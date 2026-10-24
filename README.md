# HNYZ · 衡南一中编程社官网

一个纯静态的社团官网：**HTML + CSS + 原生 JavaScript**，没有后端、没有数据库、没有构建步骤。

整体是 GitHub Dark 风格的赛博 / 极客科技风。项目卡片通过 **GitHub API** 读取仓库信息，遇到 403 限流、404 或网络异常会自动切换到本地兜底数据。

- **线上地址**：<https://ghxiaochi.github.io/club-website/>
- **仓库地址**：<https://github.com/ghxiaochi/club-website>
- **QQ 群**：`1098931492`
- **邮箱**：`483677268@qq.com`

---

## 1. 页面内容

- **首屏**：HNYZ 品牌、`把想法，写成代码。`、每周两次活动、QQ 群 / 邮箱快捷复制
- **关于社团**：社团介绍、基本信息、活动频率
- **我们做什么**：编程入门、项目实战、算法与竞赛、分享与协作
- **项目展示**：通过 GitHub API 读取 `members` 数组中的仓库，渲染 16:9 封面卡片
- **活动节奏**：每周两次活动、一次活动的流程
- **资源墙**：C++ 菜鸟教程、ESP32 Arduino 官方文档
- **常见问题**：原生 `<details>` FAQ
- **加入我们**：QQ 群、邮箱、三步加入流程

### 项目卡片结构

从上到下：

1. **16:9 封面**：`coverImg` 有值就显示图片，`object-fit: cover`；为空显示科技网格占位图
2. **标题 + 所有者**：粗体亮色项目名，灰色 `@用户名`
3. **简介**：最多 3 行，超出显示省略号
4. **底部数据栏**：等宽字体展示 `LANG / 🌟 Stars / 🍴 Forks`
5. **查看源码**：带边框的科技风按钮

卡片 Hover 时边框变科技蓝，出现 `0 0 10px rgba(88,166,255,.3)` 的微弱发光，并轻微上浮。

---

## 2. 文件结构

```text
club-website/
├── index.html              # 页面结构
├── css/
│   └── style.css           # 全站样式（暗黑赛博风）
├── js/
│   └── main.js             # GitHub API、卡片渲染、交互
├── images/
│   ├── favicon.svg
│   ├── project-website.svg # 社团官网封面
│   └── project-zaco.svg    # Zaco 猜数字封面
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

### 封面图

- 推荐 16:9，例如 1600×900
- 本地图片放到 `images/`，`coverImg` 写相对路径
- 也可以直接用远程图片 URL
- 图片加载失败会自动替换成科技网格占位图，不会出现破图

---

## 5. 数据与异常兜底

`js/main.js` 使用 `Promise.all` 并发请求：

```js
const projects = await Promise.all(members.map((member) => fetchRepo(member)));
```

本地 `desc` 优先于 GitHub 仓库自带的简介；只有两者都为空时，卡片才会显示「这个仓库还没有填写简介」。

每个请求内部处理异常，所以一个仓库失败不会影响其他卡片：

| 情况 | 处理 |
| --- | --- |
| `200` | 正常读取 `name / description / language / stargazers_count / forks_count / html_url` |
| `403` | 未登录 API 限流（60 次 / 小时 / IP），显示本地兜底数据和提示 |
| `404` | 仓库不存在、改名或私有，显示 404 提示卡片 |
| 网络错误 | 显示本地兜底数据 |

右下角 `REPOS // GITHUB_API` 表示实时数据；出现 `DEGRADED` 表示用了兜底数据，页面顶部会出现黄色提示条。

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

活动频率在 `index.html` 里搜索 `每周 2 次` / `每周两次`，涉及首屏数据、社团信息、活动节奏和 FAQ。

资源墙链接在 `index.html` 的 `#wall` 区块中，直接改 `href` 即可。

---

## 7. 换主题色

所有颜色集中在 `css/style.css` 顶部的 `:root`：

```css
:root {
  --bg: #0d1117;          /* 页面背景 */
  --panel: #161b22;       /* 卡片背景 */
  --border: #30363d;      /* 边框 */
  --text: #e6edf3;        /* 主文字 */
  --muted: #8b949e;       /* 次要文字 */
  --blue: #58a6ff;        /* 科技蓝 */
  --green: #3fb950;       /* 荧光绿 */
}
```

改这几个变量即可整体换色，不需要逐个改选择器。

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
- [ ] 项目卡片由 GitHub API 渲染，至少 3 张
- [ ] 封面图正常显示；`coverImg` 为空时显示科技网格占位
- [ ] 卡片 Hover 有蓝色边框、发光和上浮
- [ ] 手机宽度下卡片单列、导航可展开
- [ ] QQ 群号 / 邮箱可以一键复制
- [ ] 资源墙的 C++ 和 ESP32 链接可跳转
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
A：可以，在 `members` 里继续追加。建议 3–6 个，页面最整洁。
