import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileDictionary, getCuratedEntries } from "@/lib/dictionary/compile";
import {
  loadCurrentDictionary,
  primeDictionaryCache,
  resetDictionaryCache,
  syncDictionary,
} from "@/lib/dictionary/service";
import type { RawSourceEntry, SourceSyncStats } from "@/lib/dictionary/types";

const dictFixture = readFileSync(join(process.cwd(), "src/test/fixtures/dict-cn.html"), "utf8");
const dictExtraFixture = readFileSync(join(process.cwd(), "src/test/fixtures/dict-cn-extra.html"), "utf8");
const nonghaoFixture = readFileSync(join(process.cwd(), "src/test/fixtures/nonghao.html"), "utf8");
const wiktionaryCategoryFixture = readFileSync(join(process.cwd(), "src/test/fixtures/wiktionary-category.json"), "utf8");
const wiktionarySwadeshFixture = readFileSync(join(process.cwd(), "src/test/fixtures/wiktionary-swadesh.json"), "utf8");
const wikivoyageFixture = readFileSync(join(process.cwd(), "src/test/fixtures/wikivoyage-wu.html"), "utf8");
const wikipediaFixture = readFileSync(join(process.cwd(), "src/test/fixtures/wikipedia-shanghai.json"), "utf8");
const glosbeFixture = readFileSync(join(process.cwd(), "src/test/fixtures/glosbe-wuu.html"), "utf8");
const dliflcIndexFixture = readFileSync(join(process.cwd(), "src/test/fixtures/dliflc-wu-index.html"), "utf8");
const dliflcModuleFixture = readFileSync(join(process.cwd(), "src/test/fixtures/dliflc-wu-module3.html"), "utf8");
const omniglotFixture = readFileSync(join(process.cwd(), "src/test/fixtures/omniglot-shanghainese.html"), "utf8");
const ORIGINAL_ENV = {
  SITE_ROLE: process.env.SITE_ROLE,
  DICTIONARY_UPSTREAM_URL: process.env.DICTIONARY_UPSTREAM_URL,
  MIRROR_CACHE_PATH: process.env.MIRROR_CACHE_PATH,
  MIRROR_CACHE_TTL_MS: process.env.MIRROR_CACHE_TTL_MS,
  STORAGE_DRIVER: process.env.STORAGE_DRIVER,
  DATA_DIR: process.env.DATA_DIR,
};

function restoreEnvVar(key: keyof typeof ORIGINAL_ENV): void {
  const value = ORIGINAL_ENV[key];
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

afterEach(() => {
  restoreEnvVar("SITE_ROLE");
  restoreEnvVar("DICTIONARY_UPSTREAM_URL");
  restoreEnvVar("MIRROR_CACHE_PATH");
  restoreEnvVar("MIRROR_CACHE_TTL_MS");
  restoreEnvVar("STORAGE_DRIVER");
  restoreEnvVar("DATA_DIR");
  resetDictionaryCache();
});

type MockResponseOverride = {
  body?: string;
  status?: number;
};

function createMockFetch(overrides: Record<string, MockResponseOverride> = {}): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const bodyMap = new Map<string, string>([
      ["https://shh.dict.cn/", dictFixture],
      ["https://shh.dict.cn/%E4%B8%8A%E6%B5%B7%E5%9C%A8%E7%BA%BF", dictFixture],
      ["https://shh.dict.cn/greeting", dictExtraFixture],
      ["https://nhxt.xinmin.cn/cyzc/m/", nonghaoFixture],
      ["https://nhxt.xinmin.cn/cyzc/pc/", nonghaoFixture],
      [
        "https://en.wiktionary.org/w/api.php?action=query&format=json&list=categorymembers&cmtitle=Category:Shanghainese_Wu&cmlimit=50",
        wiktionaryCategoryFixture,
      ],
      [
        "https://en.wiktionary.org/w/api.php?action=parse&format=json&page=Appendix:Shanghainese_Swadesh_list&prop=text&formatversion=2",
        wiktionarySwadeshFixture,
      ],
      ["https://en.wikivoyage.org/wiki/Wu_phrasebook", wikivoyageFixture],
      [
        "https://zh.wikipedia.org/w/api.php?action=parse&format=json&page=%E4%B8%8A%E6%B5%B7%E8%AF%9D&prop=text&formatversion=2",
        wikipediaFixture,
      ],
      ["https://glosbe.com/zh/wuu", glosbeFixture],
      ["https://fieldsupport.dliflc.edu/products/wu/cs_bc_LSK", dliflcIndexFixture],
      ["https://fieldsupport.dliflc.edu/products/wu/cs_bc_LSK/module3.html", dliflcModuleFixture],
      ["https://www.omniglot.com/language/phrases/shanghainese.php", omniglotFixture],
    ]);

    const override = overrides[url];
    const body = override?.body ?? bodyMap.get(url);
    const status = override?.status ?? (body ? 200 : 404);

    if (!body) {
      return new Response("missing", { status: 404 });
    }

    return new Response(body, { status });
  }) as typeof fetch;
}

