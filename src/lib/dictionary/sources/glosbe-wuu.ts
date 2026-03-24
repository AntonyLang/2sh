import * as cheerio from "cheerio";
import { cleanSourceEntries } from "@/lib/dictionary/clean";
import { sanitizeHanPhrase } from "@/lib/dictionary/sources/han-utils";
import type { RawSourceEntry } from "@/lib/dictionary/types";

export const GLOSBE_WUU_SEEDS = ["https://glosbe.com/zh/wuu"];

export function parseGlosbeWuuHtml(
  html: string,
  context: { url: string },
): {
  accepted: RawSourceEntry[];
  skippedCount: number;
} {
  void context;
  const $ = cheerio.load(html);
  const rawEntries: RawSourceEntry[] = [];

  for (const row of $("div").toArray()) {
    const links = $(row).find("a[href]").toArray();
    if (links.length < 2) {
      continue;
    }

    const leftHref = $(links[0]).attr("href") ?? "";
    const rightHref = $(links[1]).attr("href") ?? "";
    if (!leftHref.startsWith("/wuu/zh/") || !rightHref.startsWith("/zh/wuu/")) {
      continue;
    }

    const shanghainese = sanitizeHanPhrase($(links[0]).text()).split(/[；;、／/]/u)[0] ?? "";
    const mandarin = sanitizeHanPhrase($(links[1]).text());
    if (!mandarin || !shanghainese) {
      continue;
    }

    rawEntries.push({
      mandarin,
      shanghainese,
      source: "glosbe-wuu",
      weight: 18,
      note: "Glosbe recent changes",
      evidence: `https://glosbe.com${rightHref}`,
    });
  }

  return cleanSourceEntries(rawEntries);
}

export function discoverGlosbeWuuLinks(): string[] {
  return [];
}
