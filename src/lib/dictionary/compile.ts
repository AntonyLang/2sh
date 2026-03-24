import curatedLexicon from "@/lib/dictionary/curated-lexicon.json";
import { cleanSourceEntries } from "@/lib/dictionary/clean";
import type {
  CompiledDictionary,
  CuratedLexiconSeed,
  DictionaryRecord,
  DictionarySource,
  DictionaryVariant,
  RawSourceEntry,
  SourceSyncStats,
} from "@/lib/dictionary/types";
import { getSourceBaseScore, isStrongSource } from "@/lib/dictionary/source-registry";

type VariantAccumulator = {
  output: string;
  score: number;
  sources: Set<DictionarySource>;
  notes: Set<string>;
};

function createVersionTag(date: Date): string {
  return `dict-${date.toISOString().replace(/[:.]/g, "-")}`;
}

export function getCuratedEntries(): RawSourceEntry[] {
  const seeds = curatedLexicon as CuratedLexiconSeed[];
  const expanded: RawSourceEntry[] = [];

  for (const seed of seeds) {
    if (!seed.enabled || (seed.status ?? "approved") !== "approved") {
      continue;
    }

    const inputs = [seed.mandarin, ...(seed.aliases ?? [])];
    for (const input of inputs) {
      expanded.push({
        mandarin: input,
        shanghainese: seed.shanghainese,
        source: "curated",
        weight: seed.weight ?? 100,
        note: seed.note,
      });
    }
  }

  return cleanSourceEntries(expanded).accepted;
}

export function compileDictionary(
  entries: RawSourceEntry[],
  sourceStats: SourceSyncStats[],
  now = new Date(),
): CompiledDictionary {
  const grouped = new Map<string, Map<string, VariantAccumulator>>();

  for (const entry of entries) {
    const variants = grouped.get(entry.mandarin) ?? new Map<string, VariantAccumulator>();
    const current = variants.get(entry.shanghainese) ?? {
      output: entry.shanghainese,
      score: 0,
      sources: new Set<DictionarySource>(),
      notes: new Set<string>(),
    };

    current.score += getSourceBaseScore(entry.source) + (entry.weight ?? 0);
    current.sources.add(entry.source);

    if (entry.note) {
      current.notes.add(entry.note);
    }

    variants.set(entry.shanghainese, current);
    grouped.set(entry.mandarin, variants);
  }

  const records: DictionaryRecord[] = [...grouped.entries()]
    .map(([input, variantsMap]) => {
      const variants: DictionaryVariant[] = [...variantsMap.values()]
        .map((variant) => {
          const sources = [...variant.sources].sort((left, right) => {
            return getSourceBaseScore(right) - getSourceBaseScore(left);
          });
          const strongSourceCount = sources.filter((source) => isStrongSource(source)).length;

          return {
            output: variant.output,
            score: variant.score + (strongSourceCount > 1 ? 65 : 0) + (sources.length > 1 ? 20 : 0),
            sources,
            note: [...variant.notes][0],
          };
        })
        .sort((left, right) => {
          return right.score - left.score || left.output.length - right.output.length;
        });

      return { input, variants };
    })
    .sort((left, right) => right.input.length - left.input.length || left.input.localeCompare(right.input, "zh-CN"));

  return {
    version: createVersionTag(now),
    updatedAt: now.toISOString(),
    maxInputLength: records[0]?.input.length ?? 1,
    entries: records,
    sourceStats,
  };
}
