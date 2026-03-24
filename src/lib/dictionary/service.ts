import { compileDictionary, getCuratedEntries } from "@/lib/dictionary/compile";
import {
  fetchDictionaryFromUpstream,
  readDictionaryFromMirrorCache,
  writeDictionaryToMirrorCache,
} from "@/lib/dictionary/mirror-cache";
import { writeReviewCandidateArtifactsToDisk } from "@/lib/dictionary/local-generated";
import { buildReviewCandidates } from "@/lib/dictionary/review-candidates";
import { getDictionaryStorage } from "@/lib/dictionary/storage";
import {
  isAutoIngestSource,
  isCandidateOnlySource,
} from "@/lib/dictionary/source-registry";
import { isBlockedPublicEntry } from "@/lib/dictionary/source-rules";
import { DICT_CN_SEEDS, discoverDictCnLinks, parseDictCnHtml } from "@/lib/dictionary/sources/dict-cn";
import { discoverDliflcWuLinks, DLIFLC_WU_SEEDS, parseDliflcWuHtml } from "@/lib/dictionary/sources/dliflc-wu";
import { discoverGlosbeWuuLinks, GLOSBE_WUU_SEEDS, parseGlosbeWuuHtml } from "@/lib/dictionary/sources/glosbe-wuu";
import { NONGHAO_BUNDLED_FALLBACK } from "@/lib/dictionary/sources/nonghao-fallback";
import { NONGHAO_SEEDS, discoverNonghaoLinks, parseNonghaoHtml } from "@/lib/dictionary/sources/nonghao";
import {
  discoverOmniglotShanghaineseLinks,
  OMNIGLOT_SHANGHAINESE_SEEDS,
  parseOmniglotShanghaineseHtml,
} from "@/lib/dictionary/sources/omniglot-shanghainese";
import {
  discoverWikipediaShanghaiLinks,
  parseWikipediaShanghaiPayload,
  WIKIPEDIA_SHANGHAI_SEEDS,
} from "@/lib/dictionary/sources/wikipedia-shanghai";
import {
  discoverWiktionaryShanghaiLinks,
  parseWiktionaryShanghaiPayload,
  WIKTIONARY_SHANGHAI_SEEDS,
} from "@/lib/dictionary/sources/wiktionary-shanghai";
import {
  discoverWikivoyageWuLinks,
  parseWikivoyageWuHtml,
  WIKIVOYAGE_WU_SEEDS,
} from "@/lib/dictionary/sources/wikivoyage-wu";
import type {
  CompiledDictionary,
  DictionaryStorageMode,
  DictionarySource,
  RawSourceEntry,
  ReviewCandidatesReport,
  ReviewCandidate,
  SourceHealth,
  SourceHealthStatus,
  SourceSyncStats,
  SyncReport,
} from "@/lib/dictionary/types";
import { getMirrorCacheTtlMs, getSiteRole, isMirrorSite } from "@/lib/site-mode";

type FetchLike = typeof fetch;

type SourceAdapter = {
  source: DictionarySource;
  seedUrls: string[];
  maxPages: number;
  parse: (body: string, context: { url: string }) => { accepted: RawSourceEntry[]; skippedCount: number };
  discover: (body: string, currentUrl: string) => string[];
};

type SourceCrawlResult = {
  source: DictionarySource;
  entries: RawSourceEntry[];
  stats: SourceSyncStats;
};

type PersistArtifactsFn = (
  builtDictionary: CompiledDictionary,
  activeDictionary: CompiledDictionary,
  report: SyncReport,
  candidateArtifacts?: {
    csv: string;
    report: ReviewCandidatesReport;
  },
) => Promise<void>;

type SyncOptions = {
  fetchImpl?: FetchLike;
  now?: Date;
  persistArtifacts?: PersistArtifactsFn | null;
  storageMode?: DictionaryStorageMode;
};

type LoadDictionaryOptions = {
  fetchImpl?: FetchLike;
  now?: Date;
};

