import type { RawSourceEntry } from "@/lib/dictionary/types";
import { hasHanCharacters, normalizeLookupText } from "@/lib/dictionary/normalize";

export function cleanSourceEntries(entries: RawSourceEntry[]): {
  accepted: RawSourceEntry[];
  skippedCount: number;
} {
  const accepted: RawSourceEntry[] = [];
  const seen = new Set<string>();
  let skippedCount = 0;

  for (const entry of entries) {
    const mandarin = normalizeLookupText(entry.mandarin);
    const shanghainese = normalizeLookupText(entry.shanghainese);

    if (!mandarin || !shanghainese) {
      skippedCount += 1;
      continue;
    }

    if (!hasHanCharacters(mandarin) || !hasHanCharacters(shanghainese)) {
      skippedCount += 1;
      continue;
    }

    const key = `${entry.source}::${mandarin}::${shanghainese}`;
    if (seen.has(key)) {
      skippedCount += 1;
      continue;
    }

    seen.add(key);
    accepted.push({
      ...entry,
      mandarin,
      shanghainese,
    });
  }

  return { accepted, skippedCount };
}
