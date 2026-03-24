import type { TranslationResult } from "@/lib/dictionary/types";
import { appendRuntimeNdjson } from "@/lib/runtime-data";
import { isQueryLoggingEnabled } from "@/lib/site-mode";

export type QueryLogRecord = {
  timestamp: string;
  input: string;
  normalizedInput: string;
  dictionaryVersion: string;
  candidateCount: number;
  topScore: number | null;
  unmatchedSpans: TranslationResult["unmatchedSpans"];
  hasExactTopCandidate: boolean;
};

function getDailyQueryLogPath(now: Date): string {
  return `logs/queries/${now.toISOString().slice(0, 10)}.ndjson`;
}

function hasExactTopCandidate(result: TranslationResult): boolean {
  const topCandidate = result.candidates[0];
  if (!topCandidate || result.unmatchedSpans.length > 0) {
    return false;
  }

  return (
    topCandidate.segments.length > 0 &&
    topCandidate.segments.every((segment) => segment.matched) &&
    topCandidate.segments.map((segment) => segment.input).join("") === result.normalizedInput
  );
}

export function buildQueryLogRecord(result: TranslationResult, now = new Date()): QueryLogRecord {
  return {
    timestamp: now.toISOString(),
    input: result.input,
    normalizedInput: result.normalizedInput,
    dictionaryVersion: result.dictionaryVersion,
    candidateCount: result.candidates.length,
    topScore: result.candidates[0]?.score ?? null,
    unmatchedSpans: result.unmatchedSpans,
    hasExactTopCandidate: hasExactTopCandidate(result),
  };
}

export async function logTranslationQuery(result: TranslationResult, now = new Date()): Promise<void> {
  if (!isQueryLoggingEnabled()) {
    return;
  }

  await appendRuntimeNdjson(getDailyQueryLogPath(now), buildQueryLogRecord(result, now));
}
