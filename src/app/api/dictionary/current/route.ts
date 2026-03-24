import { NextResponse } from "next/server";
import { loadCurrentDictionary } from "@/lib/dictionary/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dictionary = await loadCurrentDictionary();
    return NextResponse.json(dictionary, {
      headers: {
        "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "词库加载失败" },
      { status: 500 },
    );
  }
}
