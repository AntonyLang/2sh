import { NextResponse } from "next/server";
import {
  checkFeedbackRateLimit,
  createFeedbackRecord,
  persistFeedback,
  validateFeedbackInput,
} from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rateLimit = checkFeedbackRateLimit(request);
  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        error: `提交过于频繁，请在 ${rateLimit.retryAfterSeconds} 秒后重试。`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "提交内容不是合法 JSON。" }, { status: 400 });
  }

  const validated = validateFeedbackInput(payload);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    await persistFeedback(createFeedbackRecord(validated.value));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "反馈保存失败" },
      { status: 500 },
    );
  }
}
