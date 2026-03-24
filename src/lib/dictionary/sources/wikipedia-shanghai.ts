import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { cleanSourceEntries } from "@/lib/dictionary/clean";
import { extractHanCandidates, sanitizeHanPhrase } from "@/lib/dictionary/sources/han-utils";
import type { RawSourceEntry } from "@/lib/dictionary/types";

export const WIKIPEDIA_SHANGHAI_SEEDS = [
  "https://zh.wikipedia.org/w/api.php?action=parse&format=json&page=%E4%B8%8A%E6%B5%B7%E8%AF%9D&prop=text&formatversion=2",
];

type WikipediaParseResponse = {
  parse?: {
    text?: string;
  };
};

const RELEVANT_SECTION_PATTERNS = [/词汇/u, /常用单词示例/u, /特有词汇/u, /人稱代詞/u, /人称代词/u, /指示代詞/u, /指示代词/u];

function findCellIndexes(headers: string[]) {
  const mandarinIndex = headers.findIndex((header) => /普通话|普通話|国语|國語/u.test(header));
  const shanghaiIndex = headers.findIndex((header) => /上海话|上海話|沪语|滬語/u.test(header));
  return { mandarinIndex, shanghaiIndex };
}

function tableContextMatches($: cheerio.CheerioAPI, table: Element): boolean {
  const headerText = $(table)
    .find("tr")
    .first()
    .text()
    .replace(/\s+/g, " ");

  if (/普通话|普通話|上海话|上海話|沪语|滬語/u.test(headerText)) {
    return true;
  }

  const previousHeadings = $(table)
    .prevAll("h2, h3")
    .slice(0, 3)
    .toArray()
    .map((heading) => $(heading).text())
    .join(" ");

  return RELEVANT_SECTION_PATTERNS.some((pattern) => pattern.test(previousHeadings));
}

function extractTableEntries($: cheerio.CheerioAPI, table: Element, currentUrl: string): RawSourceEntry[] {
  const entries: RawSourceEntry[] = [];
  const headerCells = $(table)
    .find("tr")
    .first()
    .find("th, td")
    .toArray()
    .map((cell) => sanitizeHanPhrase($(cell).text()) || $(cell).text().replace(/\s+/g, " ").trim());

  const { mandarinIndex, shanghaiIndex } = findCellIndexes(headerCells);

  for (const row of $(table).find("tr").slice(1).toArray()) {
    const cells = $(row).find("th, td").toArray();
    if (cells.length < 2) {
      continue;
    }

    const leftText = $(cells[mandarinIndex >= 0 ? mandarinIndex : 0]).text();
    const rightText = $(cells[shanghaiIndex >= 0 ? shanghaiIndex : 1]).text();
    const mandarinCandidates = extractHanCandidates(leftText);
    const shanghaineseCandidates = extractHanCandidates(rightText);

    for (const mandarin of mandarinCandidates.slice(0, 2)) {
      for (const shanghainese of shanghaineseCandidates.slice(0, 2)) {
        if (!mandarin || !shanghainese) {
          continue;
        }

        entries.push({
          mandarin,
          shanghainese,
          source: "wikipedia-shanghai",
          weight: 30,
          note: "Wikipedia 上海话词表",
          evidence: currentUrl,
        });
      }
    }
  }

  return entries;
}

export function parseWikipediaShanghaiPayload(
  payload: string,
  context: { url: string },
): {
  accepted: RawSourceEntry[];
  skippedCount: number;
} {
  let parsed: WikipediaParseResponse;

  try {
    parsed = JSON.parse(payload) as WikipediaParseResponse;
  } catch {
    return { accepted: [], skippedCount: 0 };
  }

  const html = parsed.parse?.text ?? "";
  const $ = cheerio.load(html);
  const rawEntries: RawSourceEntry[] = [];

  for (const table of $("table.wikitable").toArray()) {
    if (!tableContextMatches($, table)) {
      continue;
    }

    rawEntries.push(...extractTableEntries($, table, context.url));
  }

  return cleanSourceEntries(rawEntries);
}

export function discoverWikipediaShanghaiLinks(): string[] {
  return [];
}
