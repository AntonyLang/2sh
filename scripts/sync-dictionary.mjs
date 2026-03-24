import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
require("./register-ts.cjs");

const { syncDictionary } = require("../src/lib/dictionary/service");

/**
 * @typedef {{
 *   activeDictionary: { version: string };
 *   dictionary: { version: string };
 *   report: { storageMode: "filesystem" | "blob" | "memory"; persisted: boolean; error?: string };
 * }} SyncCliOutcome
 */

/**
 * @param {(options?: unknown) => Promise<SyncCliOutcome>} [syncImpl]
 */
export async function runSyncDictionary(syncImpl = syncDictionary) {
  const outcome = await syncImpl();
  const payload = {
    activeDictionaryVersion: outcome.activeDictionary.version,
    builtDictionaryVersion: outcome.dictionary.version,
    report: outcome.report,
  };

  if (outcome.report.storageMode !== "memory" && !outcome.report.persisted) {
    throw new Error(outcome.report.error ?? "Dictionary sync completed without persisting artifacts.");
  }

  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSyncDictionary()
    .then((payload) => {
      console.log(JSON.stringify(payload, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
