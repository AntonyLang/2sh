import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const ORIGINAL_DATA_DIR = process.env.DATA_DIR;
const tempDirs: string[] = [];

afterEach(async () => {
  if (ORIGINAL_DATA_DIR === undefined) {
    delete process.env.DATA_DIR;
  } else {
    process.env.DATA_DIR = ORIGINAL_DATA_DIR;
  }

  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("summarize-usage", () => {
  it("writes usage reports from query logs and feedback", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const dataDir = await mkdtemp(join(tmpdir(), "2sh-usage-"));
    tempDirs.push(dataDir);
    process.env.DATA_DIR = dataDir;

    await mkdir(join(dataDir, "logs", "queries"), { recursive: true });
    await mkdir(join(dataDir, "feedback"), { recursive: true });

    await writeFile(
      join(dataDir, "logs", "queries", "2026-03-24.ndjson"),
      [
        JSON.stringify({
          timestamp: "2026-03-24T09:00:00.000Z",
          input: "你在做什么",
          normalizedInput: "你在做什么",
          dictionaryVersion: "dict-1",
          candidateCount: 1,
          topScore: 548,
          unmatchedSpans: [],
          hasExactTopCandidate: true,
        }),
        JSON.stringify({
          timestamp: "2026-03-24T10:00:00.000Z",
          input: "明天来吗",
          normalizedInput: "明天来吗",
          dictionaryVersion: "dict-1",
          candidateCount: 1,
          topScore: 480,
          unmatchedSpans: [{ text: "来吗", start: 2, end: 4 }],
          hasExactTopCandidate: false,
        }),
      ].join("\n"),
      "utf8",
    );

    await writeFile(
      join(dataDir, "feedback", "2026-03-24.ndjson"),
      JSON.stringify({
        timestamp: "2026-03-24T11:00:00.000Z",
        inputText: "怎么回事",
        expectedText: "哪能为实事",
        message: "这个说法更常见。",
        contact: "",
        dictionaryVersion: "dict-1",
      }),
      "utf8",
    );

    const { summarizeUsage } = await import("./summarize-usage.mjs");
    const summary = await summarizeUsage();

    expect(summary.totalQueries).toBe(2);
    expect(summary.problematicQueryCount).toBe(1);
    expect(summary.feedbackCount).toBe(1);
    expect(summary.topUnmatched[0]?.input).toBe("明天来吗");
    expect(summary.topFeedback[0]?.inputText).toBe("怎么回事");

    const latest = JSON.parse(await readFile(join(dataDir, "reports", "usage", "latest.json"), "utf8")) as {
      totalQueries: number;
    };
    const csv = await readFile(join(dataDir, "reports", "usage", "top-unmatched.csv"), "utf8");

    expect(latest.totalQueries).toBe(2);
    expect(csv).toContain("明天来吗");
  });
});
