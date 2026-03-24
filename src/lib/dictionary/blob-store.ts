import { get, list, put } from "@vercel/blob";
import type {
  CompiledDictionary,
  ReviewCandidatesReport,
  SyncReport,
} from "@/lib/dictionary/types";

const CURRENT_PATH = "compiled/current.json";
const REVIEW_CANDIDATES_PATH = "review-candidates/current.csv";

export function hasBlobStore(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  return await new Response(stream).text();
}

export async function readCurrentDictionaryFromBlob(): Promise<CompiledDictionary | null> {
  if (!hasBlobStore()) {
    return null;
  }

  const result = await get(CURRENT_PATH, { access: "public" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  return JSON.parse(await streamToText(result.stream)) as CompiledDictionary;
}

export async function writeDictionaryArtifacts(
  builtDictionary: CompiledDictionary,
  activeDictionary: CompiledDictionary,
  report: SyncReport,
  candidateArtifacts?: {
    csv: string;
    report: ReviewCandidatesReport;
  },
): Promise<void> {
  const writes: Array<Promise<unknown>> = [
    put(`snapshots/${builtDictionary.version}.json`, JSON.stringify(builtDictionary, null, 2), {
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 86400,
    }),
    put(`reports/${report.version}.json`, JSON.stringify(report, null, 2), {
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 86400,
    }),
  ];

  if (candidateArtifacts) {
    writes.push(
      put(REVIEW_CANDIDATES_PATH, candidateArtifacts.csv, {
        access: "public",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "text/csv; charset=utf-8",
        cacheControlMaxAge: 86400,
      }),
      put(`review-candidates/reports/${report.version}.json`, JSON.stringify(candidateArtifacts.report, null, 2), {
        access: "public",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json; charset=utf-8",
        cacheControlMaxAge: 86400,
      }),
    );
  }

  if (report.promotionState !== "kept_previous") {
    writes.push(
      put(CURRENT_PATH, JSON.stringify(activeDictionary, null, 2), {
        access: "public",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json; charset=utf-8",
        cacheControlMaxAge: 300,
      }),
    );
  }

  await Promise.all(writes);
}

export async function listAvailableSnapshots(limit = 200): Promise<string[]> {
  if (!hasBlobStore()) {
    return [];
  }

  const response = await list({ prefix: "snapshots/", limit });
  return response.blobs
    .map((blob) => blob.pathname.replace(/^snapshots\//, "").replace(/\.json$/u, ""))
    .sort((left, right) => right.localeCompare(left, "zh-CN"));
}

export async function readSnapshotFromBlob(version: string): Promise<CompiledDictionary | null> {
  if (!hasBlobStore()) {
    return null;
  }

  const result = await get(`snapshots/${version}.json`, { access: "public" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  return JSON.parse(await streamToText(result.stream)) as CompiledDictionary;
}

export async function promoteSnapshotToCurrent(dictionary: CompiledDictionary): Promise<void> {
  await put(CURRENT_PATH, JSON.stringify(dictionary, null, 2), {
    access: "public",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 300,
  });
}
