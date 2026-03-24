"use client";

import { useState } from "react";
import styles from "./translator-panel.module.css";
import { SOURCE_LABELS, type TranslationResult } from "@/lib/dictionary/types";

const EXAMPLES = ["你好", "怎么回事", "你在做什么", "今天下雨了"];

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TranslatorPanel() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function runTranslation(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (!trimmed) {
      setError("先输入一句普通话，再开始转写。");
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/translate?q=${encodeURIComponent(trimmed)}`, {
        method: "GET",
      });

      const payload = (await response.json()) as TranslationResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "转写失败");
      }

      setResult(payload);
    } catch (nextError) {
      setResult(null);
      setError(nextError instanceof Error ? nextError.message : "转写失败");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={styles.shell}>
      <div className={styles.grid}>
        <div className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2>输入普通话</h2>
            <p>
              适合词、短语和 1 到 2 句生活短句。系统会优先命中整句和高频表达，未收录片段保留原文，不乱猜整句。
            </p>
          </header>

          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void runTranslation(query);
            }}
          >
            <textarea
              aria-label="普通话输入框"
              className={styles.textarea}
              placeholder="例如：你好 / 怎么回事 / 你在做什么 / 今天下雨了"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
            <div className={styles.actions}>
              <button className={styles.submitButton} type="submit" disabled={isLoading}>
                {isLoading ? "转写中..." : "转成上海话"}
              </button>
              <span className={styles.hint}>
                每次最多返回 3 个候选版本，按词库优先级和常见度排序。
              </span>
            </div>
          </form>

          <div className={styles.exampleRow}>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className={styles.exampleButton}
                onClick={() => {
                  setQuery(example);
                  void runTranslation(example);
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2>候选结果</h2>
            <p>
              会展示候选写法、来源标签和命中片段。未命中的部分会明确标出，方便继续补词和人工判断。
            </p>
          </header>

          {error ? <div className={`${styles.status} ${styles.error}`}>{error}</div> : null}

          {!result && !error ? (
            <div className={styles.status}>
              输入一句普通话后提交即可开始转写。比如输入“你好”，会优先返回“侬好”。
            </div>
          ) : null}

          {result ? (
            <>
              <div className={styles.resultList}>
                {result.candidates.map((candidate, index) => {
                  const unmatchedCount = candidate.segments.filter((segment) => !segment.matched).length;

                  return (
                    <article className={styles.resultCard} key={`${candidate.text}-${index}`}>
                      <div className={styles.resultCardTop}>
                        <div>
                          <div className={styles.candidateText}>{candidate.text}</div>
                          <div className={styles.meta}>
                            得分 {candidate.score} · 未命中片段 {unmatchedCount}
                          </div>
                        </div>
                        <span className={styles.rank}>{index + 1}</span>
                      </div>

                      <div className={styles.sourceRow}>
                        {candidate.sources.map((source) => (
                          <span className={styles.sourceChip} key={`${candidate.text}-${source}`}>
                            {SOURCE_LABELS[source]}
                          </span>
                        ))}
                      </div>

                      <div className={styles.segmentRow}>
                        {candidate.segments.map((segment) => (
                          <span
                            className={`${styles.segmentChip} ${segment.matched ? "" : styles.segmentMiss}`}
                            key={`${candidate.text}-${segment.start}-${segment.end}`}
                          >
                            {segment.input} → {segment.output}
                          </span>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>

              <footer className={styles.footer}>
                <span>
                  词库版本 {result.dictionaryVersion} · 最近更新时间 {formatUpdatedAt(result.updatedAt)}
                </span>
                <span>
                  未命中{" "}
                  {result.unmatchedSpans.length > 0
                    ? result.unmatchedSpans.map((span) => span.text).join(" / ")
                    : "无"}
                </span>
              </footer>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
