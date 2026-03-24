import * as cheerio from "cheerio";
import { cleanSourceEntries } from "@/lib/dictionary/clean";
import { lookupMandarinFromEnglishGloss } from "@/lib/dictionary/sources/english-mandarin";
import { extractHanCandidates, sanitizeHanPhrase } from "@/lib/dictionary/sources/han-utils";
import type { RawSourceEntry } from "@/lib/dictionary/types";

const CATEGORY_API =
  "https://en.wiktionary.org/w/api.php?action=query&format=json&list=categorymembers&cmtitle=Category:Shanghainese_Wu&cmlimit=50";
const SWADESH_API =
  "https://en.wiktionary.org/w/api.php?action=parse&format=json&page=Appendix:Shanghainese_Swadesh_list&prop=text&formatversion=2";

export const WIKTIONARY_SHANGHAI_SEEDS = [CATEGORY_API, SWADESH_API];

type WiktionaryCategoryResponse = {
  continue?: {
    cmcontinue?: string;
  };
  query?: {
    categorymembers?: Array<{
      title: string;
    }>;
  };
};

type WiktionaryParseResponse = {
  parse?: {
    text?: string;
  };
};

function createCategoryContinueUrl(token: string): string {
  return `${CATEGORY_API}&cmcontinue=${encodeURIComponent(token)}`;
}

function parseCategoryMembers(payload: WiktionaryCategoryResponse, currentUrl: string) {
  const rawEntries: RawSourceEntry[] = [];

  for (const member of payload.query?.categorymembers ?? []) {
    const title = sanitizeHanPhrase(member.title);
    if (!title || title.length > 8 || /……|…/u.test(title)) {
      continue;
    }

    rawEntries.push({
      mandarin: title,
      shanghainese: title,
      source: "wiktionary-shanghai",
      weight: 8,
      note: "Wiktionary category title",
      evidence: currentUrl,
    });
  }

  return cleanSourceEntries(rawEntries);
}

function parseSwadeshList(payload: WiktionaryParseResponse, currentUrl: string) {
  const html = payload.parse?.text ?? "";
  const $ = cheerio.load(html);
  const rawEntries: RawSourceEntry[] = [];

  for (const row of $("table.wikitable tr").toArray()) {
    const cells = $(row).find("td");
    if (cells.length < 3) {
      continue;
    }

    const english = $(cells[1]).text().trim();
    const mandarinCandidates = lookupMandarinFromEnglishGloss(english);
    if (mandarinCandidates.length === 0) {
      continue;
    }

    const wuCell = $(cells[2]);
    const shanghaineseCandidates = [
      ...wuCell
        .find(".Hans a, .Hans, .Hani a, .Hani, .Hant a, .Hant")
        .toArray()
        .map((element) => sanitizeHanPhrase($(element).text())),
      ...extractHanCandidates(wuCell.text()),
    ]
      .filter((value) => value.length > 0)
      .slice(0, 3);

    for (const mandarin of mandarinCandidates) {
      for (const shanghainese of [...new Set(shanghaineseCandidates)].slice(0, 2)) {
        rawEntries.push({
          mandarin,
          shanghainese,
          source: "wiktionary-shanghai",
          weight: 34,
          note: "Wiktionary Swadesh list",
          evidence: `${currentUrl}#list`,
        });
      }
    }
  }

  return cleanSourceEntries(rawEntries);
}

export function parseWiktionaryShanghaiPayload(
  payload: string,
  context: { url: string },
): {
  accepted: RawSourceEntry[];
  skippedCount: number;
} {
  try {
    const parsed = JSON.parse(payload) as WiktionaryCategoryResponse | WiktionaryParseResponse;

    if ("query" in parsed && parsed.query?.categorymembers) {
      return parseCategoryMembers(parsed, context.url);
    }

    if ("parse" in parsed && parsed.parse?.text) {
      return parseSwadeshList(parsed, context.url);
    }
  } catch {
    return { accepted: [], skippedCount: 0 };
  }

  return { accepted: [], skippedCount: 0 };
}

export function discoverWiktionaryShanghaiLinks(payload: string): string[] {
  try {
    const parsed = JSON.parse(payload) as WiktionaryCategoryResponse;
    const token = parsed.continue?.cmcontinue;
    return token ? [createCategoryContinueUrl(token)] : [];
  } catch {
    return [];
  }
}
