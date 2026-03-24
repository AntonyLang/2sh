import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { packageRelease } from "./package-release.mjs";

function parseArgs(argv) {
  const options = {
    host: "119.28.190.25",
    user: "root",
    port: "22",
    appDir: "/srv/2sh",
    archive: "2sh-release.tgz",
    remoteArchive: "/root/2sh-release.tgz",
    skipPackage: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--host") {
      options.host = argv[index + 1] ?? options.host;
      index += 1;
      continue;
    }

    if (token === "--user") {
      options.user = argv[index + 1] ?? options.user;
      index += 1;
      continue;
    }

    if (token === "--port") {
      options.port = argv[index + 1] ?? options.port;
      index += 1;
      continue;
    }

    if (token === "--app-dir") {
      options.appDir = argv[index + 1] ?? options.appDir;
      index += 1;
      continue;
    }

    if (token === "--archive") {
      options.archive = argv[index + 1] ?? options.archive;
      index += 1;
      continue;
    }

    if (token === "--remote-archive") {
      options.remoteArchive = argv[index + 1] ?? options.remoteArchive;
      index += 1;
      continue;
    }

    if (token === "--skip-package") {
      options.skipPackage = true;
    }
  }

  return options;
}

function run(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function escapeSingleQuotes(value) {
  return value.replace(/'/gu, "'\\''");
}

function buildRemoteScript({ appDir, remoteArchive }) {
  const safeAppDir = escapeSingleQuotes(appDir);
  const safeRemoteArchive = escapeSingleQuotes(remoteArchive);

  return [
    "set -euxo pipefail",
    `mkdir -p '${safeAppDir}'`,
    `find '${safeAppDir}' -mindepth 1 -maxdepth 1 ! -name '.env.production' -exec rm -rf {} +`,
    `tar -xzf '${safeRemoteArchive}' -C '${safeAppDir}'`,
    `cd '${safeAppDir}'`,
    "docker compose up -d --build --remove-orphans",
    "docker compose ps",
    "curl -I http://127.0.0.1 || true",
    "curl -fsS http://127.0.0.1/api/dictionary/current >/dev/null",
  ].join(" && ");
}

export async function deploySelfHosted({
  host = "119.28.190.25",
  user = "root",
  port = "22",
  appDir = "/srv/2sh",
  archive = "2sh-release.tgz",
  remoteArchive = "/root/2sh-release.tgz",
  skipPackage = false,
} = {}) {
  if (!skipPackage) {
    await packageRelease({ archive });
  }

  const remoteTarget = `${user}@${host}`;

  await run("scp", ["-P", port, archive, `${remoteTarget}:${remoteArchive}`]);
  await run("ssh", ["-p", port, remoteTarget, buildRemoteScript({ appDir, remoteArchive })]);

  return {
    host,
    user,
    port,
    appDir,
    archive,
    remoteArchive,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await deploySelfHosted(options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
