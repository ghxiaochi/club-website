#!/usr/bin/env python3
"""生成首页背景用的三张气泡图（浅色 / 深色各一套，共六张 SVG）。

为什么是 SVG 不是位图：
  这三颗泡是「大面积柔光 + 一圈很淡的边 + 左上一点高光」。位图存这种
  低对比的长渐变，alpha 只有几十级，放大后会出现一圈圈的色带（WebP
  更明显）；SVG 交给浏览器栅格化，渐变会自己做抖动，看不到带。
  体积也从每张 20KB 降到 1KB 左右。

观感上要的是「大团柔光里透出一颗泡」：主体从中心往外淡出，边只比主体
亮一点点，高光压在左上。环一旦画实，长页面上就变成三个圈。
"""

import os

OUT = os.path.join(os.path.dirname(__file__), "..", "images", "decor")

TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" fill="none">
  <defs>
    <radialGradient id="body" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="{c}" stop-opacity="{core}"/>
      <stop offset=".62" stop-color="{c}" stop-opacity="{mid}"/>
      <stop offset=".93" stop-color="{c}" stop-opacity="{rim}"/>
      <stop offset="1" stop-color="{c}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gloss" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="{gloss}"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="320" cy="320" r="300" fill="url(#body)"/>
  <circle cx="320" cy="320" r="300" stroke="{c}" stroke-opacity="{line}" stroke-width="1.5"/>
  <ellipse cx="222" cy="212" rx="96" ry="64" fill="url(#gloss)"/>
</svg>
"""

# 浅色：蓝 / 青 / 紫
LIGHT = [
    ("bubble-a", "#2563eb", 0.10, 0.06, 0.18, 0.15, 0.32),
    ("bubble-b", "#0891b2", 0.09, 0.05, 0.16, 0.13, 0.28),
    ("bubble-c", "#7c3aed", 0.08, 0.05, 0.14, 0.12, 0.24),
]

# 深色：亮版本，高光压到 0.1 以下，否则深底上是一颗白球
DARK = [
    ("bubble-a-dark", "#5b93ff", 0.09, 0.06, 0.16, 0.18, 0.09),
    ("bubble-b-dark", "#38bdf8", 0.08, 0.05, 0.14, 0.16, 0.08),
    ("bubble-c-dark", "#c4b5fd", 0.07, 0.05, 0.13, 0.14, 0.07),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, color, core, mid, rim, line, gloss in LIGHT + DARK:
        path = os.path.join(OUT, name + ".svg")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(TEMPLATE.format(c=color, core=core, mid=mid, rim=rim, line=line, gloss=gloss))
        print(name, os.path.getsize(path), "B")


if __name__ == "__main__":
    main()
