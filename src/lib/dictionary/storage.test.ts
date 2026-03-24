import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileDictionary } from "@/lib/dictionary/compile";
import { getDictionaryStorage } from "@/lib/dictionary/storage";
import type { RawSourceEntry, SourceSyncStats, SyncReport } from "@/lib/dictionary/types";

const ORIGINAL_STORAGE_DRIVER = process.env.STORAGE_DRIVER;
const ORIGINAL_DATA_DIR = process.env.DATA_DIR;

function restoreEnv(name: "STORAGE_DRIVER" | "DATA_DIR", value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

afterEach(() => {
  restoreEnv("STORAGE_DRIVER", ORIGINAL_STORAGE_DRIVER);
  restoreEnv("DATA_DIR", ORIGINAL_DATA_DIR);
});

function createDictionary(versionDate = new Date("2026-03-24T00:00:00.000Z")) {
  const entries: RawSourceEntry[] = [
    { mandarin: "你好", shanghainese: "侬好", source: "curated", weight: 160 },
    { mandarin: "谢谢", shanghainese: "谢谢侬", source: "wikivoyage-wu", weight: 90 },
  ];
  const stats: SourceSyncStats[] = [
    {
      source: "curated",
      fetchedPages: 0,
      discoveredPages: 0,
      parsedEntries: 1,
      acceptedEntries: 1,
      skippedEntries: 0,
      errors: [],
    },
    {
      source: "wikivoyage-wu",
      fetchedPages: 1,
      discoveredPages: 1,
      parsedEntries: 1,
      acceptedEntries: 1,
      skippedEntries: 0,
      errors: [],
    },
  ];

  return compileDictionary(entries, stats, versionDate);
}

describe("filesystem dictionary storage", () => {
  it("writes and reads current snapshots, reports, and candidate artifacts", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "2sh-storage-"));
    process.env.STORAGE_DRIVER = "filesystem";
    process.env.DATA_DIR = tempDir;

    const storage = getDictionaryStorage();
    const builtDictionary = createDictionary(new Date("2026-03-24T00:00:00.000Z"));
    const activeDictionary = createDictionary(new Date("2026-03-24T00:05:00.000Z"));
    const report: SyncReport = {
      version: "sync-2026-03-24T00-05-00-000Z",
      startedAt: "2026-03-24T00:05:00.000Z",
      finishedAt: "2026-03-24T00:05:10.000Z",
      dictionaryVersion: builtDictionary.version,
      activeDictionaryVersion: activeDictionary.version,
      totalEntries: activeDictionary.entries.length,
      newEntries: 2,
      updatedEntries: 0,
      skippedEntries: 0,
      promotionState: "promoted",
      excludedSources: [],
      anomalies: [],
      entryDelta: { absolute: 2, ratio: null },
      sourceHealth: [],
      failedSources: [],
      persisted: true,
      storageMode: "filesystem",
      sourceStats: activeDictionary.sourceStats,
      candidateSourceStats: [],
      reviewCandidateCount: 1,
      reviewCandidateAcceptedByRule: 1,
      reviewCandidateRejectedByLicense: 0,
      highValuePhraseCount: 1,
    };

    await storage.writeDictionaryArtifacts(builtDictionary, activeDictionary, report, {
      csv: "mandarin,shanghainese\n你好,侬好\n",
      report: {
        version: "review-1",
        generatedAt: "2026-03-24T00:05:00.000Z",
        reviewCandidateCount: 1,
        reviewCandidateAcceptedByRule: 1,
        reviewCandidateRejectedByLicense: 0,
        highValuePhraseCount: 1,
        sourceStats: [],
      },
    });

    expect((await storage.readCurrentDictionary())?.version).toBe(activeDictionary.version);
    expect(await storage.listAvailableSnapshots()).toContain(builtDictionary.version);
    expect((await storage.readSnapshot(builtDictionary.version))?.version).toBe(builtDictionary.version);

    const rollbackDictionary = createDictionary(new Date("2026-03-24T00:10:00.000Z"));
    await storage.promoteSnapshotToCurrent(rollbackDictionary);

    expect((await storage.readCurrentDictionary())?.version).toBe(rollbackDictionary.version);

    rmSync(tempDir, { recursive: true, force: true });
  });
});
