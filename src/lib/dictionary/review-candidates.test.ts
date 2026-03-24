import { describe, expect, it } from "vitest";
import { compileDictionary } from "@/lib/dictionary/compile";
import { buildReviewCandidates } from "@/lib/dictionary/review-candidates";
import type { RawSourceEntry, SourceSyncStats } from "@/lib/dictionary/types";

describe("buildReviewCandidates", () => {
  it("keeps weak-source outputs in review CSV only and scores multi-source phrases higher", () => {
    const strongEntries: RawSourceEntry[] = [
      { mandarin: "你好", shanghainese: "侬好", source: "curated", weight: 200 },
      { mandarin: "下雨", shanghainese: "落雨", source: "dict-cn", weight: 40 },
    ];
    const strongStats: SourceSyncStats[] = [
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
        source: "dict-cn",
        fetchedPages: 1,
        discoveredPages: 1,
        parsedEntries: 1,
        acceptedEntries: 1,
        skippedEntries: 0,
        errors: [],
      },
    ];
    const strongDictionary = compileDictionary(strongEntries, strongStats, new Date("2026-03-23T00:00:00.000Z"));

    const result = buildReviewCandidates({
      strongDictionary,
      now: new Date("2026-03-23T00:00:00.000Z"),
      bundles: [
        {
          source: "glosbe-wuu",
          stats: {
            source: "glosbe-wuu",
            fetchedPages: 1,
            discoveredPages: 1,
            parsedEntries: 2,
            acceptedEntries: 2,
            skippedEntries: 0,
            errors: [],
          },
          entries: [
            {
              mandarin: "你好",
              shanghainese: "侬好",
              source: "glosbe-wuu",
              evidence: "https://glosbe.com/zh/wuu/你好",
            },
            {
              mandarin: "谢谢你帮忙",
              shanghainese: "谢谢侬帮我忙",
              source: "glosbe-wuu",
              evidence: "https://glosbe.com/zh/wuu/谢谢你帮忙",
            },
          ],
        },
        {
          source: "dliflc-wu",
          stats: {
            source: "dliflc-wu",
            fetchedPages: 1,
            discoveredPages: 1,
            parsedEntries: 1,
            acceptedEntries: 1,
            skippedEntries: 0,
            errors: [],
          },
          entries: [
            {
              mandarin: "谢谢你帮忙",
              shanghainese: "谢谢侬帮我忙",
              source: "dliflc-wu",
              evidence: "https://fieldsupport.dliflc.edu/products/wu/cs_bc_LSK/module3.html",
            },
          ],
        },
      ],
    });

    const helpCandidate = result.candidates.find((candidate) => candidate.mandarin === "谢谢你帮忙");

    expect(result.candidates.some((candidate) => candidate.mandarin === "你好")).toBe(true);
    expect(helpCandidate?.confidence).toBeGreaterThanOrEqual(0.7);
    expect(helpCandidate?.source).toContain("glosbe-wuu");
    expect(helpCandidate?.source).toContain("dliflc-wu");
    expect(result.csv).toContain("mandarin,shanghainese,source,source_tier,evidence,confidence,candidate_type,license_note,status");
    expect(result.report.reviewCandidateAcceptedByRule).toBe(2);
  });
});
