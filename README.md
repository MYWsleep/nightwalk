# 夜归 · Nightwalk

一个纯前端 Canvas2D 恐怖步行叙事游戏：六段回家的路，越走越不对劲。

- **在线试玩**：https://mywsleep.github.io/nightwalk/play/
- **官网**：https://mywsleep.github.io/nightwalk/
- **桌面版（安装程序）**：[Nightwalk-Setup-1.0.1.exe](https://github.com/MYWsleep/nightwalk/releases/download/v1.0.1/Nightwalk-Setup-1.0.1.exe)（110 MB，双击安装）
- **桌面版（便携）**：[Nightwalk-1.0.1-win64.zip](https://github.com/MYWsleep/nightwalk/releases/download/v1.0.1/Nightwalk-1.0.1-win64.zip)（110 MB，解压后跑 启动夜归.bat）
- **安卓版（APK）**：[Nightwalk-1.0.0-android.apk](https://github.com/MYWsleep/nightwalk/releases/download/v1.0.1/Nightwalk-1.0.0-android.apk)（426 KB，Android 7.0+，触屏操作）

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

安卓版用触屏：左下按住走、右下按住回头，进游戏自动横屏全屏、屏幕常亮。

设置里可调音量、静音、字号、减少闪烁、全屏。ESC 暂停，暂停里能存档回主界面或直接关窗。

## 结构

```
index.html        官网首页
play/             网页版游戏（与 desktop 同源）
img/              hero 与章节截图
apk/             安卓安装包（426 KB，直接下载）
（桌面版压缩包放在 GitHub Releases，不进仓库）
404.html _headers robots.txt .nojekyll DEPLOY.md
```

## 本地跑

直接开 `index.html`，或者：

```bash
python -m http.server 8099
```

## 部署

推 `main` 即触发 GitHub Pages 构建，约 1 分钟上线。其他托管方式见 `DEPLOY.md`。
