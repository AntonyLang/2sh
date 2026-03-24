import { normalizeLookupText } from "@/lib/dictionary/normalize";
import {
  allowsCandidateExport,
  getSourceRegistryEntry,
} from "@/lib/dictionary/source-registry";
import type {
  CompiledDictionary,
  DictionarySource,
  RawSourceEntry,
  ReviewCandidate,
  ReviewCandidatesReport,
  SourceSyncStats,
} from "@/lib/dictionary/types";

type CandidateSourceBundle = {
  source: DictionarySource;
  entries: RawSourceEntry[];
  stats: SourceSyncStats;
};

type AggregatedCandidate = {
  mandarin: string;
  shanghainese: string;
  sources: Set<DictionarySource>;
  evidence: Set<string>;
  highValuePhrase: boolean;
  candidateType: string;
};

const HIGH_VALUE_RULES: Array<{ category: string; pattern: RegExp }> = [
  { category: "greeting", pattern: /你好|早上好|晚上好|再见/u },
  { category: "polite", pattern: /请|谢谢|对不起|不好意思/u },
  { category: "time_weather", pattern: /几点|时间|天气|下雨|晴/u },
  { category: "directions", pattern: /哪里|哪儿|左边|右边|往前|厕所|洗手间/u },
  { category: "daily_action", pattern: /吃|喝|来|去|听不懂|帮忙/u },
  { category: "status", pattern: /好伐|怎么样|好吗|很好/u },
];

function classifyHighValuePhrase(text: string): string | null {
  for (const rule of HIGH_VALUE_RULES) {
    if (rule.pattern.test(text)) {
      return rule.category;
    }
  }

  return null;
}

function buildStrongVariantIndex(dictionary: CompiledDictionary): Map<string, Set<string>> {
  return new Map(
    dictionary.entries.map((entry) => [entry.input, new Set(entry.variants.map((variant) => variant.output))]),
  );
}

function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeCsv(value: string): string {
  if (/[",\n]/u.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
}

export function buildReviewCandidates(args: {
  bundles: CandidateSourceBundle[];
  strongDictionary: CompiledDictionary;
  now?: Date;
}): {
  candidates: ReviewCandidate[];
  csv: string;
  report: ReviewCandidatesReport;
} {
  const now = args.now ?? new Date();
  const strongIndex = buildStrongVariantIndex(args.strongDictionary);
  const aggregated = new Map<string, AggregatedCandidate>();
  let rejectedByLicense = 0;
  let acceptedByRule = 0;

  for (const bundle of args.bundles) {
    if (!allowsCandidateExport(bundle.source)) {
      rejectedByLicense += bundle.entries.length;
      continue;
    }

    for (const entry of bundle.entries) {
      const mandarin = normalizeLookupText(entry.mandarin);
      const shanghainese = normalizeLookupText(entry.shanghainese);
      if (!mandarin || !shanghainese) {
        continue;
      }

      const key = `${mandarin}::${shanghainese}`;
      const highValueCategory = classifyHighValuePhrase(mandarin);
      const candidateType = highValueCategory
        ? `phrase:${highValueCategory}`
        : mandarin.length >= 4
          ? "phrase"
          : "lexicon";
      const current = aggregated.get(key) ?? {
        mandarin,
        shanghainese,
        sources: new Set<DictionarySource>(),
        evidence: new Set<string>(),
        highValuePhrase: false,
        candidateType,
      };

      current.sources.add(entry.source);
      if (entry.evidence) {
        current.evidence.add(entry.evidence);
      }
      current.highValuePhrase ||= highValueCategory !== null;
      current.candidateType = highValueCategory ? `phrase:${highValueCategory}` : current.candidateType;
      aggregated.set(key, current);
    }
  }

  const candidates: ReviewCandidate[] = [];

  for (const item of aggregated.values()) {
    const strongVariants = strongIndex.get(item.mandarin);
    const matchesStrongPair = strongVariants?.has(item.shanghainese) ?? false;
    const weakMultiSource = item.sources.size >= 2;
    const passesRule = matchesStrongPair || weakMultiSource || item.highValuePhrase;
    if (!passesRule) {
      continue;
    }

    acceptedByRule += 1;

    const sourceList = [...item.sources].sort((left, right) => left.localeCompare(right, "zh-CN"));
    let confidence = 0.38;
    if (matchesStrongPair) {
      confidence += 0.28;
    }
    if (weakMultiSource) {
      confidence += 0.22;
    }
    if (item.highValuePhrase) {
      confidence += 0.14;
    }
    confidence += Math.min(0.1, sourceList.length * 0.04);

    const primarySource = getSourceRegistryEntry(sourceList[0]);
    candidates.push({
      mandarin: item.mandarin,
      shanghainese: item.shanghainese,
      source: sourceList.join("|"),
      sourceTier: primarySource.sourceTier,
      evidence: [...item.evidence].join(" | "),
      confidence: roundConfidence(Math.min(confidence, 0.98)),
      candidateType: item.candidateType,
      licenseNote: sourceList.map((source) => getSourceRegistryEntry(source).licenseNote).join(" | "),
      status: "pending",
      highValuePhrase: item.highValuePhrase,
    });
  }

  candidates.sort((left, right) => {
    return right.confidence - left.confidence || right.mandarin.length - left.mandarin.length || left.mandarin.localeCompare(right.mandarin, "zh-CN");
  });

  const header = [
    "mandarin",
    "shanghainese",
    "source",
    "source_tier",
    "evidence",
    "confidence",
    "candidate_type",
    "license_note",
    "status",
  ];
  const csv = [
    header.join(","),
    ...candidates.map((candidate) => {
      return [
        candidate.mandarin,
        candidate.shanghainese,
        candidate.source,
        candidate.sourceTier,
        candidate.evidence,
        String(candidate.confidence),
        candidate.candidateType,
        candidate.licenseNote,
        candidate.status,
      ]
        .map(escapeCsv)
        .join(",");
    }),
  ].join("\n");

  return {
    candidates,
    csv,
    report: {
      version: `review-candidates-${now.toISOString().replace(/[:.]/g, "-")}`,
      generatedAt: now.toISOString(),
      reviewCandidateCount: candidates.length,
      reviewCandidateAcceptedByRule: acceptedByRule,
      reviewCandidateRejectedByLicense: rejectedByLicense,
      highValuePhraseCount: candidates.filter((candidate) => candidate.highValuePhrase).length,
      sourceStats: args.bundles.map((bundle) => bundle.stats),
    },
  };
}
