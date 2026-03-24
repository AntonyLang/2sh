import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetFeedbackRateLimitState } from "@/lib/feedback";

const ORIGINAL_DATA_DIR = process.env.DATA_DIR;
const ORIGINAL_RATE_LIMIT_WINDOW = process.env.FEEDBACK_RATE_LIMIT_WINDOW_MS;
const ORIGINAL_RATE_LIMIT_MAX = process.env.FEEDBACK_RATE_LIMIT_MAX;

function restoreEnv(name: "DATA_DIR" | "FEEDBACK_RATE_LIMIT_WINDOW_MS" | "FEEDBACK_RATE_LIMIT_MAX", value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

afterEach(async () => {
  restoreEnv("DATA_DIR", ORIGINAL_DATA_DIR);
  restoreEnv("FEEDBACK_RATE_LIMIT_WINDOW_MS", ORIGINAL_RATE_LIMIT_WINDOW);
  restoreEnv("FEEDBACK_RATE_LIMIT_MAX", ORIGINAL_RATE_LIMIT_MAX);
  resetFeedbackRateLimitState();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("POST /api/feedback", () => {
  it("persists valid feedback to filesystem", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "2sh-feedback-"));
    process.env.DATA_DIR = dataDir;

    const { POST } = await import("@/app/api/feedback/route");
    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify({
          inputText: "怎么回事",
          expectedText: "哪能为实事",
          message: "这个更常见。",
          contact: "tester@example.com",
          dictionaryVersion: "dict-1",
          website: "",
        }),
      }),
    );

    const payload = (await response.json()) as { ok: boolean };
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);

    const feedbackPath = join(dataDir, "feedback", `${new Date().toISOString().slice(0, 10)}.ndjson`);
    const raw = await readFile(feedbackPath, "utf8");
    const [line] = raw.trim().split(/\r?\n/u);
    const saved = JSON.parse(line) as {
      inputText: string;
      expectedText: string;
      message: string;
      contact: string;
      dictionaryVersion: string;
    };

    expect(saved).toMatchObject({
      inputText: "怎么回事",
      expectedText: "哪能为实事",
      message: "这个更常见。",
      contact: "tester@example.com",
      dictionaryVersion: "dict-1",
    });

    await rm(dataDir, { recursive: true, force: true });
  });

  it("rejects honeypot submissions", async () => {
    const { POST } = await import("@/app/api/feedback/route");
    const response = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          inputText: "你好",
          message: "test",
          website: "spam.example",
        }),
      }),
    );
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toContain("提交失败");
  });

  it("applies an in-memory rate limit", async () => {
    process.env.FEEDBACK_RATE_LIMIT_MAX = "1";
    process.env.FEEDBACK_RATE_LIMIT_WINDOW_MS = "600000";

    const { POST } = await import("@/app/api/feedback/route");
    const request = () =>
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.11",
          "user-agent": "vitest",
        },
        body: JSON.stringify({
          inputText: "你好",
          message: "第一次",
          website: "",
        }),
      });

    const first = await POST(request());
    const second = await POST(request());
    const payload = (await second.json()) as { error: string };

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(payload.error).toContain("提交过于频繁");
  });
});
