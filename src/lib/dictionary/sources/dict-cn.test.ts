import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverDictCnLinks, parseDictCnHtml } from "@/lib/dictionary/sources/dict-cn";

const fixture = readFileSync(join(process.cwd(), "src/test/fixtures/dict-cn.html"), "utf8");

describe("parseDictCnHtml", () => {
  it("extracts 方/中 pairs and single-word entries", () => {
    const parsed = parseDictCnHtml(fixture);
    const signatures = parsed.accepted.map((entry) => `${entry.mandarin}:${entry.shanghainese}`);

    expect(signatures).toContain("你好:侬好");
    expect(signatures).toContain("今天下雨了。:今朝落雨了。");
  });

  it("discovers same-domain category links", () => {
    const links = discoverDictCnLinks(fixture, "https://shh.dict.cn/");
    expect(links).toContain("https://shh.dict.cn/greeting");
  });
});
