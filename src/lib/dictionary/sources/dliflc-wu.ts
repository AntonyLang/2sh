import * as cheerio from "cheerio";
import { cleanSourceEntries } from "@/lib/dictionary/clean";
import { lookupMandarinFromEnglishGloss } from "@/lib/dictionary/sources/english-mandarin";
import { sanitizeHanPhrase } from "@/lib/dictionary/sources/han-utils";
import type { RawSourceEntry } from "@/lib/dictionary/types";

export const DLIFLC_WU_SEEDS = ["https://fieldsupport.dliflc.edu/products/wu/cs_bc_LSK"];

export function parseDliflcWuHtml(
  html: string,
  context: { url: string },
): {
  accepted: RawSourceEntry[];
  skippedCount: number;
} {
  const $ = cheerio.load(html);
  const rawEntries: RawSourceEntry[] = [];

  for (const row of $("table tr").toArray()) {
    const cells = $(row).find("td");
    if (cells.length < 6) {
      continue;
    }

    const english = $(cells[1]).text().replace(/\s+/g, " ").trim();
    const targetText = sanitizeHanPhrase($(cells[cells.length - 1]!).text());
    const mandarinCandidates = lookupMandarinFromEnglishGloss(english);

    for (const mandarin of mandarinCandidates) {
      if (!targetText) {
        continue;
      }

      rawEntries.push({
        mandarin,
        shanghainese: targetText,
        source: "dliflc-wu",
        weight: 16,
        note: "DLIFLC Basic Language Guide",
        evidence: context.url,
      });
    }
  }

  return cleanSourceEntries(rawEntries);
}

export function discoverDliflcWuLinks(html: string, currentUrl: string): string[] {
  const $ = cheerio.load(html);
  const baseUrl = new URL(currentUrl.endsWith("/") ? currentUrl : `${currentUrl}/`);
  const links = new Set<string>();

  for (const element of $("a[href]").toArray()) {
    const href = $(element).attr("href");
    if (!href) {
      continue;
    }

    try {
      const absolute = new URL(href, baseUrl);
      if (absolute.host !== "fieldsupport.dliflc.edu") {
        continue;
      }

      if (!/\/products\/wu\/cs_bc_LSK\/module\d+\.html$/u.test(absolute.pathname)) {
        continue;
      }

      links.add(absolute.toString());
    } catch {
      continue;
    }
  }

  return [...links];
}
