import { describe, expect, it } from "vitest";
import { compileDictionary, getCuratedEntries } from "@/lib/dictionary/compile";
import type { RawSourceEntry, SourceSyncStats } from "@/lib/dictionary/types";

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
];

describe("compileDictionary", () => {
  it("keeps curated variants ahead of lower-priority public entries", () => {
    const entries: RawSourceEntry[] = [
      { mandarin: "你好", shanghainese: "侬好", source: "curated", weight: 160 },
      { mandarin: "你好", shanghainese: "侬好", source: "dict-cn", weight: 36 },
      { mandarin: "你好", shanghainese: "您好", source: "nonghao", weight: 44 },
    ];

    const dictionary = compileDictionary(entries, stats, new Date("2026-03-23T10:00:00.000Z"));
    const record = dictionary.entries.find((item) => item.input === "你好");

    expect(record?.variants[0]?.output).toBe("侬好");
    expect(record?.variants[0]?.sources).toEqual(["curated", "dict-cn"]);
  });

  it("expands curated aliases into lookup entries", () => {
    const curatedEntries = getCuratedEntries();
    expect(curatedEntries.some((entry) => entry.mandarin === "你好啊" && entry.shanghainese === "侬好")).toBe(true);
  });
});
