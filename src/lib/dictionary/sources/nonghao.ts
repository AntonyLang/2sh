import * as cheerio from "cheerio";
import { cleanSourceEntries } from "@/lib/dictionary/clean";
import { normalizeLine, splitGlossCandidates } from "@/lib/dictionary/normalize";
import type { RawSourceEntry } from "@/lib/dictionary/types";

export const NONGHAO_SEEDS = [
  "https://nhxt.xinmin.cn/cyzc/m/",
  "https://nhxt.xinmin.cn/cyzc/pc/",
];

const PINYIN_LINE_PATTERN =
  /^([^\sa-zA-Z0-9][^a-zA-Z]{0,20}?)\s+([a-z][a-z\s/.-]+)\s+(.+)$/i;

export function parseNonghaoHtml(
  html: string,
  context?: { url: string },
): {
  accepted: RawSourceEntry[];
  skippedCount: number;
} {
  void context;
  const $ = cheerio.load(html);
  const rawEntries: RawSourceEntry[] = [];

  const lines = $.root()
    .text()
    .split(/\n+/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  for (const line of lines) {
    const matched = PINYIN_LINE_PATTERN.exec(line);
    if (!matched) {
      continue;
    }

    const shanghainese = matched[1]?.trim() ?? "";
    const definition = matched[3]?.trim() ?? "";
    const candidates = splitGlossCandidates(definition);

    for (const mandarin of candidates.slice(0, 3)) {
      rawEntries.push({
        mandarin,
        shanghainese,
        source: "nonghao",
        weight: 44,
        raw: line,
      });
    }
  }

  return cleanSourceEntries(rawEntries);
}

export function discoverNonghaoLinks(html: string, currentUrl: string): string[] {
  const $ = cheerio.load(html);
  const baseUrl = new URL(currentUrl);
  const links = new Set<string>();

  for (const element of $("a[href]").toArray()) {
    const href = $(element).attr("href");
    if (!href || href.startsWith("javascript:")) {
      continue;
    }

    try {
      const absolute = new URL(href, baseUrl);
      if (absolute.host !== "nhxt.xinmin.cn") {
        continue;
      }
      if (!absolute.pathname.startsWith("/cyzc/")) {
        continue;
      }
      links.add(absolute.toString());
    } catch {
      continue;
    }
  }

  return [...links];
}