function createPreviousDictionary() {
  const entries: RawSourceEntry[] = [
    { mandarin: "你好", shanghainese: "侬好", source: "curated", weight: 160 },
  ];
  const stats: SourceSyncStats[] = [
    {
      source: "curated",
      fetchedPages: 0,
      discoveredPages: 0,
      parsedEntries: 1,
      acceptedEntries: 1,
      skippedEntries: 0,
      errors: [],
    },
  ];

  return compileDictionary(entries, stats, new Date("2026-03-22T09:00:00.000Z"));
}

function createLargePreviousDictionary() {
  const curatedEntries = getCuratedEntries();
  const legacyDictEntries: RawSourceEntry[] = Array.from({ length: 180 }, (_, index) => ({
    mandarin: `老词条甲${index}`,
    shanghainese: `老闲话甲${index}`,
    source: "dict-cn",
    weight: 40,
  }));
  const legacyNonghaoEntries: RawSourceEntry[] = Array.from({ length: 120 }, (_, index) => ({
    mandarin: `老词条乙${index}`,
    shanghainese: `老闲话乙${index}`,
    source: "nonghao",
    weight: 40,
  }));

  const stats: SourceSyncStats[] = [
    {
      source: "curated",
      fetchedPages: 0,
      discoveredPages: 0,
      parsedEntries: curatedEntries.length,
      acceptedEntries: curatedEntries.length,
      skippedEntries: 0,
      errors: [],
    },
    {
      source: "dict-cn",
      fetchedPages: 6,
      discoveredPages: 6,
      parsedEntries: legacyDictEntries.length,
      acceptedEntries: legacyDictEntries.length,
      skippedEntries: 0,
      errors: [],
    },
    {
      source: "nonghao",
      fetchedPages: 4,
      discoveredPages: 4,
      parsedEntries: legacyNonghaoEntries.length,
      acceptedEntries: legacyNonghaoEntries.length,
      skippedEntries: 0,
      errors: [],
    },
  ];

  return compileDictionary(
    [...curatedEntries, ...legacyDictEntries, ...legacyNonghaoEntries],
    stats,
    new Date("2026-03-22T09:00:00.000Z"),
  );
}

function createPreviousDictionaryWithNonghaoEntries() {
  const curatedEntries = getCuratedEntries();
  const nonghaoEntries: RawSourceEntry[] = [
    {
      mandarin: "天气",
      shanghainese: "天气",
      source: "nonghao",
      weight: 44,
    },
  ];

  const stats: SourceSyncStats[] = [
    {
      source: "curated",
      fetchedPages: 0,
      discoveredPages: 0,
      parsedEntries: curatedEntries.length,
      acceptedEntries: curatedEntries.length,
      skippedEntries: 0,
      errors: [],
    },
    {
      source: "nonghao",
      fetchedPages: 1,
      discoveredPages: 1,
      parsedEntries: nonghaoEntries.length,
      acceptedEntries: nonghaoEntries.length,
      skippedEntries: 0,
      errors: [],
    },
  ];

  return compileDictionary([...curatedEntries, ...nonghaoEntries], stats, new Date("2026-03-22T09:00:00.000Z"));
}

