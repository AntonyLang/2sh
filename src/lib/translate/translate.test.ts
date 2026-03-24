import { describe, expect, it } from "vitest";
import { compileDictionary } from "@/lib/dictionary/compile";
import { translateText } from "@/lib/translate/translate";
import type { RawSourceEntry, SourceSyncStats } from "@/lib/dictionary/types";

function buildDictionary(entries: RawSourceEntry[]) {
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

  return compileDictionary(entries, stats, new Date("2026-03-23T10:00:00.000Z"));
}

describe("translateText", () => {
  it("prefers the longest matching phrase and keeps multiple variants", () => {
    const dictionary = buildDictionary([
      { mandarin: "怎么回事", shanghainese: "哪能为实事", source: "curated", weight: 180 },
      { mandarin: "怎么回事", shanghainese: "哪能回事", source: "curated", weight: 150 },
      { mandarin: "怎么", shanghainese: "哪能", source: "curated", weight: 120 },
      { mandarin: "回事", shanghainese: "回事", source: "curated", weight: 80 },
    ]);

    const result = translateText("怎么回事", dictionary);

    expect(result.candidates[0]?.text).toBe("哪能为实事");
    expect(result.candidates[1]?.text).toBe("哪能回事");
  });

  it("keeps unknown fragments as raw text", () => {
    const dictionary = buildDictionary([
      { mandarin: "你好", shanghainese: "侬好", source: "curated", weight: 160 },
    ]);

    const result = translateText("你好呀", dictionary);

    expect(result.candidates[0]?.text).toBe("侬好呀");
    expect(result.unmatchedSpans).toEqual([{ text: "呀", start: 2, end: 3 }]);
  });

  it("preserves punctuation in short sentences", () => {
    const dictionary = buildDictionary([
      { mandarin: "你好", shanghainese: "侬好", source: "curated", weight: 160 },
    ]);

    const result = translateText("你好！", dictionary);

    expect(result.candidates[0]?.text).toBe("侬好！");
  });
});