export type SyncOutcome = {
  dictionary: CompiledDictionary;
  activeDictionary: CompiledDictionary;
  report: SyncReport;
  reviewCandidates: ReviewCandidate[];
  reviewCandidatesCsv: string;
  reviewCandidatesReport: ReviewCandidatesReport;
};

const SOURCE_ADAPTERS: SourceAdapter[] = [
  {
    source: "dict-cn",
    seedUrls: DICT_CN_SEEDS,
    maxPages: 6,
    parse: parseDictCnHtml,
    discover: discoverDictCnLinks,
  },
  {
    source: "nonghao",
    seedUrls: NONGHAO_SEEDS,
    maxPages: 4,
    parse: parseNonghaoHtml,
    discover: discoverNonghaoLinks,
  },
  {
    source: "wiktionary-shanghai",
    seedUrls: WIKTIONARY_SHANGHAI_SEEDS,
    maxPages: 5,
    parse: parseWiktionaryShanghaiPayload,
    discover: discoverWiktionaryShanghaiLinks,
  },
  {
    source: "wikivoyage-wu",
    seedUrls: WIKIVOYAGE_WU_SEEDS,
    maxPages: 1,
    parse: parseWikivoyageWuHtml,
    discover: discoverWikivoyageWuLinks,
  },
  {
    source: "wikipedia-shanghai",
    seedUrls: WIKIPEDIA_SHANGHAI_SEEDS,
    maxPages: 1,
    parse: parseWikipediaShanghaiPayload,
    discover: discoverWikipediaShanghaiLinks,
  },
  {
    source: "glosbe-wuu",
    seedUrls: GLOSBE_WUU_SEEDS,
    maxPages: 1,
    parse: parseGlosbeWuuHtml,
    discover: discoverGlosbeWuuLinks,
  },
  {
    source: "dliflc-wu",
    seedUrls: DLIFLC_WU_SEEDS,
    maxPages: 16,
    parse: parseDliflcWuHtml,
    discover: discoverDliflcWuLinks,
  },
  {
    source: "omniglot-shanghainese",
    seedUrls: OMNIGLOT_SHANGHAINESE_SEEDS,
    maxPages: 1,
    parse: parseOmniglotShanghaineseHtml,
    discover: discoverOmniglotShanghaineseLinks,
  },
];

const AUTO_INGEST_ADAPTERS = SOURCE_ADAPTERS.filter((adapter) => isAutoIngestSource(adapter.source));
const CANDIDATE_ONLY_ADAPTERS = SOURCE_ADAPTERS.filter((adapter) => isCandidateOnlySource(adapter.source));

const REQUEST_HEADERS = {
  "user-agent": "2sh-dictionary-sync/0.3 (+https://vercel.com)",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.7",
};

const SOURCE_MIN_ACCEPTED: Record<DictionarySource, number> = {
  curated: 1,
  "dict-cn": 2,
  nonghao: 2,
  "wiktionary-shanghai": 3,
  "wikivoyage-wu": 2,
  "wikipedia-shanghai": 2,
  "glosbe-wuu": 1,
  "dliflc-wu": 1,
  "omniglot-shanghainese": 1,
};

let volatileDictionary: CompiledDictionary | null = null;
let volatileDictionaryLoadedAt = 0;
let volatileDictionaryRole: "primary" | "mirror" = "primary";

function createSyncTag(date: Date): string {
  return `sync-${date.toISOString().replace(/[:.]/g, "-")}`;
}

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function createCuratedStats(entries: RawSourceEntry[]): SourceSyncStats {
  return {
    source: "curated",
    fetchedPages: 0,
    discoveredPages: 0,
    parsedEntries: entries.length,
    acceptedEntries: entries.length,
    skippedEntries: 0,
    errors: [],
  };
}

function createDictionarySignature(dictionary: CompiledDictionary): Map<string, string> {
  return new Map(
    dictionary.entries.map((record) => {
      const outputs = record.variants.map((variant) => variant.output).join("|");
      return [record.input, outputs];
    }),
  );
}

