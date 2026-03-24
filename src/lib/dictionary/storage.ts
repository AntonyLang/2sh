import {
  listAvailableSnapshots as listBlobSnapshots,
  promoteSnapshotToCurrent as promoteBlobSnapshotToCurrent,
  readCurrentDictionaryFromBlob,
  readSnapshotFromBlob,
  writeDictionaryArtifacts as writeBlobArtifacts,
} from "@/lib/dictionary/blob-store";
import {
  listFilesystemSnapshots,
  promoteFilesystemSnapshotToCurrent,
  readCurrentDictionaryFromFilesystem,
  readSnapshotFromFilesystem,
  writeDictionaryArtifactsToFilesystem,
} from "@/lib/dictionary/filesystem-store";
import type {
  CompiledDictionary,
  DictionaryStorageMode,
  ReviewCandidatesReport,
  SyncReport,
} from "@/lib/dictionary/types";
import { getStorageDriver } from "@/lib/site-mode";

export type DictionaryStorage = {
  driver: Exclude<DictionaryStorageMode, "memory">;
  readCurrentDictionary: () => Promise<CompiledDictionary | null>;
  writeDictionaryArtifacts: (
    builtDictionary: CompiledDictionary,
    activeDictionary: CompiledDictionary,
    report: SyncReport,
    candidateArtifacts?: {
      csv: string;
      report: ReviewCandidatesReport;
    },
  ) => Promise<void>;
  listAvailableSnapshots: (limit?: number) => Promise<string[]>;
  readSnapshot: (version: string) => Promise<CompiledDictionary | null>;
  promoteSnapshotToCurrent: (dictionary: CompiledDictionary) => Promise<void>;
};

const FILESYSTEM_STORAGE: DictionaryStorage = {
  driver: "filesystem",
  readCurrentDictionary: readCurrentDictionaryFromFilesystem,
  writeDictionaryArtifacts: writeDictionaryArtifactsToFilesystem,
  listAvailableSnapshots: listFilesystemSnapshots,
  readSnapshot: readSnapshotFromFilesystem,
  promoteSnapshotToCurrent: promoteFilesystemSnapshotToCurrent,
};

const BLOB_STORAGE: DictionaryStorage = {
  driver: "blob",
  readCurrentDictionary: readCurrentDictionaryFromBlob,
  writeDictionaryArtifacts: writeBlobArtifacts,
  listAvailableSnapshots: listBlobSnapshots,
  readSnapshot: readSnapshotFromBlob,
  promoteSnapshotToCurrent: promoteBlobSnapshotToCurrent,
};

export function getDictionaryStorage(): DictionaryStorage {
  return getStorageDriver() === "blob" ? BLOB_STORAGE : FILESYSTEM_STORAGE;
}
