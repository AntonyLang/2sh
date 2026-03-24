import type { DictionarySource, RawSourceEntry } from "@/lib/dictionary/types";

type PairRule = {
  mandarin: string;
  shanghainese: string;
};

const PUBLIC_SOURCE_BLOCKLIST_PATTERNS = [
  /[A-Za-z]{2,}/,
  /\d{2,}/,
  /[\[\]<>]/,
  /[【】]/,
  /上海话分类|上海话情景对话|最近还好吗|全文/u,
];

const PUBLIC_SOURCE_BLOCKLIST_PAIRS: PairRule[] = [
  { mandarin: "你好【拼】nonghao", shanghainese: "侬好" },
  { mandarin: "你好拼音", shanghainese: "侬好" },
];

const PUBLIC_SOURCE_ALLOWLIST: Record<DictionarySource, PairRule[]> = {
  curated: [],
  "dict-cn": [
    { mandarin: "你好", shanghainese: "侬好" },
    { mandarin: "怎么回事", shanghainese: "哪能为实事" },
  ],
  nonghao: [
    { mandarin: "你好", shanghainese: "侬好" },
    { mandarin: "很好", shanghainese: "蛮好" },
  ],
  "wiktionary-shanghai": [{ mandarin: "你", shanghainese: "侬" }],
  "wikivoyage-wu": [{ mandarin: "现在几点", shanghainese: "现在几点" }],
  "wikipedia-shanghai": [{ mandarin: "我们", shanghainese: "阿拉" }],
  "glosbe-wuu": [],
  "dliflc-wu": [],
  "omniglot-shanghainese": [],
};

function matchesPairRule(entry: RawSourceEntry, rules: PairRule[]): boolean {
  return rules.some((rule) => {
    return rule.mandarin === entry.mandarin && rule.shanghainese === entry.shanghainese;
  });
}

export function isBlockedPublicEntry(
  entry: RawSourceEntry,
  curatedVariants: Map<string, Set<string>>,
): string | null {
  if (entry.source === "curated") {
    return null;
  }

  if (matchesPairRule(entry, PUBLIC_SOURCE_ALLOWLIST[entry.source])) {
    return null;
  }

  if (
    PUBLIC_SOURCE_BLOCKLIST_PAIRS.some((rule) => {
      return rule.mandarin === entry.mandarin && rule.shanghainese === entry.shanghainese;
    })
  ) {
    return "blocked_pair";
  }

  if (PUBLIC_SOURCE_BLOCKLIST_PATTERNS.some((pattern) => pattern.test(entry.mandarin) || pattern.test(entry.shanghainese))) {
    return "blocked_pattern";
  }

  if (/[，。！？；：]/u.test(entry.mandarin.slice(1, -1)) || /[，。！？；：]/u.test(entry.shanghainese.slice(1, -1))) {
    return "inner_punctuation";
  }

  const curatedOutputs = curatedVariants.get(entry.mandarin);
  if (curatedOutputs && !curatedOutputs.has(entry.shanghainese)) {
    return "curated_conflict";
  }

  return null;
}
