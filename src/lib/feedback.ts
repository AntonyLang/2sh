import { appendRuntimeNdjson } from "@/lib/runtime-data";
import { getFeedbackRateLimitMax, getFeedbackRateLimitWindowMs } from "@/lib/site-mode";

const MAX_INPUT_TEXT_LENGTH = 200;
const MAX_EXPECTED_TEXT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_CONTACT_LENGTH = 200;

const feedbackRateLimit = new Map<string, { count: number; resetAt: number }>();

export type FeedbackInput = {
  inputText: string;
  expectedText?: string;
  message: string;
  contact?: string;
  dictionaryVersion?: string;
  website?: string;
};

export type FeedbackRecord = {
  timestamp: string;
  inputText: string;
  expectedText: string;
  message: string;
  contact: string;
  dictionaryVersion: string;
};

function trimToLength(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getFeedbackPath(now: Date): string {
  return `feedback/${now.toISOString().slice(0, 10)}.ndjson`;
}

function cleanupExpiredRateLimits(now = Date.now()): void {
  for (const [key, entry] of feedbackRateLimit.entries()) {
    if (entry.resetAt <= now) {
      feedbackRateLimit.delete(key);
    }
  }
}

function getRequesterKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.trim() ?? "unknown";
  return `${forwardedFor || realIp || "unknown"}|${userAgent}`;
}

export function validateFeedbackInput(raw: unknown): { ok: true; value: FeedbackInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "提交内容无效" };
  }

  const payload = raw as Record<string, unknown>;
  const inputText = trimToLength(payload.inputText, MAX_INPUT_TEXT_LENGTH);
  const expectedText = trimToLength(payload.expectedText, MAX_EXPECTED_TEXT_LENGTH);
  const message = trimToLength(payload.message, MAX_MESSAGE_LENGTH);
  const contact = trimToLength(payload.contact, MAX_CONTACT_LENGTH);
  const dictionaryVersion = trimToLength(payload.dictionaryVersion, 120);
  const website = trimToLength(payload.website, 200);

  if (website) {
    return { ok: false, error: "提交失败" };
  }

  if (!inputText) {
    return { ok: false, error: "请填写原句" };
  }

  if (!message) {
    return { ok: false, error: "请填写问题说明或建议" };
  }

  return {
    ok: true,
    value: {
      inputText,
      expectedText,
      message,
      contact,
      dictionaryVersion,
    },
  };
}

export function checkFeedbackRateLimit(
  request: Request,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  cleanupExpiredRateLimits(now);

  const key = getRequesterKey(request);
  const windowMs = getFeedbackRateLimitWindowMs();
  const maxRequests = getFeedbackRateLimitMax();
  const existing = feedbackRateLimit.get(key);

  if (!existing || existing.resetAt <= now) {
    feedbackRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= maxRequests) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  feedbackRateLimit.set(key, existing);
  return { ok: true };
}

export function createFeedbackRecord(input: FeedbackInput, now = new Date()): FeedbackRecord {
  return {
    timestamp: now.toISOString(),
    inputText: input.inputText,
    expectedText: input.expectedText ?? "",
    message: input.message,
    contact: input.contact ?? "",
    dictionaryVersion: input.dictionaryVersion ?? "",
  };
}

export async function persistFeedback(record: FeedbackRecord, now = new Date()): Promise<void> {
  await appendRuntimeNdjson(getFeedbackPath(now), record);
}

export function resetFeedbackRateLimitState(): void {
  feedbackRateLimit.clear();
}
