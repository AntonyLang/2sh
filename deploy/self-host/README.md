# Self-host deployment

This directory contains the default self-hosted deployment assets for running the project on a Linux VPS.

## Stack

- Docker Compose
- Caddy
- supercronic
- Local filesystem persistence at `/app/var`

## Required setup

1. Install Docker Engine and Docker Compose on the target host.
2. Copy `.env.production.example` to `.env.production`.
3. Update at least:
   - `APP_DOMAIN`
   - `LETSENCRYPT_EMAIL`
   - `SITE_URL`
   - `ADMIN_SYNC_TOKEN`
   - `QUERY_LOGGING_ENABLED`
4. Start the stack:

```bash
docker compose up -d --build
```

## Services

- `web`: Next.js app
- `scheduler`: runs `npm run sync-dictionary` daily
- `caddy`: HTTPS reverse proxy

## Persistence

All runtime artifacts are written under `DATA_DIR`, which defaults to `/app/var` in production:

- `compiled/current.json`
- `snapshots/*.json`
- `reports/*.json`
- `reports/usage/latest.json`
- `reports/usage/top-unmatched.csv`
- `reports/usage/top-feedback.csv`
- `review-candidates/current.csv`
- `review-candidates/reports/*.json`
- `logs/queries/*.ndjson`
- `feedback/*.ndjson`

## Manual redeploy from Windows

From the local repo:

```bash
npm run package-release
npm run deploy-self-host
```

The deploy script defaults to:

- `host=119.28.190.25`
- `user=root`
- `port=22`
- `appDir=/srv/2sh`
- `remoteArchive=/root/2sh-release.zip`

It performs:

1. package the workspace into `2sh-release.zip`
2. upload it via `scp`
3. clean `/srv/2sh` except `.env.production`
4. extract the new release
5. run `docker compose up -d --build --remove-orphans`

## Manual verification

After redeploying, verify:

```bash
docker compose ps
curl -I http://119.28.190.25
curl http://119.28.190.25/api/dictionary/current
curl -H "Authorization: Bearer <ADMIN_SYNC_TOKEN>" http://119.28.190.25/api/internal/sync
```

## GitHub Actions deploy

The workflow at `.github/workflows/deploy-self-host.yml` expects:

- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_APP_DIR`

Recommended values for the current server:

- `DEPLOY_HOST=119.28.190.25`
- `DEPLOY_PORT=22`
- `DEPLOY_USER=root`
- `DEPLOY_APP_DIR=/srv/2sh`

The server must allow `root` SSH key login, and `/srv/2sh/.env.production` must already exist on the host.
