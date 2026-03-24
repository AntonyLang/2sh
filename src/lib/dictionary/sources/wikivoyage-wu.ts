import * as cheerio from "cheerio";
import { cleanSourceEntries } from "@/lib/dictionary/clean";
import { lookupMandarinFromEnglishGloss, normalizeEnglishGloss } from "@/lib/dictionary/sources/english-mandarin";
import { extractHanCandidates, sanitizeHanPhrase } from "@/lib/dictionary/sources/han-utils";
import type { RawSourceEntry } from "@/lib/dictionary/types";

export const WIKIVOYAGE_WU_SEEDS = ["https://en.wikivoyage.org/wiki/Wu_phrasebook"];

const ALLOWED_GLOSS_KEYS = new Set([
  "hello",
  "hi",
  "good morning",
  "good evening",
  "good night",
  "goodbye",
  "good bye",
  "thank you",
  "thanks",
  "excuse me",
  "please",
  "sorry",
  "what time is it",
  "where is the toilet",
  "where is the bathroom",
  "how much is this",
  "left",
  "right",
  "straight ahead",
  "i don't understand",
]);

function extractShanghaiPhrase(text: string): string[] {
  const prefix = text.includes("(Shanghai)") ? text.split("(Shanghai)")[0] ?? text : text;
  const candidates = extractHanCandidates(prefix).filter((value) => value.length <= 20);

  if (candidates.length > 0) {
    return candidates.slice(-2);
  }

  const fallback = sanitizeHanPhrase(prefix);
  return fallback ? [fallback] : [];
}

export function parseWikivoyageWuHtml(
  html: string,
  context: { url: string },
): {
  accepted: RawSourceEntry[];
  skippedCount: number;
} {
  const $ = cheerio.load(html);
  const rawEntries: RawSourceEntry[] = [];

  for (const term of $("dt").toArray()) {
    const english = $(term).text().trim();
    const normalized = normalizeEnglishGloss(english);
    if (!ALLOWED_GLOSS_KEYS.has(normalized)) {
      continue;
    }

    const mandarinCandidates = lookupMandarinFromEnglishGloss(english);
    const definition = $(term).next("dd");
    const shanghaineseCandidates = definition.length > 0 ? extractShanghaiPhrase(definition.text()) : [];

    for (const mandarin of mandarinCandidates) {
      for (const shanghainese of shanghaineseCandidates.slice(0, 2)) {
        rawEntries.push({
          mandarin,
          shanghainese,
          source: "wikivoyage-wu",
          weight: 40,
          note: "Wikivoyage Shanghai phrase",
          evidence: `${context.url}#${normalized.replace(/\s+/g, "-")}`,
        });
      }
    }
  }

  return cleanSourceEntries(rawEntries);
}

export function discoverWikivoyageWuLinks(): string[] {
  return [];
}
