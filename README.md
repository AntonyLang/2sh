# 沪语转写测试版

把普通话短句转成更常见的上海话汉字写法的极简网站。当前仓库默认走自托管路线：

- `Next.js` 单体应用
- `filesystem` 作为默认持久化驱动
- `Docker Compose + Caddy + supercronic` 作为默认生产部署
- 生产目标默认是香港 VPS，当前线上入口可用 IP 或后续切正式域名

## 本地开发

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 环境变量

复制 `.env.example` 到 `.env.local` 后填写。常用项：

- `STORAGE_DRIVER=filesystem`
- `DATA_DIR=var`
- `ADMIN_SYNC_TOKEN=...`
- `QUERY_LOGGING_ENABLED=true`
- `FEEDBACK_RATE_LIMIT_WINDOW_MS=600000`
- `FEEDBACK_RATE_LIMIT_MAX=5`
- `SYNC_ENABLED=true`
- `SYNC_TZ=Asia/Shanghai`
- `SYNC_SCHEDULE=0 8 * * *`
- `SITE_URL=http://localhost:3000`

生产环境样板见 `.env.production.example`。

## 词库与质量闭环

人工词库维护入口：

- `data/curated-lexicon.csv`
- `data/generated/review-candidates.csv`
- `data/regression-cases.json`

同步和分析命令：

```bash
npm run import-curated-csv
npm run sync-dictionary
npm run summarize-usage
```

运行时会写入：

- `DATA_DIR/logs/queries/*.ndjson`
- `DATA_DIR/feedback/*.ndjson`
- `DATA_DIR/reports/usage/latest.json`
- `DATA_DIR/reports/usage/top-unmatched.csv`
- `DATA_DIR/reports/usage/top-feedback.csv`

## 接口

```http
GET /api/translate?q=你好
GET /api/dictionary/current
GET /feedback
POST /api/feedback
GET /api/internal/sync
```

`/api/internal/sync` 默认使用 `ADMIN_SYNC_TOKEN` 鉴权。

## 手动重部署到香港机

本机打包：

```bash
npm run package-release
```

本机直接发布到当前香港机：

```bash
npm run deploy-self-host
```

默认参数：

- `host=119.28.190.25`
- `user=root`
- `port=22`
- `appDir=/srv/2sh`
- `archive=2sh-release.zip`

可覆盖：

```bash
npm run deploy-self-host -- --host 119.28.190.25 --user root --app-dir /srv/2sh
```

## GitHub 一键发布

仓库内已提供工作流：

- `.github/workflows/deploy-self-host.yml`

建议步骤：

1. 在 GitHub 创建一个空仓库。
2. 本地添加远端并推送：

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

3. 在 GitHub 仓库 Secrets 里配置：
   - `DEPLOY_HOST=119.28.190.25`
   - `DEPLOY_PORT=22`
   - `DEPLOY_USER=root`
   - `DEPLOY_SSH_KEY=<root 可登录香港机的私钥>`
   - `DEPLOY_APP_DIR=/srv/2sh`

完成后：

- `push` 到 `main` 会自动发布
- 也可以在 Actions 页面手动触发 `Deploy Self-Hosted`

## 测试

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```
