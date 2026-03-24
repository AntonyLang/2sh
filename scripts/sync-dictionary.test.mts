import { describe, expect, it } from "vitest";

describe("sync-dictionary", () => {
  it("returns the active and built dictionary versions for successful syncs", async () => {
    const { runSyncDictionary } = await import("./sync-dictionary.mjs");
    const payload = await runSyncDictionary(async () => ({
      activeDictionary: {
        version: "dict-active",
        updatedAt: "2026-03-24T00:00:00.000Z",
        maxInputLength: 2,
        entries: [],
        sourceStats: [],
      },
      dictionary: {
        version: "dict-built",
        updatedAt: "2026-03-24T00:00:00.000Z",
        maxInputLength: 2,
        entries: [],
        sourceStats: [],
      },
      reviewCandidates: [],
      reviewCandidatesCsv: "",
      reviewCandidatesReport: {
        version: "review-report",
        generatedAt: "2026-03-24T00:00:00.000Z",
        reviewCandidateCount: 0,
        reviewCandidateAcceptedByRule: 0,
        reviewCandidateRejectedByLicense: 0,
        highValuePhraseCount: 0,
        sourceStats: [],
      },
      report: {
        storageMode: "filesystem",
        persisted: true,
      },
    }));

    expect(payload).toMatchObject({
      activeDictionaryVersion: "dict-active",
      builtDictionaryVersion: "dict-built",
      report: {
        storageMode: "filesystem",
        persisted: true,
      },
    });
  });

  it("throws when sync completes without persisting filesystem artifacts", async () => {
    const { runSyncDictionary } = await import("./sync-dictionary.mjs");

    await expect(
      runSyncDictionary(async () => ({
        activeDictionary: {
          version: "dict-active",
          updatedAt: "2026-03-24T00:00:00.000Z",
          maxInputLength: 2,
          entries: [],
          sourceStats: [],
        },
        dictionary: {
          version: "dict-built",
          updatedAt: "2026-03-24T00:00:00.000Z",
          maxInputLength: 2,
          entries: [],
          sourceStats: [],
        },
        reviewCandidates: [],
        reviewCandidatesCsv: "",
        reviewCandidatesReport: {
          version: "review-report",
          generatedAt: "2026-03-24T00:00:00.000Z",
          reviewCandidateCount: 0,
          reviewCandidateAcceptedByRule: 0,
          reviewCandidateRejectedByLicense: 0,
          highValuePhraseCount: 0,
          sourceStats: [],
        },
        report: {
          storageMode: "filesystem",
          persisted: false,
          error: "write failed",
        },
      })),
    ).rejects.toThrow("write failed");
  });
});
