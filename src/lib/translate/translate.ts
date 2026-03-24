import { normalizeInputText } from "@/lib/dictionary/normalize";
import type {
  CompiledDictionary,
  DictionarySource,
  TranslationCandidate,
  TranslationResult,
  TranslationSegment,
} from "@/lib/dictionary/types";

const INTERMEDIATE_LIMIT = 5;
const FINAL_LIMIT = 3;

type CandidatePath = {
  score: number;
  segments: TranslationSegment[];
};

function sourceRank(source: DictionarySource): number {
  if (source === "curated") return 0;
  if (source === "nonghao") return 1;
  return 2;
}

function sortSources(sources: DictionarySource[]): DictionarySource[] {
  return [...new Set(sources)].sort((left, right) => sourceRank(left) - sourceRank(right));
}

function sameSources(left: DictionarySource[], right: DictionarySource[]): boolean {
  return left.length === right.length && left.every((source, index) => source === right[index]);
}

function mergeAdjacentSegments(segments: TranslationSegment[]): TranslationSegment[] {
  const merged: TranslationSegment[] = [];

  for (const segment of segments) {
    const previous = merged.at(-1);
    if (
      previous &&
      previous.matched === segment.matched &&
      previous.end === segment.start &&
      sameSources(previous.sources, segment.sources)
    ) {
      previous.input += segment.input;
      previous.output += segment.output;
      previous.end = segment.end;
      continue;
    }

    merged.push({ ...segment, sources: [...segment.sources] });
  }

  return merged;
}

function candidateKey(candidate: CandidatePath): string {
  return candidate.segments
    .map((segment) => `${segment.output}:${segment.start}:${segment.end}:${segment.matched ? "1" : "0"}`)
    .join("|");
}

function pruneCandidates(candidates: CandidatePath[]): CandidatePath[] {
  const deduped = new Map<string, CandidatePath>();

  for (const candidate of candidates) {
    const normalizedCandidate = {
      ...candidate,
      segments: mergeAdjacentSegments(candidate.segments),
    };
    const key = candidateKey(normalizedCandidate);
    const existing = deduped.get(key);

    if (!existing || existing.score < normalizedCandidate.score) {
      deduped.set(key, normalizedCandidate);
    }
  }

  return [...deduped.values()]
    .sort((left, right) => {
      const leftText = left.segments.map((segment) => segment.output).join("");
      const rightText = right.segments.map((segment) => segment.output).join("");
      return right.score - left.score || leftText.length - rightText.length;
    })
    .slice(0, INTERMEDIATE_LIMIT);
}

export function translateText(input: string, dictionary: CompiledDictionary): TranslationResult {
  const normalizedInput = normalizeInputText(input);
  if (!normalizedInput) {
    return {
      input,
      normalizedInput,
      candidates: [],
      unmatchedSpans: [],
      dictionaryVersion: dictionary.version,
      updatedAt: dictionary.updatedAt,
    };
  }

  const records = new Map(dictionary.entries.map((entry) => [entry.input, entry.variants]));
  const memo = new Map<number, CandidatePath[]>();

  const solve = (offset: number): CandidatePath[] => {
    if (offset >= normalizedInput.length) {
      return [{ score: 0, segments: [] }];
    }

    const memoized = memo.get(offset);
    if (memoized) {
      return memoized;
    }

    const candidates: CandidatePath[] = [];
    const maxLength = Math.min(dictionary.maxInputLength, normalizedInput.length - offset);

    for (let size = maxLength; size >= 1; size -= 1) {
      const chunk = normalizedInput.slice(offset, offset + size);
      const variants = records.get(chunk);

      if (!variants) {
        continue;
      }

      const tails = solve(offset + size);
      for (const variant of variants.slice(0, 3)) {
        for (const tail of tails) {
          candidates.push({
            score: tail.score + variant.score + size * size * 50,
            segments: [
              {
                input: chunk,
                output: variant.output,
                matched: true,
                start: offset,
                end: offset + size,
                sources: sortSources(variant.sources),
              },
              ...tail.segments,
            ],
          });
        }
      }
    }

    const fallbackTails = solve(offset + 1);
    const currentCharacter = normalizedInput[offset];
    for (const tail of fallbackTails) {
      candidates.push({
        score: tail.score - 24,
        segments: [
          {
            input: currentCharacter,
            output: currentCharacter,
            matched: false,
            start: offset,
            end: offset + 1,
            sources: [],
          },
          ...tail.segments,
        ],
      });
    }

    const pruned = pruneCandidates(candidates);
    memo.set(offset, pruned);
    return pruned;
  };

  const dedupedFinalCandidates = new Map<string, TranslationCandidate>();
  for (const candidate of solve(0)) {
    const segments = mergeAdjacentSegments(candidate.segments);
    const text = segments.map((segment) => segment.output).join("");
    const sources = sortSources(
      segments.flatMap((segment) => {
        return segment.sources;
      }),
    );
    const existing = dedupedFinalCandidates.get(text);

    const normalizedCandidate: TranslationCandidate = {
      text,
      score: candidate.score,
      segments,
      sources,
    };

    if (!existing || existing.score < normalizedCandidate.score) {
      dedupedFinalCandidates.set(text, normalizedCandidate);
    }
  }

  const candidates = [...dedupedFinalCandidates.values()]
    .sort((left, right) => right.score - left.score || left.text.length - right.text.length)
    .slice(0, FINAL_LIMIT);

  const unmatchedSpans =
    candidates[0]?.segments
      .filter((segment) => !segment.matched)
      .map((segment) => ({
        text: segment.input,
        start: segment.start,
        end: segment.end,
      })) ?? [];

  return {
    input,
    normalizedInput,
    candidates,
    unmatchedSpans,
    dictionaryVersion: dictionary.version,
    updatedAt: dictionary.updatedAt,
  };
}
