import { NextResponse } from "next/server";
import { normalizeInputText } from "@/lib/dictionary/normalize";
import { loadCurrentDictionary } from "@/lib/dictionary/service";
import { translateText } from "@/lib/translate/translate";
import { logTranslationQuery } from "@/lib/query-logging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  if (!normalizeInputText(query)) {
    return NextResponse.json({ error: "缺少 q 参数或输入为空。" }, { status: 400 });
  }

  try {
    const dictionary = await loadCurrentDictionary();
    const translation = translateText(query, dictionary);

    await logTranslationQuery(translation).catch((error) => {
      console.error("Failed to persist query log", error);
    });

    return NextResponse.json(translation);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "词库加载失败" },
      { status: 500 },
    );
  }
}
