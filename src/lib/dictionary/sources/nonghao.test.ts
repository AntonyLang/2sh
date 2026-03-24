import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseNonghaoHtml } from "@/lib/dictionary/sources/nonghao";

const fixture = readFileSync(join(process.cwd(), "src/test/fixtures/nonghao.html"), "utf8");

describe("parseNonghaoHtml", () => {
  it("extracts concise Mandarin glosses from dictionary lines", () => {
    const parsed = parseNonghaoHtml(fixture);
    const signatures = parsed.accepted.map((entry) => `${entry.mandarin}:${entry.shanghainese}`);

    expect(signatures).toContain("你好:侬好");
    expect(signatures).toContain("很好:蛮好");
    expect(signatures).toContain("下雨:落雨");
    expect(signatures).toContain("我们:阿拉");
  });
});
