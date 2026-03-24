import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { compileDictionary } from "@/lib/dictionary/compile";
import type { RawSourceEntry, SourceSyncStats } from "@/lib/dictionary/types";

const ORIGINAL_DATA_DIR = process.env.DATA_DIR;
const ORIGINAL_QUERY_LOGGING_ENABLED = process.env.QUERY_LOGGING_ENABLED;

const entries: RawSourceEntry[] = [
  { mandarin: "你好", shanghainese: "侬好", source: "curated", weight: 160 },
  { mandarin: "怎么回事", shanghainese: "哪能为实事", source: "curated", weight: 180 },
];

const stats: SourceSyncStats[] = [
  {
    source: "curated",
    fetchedPages: 0,
    discoveredPages: 0,
    parsedEntries: entries.length,
    acceptedEntries: entries.length,
    skippedEntries: 0,
    errors: [],
  },
];

const dictionary = compileDictionary(entries, stats, new Date("2026-03-23T10:00:00.000Z"));

function restoreEnv(name: "DATA_DIR" | "QUERY_LOGGING_ENABLED", value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

afterEach(async () => {
  restoreEnv("DATA_DIR", ORIGINAL_DATA_DIR);
  restoreEnv("QUERY_LOGGING_ENABLED", ORIGINAL_QUERY_LOGGING_ENABLED);
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("GET /api/translate", () => {
  it("returns translated candidates and persists an anonymous query log", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "2sh-translate-"));
    process.env.DATA_DIR = dataDir;
    process.env.QUERY_LOGGING_ENABLED = "true";

    vi.doMock("@/lib/dictionary/service", () => {
      return {
        loadCurrentDictionary: vi.fn(async () => dictionary),
      };
    });

    const { GET } = await import("@/app/api/translate/route");
    const response = await GET(new Request("http://localhost/api/translate?q=%E4%BD%A0%E5%A5%BD"));
    const payload = (await response.json()) as {
      candidates: Array<{ text: string }>;
      dictionaryVersion: string;
    };

    expect(response.status).toBe(200);
    expect(payload.candidates[0]?.text).toBe("侬好");

    const queryLogPath = join(dataDir, "logs", "queries", `${new Date().toISOString().slice(0, 10)}.ndjson`);
    const rawLog = await readFile(queryLogPath, "utf8");
    const [line] = rawLog.trim().split(/\r?\n/u);
    const logged = JSON.parse(line) as {
      input: string;
      normalizedInput: string;
      candidateCount: number;
      hasExactTopCandidate: boolean;
      dictionaryVersion: string;
    };

    expect(logged.input).toBe("你好");
    expect(logged.normalizedInput).toBe("你好");
    expect(logged.candidateCount).toBe(payload.candidates.length);
    expect(logged.hasExactTopCandidate).toBe(true);
    expect(logged.dictionaryVersion).toBe(payload.dictionaryVersion);

    await rm(dataDir, { recursive: true, force: true });
  });

  it("keeps the response successful when query logging fails", async () => {
    vi.doMock("@/lib/dictionary/service", () => {
      return {
        loadCurrentDictionary: vi.fn(async () => dictionary),
      };
    });

    vi.doMock("@/lib/query-logging", () => {
      return {
        logTranslationQuery: vi.fn(async () => {
          throw new Error("disk full");
        }),
      };
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { GET } = await import("@/app/api/translate/route");
    const response = await GET(new Request("http://localhost/api/translate?q=%E4%BD%A0%E5%A5%BD"));
    const payload = (await response.json()) as { candidates: Array<{ text: string }> };

    expect(response.status).toBe(200);
    expect(payload.candidates[0]?.text).toBe("侬好");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("validates missing input", async () => {
    const { GET } = await import("@/app/api/translate/route");
    const response = await GET(new Request("http://localhost/api/translate?q="));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toContain("缺少 q 参数");
  });
});
