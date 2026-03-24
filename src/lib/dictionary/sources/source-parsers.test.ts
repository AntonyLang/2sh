import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDliflcWuHtml, discoverDliflcWuLinks } from "@/lib/dictionary/sources/dliflc-wu";
import { parseGlosbeWuuHtml } from "@/lib/dictionary/sources/glosbe-wuu";
import { parseOmniglotShanghaineseHtml } from "@/lib/dictionary/sources/omniglot-shanghainese";
import { parseWikipediaShanghaiPayload } from "@/lib/dictionary/sources/wikipedia-shanghai";
import {
  discoverWiktionaryShanghaiLinks,
  parseWiktionaryShanghaiPayload,
} from "@/lib/dictionary/sources/wiktionary-shanghai";
import { parseWikivoyageWuHtml } from "@/lib/dictionary/sources/wikivoyage-wu";

const fixturesDir = join(process.cwd(), "src/test/fixtures");
const wiktionaryCategoryFixture = readFileSync(join(fixturesDir, "wiktionary-category.json"), "utf8");
const wiktionarySwadeshFixture = readFileSync(join(fixturesDir, "wiktionary-swadesh.json"), "utf8");
const wikivoyageFixture = readFileSync(join(fixturesDir, "wikivoyage-wu.html"), "utf8");
const wikipediaFixture = readFileSync(join(fixturesDir, "wikipedia-shanghai.json"), "utf8");
const glosbeFixture = readFileSync(join(fixturesDir, "glosbe-wuu.html"), "utf8");
const dliflcIndexFixture = readFileSync(join(fixturesDir, "dliflc-wu-index.html"), "utf8");
const dliflcModuleFixture = readFileSync(join(fixturesDir, "dliflc-wu-module3.html"), "utf8");
const omniglotFixture = readFileSync(join(fixturesDir, "omniglot-shanghainese.html"), "utf8");

describe("source parsers", () => {
  it("parses Wiktionary category and Swadesh payloads", () => {
    const categoryParsed = parseWiktionaryShanghaiPayload(wiktionaryCategoryFixture, {
      url: "https://en.wiktionary.org/w/api.php?action=query",
    });
    const swadeshParsed = parseWiktionaryShanghaiPayload(wiktionarySwadeshFixture, {
      url: "https://en.wiktionary.org/w/api.php?action=parse",
    });

    expect(categoryParsed.accepted.some((entry) => entry.mandarin === "闲话" && entry.shanghainese === "闲话")).toBe(true);
    expect(swadeshParsed.accepted.some((entry) => entry.mandarin === "你" && entry.shanghainese === "侬")).toBe(true);
    expect(discoverWiktionaryShanghaiLinks(wiktionaryCategoryFixture)).toEqual([]);
  });

  it("parses Wikivoyage Shanghai phrases and keeps mapped phrases only", () => {
    const parsed = parseWikivoyageWuHtml(wikivoyageFixture, {
      url: "https://en.wikivoyage.org/wiki/Wu_phrasebook",
    });

    expect(parsed.accepted.some((entry) => entry.mandarin === "谢谢" && entry.shanghainese === "多谢")).toBe(true);
    expect(parsed.accepted.some((entry) => entry.mandarin === "现在几点" && entry.shanghainese === "现在几点")).toBe(true);
  });

  it("parses structured Wikipedia term tables", () => {
    const parsed = parseWikipediaShanghaiPayload(wikipediaFixture, {
      url: "https://zh.wikipedia.org/w/api.php?action=parse",
    });

    expect(parsed.accepted.some((entry) => entry.mandarin === "我们" && entry.shanghainese === "阿拉")).toBe(true);
    expect(parsed.accepted.some((entry) => entry.mandarin === "下雨" && entry.shanghainese === "落雨")).toBe(true);
  });

  it("parses Glosbe candidate pairs from recent changes", () => {
    const parsed = parseGlosbeWuuHtml(glosbeFixture, {
      url: "https://glosbe.com/zh/wuu",
    });

    expect(parsed.accepted.some((entry) => entry.mandarin === "折腾" && entry.shanghainese === "作")).toBe(true);
  });

  it("discovers and parses DLIFLC phrasebook rows", () => {
    const discovered = discoverDliflcWuLinks(
      dliflcIndexFixture,
      "https://fieldsupport.dliflc.edu/products/wu/cs_bc_LSK",
    );
    const parsed = parseDliflcWuHtml(dliflcModuleFixture, {
      url: "https://fieldsupport.dliflc.edu/products/wu/cs_bc_LSK/module3.html",
    });

    expect(discovered).toContain("https://fieldsupport.dliflc.edu/products/wu/cs_bc_LSK/module3.html");
    expect(parsed.accepted.some((entry) => entry.mandarin === "你好" && entry.shanghainese === "喂")).toBe(true);
    expect(parsed.accepted.some((entry) => entry.mandarin === "谢谢你帮忙" && entry.shanghainese === "谢谢侬帮我忙")).toBe(true);
  });

  it("parses Omniglot useful phrases into weak-source candidates", () => {
    const parsed = parseOmniglotShanghaineseHtml(omniglotFixture, {
      url: "https://www.omniglot.com/language/phrases/shanghainese.php",
    });

    expect(parsed.accepted.some((entry) => entry.mandarin === "你好" && entry.shanghainese === "侬好")).toBe(true);
    expect(parsed.accepted.some((entry) => entry.mandarin === "好久不见" && entry.shanghainese === "好久弗见")).toBe(true);
  });
});
