# 衡南一中编程社 HN1Z CODE · 社团官网

一个纯静态的社团官网 MVP：使用 **HTML + CSS + 原生 JavaScript**，没有后端、没有数据库、没有构建步骤。

项目卡片由 `projects.json` 驱动，支持标签筛选；QQ 群号和邮箱支持一键复制；页面可直接部署到 GitHub Pages。

- **线上地址**：<https://ghxiaochi.github.io/club-website/>
- **仓库地址**：<https://github.com/ghxiaochi/club-website>
- **联系方式**：QQ 群 `1098931492` · 邮箱 `483677268@qq.com`

> 更新网站时，把本目录中的文件覆盖到仓库根目录并推送即可；Pages 会自动重新部署。详细步骤见文末「部署到 GitHub Pages」。

## 页面包含

- **首屏**：社团名称、一句话简介、QQ 群 / 邮箱快捷联系卡片
- **关于社团**：社团介绍、基本信息表（名称、面向对象、活动频率、联系方式）
- **我们做什么**：编程入门、项目实战、算法与竞赛、分享与协作
- **项目展示**：从 `projects.json` 读取并生成卡片，支持按技术标签筛选
- **活动节奏**：每周 / 每月 / 每学期的安排，以及一次活动的流程
- **常见问题**：可展开的 FAQ
- **加入我们**：三步加入流程、QQ 群号、邮箱、复制按钮
- **页脚**：快速导航、GitHub 和版权信息
- 响应式布局、卡片 hover、图片缺失占位、键盘可访问
- 无第三方依赖，可离线打开

## 文件结构

```text
club-website/
├── index.html                  # 首页结构（所有文案都在这里）
├── css/
│   └── style.css               # 全站样式（颜色变量在文件顶部）
├── js/
│   └── main.js                 # 读取 JSON、渲染卡片、筛选、复制、导航
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

适合快速看效果，无需安装任何环境。浏览器会直接打开首页，项目卡片使用 `js/main.js` 里的内置预览数据。

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

也可以使用 Node.js 的任意静态服务器：

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
- `衡南一中`：学校名称
- 首屏标题、关于社团段落、我们做什么、活动节奏、FAQ、页脚版权

页面结构按区块注释分隔，例如：

```html
<!-- ========== 关于 ========== -->
<!-- ========== 我们做什么 ========== -->
<!-- ========== 项目 ========== -->
<!-- ========== 活动节奏 ========== -->
<!-- ========== 常见问题 ========== -->
<!-- ========== 加入 ========== -->
```

要删除某个区块时，连同对应的 `<section>…</section>` 整段删除即可；如果删除了导航里对应的链接，记得同时修改页头 `#site-nav` 和页脚 `footer-nav`。

### 2. 修改 QQ 群号和邮箱

当前使用的联系方式：

```text
QQ 群：1098931492
邮箱：483677268@qq.com
```

这些信息出现在多个位置，**建议用编辑器的“全局替换”**：

1. 把 `1098931492` 全部替换成新群号
2. 把 `483677268@qq.com` 全部替换成新邮箱

需要同步的地方包括：

- 首屏右侧快捷联系卡片中的显示文字
- 首屏“复制”按钮的 `data-copy-value` 和 `aria-label`
- “关于社团”信息表中的群号和邮箱
- “加入我们”三步流程中的群号说明
- 加入区联系卡片中的显示文字
- 加入区“复制群号 / 复制邮箱”按钮的 `data-copy-value` 和 `aria-label`
- 邮箱链接的 `mailto:` 地址

复制按钮的写法如下，改群号时 `data-copy-value` 也要一起改：

```html
<button type="button" data-copy-value="1098931492" aria-label="复制 QQ 群号 1098931492">
  <span data-copy-label>复制群号</span>
</button>
```

> 页面里的 QQ 群号是纯文本 + 复制按钮，不会自动打开 QQ。如果以后拿到群二维码或 QQ 群邀请链接，可以把加入区右侧的卡片替换成二维码图片或链接。

### 3. 当前项目清单

`projects.json` 里目前有三张卡片：

1. **Zaco 猜数字**：真实仓库 `ghxiaochi/zaco-guess-number`
2. **社团官网 HN1Z CODE**：本站自己的仓库（创建并上传后即可访问）
3. **下一个社团项目**：占位卡片，改成本社团的下一个真实项目

修改后刷新页面即可看到变化。

### 4. 维护项目清单 `projects.json`

这是一个 JSON 数组，每个对象就是一张项目卡片：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | 项目名称 |
| `desc` | string | 是 | 一句话描述 |
| `tags` | string[] | 否 | 技术标签数组，显示为小胶囊，同时自动生成筛选按钮 |
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
- `cover` 为空或图片加载失败时，会自动显示带项目首字和标签的占位块。
- 新增或删除项目后，卡片数量和筛选标签都会自动变化，不需要改 HTML。
- 筛选按钮按标签在 JSON 中第一次出现的顺序生成；同名标签只出现一次。

> 直接双击 `index.html` 预览时，页面使用 `js/main.js` 里的 `FALLBACK_PROJECTS`。如果修改了 `projects.json` 又想保持双击预览同步，需要手动更新这段内置数据；用本地服务器预览则不需要。

### 5. 调整颜色和字体

颜色、圆角、最大宽度集中在 `css/style.css` 顶部的 `:root` 变量中：

