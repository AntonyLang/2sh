import type {
  DictionarySource,
  SourceExtractType,
  SourceLicenseClass,
  SourceReviewPolicy,
  SourceSyncMode,
  SourceTier,
} from "@/lib/dictionary/types";

export type SourceRegistryEntry = {
  source: DictionarySource;
  label: string;
  sourceTier: SourceTier;
  syncMode: SourceSyncMode;
  extractType: SourceExtractType;
  reviewPolicy: SourceReviewPolicy;
  licenseClass: SourceLicenseClass;
  licenseNote: string;
  baseScore: number;
  enabled: boolean;
};

export const SOURCE_REGISTRY: Record<DictionarySource, SourceRegistryEntry> = {
  curated: {
    source: "curated",
    label: "精选词库",
    sourceTier: "strong",
    syncMode: "manual_reference",
    extractType: "lexicon",
    reviewPolicy: "manual_reference",
    licenseClass: "first_party",
    licenseNote: "仓库内人工维护的精选 CSV 词库",
    baseScore: 360,
    enabled: true,
  },
  "dict-cn": {
    source: "dict-cn",
    label: "Dict.CN",
    sourceTier: "strong",
    syncMode: "auto_ingest",
    extractType: "lexicon",
    reviewPolicy: "auto_ingest",
    licenseClass: "public_reference",
    licenseNote: "公开词典页面，结构稳定时可自动抓取",
    baseScore: 105,
    enabled: true,
  },
  nonghao: {
    source: "nonghao",
    label: "侬好学堂",
    sourceTier: "strong",
    syncMode: "auto_ingest",
    extractType: "lexicon",
    reviewPolicy: "auto_ingest",
    licenseClass: "public_reference",
    licenseNote: "公开字词页，源站不稳时走历史或 bundled fallback",
    baseScore: 120,
    enabled: true,
  },
  "wiktionary-shanghai": {
    source: "wiktionary-shanghai",
    label: "Wiktionary",
    sourceTier: "strong",
    syncMode: "auto_ingest",
    extractType: "lexicon",
    reviewPolicy: "auto_ingest",
    licenseClass: "open_cc",
    licenseNote: "Wiktionary 公开词条与 Swadesh list，CC BY-SA",
    baseScore: 135,
    enabled: true,
  },
  "wikivoyage-wu": {
    source: "wikivoyage-wu",
    label: "Wikivoyage",
    sourceTier: "strong",
    syncMode: "auto_ingest",
    extractType: "phrasebook",
    reviewPolicy: "auto_ingest",
    licenseClass: "open_cc",
    licenseNote: "Wikivoyage Wu phrasebook，CC BY-SA",
    baseScore: 128,
    enabled: true,
  },
  "wikipedia-shanghai": {
    source: "wikipedia-shanghai",
    label: "Wikipedia",
    sourceTier: "strong",
    syncMode: "auto_ingest",
    extractType: "lexicon",
    reviewPolicy: "auto_ingest",
    licenseClass: "open_cc",
    licenseNote: "Wikipedia 上海话条目中的结构化词表，CC BY-SA",
    baseScore: 118,
    enabled: true,
  },
  "glosbe-wuu": {
    source: "glosbe-wuu",
    label: "Glosbe",
    sourceTier: "candidate",
    syncMode: "candidate_only",
    extractType: "translation_memory",
    reviewPolicy: "csv_review",
    licenseClass: "community_reference",
    licenseNote: "社区翻译平台公开页面，只产出待审候选",
    baseScore: 0,
    enabled: true,
  },
  "dliflc-wu": {
    source: "dliflc-wu",
    label: "DLIFLC",
    sourceTier: "candidate",
    syncMode: "candidate_only",
    extractType: "phrasebook",
    reviewPolicy: "csv_review",
    licenseClass: "educational_public",
    licenseNote: "DLIFLC 公开 Basic Language Guide，只产出待审候选",
    baseScore: 0,
    enabled: true,
  },
  "omniglot-shanghainese": {
    source: "omniglot-shanghainese",
    label: "Omniglot",
    sourceTier: "candidate",
    syncMode: "candidate_only",
    extractType: "phrasebook",
    reviewPolicy: "csv_review",
    licenseClass: "public_reference",
    licenseNote: "Omniglot Shanghainese useful phrases 页面，只产出待审候选",
    baseScore: 0,
    enabled: true,
  },
};

export function getSourceRegistryEntry(source: DictionarySource): SourceRegistryEntry {
  return SOURCE_REGISTRY[source];
}

export function getSourceBaseScore(source: DictionarySource): number {
  return SOURCE_REGISTRY[source].baseScore;
}

export function isAutoIngestSource(source: DictionarySource): boolean {
  return SOURCE_REGISTRY[source].enabled && SOURCE_REGISTRY[source].syncMode === "auto_ingest";
}

export function isCandidateOnlySource(source: DictionarySource): boolean {
  return SOURCE_REGISTRY[source].enabled && SOURCE_REGISTRY[source].syncMode === "candidate_only";
}

export function isStrongSource(source: DictionarySource): boolean {
  return SOURCE_REGISTRY[source].sourceTier === "strong";
}

export function allowsCandidateExport(source: DictionarySource): boolean {
  const licenseClass = SOURCE_REGISTRY[source].licenseClass;
  return (
    licenseClass === "open_cc" ||
    licenseClass === "public_reference" ||
    licenseClass === "community_reference" ||
    licenseClass === "educational_public"
  );
}
