const PUNCTUATION_MAP: Record<string, string> = {
  ",": "，",
  ".": "。",
  "!": "！",
  "?": "？",
  ":": "：",
  ";": "；",
  "(": "（",
  ")": "）",
  "[": "【",
  "]": "】",
};

const STOP_GLOSSES = ["互致问候时用", "礼貌用语", "旧", "见上", "见下", "即", "泛称"];

export function normalizeInputText(value: string): string {
  let normalized = value.normalize("NFKC");
  normalized = normalized.replace(/\r\n?/g, "\n");
  normalized = normalized.replace(/[ \t]+/g, " ");
  normalized = normalized.replace(/\s*([,.;:!?()[\]])\s*/g, (_, token: string) => {
    return PUNCTUATION_MAP[token] ?? token;
  });
  normalized = normalized.replace(/\s*([，。！？；：、（）【】])\s*/g, "$1");
  normalized = normalized.replace(/\n{2,}/g, "\n");
  return normalized.trim();
}

export function normalizeLookupText(value: string): string {
  return normalizeInputText(value).replace(/[\u200b\u3000]/g, "");
}

export function normalizeLine(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function hasHanCharacters(value: string): boolean {
  return /[\p{Script=Han}]/u.test(value);
}

export function stripDictionaryMarkup(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/【[^】]+】/g, " ")
    .replace(/〈[^〉]+〉/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/◇[^。；;\n]+/g, " ")
    .replace(/◇/g, " ")
    .replace(/[“”"']/g, "")
    .replace(/[（(][^）)]*[）)]/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

export function splitGlossCandidates(rawValue: string): string[] {
  const stripped = stripDictionaryMarkup(rawValue)
    .replace(/～/g, "")
    .replace(/[｜|]/g, "。")
    .replace(/[／/]/g, " ")
    .replace(/[；;]/g, "。")
    .replace(/[，,]/g, "。");

  const sentenceCandidates = stripped
    .split(/[。\n]/)
    .flatMap((sentence) => {
      const plain = sentence.split("：")[0]?.trim() ?? "";
      return plain ? [plain] : [];
    })
    .map((sentence) => normalizeLookupText(sentence))
    .flatMap((sentence) => sentence.split(/\s+/))
    .map((sentence) => sentence.replace(/^[^\p{Script=Han}]+|[^\p{Script=Han}]+$/gu, ""))
    .filter((sentence) => sentence.length >= 1 && sentence.length <= 14)
    .filter(hasHanCharacters)
    .filter((sentence) => !STOP_GLOSSES.some((stop) => sentence.includes(stop)))
    .filter((sentence) => !/[A-Za-z0-9]/.test(sentence));

  return [...new Set(sentenceCandidates)].sort((left, right) => {
    return left.length - right.length || left.localeCompare(right, "zh-CN");
  });
}