```css
:root {
  --bg: #fbfbf9;        /* 页面背景 */
  --surface: #ffffff;   /* 卡片背景 */
  --soft: #f3f4ef;      /* 浅色区块背景 */
  --ink: #111310;       /* 主文字 / 黑色按钮 */
  --muted: #666b66;     /* 次要文字 */
  --line: #e2e3dd;      /* 分隔线 / 边框 */
  --accent: #1f5eff;    /* 强调色（链接、标签数字） */
  --radius: 14px;       /* 卡片圆角 */
}
```

当前风格是“白底 + 黑字 + 细边框 + 少量蓝色强调”。如果换成学校主色，只需要改 `--accent`，其余颜色基本不用动。

### 6. 替换项目封面

项目封面是 `images/` 下的 SVG 文件：

- `project-zaco.svg`
- `project-website.svg`

新增项目时，把封面放进 `images/`，然后在 `projects.json` 的 `cover` 里写相对路径。支持 `.svg`、`.png`、`.jpg`、`.webp`。

---

## 页面交互说明

- **标签筛选**：点击项目区上方的标签按钮，只显示包含该标签的项目；点击“全部”恢复。
- **复制按钮**：点击 QQ 群号或邮箱旁的“复制”，成功后按钮会短暂显示“已复制”。
- **移动端菜单**：窄屏下点击右上角按钮展开导航；点击链接、按 `Esc` 或点击菜单外区域会关闭。
- **FAQ**：使用原生 `<details>` / `<summary>`，点击问题展开答案。
- **图片占位**：封面为空或加载失败时显示灰色占位块，不会出现破图。

所有交互都是原生 JavaScript，没有引入任何框架或第三方库。

---

## 部署到 GitHub Pages

以下命令在 `club-website/` 目录中执行。示例使用 GitHub 用户名 `ghxiaochi` 和仓库名 `club-website`。

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
- 选择 **Public**（GitHub Pages 免费账户需要公开仓库）
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

如果仓库名正好是 `ghxiaochi.github.io`，网址会变成 `https://ghxiaochi.github.io/`。社团项目建议使用普通仓库名 `club-website`。

以后更新内容只需要：

```bash
git add .
git commit -m "update site content"
git push
```

GitHub Pages 会自动重新部署，通常 1 分钟左右生效。

### 可选：放进已有仓库的 `docs/` 目录

如果不想新建仓库，也可以把整个站点放进已有仓库的 `docs/` 目录，然后在 Pages 里选择 `main` 分支的 `/docs` 文件夹。这样不会覆盖原有项目文件，网址格式为：

```text
https://ghxiaochi.github.io/仓库名/
```

---

## 验收清单

- [ ] 直接双击 `index.html` 或通过本地服务器打开，能看到完整首页
- [ ] 项目卡片由 `projects.json` 渲染（通过本地服务器验证）
- [ ] 点击标签按钮可以筛选项目，“全部”可以恢复
- [ ] 点击“复制”可以复制 QQ 群号和邮箱
- [ ] 修改 `projects.json` 后刷新页面，卡片内容和筛选标签同步变化
- [ ] 封面为空或图片路径错误时显示占位块，不出现破图
- [ ] 浏览器窗口缩到手机宽度，导航、卡片、加入区域布局正常
- [ ] 项目仓库链接能在新标签页打开
- [ ] 没有后端接口、数据库或第三方运行时依赖
- [ ] 推送到 GitHub 并开启 Pages 后可以公开访问

## 常见问题

**Q：为什么双击打开时改了 `projects.json` 没变化？**

浏览器不允许 `file://` 页面读取本地 JSON。用 `python3 -m http.server 8000` 启动本地服务器即可。

**Q：部署后项目卡片不显示？**

先检查浏览器控制台是否有 404。常见原因是 `projects.json` 或图片文件名大小写不一致，或文件没有提交到仓库。可以用 `git ls-files` 确认文件已上传。

**Q：复制按钮没反应？**

在 `file://` 或非 HTTPS 环境下，浏览器可能限制剪贴板 API。页面会自动退回兼容方案；如果仍然失败，可以手动选中群号或邮箱复制。部署到 GitHub Pages（HTTPS）后一般正常。

**Q：可以加更多项目吗？**

可以，在 `projects.json` 数组中继续追加对象即可。建议保持 3–9 个项目，页面最整洁。新增标签会自动出现在筛选栏。

**Q：需要安装 Node.js 或打包工具吗？**

不需要。整个站点是原生静态文件，GitHub Pages 直接托管即可。

**Q：QQ 群号可以做成点击直接加群吗？**

当前是纯文本 + 复制按钮，兼容性最好。如果以后拿到 QQ 群邀请链接或二维码，可以在 `index.html` 的加入区替换成链接或图片，并同时更新 README 中的联系方式。

## 技术说明

- 纯 HTML / CSS / 原生 JavaScript，无框架、无构建步骤
- 响应式断点：`1020px`、`980px`、`900px`、`860px`、`760px`、`620px`、`560px`、`430px`
- 基础可访问性：跳过导航链接、语义化标签、键盘焦点样式、`aria-live` 状态提示、尊重 `prefers-reduced-motion`
- 所有动态插入的文本使用 DOM API，不直接拼接 HTML
- 图片使用原生懒加载 `loading="lazy"`
- 联系方式、项目数据与页面结构分离，方便后续维护

---

项目数据中仍保留“下一个社团项目”占位条目；QQ 群号 `1098931492` 和邮箱 `483677268@qq.com` 已替换为真实联系方式。发布前请再确认群号和邮箱无误。