function createMirrorDictionary() {
  const entries: RawSourceEntry[] = [
    { mandarin: "你好", shanghainese: "侬好", source: "curated", weight: 160 },
    { mandarin: "请稍等", shanghainese: "请侬等一歇", source: "wikivoyage-wu", weight: 120 },
  ];
  const stats: SourceSyncStats[] = [
    {
      source: "curated",
      fetchedPages: 0,
      discoveredPages: 0,
      parsedEntries: 1,
      acceptedEntries: 1,
      skippedEntries: 0,
      errors: [],
    },
    {
      source: "wikivoyage-wu",
      fetchedPages: 1,
      discoveredPages: 1,
      parsedEntries: 1,
      acceptedEntries: 1,
      skippedEntries: 0,
      errors: [],
    },
  ];

  return compileDictionary(entries, stats, new Date("2026-03-23T15:00:00.000Z"));
}

describe("syncDictionary", () => {
  it("builds a merged dictionary from curated and public sources", async () => {
    resetDictionaryCache();

    const outcome = await syncDictionary({
      fetchImpl: createMockFetch(),
      now: new Date("2026-03-23T12:00:00.000Z"),
      persistArtifacts: null,
    });

    expect(outcome.activeDictionary.entries.some((entry) => entry.input === "怎么回事")).toBe(true);
    expect(outcome.report.sourceStats.find((stats) => stats.source === "dict-cn")?.acceptedEntries).toBeGreaterThan(0);
    expect(outcome.report.sourceStats.find((stats) => stats.source === "nonghao")?.acceptedEntries).toBeGreaterThan(0);
    expect(
      outcome.report.sourceStats.find((stats) => stats.source === "wiktionary-shanghai")?.acceptedEntries,
    ).toBeGreaterThan(0);
    expect(
      outcome.report.sourceStats.find((stats) => stats.source === "wikivoyage-wu")?.acceptedEntries,
    ).toBeGreaterThan(0);
    expect(
      outcome.report.sourceStats.find((stats) => stats.source === "wikipedia-shanghai")?.acceptedEntries,
    ).toBeGreaterThan(0);
    expect(
      outcome.report.candidateSourceStats.find((stats) => stats.source === "glosbe-wuu")?.acceptedEntries,
    ).toBeGreaterThan(0);
    expect(
      outcome.report.candidateSourceStats.find((stats) => stats.source === "omniglot-shanghainese")?.acceptedEntries,
    ).toBeGreaterThan(0);
    expect(outcome.report.reviewCandidateCount).toBeGreaterThan(0);
    expect(outcome.activeDictionary.entries.some((entry) => entry.input === "我们")).toBe(true);
    expect(outcome.report.promotionState).toBe("promoted");
  });

  it("keeps candidate-only source terms out of the formal dictionary while exporting them for CSV review", async () => {
    resetDictionaryCache();

    const outcome = await syncDictionary({
      fetchImpl: createMockFetch(),
      now: new Date("2026-03-23T12:00:00.000Z"),
      persistArtifacts: null,
    });

    expect(
      outcome.activeDictionary.entries.some((entry) => {
        return entry.variants.some((variant) => variant.sources.includes("glosbe-wuu"));
      }),
    ).toBe(false);
    expect(
      outcome.reviewCandidates.some((candidate) => {
        return candidate.source.includes("glosbe-wuu") || candidate.source.includes("dliflc-wu");
      }),
    ).toBe(true);
    expect(outcome.reviewCandidatesCsv).toContain("candidate_type");
  });

  it("keeps the previous dictionary active if persistence fails", async () => {
    const previous = createPreviousDictionary();
    primeDictionaryCache(previous);

    const outcome = await syncDictionary({
      fetchImpl: createMockFetch(),
      now: new Date("2026-03-23T12:00:00.000Z"),
      persistArtifacts: async () => {
        throw new Error("blob unavailable");
      },
    });

    expect(outcome.activeDictionary.version).toBe(previous.version);
    expect(outcome.report.persisted).toBe(false);
    expect(outcome.report.error).toContain("blob unavailable");
  });

  it("promotes with exclusions when one public source is unhealthy", async () => {
    resetDictionaryCache();

    const outcome = await syncDictionary({
      fetchImpl: createMockFetch({
        "https://nhxt.xinmin.cn/cyzc/m/": { body: "server error", status: 500 },
        "https://nhxt.xinmin.cn/cyzc/pc/": { body: "server error", status: 500 },
      }),
      now: new Date("2026-03-23T12:00:00.000Z"),
      persistArtifacts: null,
    });

    expect(outcome.report.promotionState).toBe("promoted_with_exclusions");
    expect(outcome.report.excludedSources).toContain("nonghao");
    expect(outcome.report.sourceHealth.find((health) => health.source === "nonghao")?.status).toBe("failed");
    expect(outcome.activeDictionary.entries.some((entry) => entry.input === "怎么回事")).toBe(true);
  });

  it("retains previous Nonghao entries as stale fallback when the live source fails", async () => {
    const previous = createPreviousDictionaryWithNonghaoEntries();
    primeDictionaryCache(previous);

    const outcome = await syncDictionary({
      fetchImpl: createMockFetch({
        "https://nhxt.xinmin.cn/cyzc/m/": { body: "server error", status: 500 },
        "https://nhxt.xinmin.cn/cyzc/pc/": { body: "server error", status: 500 },
      }),
      now: new Date("2026-03-23T12:00:00.000Z"),
      persistArtifacts: null,
    });

    expect(outcome.report.excludedSources).toContain("nonghao");
    expect(outcome.report.sourceHealth.find((health) => health.source === "nonghao")?.fallbackMode).toBe("previous");
    expect(outcome.report.sourceHealth.find((health) => health.source === "nonghao")?.fallbackEntries).toBe(1);
    expect(outcome.activeDictionary.entries.some((entry) => entry.input === "天气")).toBe(true);
  });

  it("uses a bundled Nonghao fallback when there is no previous source snapshot", async () => {
    resetDictionaryCache();

    const outcome = await syncDictionary({
      fetchImpl: createMockFetch({
        "https://nhxt.xinmin.cn/cyzc/m/": { body: "server error", status: 500 },
        "https://nhxt.xinmin.cn/cyzc/pc/": { body: "server error", status: 500 },
      }),
      now: new Date("2026-03-23T12:00:00.000Z"),
      persistArtifacts: null,
    });

    const nonghaoHealth = outcome.report.sourceHealth.find((health) => health.source === "nonghao");
    const helloVariant = outcome.activeDictionary.entries.find((entry) => entry.input === "你好")?.variants[0];

    expect(outcome.report.excludedSources).toContain("nonghao");
    expect(nonghaoHealth?.fallbackMode).toBe("bundled");
    expect(nonghaoHealth?.fallbackEntries).toBeGreaterThanOrEqual(4);
    expect(helloVariant?.sources).toContain("nonghao");
  });

  it("keeps the previous dictionary when all public sources collapse and entry volume drops sharply", async () => {
    const previous = createLargePreviousDictionary();
    primeDictionaryCache(previous);

    const outcome = await syncDictionary({
      fetchImpl: createMockFetch({
        "https://shh.dict.cn/": { body: "server error", status: 500 },
        "https://shh.dict.cn/%E4%B8%8A%E6%B5%B7%E5%9C%A8%E7%BA%BF": { body: "server error", status: 500 },
        "https://nhxt.xinmin.cn/cyzc/m/": { body: "server error", status: 500 },
        "https://nhxt.xinmin.cn/cyzc/pc/": { body: "server error", status: 500 },
      }),
      now: new Date("2026-03-23T12:00:00.000Z"),
      persistArtifacts: null,
    });

    expect(outcome.activeDictionary.version).toBe(previous.version);
    expect(outcome.report.promotionState).toBe("kept_previous");
    expect(outcome.report.excludedSources).toEqual(expect.arrayContaining(["dict-cn", "nonghao"]));
    expect(outcome.report.anomalies).toContain("overall_entry_drop");
  });

  it("persists the active dictionary to the filesystem by default without any Vercel configuration", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "2sh-storage-"));

    delete process.env.STORAGE_DRIVER;
    process.env.DATA_DIR = tempDir;

    const outcome = await syncDictionary({
      fetchImpl: createMockFetch(),
      now: new Date("2026-03-23T12:00:00.000Z"),
    });

    resetDictionaryCache();
    const dictionary = await loadCurrentDictionary();

    expect(outcome.report.storageMode).toBe("filesystem");
    expect(outcome.report.persisted).toBe(true);
    expect(dictionary.version).toBe(outcome.activeDictionary.version);
    expect(readFileSync(join(tempDir, "compiled", "current.json"), "utf8")).toContain(outcome.activeDictionary.version);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("cold starts with the curated fallback when there is no configured storage state", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "2sh-storage-"));

    delete process.env.STORAGE_DRIVER;
    process.env.DATA_DIR = tempDir;

    const dictionary = await loadCurrentDictionary({
      now: new Date("2026-03-23T12:00:00.000Z"),
    });

    expect(dictionary.sourceStats).toHaveLength(1);
    expect(dictionary.sourceStats[0]?.source).toBe("curated");
    expect(dictionary.entries.some((entry) => entry.input === "你好")).toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("loads the mirror dictionary from upstream and persists a local cache snapshot", async () => {
    const mirrorDictionary = createMirrorDictionary();
    const tempDir = mkdtempSync(join(tmpdir(), "2sh-mirror-"));
    const cachePath = join(tempDir, "current.json");

    process.env.SITE_ROLE = "mirror";
    process.env.DICTIONARY_UPSTREAM_URL = "https://primary.example.com/api/dictionary/current";
    process.env.MIRROR_CACHE_PATH = cachePath;
    process.env.MIRROR_CACHE_TTL_MS = "300000";

    const dictionary = await loadCurrentDictionary({
      now: new Date("2026-03-23T15:01:00.000Z"),
      fetchImpl: (async () => {
        return new Response(JSON.stringify(mirrorDictionary), { status: 200 });
      }) as typeof fetch,
    });

    expect(dictionary.version).toBe(mirrorDictionary.version);
    expect(JSON.parse(readFileSync(cachePath, "utf8"))).toMatchObject({
      version: mirrorDictionary.version,
    });

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("uses the mirror cache file when the upstream dictionary is unavailable", async () => {
    const mirrorDictionary = createMirrorDictionary();
    const tempDir = mkdtempSync(join(tmpdir(), "2sh-mirror-"));
    const cachePath = join(tempDir, "current.json");

    process.env.SITE_ROLE = "mirror";
    process.env.DICTIONARY_UPSTREAM_URL = "https://primary.example.com/api/dictionary/current";
    process.env.MIRROR_CACHE_PATH = cachePath;

    writeFileSync(cachePath, JSON.stringify(mirrorDictionary, null, 2), "utf8");

    const dictionary = await loadCurrentDictionary({
      now: new Date("2026-03-23T15:02:00.000Z"),
      fetchImpl: (async () => {
        throw new Error("upstream offline");
      }) as typeof fetch,
    });

    expect(dictionary.version).toBe(mirrorDictionary.version);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("falls back to the bundled curated dictionary when mirror upstream and file cache both miss", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "2sh-mirror-"));
    const cachePath = join(tempDir, "missing.json");

    process.env.SITE_ROLE = "mirror";
    process.env.DICTIONARY_UPSTREAM_URL = "https://primary.example.com/api/dictionary/current";
    process.env.MIRROR_CACHE_PATH = cachePath;

    const dictionary = await loadCurrentDictionary({
      now: new Date("2026-03-23T15:03:00.000Z"),
      fetchImpl: (async () => {
        throw new Error("upstream offline");
      }) as typeof fetch,
    });

    expect(dictionary.sourceStats).toHaveLength(1);
    expect(dictionary.sourceStats[0]?.source).toBe("curated");
    expect(dictionary.entries.some((entry) => entry.input === "你好")).toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });
});
