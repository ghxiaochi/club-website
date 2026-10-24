# 衡南一中编程社 HN1Z CODE · 社团官网

一个纯静态的社团官网 MVP：使用 **HTML + CSS + 原生 JavaScript**，没有后端、没有数据库、没有构建步骤。项目卡片由 `projects.json` 驱动，可直接部署到 GitHub Pages。

## 页面包含

- 首屏：社团名称、一句话简介、招新状态和行动按钮
- 关于我们：社团简介、数据概览和三条社团原则
- 项目展示：从 `projects.json` 读取并生成项目卡片，包含技术标签、GitHub 仓库和可选演示链接
- 招新 / 联系：报名邮箱、复制邮箱按钮、微信群二维码占位
- 页脚：快速导航和版权信息
- 响应式布局、卡片 hover、图片缺失占位、键盘可访问
- 无第三方依赖，可离线打开

## 文件结构

```text
club-website/
├── index.html                  # 首页结构
├── css/
│   └── style.css               # 全站样式（颜色变量在文件顶部）
├── js/
│   └── main.js                 # 读取 JSON、渲染卡片、导航、复制邮箱
├── projects.json               # 项目清单（手动维护）
├── images/
│   ├── favicon.svg             # 站点图标
│   ├── project-zaco.svg        # Zaco 猜数字封面
│   └── project-website.svg     # 社团官网封面
└── README.md
```

---

## 本地预览

### 方式 A：直接双击 `index.html`

适合快速看效果，无需安装任何环境。浏览器会直接打开首页，项目卡片使用 `js/main.js` 里的内置示例数据。

> 注意：浏览器安全策略禁止 `file://` 页面通过 `fetch` 读取本地 JSON，所以直接双击时 **不会** 读取最新的 `projects.json`。修改项目数据后，请用方式 B 预览。

### 方式 B：启动本地服务器（推荐）

在 `club-website/` 目录中执行：

```bash
# Python 3（macOS / Linux / Windows 通常可用）
python3 -m http.server 8000

# 如果系统里只有 python
python -m http.server 8000
```

然后打开：

```text
http://localhost:8000
```

此时页面会通过 HTTP 请求读取真实的 `projects.json`，修改后刷新即可看到变化。

也可以使用 Node.js 的任意静态服务器，例如：

```bash
npx serve .
```

> 如果修改 `projects.json` 后仍看到旧内容，先强制刷新浏览器缓存（macOS：`Cmd + Shift + R`，Windows：`Ctrl + Shift + R`）。

---

## 修改内容

### 1. 修改社团名称和文案

打开 `index.html`，搜索以下内容直接替换：

- `HN1Z CODE`：英文名 / 品牌名
- `衡南一中编程社`：中文名
- `2026 秋季招新进行中`：首屏状态
- `hn1z-codeclub@example.com`：报名邮箱（页面中出现多次，建议全局替换）
- 首屏标题、关于我们段落、社团数据、页脚版权

颜色和字体集中在 `css/style.css` 顶部的 `:root` 变量中，例如：

```css
:root {
  --bg: #f4f1e9;        /* 页面背景 */
  --ink: #171813;       /* 主文字 */
  --accent: #ff5a36;    /* 强调色 */
  --lime: #d9ff62;      /* 辅助色 */
}
```

### 2. 当前项目清单

`projects.json` 里目前有三张卡片：

1. **Zaco 猜数字**：真实仓库 `ghxiaochi/zaco-guess-number`
2. **社团官网 HN1Z Code**：本站自己的仓库（创建并上传后即可访问）
3. **下一个社团项目**：占位卡片，改成本社团的下一个真实项目

修改后刷新页面即可看到变化。

### 3. 维护项目清单 `projects.json`

这是一个 JSON 数组，每个对象就是一张项目卡片：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | 项目名称 |
| `desc` | string | 是 | 一句话描述 |
| `tags` | string[] | 否 | 技术标签数组，显示为小胶囊 |
| `repo` | string | 否 | GitHub 仓库链接，必须是 `http(s)` |
| `demo` | string | 否 | 演示链接，可为空字符串 |
| `cover` | string | 否 | 封面图路径；为空时显示自动生成的占位色块 |

示例：

```json
[
  {
    "name": "我的项目",
    "desc": "一句话讲清楚这个项目解决什么问题。",
    "tags": ["JavaScript", "CSS"],
    "repo": "https://github.com/your-name/my-project",
    "demo": "https://your-name.github.io/my-project/",
    "cover": "images/my-project.png"
  }
]
```

修改时注意：

- JSON 不允许注释，最后一项后面不要加逗号。
- 图片路径区分大小写（Linux / GitHub Pages 上尤其明显）。
- 把项目封面放进 `images/`，然后让 `cover` 使用相对路径，例如 `images/my-project.png`。
- 图片建议使用 **16:10** 比例（例如 `1200 × 750`），显示效果最佳。
- `cover` 为空或图片加载失败时，会自动显示带项目首字母和标签的渐变占位块。
- 新增或删除项目后，卡片数量自动变化，不需要改 HTML。

