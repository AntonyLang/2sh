import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReviewCandidatesReport } from "@/lib/dictionary/types";

const GENERATED_DIR = join(process.cwd(), "data", "generated");

export async function writeReviewCandidateArtifactsToDisk(
  csv: string,
  report: ReviewCandidatesReport,
): Promise<void> {
  await mkdir(GENERATED_DIR, { recursive: true });
  await Promise.all([
    writeFile(join(GENERATED_DIR, "review-candidates.csv"), csv, "utf8"),
    writeFile(join(GENERATED_DIR, "review-candidates-report.json"), JSON.stringify(report, null, 2), "utf8"),
  ]);
}
