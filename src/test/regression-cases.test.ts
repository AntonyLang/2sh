import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type RegressionCase = {
  input: string;
  expected: string;
};

const regressionCases = JSON.parse(
  readFileSync(join(process.cwd(), "data/regression-cases.json"), "utf8"),
) as RegressionCase[];

describe("generated regression cases", () => {
  it("contains at least 100 curated acceptance samples", () => {
    expect(regressionCases.length).toBeGreaterThanOrEqual(100);
    expect(regressionCases).toEqual(
      expect.arrayContaining([
        { input: "你好", expected: "侬好" },
        { input: "怎么回事", expected: "哪能为实事" },
        { input: "你在做什么", expected: "侬勒做啥" },
        { input: "今天下雨了", expected: "今朝落雨了" },
      ]),
    );
  });
});
