import { NextResponse } from "next/server";
import { syncDictionary } from "@/lib/dictionary/service";
import { getAdminSyncToken, isSyncEnabled } from "@/lib/site-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = getAdminSyncToken();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  const querySecret = new URL(request.url).searchParams.get("secret");

  return authHeader === `Bearer ${secret}` || querySecret === secret;
}

export async function GET(request: Request) {
  if (!isSyncEnabled()) {
    return NextResponse.json({ error: "Sync disabled for this deployment." }, { status: 404 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const outcome = await syncDictionary();
    const status = outcome.report.storageMode !== "memory" && !outcome.report.persisted ? 500 : 200;

    return NextResponse.json(
      {
        activeDictionaryVersion: outcome.activeDictionary.version,
        builtDictionaryVersion: outcome.dictionary.version,
        report: outcome.report,
      },
      { status },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "同步失败" },
      { status: 500 },
    );
  }
}
