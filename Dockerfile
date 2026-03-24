FROM node:20-bookworm-slim

ARG SUPERCRONIC_VERSION=v0.2.38

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl tzdata \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL -o /usr/local/bin/supercronic \
  "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" \
  && chmod +x /usr/local/bin/supercronic

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN chmod +x \
  deploy/self-host/init-data-dir.sh \
  deploy/self-host/run-web.sh \
  deploy/self-host/run-scheduler.sh \
  && npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["/bin/sh", "/app/deploy/self-host/run-web.sh"]
