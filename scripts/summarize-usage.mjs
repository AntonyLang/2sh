import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";

function getDataDir() {
  return process.env.DATA_DIR?.trim() || "var";
}

function resolveDataDir() {
  const dataDir = getDataDir();
  return isAbsolute(dataDir) ? dataDir : join(process.cwd(), dataDir);
}

async function readNdjsonDirectory(directoryPath) {
  try {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ndjson"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    const records = [];
    for (const file of files) {
      const raw = await readFile(join(directoryPath, file), "utf8");
      for (const line of raw.split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        records.push(JSON.parse(trimmed));
      }
    }

    return {
      records,
      files,
    };
  } catch {
    return {
      records: [],
      files: [],
    };
  }
}

function csvEscape(value) {
  const serialized = String(value ?? "");
  if (!/[",\n]/u.test(serialized)) {
    return serialized;
  }

  return `"${serialized.replace(/"/gu, '""')}"`;
}

function toCsv(columns, rows) {
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")).join("\n");
  return body ? `${header}\n${body}\n` : `${header}\n`;
}

function summarizeQueries(records) {
  const unmatchedMap = new Map();
  let problematicQueryCount = 0;

  for (const record of records) {
    const normalizedInput = String(record.normalizedInput ?? record.input ?? "").trim();
    if (!normalizedInput) {
      continue;
    }

    const unmatchedSpans = Array.isArray(record.unmatchedSpans) ? record.unmatchedSpans : [];
    const problematic = unmatchedSpans.length > 0 || record.hasExactTopCandidate !== true;
    if (!problematic) {
      continue;
    }

    problematicQueryCount += 1;
    const key = normalizedInput;
    const unmatchedExamples = unmatchedSpans.map((span) => span?.text).filter(Boolean);
    const previous = unmatchedMap.get(key) ?? {
      input: String(record.input ?? normalizedInput),
      normalizedInput,
      count: 0,
      lastSeen: "",
      lastDictionaryVersion: "",
      unmatchedExamples: new Set(),
    };

    previous.count += 1;
    previous.lastSeen = String(record.timestamp ?? previous.lastSeen);
    previous.lastDictionaryVersion = String(record.dictionaryVersion ?? previous.lastDictionaryVersion);

    if (unmatchedExamples.length > 0) {
      for (const example of unmatchedExamples) {
        previous.unmatchedExamples.add(example);
      }
    } else {
      previous.unmatchedExamples.add("候选未完整命中");
    }

    unmatchedMap.set(key, previous);
  }

  const topUnmatched = [...unmatchedMap.values()]
    .sort((left, right) => right.count - left.count || right.lastSeen.localeCompare(left.lastSeen, "zh-CN"))
    .slice(0, 50)
    .map((entry) => ({
      input: entry.input,
      normalizedInput: entry.normalizedInput,
      count: entry.count,
      lastSeen: entry.lastSeen,
      lastDictionaryVersion: entry.lastDictionaryVersion,
      unmatchedExamples: [...entry.unmatchedExamples].join(" / "),
    }));

  return {
    problematicQueryCount,
    uniqueProblematicQueries: unmatchedMap.size,
    topUnmatched,
  };
}

function summarizeFeedback(records) {
  const feedbackMap = new Map();

  for (const record of records) {
    const inputText = String(record.inputText ?? "").trim();
    if (!inputText) {
      continue;
    }

    const previous = feedbackMap.get(inputText) ?? {
      inputText,
      count: 0,
      lastSeen: "",
      latestExpectedText: "",
      latestMessage: "",
      hasContact: false,
      lastDictionaryVersion: "",
    };

    previous.count += 1;
    previous.lastSeen = String(record.timestamp ?? previous.lastSeen);
    previous.latestExpectedText = String(record.expectedText ?? "");
    previous.latestMessage = String(record.message ?? "");
    previous.hasContact = previous.hasContact || Boolean(String(record.contact ?? "").trim());
    previous.lastDictionaryVersion = String(record.dictionaryVersion ?? previous.lastDictionaryVersion);

    feedbackMap.set(inputText, previous);
  }

  const topFeedback = [...feedbackMap.values()]
    .sort((left, right) => right.count - left.count || right.lastSeen.localeCompare(left.lastSeen, "zh-CN"))
    .slice(0, 50);

  return {
    feedbackCount: records.length,
    uniqueFeedbackInputs: feedbackMap.size,
    topFeedback,
  };
}

export async function summarizeUsage() {
  const dataDir = resolveDataDir();
  const queryData = await readNdjsonDirectory(join(dataDir, "logs", "queries"));
  const feedbackData = await readNdjsonDirectory(join(dataDir, "feedback"));
  const querySummary = summarizeQueries(queryData.records);
  const feedbackSummary = summarizeFeedback(feedbackData.records);

  const latest = {
    generatedAt: new Date().toISOString(),
    totalQueries: queryData.records.length,
    queryLogDays: queryData.files.length,
    problematicQueryCount: querySummary.problematicQueryCount,
    uniqueProblematicQueries: querySummary.uniqueProblematicQueries,
    feedbackCount: feedbackSummary.feedbackCount,
    feedbackDays: feedbackData.files.length,
    uniqueFeedbackInputs: feedbackSummary.uniqueFeedbackInputs,
    topUnmatched: querySummary.topUnmatched.slice(0, 20),
    topFeedback: feedbackSummary.topFeedback.slice(0, 20),
  };

  const reportDir = join(dataDir, "reports", "usage");
  await mkdir(reportDir, { recursive: true });
  await writeFile(join(reportDir, "latest.json"), JSON.stringify(latest, null, 2), "utf8");
  await writeFile(
    join(reportDir, "top-unmatched.csv"),
    toCsv(["input", "normalizedInput", "count", "lastSeen", "lastDictionaryVersion", "unmatchedExamples"], querySummary.topUnmatched),
    "utf8",
  );
  await writeFile(
    join(reportDir, "top-feedback.csv"),
    toCsv(
      ["inputText", "count", "lastSeen", "latestExpectedText", "latestMessage", "hasContact", "lastDictionaryVersion"],
      feedbackSummary.topFeedback,
    ),
    "utf8",
  );

  return latest;
}

async function main() {
  const summary = await summarizeUsage();
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
