# 发布说明 · 夜归 Nightwalk 官网

这个目录就是一个完整的静态站，没有构建步骤、没有后端、没有任何外部请求。
把整个 `site/` 目录原样传上去就能访问。

## 目录结构

```
site/
  index.html            首页
  404.html              任意静态托管会自动接管 404
  style.css             全站样式（无外链字体）
  main.js               滚动显现 + 视差，失败也不影响阅读
  robots.txt
  _headers              Cloudflare Pages / Netlify 的缓存与安全头（其他平台忽略）
  .nojekyll             GitHub Pages 用，别删
  img/                  hero.jpg + 6 张章节图（JPEG，合计 ~400 KB）
  play/                 网页版游戏（index.html + src/*.js，~190 KB）
  download/             桌面版分卷 6 个（20 MB × 5 + 9.8 MB）+ 合并分卷.bat
```

总体积约 112 MB，其中 110 MB 是分卷压缩包。单文件最大 20 MB，低于 GitHub Pages（100 MB）、Cloudflare Pages（25 MiB）、Vercel（100 MB）的单文件上限，三家都能直接放。

## 方式一：Cloudflare Pages（推荐，国内外都能开）

```bash
npm i -g wrangler
cd site
wrangler pages deploy . --project-name nightwalk
```

或者在控制台里新建 Pages 项目 → 直接上传 `site` 文件夹（拖拽也行）。
绑定自定义域名后把 `robots.txt` 里的域名、页面里的邮箱换成自己的。

## 方式二：GitHub Pages

```bash
cd site
git init -b main
git add . && git commit -m "nightwalk site"
git remote add origin git@github.com:<USER>/<REPO>.git
git push -u origin main
```

仓库 Settings → Pages → Source 选 `main` / `/(root)`。`.nojekyll` 已经在目录里，不用额外加。
访问 `https://<USER>.github.io/<REPO>/`。

## 方式三：Vercel / Netlify

```bash
npx vercel deploy site --prod          # Vercel
npx netlify deploy --dir site --prod   # Netlify（需先 netlify login）
```

两者都识别 `_headers`（Netlify 原生支持，Vercel 用 `vercel.json`，本项目不需要）。

## 方式四：自己的服务器（nginx）

```nginx
server {
  listen 80;
  server_name nightwalk.example.com;
  root /var/www/nightwalk;
  index index.html;
  error_page 404 /404.html;
  location /download/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
  location /play/     { add_header Cache-Control "public, max-age=3600"; }
  location / { try_files $uri $uri/ =404; }
}
```

上传：`scp -r site/* user@host:/var/www/nightwalk/`。宝塔面板直接把 `site` 里的内容传到站点根目录即可。

## 发布前要改的三处

1. `index.html` 里的 `mailto:yg@nightwalk.example` → 你的邮箱。
2. `robots.txt` / `404.html` 里没有硬编码域名，自定义域名后无需改；如果要加 sitemap，自己补一个 `sitemap.xml` 并写死域名。
3. 想做访问统计时再加脚本——现在整站零外部请求，加了就破功。

## 本地预览（HTTP，不要用 file:// 验发布）

```bash
cd site
python -m http.server 8099        # 或 npx serve .
# 打开 http://127.0.0.1:8099/
```

`file://` 下能开，但相对链接、404 行为、缓存头都跟线上不同，发布前用 HTTP 过一遍。
