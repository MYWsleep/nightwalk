# 夜归 · Nightwalk

一个纯前端 Canvas2D 恐怖步行叙事游戏：六段回家的路，越走越不对劲。

- **在线试玩**：https://mywsleep.github.io/nightwalk/play/
- **官网**：https://mywsleep.github.io/nightwalk/
- **桌面版**：见 [下载区](https://mywsleep.github.io/nightwalk/#download)（六卷分卷，附 `合并分卷.bat`）

## 内容

| 章节 | 场景 |
| --- | --- |
| 一 | 下班 |
| 二 | 便利店 |
| 三 | 车库 |
| 四 | 楼道 |
| 五 | 到家 |
| 六 | 客厅 |

机制：回头（↓/S）会看见它，也会永久污染章节卡与存档；停下会被贴上；存档偶尔会混进别人的进度；路边的牌子会改写；字幕会在它靠近时结巴。

设置里可调音量、静音、字号、减少闪烁、全屏。ESC 暂停，暂停里能存档回主界面或直接关窗。

## 结构

```
index.html        官网首页
play/             网页版游戏（与 desktop 同源）
img/              hero 与章节截图
download/         桌面版六卷（20MB×5 + 9.8MB）
404.html _headers robots.txt .nojekyll DEPLOY.md
```

## 本地跑

直接开 `index.html`，或者：

```bash
python -m http.server 8099
```

## 部署

推 `main` 即触发 GitHub Pages 构建，约 1 分钟上线。其他托管方式见 `DEPLOY.md`。