function extractSourceEntriesFromDictionary(
  dictionary: CompiledDictionary,
  source: DictionarySource,
): RawSourceEntry[] {
  const entries: RawSourceEntry[] = [];

  for (const record of dictionary.entries) {
    for (const variant of record.variants) {
      if (!variant.sources.includes(source)) {
        continue;
      }

      entries.push({
        mandarin: record.input,
        shanghainese: variant.output,
        source,
        weight: -110,
        note: "previous source fallback",
      });
    }
  }

  return entries;
}

function getBundledFallbackEntries(source: DictionarySource): RawSourceEntry[] {
  if (source === "nonghao") {
    return NONGHAO_BUNDLED_FALLBACK.map((entry) => ({
      ...entry,
      weight: (entry.weight ?? 0) - 90,
    }));
  }

  return [];
}

function compareDictionaries(previous: CompiledDictionary, next: CompiledDictionary) {
  const previousSignatures = createDictionarySignature(previous);
  let newEntries = 0;
  let updatedEntries = 0;

  for (const record of next.entries) {
    const signature = record.variants.map((variant) => variant.output).join("|");
    const previousSignature = previousSignatures.get(record.input);

    if (!previousSignature) {
      newEntries += 1;
      continue;
    }

    if (previousSignature !== signature) {
      updatedEntries += 1;
    }
  }

  return { newEntries, updatedEntries };
}

