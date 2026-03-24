import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { getDataDir } from "@/lib/site-mode";

function resolveBaseDir(): string {
  const dataDir = getDataDir();
  return isAbsolute(dataDir) ? dataDir : join(/* turbopackIgnore: true */ process.cwd(), dataDir);
}

export function resolveRuntimeDataPath(relativePath: string): string {
  return join(resolveBaseDir(), relativePath);
}

export async function ensureRuntimeDataParent(relativePath: string): Promise<string> {
  const targetPath = resolveRuntimeDataPath(relativePath);
  await mkdir(dirname(targetPath), { recursive: true });
  return targetPath;
}

export async function writeRuntimeJson(relativePath: string, payload: unknown): Promise<void> {
  const targetPath = await ensureRuntimeDataParent(relativePath);
  await writeFile(targetPath, JSON.stringify(payload, null, 2), "utf8");
}

export async function readRuntimeJson<T>(relativePath: string): Promise<T | null> {
  try {
    const payload = await readFile(resolveRuntimeDataPath(relativePath), "utf8");
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

export async function writeRuntimeText(relativePath: string, content: string): Promise<void> {
  const targetPath = await ensureRuntimeDataParent(relativePath);
  await writeFile(targetPath, content, "utf8");
}

export async function appendRuntimeNdjson(relativePath: string, payload: unknown): Promise<void> {
  const targetPath = await ensureRuntimeDataParent(relativePath);
  await appendFile(targetPath, `${JSON.stringify(payload)}\n`, "utf8");
}
