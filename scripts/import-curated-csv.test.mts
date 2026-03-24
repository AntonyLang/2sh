import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CSV_HEADERS,
  buildCuratedLexiconArtifacts,
  importCuratedCsv,
  parseCsvText,
} from "./import-curated-csv.mjs";

const tempDirs: string[] = [];

async function createTempDir() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "2sh-curated-"));
  tempDirs.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((directory) => {
      return fs.rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("import-curated-csv", () => {
  it("parses canonical CSV rows and tracks duplicates or conflicts", () => {
    const csvText = [
      CSV_HEADERS.join(","),
      "你好,侬好,你好啊|您好,180,true,greeting,常用问候,manual,approved",
      "怎么回事,哪能为实事,,195,true,question,首选示例,manual,approved",
      "怎么回事,哪能回事,,175,true,question,常见短写,manual,approved",
      "复核词,待确认,,120,true,phrase,需要复核,manual,review",
      "停用词,老写法,,100,false,phrase,停用,manual,disabled",
    ].join("\n");

    const records = parseCsvText(csvText);
    const artifacts = buildCuratedLexiconArtifacts(records);

    expect(records).toHaveLength(5);
    expect(artifacts.report.aliasExpandedCount).toBe(2);
    expect(artifacts.report.conflictCount).toBe(1);
    expect(artifacts.report.disabledCount).toBe(2);
    expect(
      artifacts.seeds.find((seed: { mandarin: string; enabled: boolean }) => seed.mandarin === "复核词")
        ?.enabled,
    ).toBe(false);
    expect(
      artifacts.regressionCases.some((item: { input: string }) => item.input === "复核词"),
    ).toBe(false);
  });

  it("writes generated JSON, validation report, and regression cases", async () => {
    const directory = await createTempDir();
    const csvPath = path.join(directory, "curated-lexicon.csv");
    const jsonPath = path.join(directory, "curated-lexicon.json");
    const reportPath = path.join(directory, "curated-import-report.json");
    const regressionPath = path.join(directory, "regression-cases.json");

    const rows = [
      CSV_HEADERS.join(","),
      "你好,侬好,你好啊|您好,180,true,greeting,常用问候,manual,approved",
      "怎么回事,哪能为实事,,195,true,question,首选示例,manual,approved",
      "今天下雨了,今朝落雨了,,188,true,weather,验收样例,manual,approved",
    ].join("\n");

    await fs.writeFile(csvPath, rows, "utf8");
    const artifacts = await importCuratedCsv({ csvPath, jsonPath, reportPath, regressionPath });

    const generatedJson = JSON.parse(await fs.readFile(jsonPath, "utf8"));
    const generatedReport = JSON.parse(await fs.readFile(reportPath, "utf8"));
    const generatedRegression = JSON.parse(await fs.readFile(regressionPath, "utf8"));

    expect(artifacts.report.rowCount).toBe(3);
    expect(generatedJson).toHaveLength(3);
    expect(generatedReport.regressionCaseCount).toBe(3);
    expect(generatedRegression).toEqual([
      { input: "怎么回事", expected: "哪能为实事" },
      { input: "今天下雨了", expected: "今朝落雨了" },
      { input: "你好", expected: "侬好" },
    ]);
  });
});
