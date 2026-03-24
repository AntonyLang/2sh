import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { getDictionaryUpstreamUrl, getMirrorCachePath } from "@/lib/site-mode";
import type { CompiledDictionary } from "@/lib/dictionary/types";

type FetchLike = typeof fetch;

function resolveCachePath(): string {
  const configured = getMirrorCachePath();
  return isAbsolute(configured) ? configured : join(/* turbopackIgnore: true */ process.cwd(), configured);
}

export async function readDictionaryFromMirrorCache(): Promise<CompiledDictionary | null> {
  try {
    const payload = await readFile(resolveCachePath(), "utf8");
    return JSON.parse(payload) as CompiledDictionary;
  } catch {
    return null;
  }
}

export async function writeDictionaryToMirrorCache(dictionary: CompiledDictionary): Promise<void> {
  const targetPath = resolveCachePath();
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, JSON.stringify(dictionary, null, 2), "utf8");
}

export async function fetchDictionaryFromUpstream(
  fetchImpl: FetchLike,
  upstreamUrl = getDictionaryUpstreamUrl(),
): Promise<CompiledDictionary | null> {
  if (!upstreamUrl) {
    return null;
  }

  const response = await fetchImpl(upstreamUrl, {
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as CompiledDictionary;
}