async function fetchPayload(url: string, fetchImpl: FetchLike): Promise<string> {
  const response = await fetchImpl(url, {
    headers: REQUEST_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.text();
}

async function crawlSource(
  adapter: SourceAdapter,
  fetchImpl: FetchLike,
): Promise<SourceCrawlResult> {
  const queue = [...adapter.seedUrls];
  const seen = new Set<string>();
  const discovered = new Set<string>(adapter.seedUrls);
  const acceptedEntries: RawSourceEntry[] = [];

  const stats: SourceSyncStats = {
    source: adapter.source,
    fetchedPages: 0,
    discoveredPages: discovered.size,
    parsedEntries: 0,
    acceptedEntries: 0,
    skippedEntries: 0,
    errors: [],
  };

  while (queue.length > 0 && seen.size < adapter.maxPages) {
    const nextUrl = queue.shift();
    if (!nextUrl || seen.has(nextUrl)) {
      continue;
    }

    seen.add(nextUrl);

    try {
      const payload = await fetchPayload(nextUrl, fetchImpl);
      stats.fetchedPages += 1;

      const parsed = adapter.parse(payload, { url: nextUrl });
      acceptedEntries.push(...parsed.accepted);
      stats.parsedEntries += parsed.accepted.length + parsed.skippedCount;
      stats.acceptedEntries += parsed.accepted.length;
      stats.skippedEntries += parsed.skippedCount;

      for (const discoveredUrl of adapter.discover(payload, nextUrl)) {
        if (discovered.has(discoveredUrl)) {
          continue;
        }

        discovered.add(discoveredUrl);
        if (seen.size + queue.length < adapter.maxPages) {
          queue.push(discoveredUrl);
        }
      }
    } catch (error) {
      stats.errors.push(`${nextUrl}: ${serializeError(error)}`);
    }
  }

  stats.discoveredPages = discovered.size;
  return {
    source: adapter.source,
    entries: acceptedEntries,
    stats,
  };
}

function buildCuratedVariantIndex(entries: RawSourceEntry[]): Map<string, Set<string>> {
  const variants = new Map<string, Set<string>>();

  for (const entry of entries) {
    const outputs = variants.get(entry.mandarin) ?? new Set<string>();
    outputs.add(entry.shanghainese);
    variants.set(entry.mandarin, outputs);
  }

  return variants;
}

function applyPublicSourceRules(
  crawled: SourceCrawlResult[],
  curatedEntries: RawSourceEntry[],
): SourceCrawlResult[] {
  const curatedVariants = buildCuratedVariantIndex(curatedEntries);

  return crawled.map((result) => {
    const nextEntries: RawSourceEntry[] = [];
    let blockedEntries = 0;

    for (const entry of result.entries) {
      const blockedReason = isBlockedPublicEntry(entry, curatedVariants);
      if (blockedReason) {
        blockedEntries += 1;
        continue;
      }

      nextEntries.push(entry);
    }

    return {
      source: result.source,
      entries: nextEntries,
      stats: {
        ...result.stats,
        acceptedEntries: nextEntries.length,
        skippedEntries: result.stats.skippedEntries + blockedEntries,
      },
    };
  });
}

function getPreviousSourceStats(dictionary: CompiledDictionary): Map<DictionarySource, SourceSyncStats> {
  return new Map(dictionary.sourceStats.map((stats) => [stats.source, stats]));
}

function ratioDelta(currentValue: number, previousValue: number): number | null {
  if (previousValue === 0) {
    return null;
  }

  return (currentValue - previousValue) / previousValue;
}

function determineSourceStatus(args: {
  source: DictionarySource;
  stats: SourceSyncStats;
  previousAcceptedEntries: number;
  fallbackMode?: "previous" | "bundled";
  fallbackEntries?: number;
}): SourceHealth {
  const { source, stats, previousAcceptedEntries, fallbackMode, fallbackEntries = 0 } = args;
  const reasons: string[] = [];
  let status: SourceHealthStatus = "healthy";
  const entryDelta = stats.acceptedEntries - previousAcceptedEntries;
  const entryDeltaRatio = ratioDelta(stats.acceptedEntries, previousAcceptedEntries);

  if (!fallbackMode && (stats.fetchedPages === 0 || stats.acceptedEntries < SOURCE_MIN_ACCEPTED[source])) {
    status = stats.errors.length > 0 ? "failed" : "excluded";
    reasons.push("insufficient_entries");
  }

  if (previousAcceptedEntries >= 10 && entryDeltaRatio !== null && entryDeltaRatio < -0.65) {
    status = "excluded";
    reasons.push("entry_drop");
  }

  if (fallbackMode) {
    status = "warning";
    reasons.push(fallbackMode === "previous" ? "stale_previous_entries" : "bundled_fallback");
  }

  if (stats.errors.length > 0 && status === "healthy") {
    status = "warning";
    reasons.push("partial_fetch_errors");
  }

  if (stats.parsedEntries > 0 && stats.acceptedEntries / stats.parsedEntries < 0.08 && status === "healthy") {
    status = "warning";
    reasons.push("low_acceptance_ratio");
  }

  return {
    source,
    status,
    reasons,
    fetchedPages: stats.fetchedPages,
    discoveredPages: stats.discoveredPages,
    acceptedEntries: stats.acceptedEntries,
    previousAcceptedEntries,
    errorCount: stats.errors.length,
    entryDelta,
    entryDeltaRatio,
    fallbackMode,
    fallbackEntries,
  };
}

function buildFallbackDictionary(now = new Date()): CompiledDictionary {
  const curatedEntries = getCuratedEntries();
  return compileDictionary(curatedEntries, [createCuratedStats(curatedEntries)], now);
}

async function buildRemoteDictionary(
  fetchImpl: FetchLike,
  previousDictionary: CompiledDictionary,
  now = new Date(),
): Promise<{
  dictionary: CompiledDictionary;
  liveDictionary: CompiledDictionary;
  anomalies: string[];
  excludedSources: DictionarySource[];
  sourceHealth: SourceHealth[];
  candidateSourceStats: SourceSyncStats[];
  reviewCandidates: ReviewCandidate[];
  reviewCandidatesCsv: string;
  reviewCandidatesReport: ReviewCandidatesReport;
}> {
  const curatedEntries = getCuratedEntries();
  const previousStats = getPreviousSourceStats(previousDictionary);

  const crawledAutoIngest = applyPublicSourceRules(
    await Promise.all(AUTO_INGEST_ADAPTERS.map((adapter) => crawlSource(adapter, fetchImpl))),
    curatedEntries,
  );
  const crawledCandidateOnly = applyPublicSourceRules(
    await Promise.all(CANDIDATE_ONLY_ADAPTERS.map((adapter) => crawlSource(adapter, fetchImpl))),
    curatedEntries,
  );

  const sourceHealth = crawledAutoIngest.map((result) => {
    const previousAcceptedEntries = previousStats.get(result.source)?.acceptedEntries ?? 0;
    return determineSourceStatus({
      source: result.source,
      stats: result.stats,
      previousAcceptedEntries,
    });
  });

  const anomalies: string[] = [];
  const excludedSources = sourceHealth
    .filter((health) => health.status === "excluded" || health.status === "failed")
    .map((health) => health.source);

  for (const health of sourceHealth) {
    if (health.reasons.length > 0) {
      anomalies.push(`${health.source}:${health.reasons.join(",")}`);
    }
  }

  const fallbackEntries: RawSourceEntry[] = [];
  const nextSourceHealth = sourceHealth.map((health) => {
    if (!excludedSources.includes(health.source)) {
      return health;
    }

    const previousEntries = extractSourceEntriesFromDictionary(previousDictionary, health.source);
    const fallback =
      previousEntries.length > 0
        ? {
            entries: previousEntries,
            mode: "previous" as const,
          }
        : {
            entries: getBundledFallbackEntries(health.source),
            mode: "bundled" as const,
          };

    if (fallback.entries.length === 0) {
      return health;
    }

    fallbackEntries.push(...fallback.entries);
    anomalies.push(
      `${health.source}:${fallback.mode === "previous" ? "using_previous_fallback" : "using_bundled_fallback"}`,
    );

    return {
      ...health,
      fallbackMode: fallback.mode,
      fallbackEntries: fallback.entries.length,
    };
  });

  const includedSourceEntries = crawledAutoIngest
    .filter((result) => !excludedSources.includes(result.source))
    .flatMap((result) => result.entries);

  const includedSourceStats = crawledAutoIngest.map((result) => {
    if (!excludedSources.includes(result.source)) {
      return result.stats;
    }

    return {
      ...result.stats,
      acceptedEntries: 0,
    };
  });

  const liveDictionary = compileDictionary(
    [...curatedEntries, ...includedSourceEntries],
    [createCuratedStats(curatedEntries), ...includedSourceStats],
    now,
  );
  const reviewCandidates = buildReviewCandidates({
    bundles: crawledCandidateOnly,
    strongDictionary: liveDictionary,
    now,
  });

  return {
    dictionary: compileDictionary(
      [...curatedEntries, ...includedSourceEntries, ...fallbackEntries],
      [createCuratedStats(curatedEntries), ...includedSourceStats],
      now,
    ),
    liveDictionary,
    anomalies,
    excludedSources,
    sourceHealth: [
      {
        source: "curated",
        status: "healthy",
        reasons: [],
        fetchedPages: 0,
        discoveredPages: 0,
        acceptedEntries: curatedEntries.length,
        previousAcceptedEntries: previousStats.get("curated")?.acceptedEntries ?? 0,
        errorCount: 0,
        entryDelta: curatedEntries.length - (previousStats.get("curated")?.acceptedEntries ?? 0),
        entryDeltaRatio: ratioDelta(curatedEntries.length, previousStats.get("curated")?.acceptedEntries ?? 0),
      },
      ...nextSourceHealth,
    ],
    candidateSourceStats: crawledCandidateOnly.map((result) => result.stats),
    reviewCandidates: reviewCandidates.candidates,
    reviewCandidatesCsv: reviewCandidates.csv,
    reviewCandidatesReport: reviewCandidates.report,
  };
}

function shouldKeepPreviousDictionary(args: {
  previousDictionary: CompiledDictionary;
  nextDictionary: CompiledDictionary;
  excludedSources: DictionarySource[];
  anomalies: string[];
}): boolean {
  const { previousDictionary, nextDictionary, excludedSources, anomalies } = args;

  if (previousDictionary.entries.length === 0) {
    return false;
  }

  const ratio = nextDictionary.entries.length / previousDictionary.entries.length;
  if (ratio < 0.75) {
    anomalies.push("overall_entry_drop");
    return true;
  }

  if (
    excludedSources.length === AUTO_INGEST_ADAPTERS.length &&
    previousDictionary.entries.length > nextDictionary.entries.length + 20
  ) {
    anomalies.push("all_public_sources_excluded");
    return true;
  }

  return false;
}

export function resetDictionaryCache(): void {
  volatileDictionary = null;
  volatileDictionaryLoadedAt = 0;
  volatileDictionaryRole = "primary";
}

export function primeDictionaryCache(dictionary: CompiledDictionary): void {
  rememberDictionary(dictionary);
}

function rememberDictionary(dictionary: CompiledDictionary, loadedAt = Date.now()): CompiledDictionary {
  volatileDictionary = dictionary;
  volatileDictionaryLoadedAt = loadedAt;
  volatileDictionaryRole = getSiteRole();
  return dictionary;
}

function getVolatileDictionary(now = new Date()): CompiledDictionary | null {
  if (!volatileDictionary || volatileDictionaryRole !== getSiteRole()) {
    return null;
  }

  if (!isMirrorSite()) {
    return volatileDictionary;
  }

  if (now.getTime() - volatileDictionaryLoadedAt <= getMirrorCacheTtlMs()) {
    return volatileDictionary;
  }

  return null;
}

async function loadPrimaryDictionary(): Promise<CompiledDictionary> {
  const cached = getVolatileDictionary();
  if (cached) {
    return cached;
  }

  try {
    const persisted = await getDictionaryStorage().readCurrentDictionary();
    if (persisted) {
      return rememberDictionary(persisted);
    }
  } catch {}

  return rememberDictionary(buildFallbackDictionary());
}

async function loadMirrorDictionary(options: LoadDictionaryOptions): Promise<CompiledDictionary> {
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;
  const cached = getVolatileDictionary(now);
  if (cached) {
    return cached;
  }

  try {
    const upstreamDictionary = await fetchDictionaryFromUpstream(fetchImpl);
    if (upstreamDictionary) {
      await writeDictionaryToMirrorCache(upstreamDictionary).catch(() => {});
      return rememberDictionary(upstreamDictionary, now.getTime());
    }
  } catch {}

  const persisted = await readDictionaryFromMirrorCache();
  if (persisted) {
    return rememberDictionary(persisted, now.getTime());
  }

  return rememberDictionary(buildFallbackDictionary(now), now.getTime());
}

export async function loadCurrentDictionary(options: LoadDictionaryOptions = {}): Promise<CompiledDictionary> {
  if (isMirrorSite()) {
    return await loadMirrorDictionary(options);
  }

  return await loadPrimaryDictionary();
}

export async function syncDictionary(options: SyncOptions = {}): Promise<SyncOutcome> {
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;
  const previousDictionary = await loadCurrentDictionary();
  const storage = getDictionaryStorage();
  const builtOutcome = await buildRemoteDictionary(fetchImpl, previousDictionary, now);
  const nextDictionary = builtOutcome.dictionary;
  const keepPrevious = shouldKeepPreviousDictionary({
    previousDictionary,
    nextDictionary: builtOutcome.liveDictionary,
    excludedSources: builtOutcome.excludedSources,
    anomalies: builtOutcome.anomalies,
  });

  const activeDictionary = keepPrevious ? previousDictionary : nextDictionary;
  const promotionState = keepPrevious
    ? "kept_previous"
    : builtOutcome.excludedSources.length > 0
      ? "promoted_with_exclusions"
      : "promoted";

  const diff = compareDictionaries(previousDictionary, nextDictionary);
  const absoluteEntryDelta = nextDictionary.entries.length - previousDictionary.entries.length;
  const entryDeltaRatio = ratioDelta(nextDictionary.entries.length, previousDictionary.entries.length);

  const baseReport: Omit<SyncReport, "persisted" | "storageMode" | "error"> = {
    version: createSyncTag(now),
    startedAt: now.toISOString(),
    finishedAt: new Date().toISOString(),
    dictionaryVersion: nextDictionary.version,
    activeDictionaryVersion: activeDictionary.version,
    totalEntries: nextDictionary.entries.length,
    newEntries: diff.newEntries,
    updatedEntries: diff.updatedEntries,
    skippedEntries: nextDictionary.sourceStats.reduce((sum, current) => sum + current.skippedEntries, 0),
    promotionState,
    excludedSources: builtOutcome.excludedSources,
    anomalies: builtOutcome.anomalies,
    entryDelta: {
      absolute: absoluteEntryDelta,
      ratio: entryDeltaRatio,
    },
    sourceHealth: builtOutcome.sourceHealth,
    failedSources: builtOutcome.sourceHealth
      .filter((health) => health.status === "failed")
      .map((health) => health.source),
    sourceStats: nextDictionary.sourceStats,
    candidateSourceStats: builtOutcome.candidateSourceStats,
    reviewCandidateCount: builtOutcome.reviewCandidatesReport.reviewCandidateCount,
    reviewCandidateAcceptedByRule: builtOutcome.reviewCandidatesReport.reviewCandidateAcceptedByRule,
    reviewCandidateRejectedByLicense: builtOutcome.reviewCandidatesReport.reviewCandidateRejectedByLicense,
    highValuePhraseCount: builtOutcome.reviewCandidatesReport.highValuePhraseCount,
  };

  const persistArtifacts = options.persistArtifacts === undefined ? storage.writeDictionaryArtifacts : options.persistArtifacts;
  const persistenceMode =
    options.persistArtifacts === null ? "memory" : (options.storageMode ?? storage.driver);

  if (!persistArtifacts) {
    await writeReviewCandidateArtifactsToDisk(
      builtOutcome.reviewCandidatesCsv,
      builtOutcome.reviewCandidatesReport,
    ).catch(() => {});
    rememberDictionary(activeDictionary);
    return {
      dictionary: nextDictionary,
      activeDictionary,
      report: {
        ...baseReport,
        persisted: false,
        storageMode: persistenceMode,
      },
      reviewCandidates: builtOutcome.reviewCandidates,
      reviewCandidatesCsv: builtOutcome.reviewCandidatesCsv,
      reviewCandidatesReport: builtOutcome.reviewCandidatesReport,
    };
  }

  try {
    const report: SyncReport = {
      ...baseReport,
      persisted: true,
      storageMode: persistenceMode,
    };

    await persistArtifacts(nextDictionary, activeDictionary, report, {
      csv: builtOutcome.reviewCandidatesCsv,
      report: builtOutcome.reviewCandidatesReport,
    });
    rememberDictionary(activeDictionary);

    return {
      dictionary: nextDictionary,
      activeDictionary,
      report,
      reviewCandidates: builtOutcome.reviewCandidates,
      reviewCandidatesCsv: builtOutcome.reviewCandidatesCsv,
      reviewCandidatesReport: builtOutcome.reviewCandidatesReport,
    };
  } catch (error) {
    rememberDictionary(previousDictionary);
    return {
      dictionary: nextDictionary,
      activeDictionary: previousDictionary,
      report: {
        ...baseReport,
        activeDictionaryVersion: previousDictionary.version,
        promotionState: "kept_previous",
        persisted: false,
        storageMode: persistenceMode,
        error: serializeError(error),
      },
      reviewCandidates: builtOutcome.reviewCandidates,
      reviewCandidatesCsv: builtOutcome.reviewCandidatesCsv,
      reviewCandidatesReport: builtOutcome.reviewCandidatesReport,
    };
  }
}
