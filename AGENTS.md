# 工程约定

给接手这个仓库的人（以及 AI）看的几条硬规则。

## 交付

- **改完就推**：代码写完、回归跑过，直接 `git commit` + `git push origin main`，不用再等确认。
- **推之前先跑回归**：5 个页面 × 4 套皮肤 = 20 组合，要求 0 个 JS 报错、0 个 4xx（`member.html` 的 GitHub API 403 限流除外，有本地缓存兜底）、无横向溢出。
- **远端有新提交就先 `git pull --rebase`**：`data/` 下有每日自动快照，几乎每次推都会撞上，rebase 干净后再推。
- 推送失败不要强推，先看清楚 `HEAD..origin/main` 里是什么。

## 版本号

每次改动把 5 个 HTML 与 `sw.js` 里的 `?v=YYYYMMDD` 整体升一天，`sw.js` 的 `VERSION` 同步改，
预缓存清单里增删文件要跟着改，否则老用户拿到的是旧缓存。

## 目录

```text
css/  base(基础) layout(骨架) ui(组件) skins(皮肤)
js/   core(核心) layout(骨架) ui(页面) skins(皮肤)
```

- 结构层不许写颜色，颜色只出现在 `skins/`。
- 新组件优先复用 `.ck` 里已经重定义过的 `--bg / --panel / --text / --blue`，会自动跟皮肤走。

## 舞台

`js/layout/haloflux.js` 是纯 Canvas 2D，无依赖。改它之前先读 README 第 3 节，
尤其是「光束为什么是楔不是梳」——那里记着两个已经踩过的坑（平行直线像百叶窗、
`waveAt()` 平时恒为 0 导致整圈束长一致）。
