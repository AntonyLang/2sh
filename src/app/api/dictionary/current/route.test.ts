import { afterEach, describe, expect, it, vi } from "vitest";
import { compileDictionary } from "@/lib/dictionary/compile";
import type { RawSourceEntry, SourceSyncStats } from "@/lib/dictionary/types";

const entries: RawSourceEntry[] = [{ mandarin: "你好", shanghainese: "侬好", source: "curated", weight: 160 }];
const stats: SourceSyncStats[] = [
  {
    source: "curated",
    fetchedPages: 0,
    discoveredPages: 0,
    parsedEntries: entries.length,
    acceptedEntries: entries.length,
    skippedEntries: 0,
    errors: [],
  },
];

const dictionary = compileDictionary(entries, stats, new Date("2026-03-23T10:00:00.000Z"));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("GET /api/dictionary/current", () => {
  it("returns the active compiled dictionary with cache headers", async () => {
    vi.doMock("@/lib/dictionary/service", () => {
      return {
        loadCurrentDictionary: vi.fn(async () => dictionary),
      };
    });

    const { GET } = await import("@/app/api/dictionary/current/route");
    const response = await GET();
    const payload = (await response.json()) as { version: string };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=300");
    expect(payload.version).toBe(dictionary.version);
  });
});
