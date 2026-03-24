const appDir = process.env.PM2_APP_DIR || "/srv/2sh/current";

module.exports = {
  apps: [
    {
      name: "2sh-hk-mirror",
      cwd: appDir,
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 --port 3000",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
};
