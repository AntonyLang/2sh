export const DICTIONARY_SOURCES = [
  "curated",
  "nonghao",
  "dict-cn",
  "wiktionary-shanghai",
  "wikivoyage-wu",
  "wikipedia-shanghai",
  "glosbe-wuu",
  "dliflc-wu",
  "omniglot-shanghainese",
] as const;

export type DictionarySource = (typeof DICTIONARY_SOURCES)[number];

export const SOURCE_LABELS: Record<DictionarySource, string> = {
  curated: "精选词库",
  nonghao: "侬好学堂",
  "dict-cn": "Dict.CN",
  "wiktionary-shanghai": "Wiktionary",
  "wikivoyage-wu": "Wikivoyage",
  "wikipedia-shanghai": "Wikipedia",
  "glosbe-wuu": "Glosbe",
  "dliflc-wu": "DLIFLC",
  "omniglot-shanghainese": "Omniglot",
};

export type SourceTier = "strong" | "candidate" | "disabled";
export type SourceSyncMode = "auto_ingest" | "candidate_only" | "manual_reference";
export type SourceExtractType = "lexicon" | "phrasebook" | "corpus" | "translation_memory";
export type SourceReviewPolicy = "auto_ingest" | "csv_review" | "manual_reference";
export type SourceLicenseClass =
  | "first_party"
  | "open_cc"
  | "public_reference"
  | "community_reference"
  | "educational_public"
  | "restricted_reference";

export type CuratedLexiconSeed = {
  mandarin: string;
  shanghainese: string;
  aliases?: string[];
  weight?: number;
  enabled: boolean;
  category?: string;
  note?: string;
  source?: string;
  status?: "approved" | "review" | "disabled";
};

export type RawSourceEntry = {
  mandarin: string;
  shanghainese: string;
  source: DictionarySource;
  weight?: number;
  raw?: string;
  note?: string;
  evidence?: string;
};

export type DictionaryVariant = {
  output: string;
  score: number;
  sources: DictionarySource[];
  note?: string;
};

export type DictionaryRecord = {
  input: string;
  variants: DictionaryVariant[];
};

export type SourceSyncStats = {
  source: DictionarySource;
  fetchedPages: number;
  discoveredPages: number;
  parsedEntries: number;
  acceptedEntries: number;
  skippedEntries: number;
  errors: string[];
};

export type SourceHealthStatus = "healthy" | "warning" | "excluded" | "failed";

export type SourceHealth = {
  source: DictionarySource;
  status: SourceHealthStatus;
  reasons: string[];
  fetchedPages: number;
  discoveredPages: number;
  acceptedEntries: number;
  previousAcceptedEntries: number;
  errorCount: number;
  entryDelta: number;
  entryDeltaRatio: number | null;
  fallbackMode?: "previous" | "bundled";
  fallbackEntries?: number;
};

export type CompiledDictionary = {
  version: string;
  updatedAt: string;
  maxInputLength: number;
  entries: DictionaryRecord[];
  sourceStats: SourceSyncStats[];
};

export type TranslationSegment = {
  input: string;
  output: string;
  matched: boolean;
  start: number;
  end: number;
  sources: DictionarySource[];
};

export type TranslationCandidate = {
  text: string;
  score: number;
  segments: TranslationSegment[];
  sources: DictionarySource[];
};

export type UnmatchedSpan = {
  text: string;
  start: number;
  end: number;
};

export type TranslationResult = {
  input: string;
  normalizedInput: string;
  candidates: TranslationCandidate[];
  unmatchedSpans: UnmatchedSpan[];
  dictionaryVersion: string;
  updatedAt: string;
};

export type ReviewCandidate = {
  mandarin: string;
  shanghainese: string;
  source: string;
  sourceTier: SourceTier;
  evidence: string;
  confidence: number;
  candidateType: string;
  licenseNote: string;
  status: "pending";
  highValuePhrase: boolean;
};

export type ReviewCandidatesReport = {
  version: string;
  generatedAt: string;
  reviewCandidateCount: number;
  reviewCandidateAcceptedByRule: number;
  reviewCandidateRejectedByLicense: number;
  highValuePhraseCount: number;
  sourceStats: SourceSyncStats[];
};

export type DictionaryStorageMode = "filesystem" | "blob" | "memory";

export type SyncReport = {
  version: string;
  startedAt: string;
  finishedAt: string;
  dictionaryVersion: string;
  activeDictionaryVersion: string;
  totalEntries: number;
  newEntries: number;
  updatedEntries: number;
  skippedEntries: number;
  promotionState: "promoted" | "promoted_with_exclusions" | "kept_previous";
  excludedSources: DictionarySource[];
  anomalies: string[];
  entryDelta: {
    absolute: number;
    ratio: number | null;
  };
  sourceHealth: SourceHealth[];
  failedSources: DictionarySource[];
  persisted: boolean;
  storageMode: DictionaryStorageMode;
  sourceStats: SourceSyncStats[];
  candidateSourceStats: SourceSyncStats[];
  reviewCandidateCount: number;
  reviewCandidateAcceptedByRule: number;
  reviewCandidateRejectedByLicense: number;
  highValuePhraseCount: number;
  error?: string;
};
