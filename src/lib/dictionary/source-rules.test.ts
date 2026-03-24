import { describe, expect, it } from "vitest";
import { isBlockedPublicEntry } from "@/lib/dictionary/source-rules";
import type { RawSourceEntry } from "@/lib/dictionary/types";

function createEntry(partial: Partial<RawSourceEntry>): RawSourceEntry {
  return {
    mandarin: "你好",
    shanghainese: "侬好",
    source: "dict-cn",
    ...partial,
  };
}

describe("isBlockedPublicEntry", () => {
  it("blocks public variants that conflict with curated mappings", () => {
    const reason = isBlockedPublicEntry(
      createEntry({ mandarin: "怎么回事", shanghainese: "阿拉勿认得" }),
      new Map([["怎么回事", new Set(["哪能为实事", "哪能回事"])]]),
    );

    expect(reason).toBe("curated_conflict");
  });

  it("allows known good public pairs from the allowlist", () => {
    const reason = isBlockedPublicEntry(
      createEntry({ source: "nonghao", mandarin: "很好", shanghainese: "蛮好" }),
      new Map(),
    );

    expect(reason).toBeNull();
  });

  it("blocks noisy scraped entries with embedded annotations", () => {
    const reason = isBlockedPublicEntry(
      createEntry({ mandarin: "你好【拼】nonghao" }),
      new Map(),
    );

    expect(reason).toBe("blocked_pair");
  });
});
