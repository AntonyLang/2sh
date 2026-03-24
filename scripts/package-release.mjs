import { access, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  const options = {
    archive: "2sh-release.tgz",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--archive") {
      options.archive = argv[index + 1] ?? options.archive;
      index += 1;
    }
  }

  return options;
}

function run(command, args, cwd) {
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

export async function packageRelease({
  archive = "2sh-release.tgz",
  cwd = process.cwd(),
} = {}) {
  const archivePath = join(cwd, archive);

  try {
    await access(archivePath);
    await rm(archivePath, { force: true });
  } catch {}

  await run(
    "tar",
    [
      "--exclude=.git",
      "--exclude=.next",
      "--exclude=node_modules",
      "--exclude=var",
      "--exclude=.env.production",
      `--exclude=${archive}`,
      "-czf",
      archive,
      ".",
    ],
    cwd,
  );

  console.log(`Created release bundle: ${archivePath}`);
  return {
    archivePath,
    archiveName: archive,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await packageRelease(options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
