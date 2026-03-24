import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_SYNC_ENABLED = process.env.SYNC_ENABLED;
const ORIGINAL_ADMIN_SYNC_TOKEN = process.env.ADMIN_SYNC_TOKEN;
const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

function restoreEnv(
  name: "SYNC_ENABLED" | "ADMIN_SYNC_TOKEN" | "CRON_SECRET",
  value: string | undefined,
): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

afterEach(() => {
  restoreEnv("SYNC_ENABLED", ORIGINAL_SYNC_ENABLED);
  restoreEnv("ADMIN_SYNC_TOKEN", ORIGINAL_ADMIN_SYNC_TOKEN);
  restoreEnv("CRON_SECRET", ORIGINAL_CRON_SECRET);
  vi.resetModules();
  vi.clearAllMocks();
});

describe("GET /api/internal/sync", () => {
  it("returns 404 when sync is disabled for the deployment", async () => {
    process.env.SYNC_ENABLED = "false";

    const { GET } = await import("@/app/api/internal/sync/route");
    const response = await GET(new Request("http://localhost/api/internal/sync"));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(payload.error).toContain("Sync disabled");
  });

  it("runs dictionary sync when the deployment allows it", async () => {
    process.env.SYNC_ENABLED = "true";
    process.env.ADMIN_SYNC_TOKEN = "top-secret";

    vi.doMock("@/lib/dictionary/service", () => {
      return {
        syncDictionary: vi.fn(async () => ({
          dictionary: { version: "dict-next" },
          activeDictionary: { version: "dict-active" },
          report: {
            storageMode: "memory",
            persisted: false,
          },
        })),
      };
    });

    const { GET } = await import("@/app/api/internal/sync/route");
    const response = await GET(
      new Request("http://localhost/api/internal/sync", {
        headers: {
          authorization: "Bearer top-secret",
        },
      }),
    );
    const payload = (await response.json()) as {
      activeDictionaryVersion: string;
      builtDictionaryVersion: string;
    };

    expect(response.status).toBe(200);
    expect(payload.activeDictionaryVersion).toBe("dict-active");
    expect(payload.builtDictionaryVersion).toBe("dict-next");
  });
});
