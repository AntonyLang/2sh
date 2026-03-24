import * as cheerio from "cheerio";
import { cleanSourceEntries } from "@/lib/dictionary/clean";
import { normalizeLine } from "@/lib/dictionary/normalize";
import type { RawSourceEntry } from "@/lib/dictionary/types";

export const DICT_CN_SEEDS = [
  "https://shh.dict.cn/",
  "https://shh.dict.cn/%E4%B8%8A%E6%B5%B7%E5%9C%A8%E7%BA%BF",
];

export function parseDictCnHtml(
  html: string,
  context?: { url: string },
): {
  accepted: RawSourceEntry[];
  skippedCount: number;
} {
  void context;
  const $ = cheerio.load(html);
  const compactText = normalizeLine($.root().text()).replace(/\s+/g, " ");
  const rawEntries: RawSourceEntry[] = [];

  const pairPattern =
    /\[方\]\s*(.+?)\s*\[中\]\s*(.+?)(?=(?:\[方\]|\[英\]|\[拼\]|上海话分类|上海话情景对话|搜索到的相关方言|每日一句上海话|$))/g;

  for (const match of compactText.matchAll(pairPattern)) {
    const shanghainese = match[1]?.trim() ?? "";
    const mandarin = match[2]?.trim() ?? "";

    if (mandarin && shanghainese) {
      rawEntries.push({
        mandarin,
        shanghainese,
        source: "dict-cn",
        weight: 36,
      });
    }
  }

  const compactSinglePattern = /(^| )([^ \[\]]{1,10})\s*\[中\]\s*([^ \[\]]{1,12})\s*\[拼\]/g;
  for (const match of compactText.matchAll(compactSinglePattern)) {
    const shanghainese = match[2]?.trim() ?? "";
    const mandarin = match[3]?.trim() ?? "";

    if (mandarin && shanghainese) {
      rawEntries.push({
        mandarin,
        shanghainese,
        source: "dict-cn",
        weight: 28,
      });
    }
  }

  return cleanSourceEntries(rawEntries);
}

export function discoverDictCnLinks(html: string, currentUrl: string): string[] {
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
      if (absolute.host !== "shh.dict.cn") {
        continue;
      }
      if (absolute.pathname === "/" || absolute.pathname.includes("play")) {
        continue;
      }
      links.add(absolute.toString());
    } catch {
      continue;
    }
  }

  return [...links];
}
