import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
require("./register-ts.cjs");

const { getDictionaryStorage } = require("../src/lib/dictionary/storage");

/** @typedef {import("../src/lib/dictionary/storage").DictionaryStorage} DictionaryStorage */

function parseArguments(argv) {
  const args = argv.slice(2);
  const options = {
    version: "",
    dryRun: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--version") {
      options.version = args[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (!options.version) {
      options.version = arg;
    }
  }

  return options;
}

/**
 * @param {{version: string, dryRun?: boolean, storage?: DictionaryStorage}} [options]
 */
export async function rollbackDictionaryVersion({
  version,
  dryRun = false,
  storage = getDictionaryStorage(),
} = {}) {
  if (!version) {
    throw new Error("Missing snapshot version. Use --version <dict-version>.");
  }

  const snapshot = await storage.readSnapshot(version);
  if (!snapshot) {
    throw new Error(`Snapshot not found: ${version}`);
  }

  if (!dryRun) {
    await storage.promoteSnapshotToCurrent(snapshot);
  }

  return {
    restoredVersion: snapshot.version,
    dryRun,
    storageMode: storage.driver,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  rollbackDictionaryVersion(parseArguments(process.argv))
    .then((payload) => {
      console.log(JSON.stringify(payload, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