> 直接双击 `index.html` 预览时，页面使用 `js/main.js` 里的 `FALLBACK_PROJECTS`。如果修改了 `projects.json` 又想保持双击预览同步，需要手动更新这段内置数据；用本地服务器预览则不需要。

### 4. 替换微信群二维码

当前招新区块显示的是二维码占位图。替换步骤：

1. 把微信群二维码保存为 `images/wechat-qr.png`（建议正方形，至少 400×400）。
2. 打开 `index.html`，找到 `class="qr-card"` 附近的中文注释。
3. 用下面这行替换掉 `<div class="qr-placeholder">…</div>` 整块：

```html
<img class="qr-image" src="images/wechat-qr.png" alt="衡南一中编程社招新微信群二维码">
```

`style.css` 中已经准备好了 `.qr-image` 样式。

### 5. 替换社交链接

把以下占位链接替换成真实地址：

- `https://github.com/ghxiaochi`（项目区“全部仓库”、页脚 GitHub）
- `https://github.com/ghxiaochi/zaco-guess-number`（示例项目仓库）
- 以后新增项目时，把 `projects.json` 中对应条目的 `repo` / `demo` 换成真实地址

---

## 部署到 GitHub Pages

以下命令在 `club-website/` 目录中执行。下面的示例使用 GitHub 用户名 `ghxiaochi` 和仓库名 `club-website`。

### 第 1 步：创建本地 Git 仓库并提交

```bash
git init
git add .
git commit -m "feat: init club website"
git branch -M main
```

### 第 2 步：在 GitHub 创建仓库

打开 [github.com/new](https://github.com/new)：

- Repository name 填 `club-website`
- 选择 Public（GitHub Pages 免费账户需要公开仓库）
- **不要**勾选 “Add a README file”，因为本地已经有 README
- 点击 Create repository

### 第 3 步：推送代码

```bash
git remote add origin https://github.com/ghxiaochi/club-website.git
git push -u origin main
```

### 第 4 步：开启 GitHub Pages

1. 进入仓库页面 → **Settings**
2. 左侧菜单选择 **Pages**
3. 在 **Build and deployment** 下：
   - Source 选择 **Deploy from a branch**
   - Branch 选择 **main**
   - Folder 选择 **/ (root)**
4. 点击 **Save**
5. 等待 1–3 分钟，页面顶部会出现部署成功的网址

### 第 5 步：访问网址

部署成功后，默认地址格式为：

```text
https://ghxiaochi.github.io/club-website/
```

例如用户名为 `ghxiaochi`，则访问：

```text
https://ghxiaochi.github.io/club-website/
```

> 如果仓库名正好是 `ghxiaochi.github.io`，网址会变成 `https://ghxiaochi.github.io/`。社团项目建议使用普通仓库名 `club-website`，以后还可以继续添加其它仓库。

以后更新内容只需要：

```bash
git add .
git commit -m "update projects"
git push
```

GitHub Pages 会自动重新部署，通常 1 分钟左右生效。

---

## 验收清单

- [ ] 直接双击 `index.html` 或通过本地服务器打开，能看到完整首页
- [ ] 项目卡片由 `projects.json` 渲染（通过本地服务器验证）
- [ ] 修改 `projects.json` 后刷新页面，卡片内容同步变化
- [ ] 封面为空或图片路径错误时显示占位色块，不出现破图
- [ ] 浏览器窗口缩到手机宽度，导航、卡片、招新区域布局正常
- [ ] 项目仓库链接能在新标签页打开
- [ ] 没有后端接口、数据库或第三方运行时依赖
- [ ] 推送到 GitHub 并开启 Pages 后可以公开访问

## 常见问题

**Q：为什么双击打开时改了 `projects.json` 没变化？**
浏览器不允许 `file://` 页面读取本地 JSON。用 `python3 -m http.server 8000` 启动本地服务器即可。

**Q：部署后项目卡片不显示？**
先检查浏览器控制台是否有 404。常见原因是 `projects.json` 或图片文件名大小写不一致，或文件没有提交到仓库。可以用 `git ls-files` 确认文件已上传。

**Q：可以加更多项目吗？**
可以，在 `projects.json` 数组中继续追加对象即可。建议保持 3–9 个项目，页面最整洁。

**Q：需要安装 Node.js 或打包工具吗？**
不需要。整个站点是原生静态文件，GitHub Pages 直接托管即可。

## 技术说明

- 纯 HTML / CSS / 原生 JavaScript，无框架、无构建步骤
- 响应式断点：`1020px`、`760px`、`420px`
- 基础可访问性：跳过导航链接、语义化标签、键盘焦点样式、`aria-live` 状态提示、尊重 `prefers-reduced-motion`
- 所有动态插入的文本使用 DOM API，不直接拼接 HTML
- 图片使用原生懒加载 `loading="lazy"`

---

项目数据中仍保留“社团官网”和“下一个社团项目”两个可替换条目，报名邮箱仍是 `example.com` 占位，发布前请替换为真实信息。
