import { normalizeLookupText } from "@/lib/dictionary/normalize";

export function sanitizeHanPhrase(value: string): string {
  return normalizeLookupText(
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/\[[^\]]+\]/g, " ")
      .replace(/[（(][^）)]*[）)]/g, (segment) => {
        return /[\p{Script=Han}]/u.test(segment) ? segment : " ";
      })
      .replace(/[A-Za-z0-9\u0250-\u02af\u1d00-\u1d7f\u02b0-\u02ff\u0300-\u036f/.'’-]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .replace(/[／/]/g, " ")
    .replace(/\s+/g, "")
    .replace(/^（|）$/gu, "")
    .replace(/^[，。！？；：]+|[，。！？；：]+$/gu, "");
}

export function extractHanCandidates(value: string): string[] {
  const directMatches = value.match(/[\p{Script=Han}][\p{Script=Han}（）【】、，。！？／/·\s]{0,60}/gu) ?? [];
  const compact = directMatches
    .map((match) => sanitizeHanPhrase(match))
    .map((match) => match.split(/[／/]/u)[0] ?? match)
    .map((match) => match.replace(/（.*$/u, "").trim())
    .filter((match) => match.length >= 1 && match.length <= 20);

  return [...new Set(compact)];
}
