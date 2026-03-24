import { readdir } from "node:fs/promises";
import type {
  CompiledDictionary,
  ReviewCandidatesReport,
  SyncReport,
} from "@/lib/dictionary/types";
import {
  readRuntimeJson,
  resolveRuntimeDataPath,
  writeRuntimeJson,
  writeRuntimeText,
} from "@/lib/runtime-data";

const CURRENT_PATH = "compiled/current.json";
const REVIEW_CANDIDATES_PATH = "review-candidates/current.csv";

export async function readCurrentDictionaryFromFilesystem(): Promise<CompiledDictionary | null> {
  return await readRuntimeJson<CompiledDictionary>(CURRENT_PATH);
}

export async function writeDictionaryArtifactsToFilesystem(
  builtDictionary: CompiledDictionary,
  activeDictionary: CompiledDictionary,
  report: SyncReport,
  candidateArtifacts?: {
    csv: string;
    report: ReviewCandidatesReport;
  },
): Promise<void> {
  const writes: Array<Promise<void>> = [
    writeRuntimeJson(`snapshots/${builtDictionary.version}.json`, builtDictionary),
    writeRuntimeJson(`reports/${report.version}.json`, report),
  ];

  if (candidateArtifacts) {
    writes.push(
      writeRuntimeText(REVIEW_CANDIDATES_PATH, candidateArtifacts.csv),
      writeRuntimeJson(`review-candidates/reports/${report.version}.json`, candidateArtifacts.report),
    );
  }

  if (report.promotionState !== "kept_previous") {
    writes.push(writeRuntimeJson(CURRENT_PATH, activeDictionary));
  }

  await Promise.all(writes);
}

export async function listFilesystemSnapshots(limit = 200): Promise<string[]> {
  try {
    const directory = resolveRuntimeDataPath("snapshots");
    const files = await readdir(directory, { withFileTypes: true });
    return files
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.replace(/\.json$/u, ""))
      .sort((left, right) => right.localeCompare(left, "zh-CN"))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function readSnapshotFromFilesystem(version: string): Promise<CompiledDictionary | null> {
  return await readRuntimeJson<CompiledDictionary>(`snapshots/${version}.json`);
}

export async function promoteFilesystemSnapshotToCurrent(dictionary: CompiledDictionary): Promise<void> {
  await writeRuntimeJson(CURRENT_PATH, dictionary);
}
