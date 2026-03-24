import * as cheerio from "cheerio";
import { cleanSourceEntries } from "@/lib/dictionary/clean";
import { lookupMandarinFromEnglishGloss, normalizeEnglishGloss } from "@/lib/dictionary/sources/english-mandarin";
import { extractHanCandidates, sanitizeHanPhrase } from "@/lib/dictionary/sources/han-utils";
import type { RawSourceEntry } from "@/lib/dictionary/types";

export const OMNIGLOT_SHANGHAINESE_SEEDS = ["https://www.omniglot.com/language/phrases/shanghainese.php"];

function extractCandidatesFromTranslation(value: string): string[] {
  return [
    ...extractHanCandidates(value),
    ...value
      .split(/\n+/)
      .map((line) => sanitizeHanPhrase(line))
      .filter(Boolean),
  ].filter((candidate) => candidate.length <= 24);
}

export function parseOmniglotShanghaineseHtml(
  html: string,
  context: { url: string },
): {
  accepted: RawSourceEntry[];
  skippedCount: number;
} {
  const $ = cheerio.load(html);
  const rawEntries: RawSourceEntry[] = [];

  for (const row of $("table tr").toArray()) {
    const cells = $(row).find("th, td");
    if (cells.length < 2) {
      continue;
    }

    const english = $(cells[0]).text().replace(/\s+/g, " ").trim();
    const normalizedEnglish = normalizeEnglishGloss(english);
    const mandarinCandidates = lookupMandarinFromEnglishGloss(english);

    if (mandarinCandidates.length === 0 || normalizedEnglish === "english") {
      continue;
    }

    const translationCell = $(cells[1]).text();
    const shanghaineseCandidates = [...new Set(extractCandidatesFromTranslation(translationCell))].slice(0, 3);

    for (const mandarin of mandarinCandidates) {
      for (const shanghainese of shanghaineseCandidates) {
        rawEntries.push({
          mandarin,
          shanghainese,
          source: "omniglot-shanghainese",
          weight: 18,
          note: "Omniglot useful phrases",
          evidence: `${context.url}#${normalizedEnglish.replace(/\s+/g, "-")}`,
        });
      }
    }
  }

  return cleanSourceEntries(rawEntries);
}

export function discoverOmniglotShanghaineseLinks(): string[] {
  return [];
}
