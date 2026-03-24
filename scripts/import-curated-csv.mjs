import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

export const CSV_HEADERS = [
  "mandarin",
  "shanghainese",
  "aliases",
  "weight",
  "enabled",
  "category",
  "note",
  "source",
  "status",
];

const CSV_PATH = path.join(ROOT_DIR, "data", "curated-lexicon.csv");
const JSON_PATH = path.join(ROOT_DIR, "src", "lib", "dictionary", "curated-lexicon.json");
const REPORT_PATH = path.join(ROOT_DIR, "data", "generated", "curated-import-report.json");
const REGRESSION_PATH = path.join(ROOT_DIR, "data", "regression-cases.json");

function parseCsvLineCharacters(text) {
  const rows = [];
  let currentField = "";
  let currentRow = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentField);
      currentField = "";

      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentField += char;
  }

  currentRow.push(currentField);
  if (currentRow.some((value) => value.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

export function parseCsvText(text) {
  const rows = parseCsvLineCharacters(text);
  const headerRow = rows.shift() ?? [];

  if (headerRow.join(",") !== CSV_HEADERS.join(",")) {
    throw new Error(`Unexpected CSV header: ${headerRow.join(",")}`);
  }

  return rows.map((row, index) => {
    const record = Object.fromEntries(
      CSV_HEADERS.map((header, headerIndex) => [header, (row[headerIndex] ?? "").trim()]),
    );

    return {
      ...record,
      rowNumber: index + 2,
    };
  });
}

function normalizeBoolean(value) {
  return value === "true" || value === "1" || value === "yes";
}

function normalizeAliases(value) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasInvalidHanMix(value) {
  return /[A-Za-z0-9<>[\]{}]/u.test(value);
}

export function buildCuratedLexiconArtifacts(records) {
  const duplicates = [];
  const conflicts = [];
  const missingFields = [];
  const invalidRows = [];
  const seenPairs = new Set();
  const outputsByMandarin = new Map();
  let aliasExpandedCount = 0;
  let disabledCount = 0;

  const seeds = records.map((record) => {
    const aliases = normalizeAliases(record.aliases);
    aliasExpandedCount += aliases.length;

    const status = record.status || "approved";
    const enabled = normalizeBoolean(record.enabled) && status === "approved";
    if (!enabled) {
      disabledCount += 1;
    }

    if (!record.mandarin || !record.shanghainese) {
      missingFields.push(record.rowNumber);
    }

    if (hasInvalidHanMix(record.mandarin) || hasInvalidHanMix(record.shanghainese)) {
      invalidRows.push(record.rowNumber);
    }

    const pairKey = `${record.mandarin}::${record.shanghainese}`;
    if (seenPairs.has(pairKey)) {
      duplicates.push(record.rowNumber);
    } else {
      seenPairs.add(pairKey);
    }

    const outputs = outputsByMandarin.get(record.mandarin) ?? new Set();
    outputs.add(record.shanghainese);
    outputsByMandarin.set(record.mandarin, outputs);

    return {
      mandarin: record.mandarin,
      shanghainese: record.shanghainese,
      aliases,
      weight: Number(record.weight || 0),
      enabled,
      category: record.category || undefined,
      note: record.note || undefined,
      source: record.source || "manual",
      status,
    };
  });

  for (const [mandarin, outputs] of outputsByMandarin.entries()) {
    if (outputs.size > 1) {
      conflicts.push({
        mandarin,
        variants: [...outputs],
      });
    }
  }

  seeds.sort((left, right) => {
    return right.weight - left.weight || left.mandarin.length - right.mandarin.length;
  });

  const regressionCases = [];
  const regressionSeen = new Set();

  for (const seed of seeds) {
    if (!seed.enabled || seed.status !== "approved") {
      continue;
    }

    if (regressionSeen.has(seed.mandarin)) {
      continue;
    }

    regressionSeen.add(seed.mandarin);
    regressionCases.push({
      input: seed.mandarin,
      expected: seed.shanghainese,
    });

    if (regressionCases.length >= 120) {
      break;
    }
  }

  return {
    seeds,
    report: {
      generatedAt: new Date().toISOString(),
      rowCount: records.length,
      enabledCount: seeds.filter((seed) => seed.enabled).length,
      aliasExpandedCount,
      disabledCount,
      duplicateRows: duplicates,
      missingFieldRows: missingFields,
      invalidRows,
      conflictCount: conflicts.length,
      conflicts,
      regressionCaseCount: regressionCases.length,
    },
    regressionCases,
  };
}

export async function importCuratedCsv({
  csvPath = CSV_PATH,
  jsonPath = JSON_PATH,
  reportPath = REPORT_PATH,
  regressionPath = REGRESSION_PATH,
} = {}) {
  const csvText = await fs.readFile(csvPath, "utf8");
  const records = parseCsvText(csvText);
  const artifacts = buildCuratedLexiconArtifacts(records);

  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.mkdir(path.dirname(regressionPath), { recursive: true });

  await Promise.all([
    fs.writeFile(jsonPath, `${JSON.stringify(artifacts.seeds, null, 2)}\n`, "utf8"),
    fs.writeFile(reportPath, `${JSON.stringify(artifacts.report, null, 2)}\n`, "utf8"),
    fs.writeFile(regressionPath, `${JSON.stringify(artifacts.regressionCases, null, 2)}\n`, "utf8"),
  ]);

  return artifacts;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const artifacts = await importCuratedCsv();
  console.log(JSON.stringify(artifacts.report, null, 2));
}
