import { describe, expect, it, vi } from "vitest";
import type { DictionaryStorage } from "@/lib/dictionary/storage";

function createMockStorage(overrides: Partial<DictionaryStorage>): DictionaryStorage {
  return {
    driver: "filesystem",
    readCurrentDictionary: vi.fn(async () => null),
    writeDictionaryArtifacts: vi.fn(async () => undefined),
    listAvailableSnapshots: vi.fn(async () => []),
    readSnapshot: vi.fn(async () => null),
    promoteSnapshotToCurrent: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("rollback-dictionary", () => {
  it("supports dry-run without writing current dictionary", async () => {
    const { rollbackDictionaryVersion } = await import("./rollback-dictionary.mjs");
    const storage = createMockStorage({
      readSnapshot: vi.fn(async () => ({
        version: "dict-2026-03-23",
        updatedAt: "2026-03-23T00:00:00.000Z",
        maxInputLength: 2,
        entries: [],
        sourceStats: [],
      })),
    });

    const result = await rollbackDictionaryVersion(
      {
        version: "dict-2026-03-23",
        dryRun: true,
        storage,
      },
    );

    expect(result).toMatchObject({
      restoredVersion: "dict-2026-03-23",
      dryRun: true,
      storageMode: "filesystem",
    });
    expect(storage.promoteSnapshotToCurrent).not.toHaveBeenCalled();
  });

  it("promotes a snapshot back to compiled/current.json", async () => {
    const { rollbackDictionaryVersion } = await import("./rollback-dictionary.mjs");
    const snapshot = {
      version: "dict-2026-03-23",
      updatedAt: "2026-03-23T00:00:00.000Z",
      maxInputLength: 2,
      entries: [],
      sourceStats: [],
    };
    const storage = createMockStorage({
      readSnapshot: vi.fn(async () => snapshot),
      promoteSnapshotToCurrent: vi.fn(async () => undefined),
    });

    const result = await rollbackDictionaryVersion(
      {
        version: "dict-2026-03-23",
        storage,
      },
    );

    expect(result).toMatchObject({
      restoredVersion: "dict-2026-03-23",
      dryRun: false,
      storageMode: "filesystem",
    });
    expect(storage.promoteSnapshotToCurrent).toHaveBeenCalledTimes(1);
    expect(storage.promoteSnapshotToCurrent).toHaveBeenCalledWith(snapshot);
  });
});
