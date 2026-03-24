import Link from "next/link";
import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback-form";
import { loadCurrentDictionary } from "@/lib/dictionary/service";
import styles from "./page.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "反馈建议 | 沪语转写测试版",
  description: "提交转写问题、候选建议或补词意见，帮助持续优化普通话到上海话汉字写法的结果。",
};

export default async function FeedbackPage() {
  const dictionary = await loadCurrentDictionary().catch(() => null);

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.topRow}>
          <Link href="/" className={styles.backLink}>
            ← 返回首页
          </Link>
        </div>

        <div className={styles.hero}>
          <p className={styles.kicker}>测试版反馈入口</p>
          <h1>把不自然、不常用、没命中的句子发过来。</h1>
          <p>
            当前站点仍在小范围公开测试。你提交的原句、建议写法和问题说明，会直接进入补词和修正流程。
          </p>
        </div>

        <div className={styles.tips}>
          <span>适合提交：结果不准确、候选不自然、常用说法缺失、整句命中不稳定。</span>
          <span>不需要账号，提交后不会公开展示。</span>
        </div>

        <FeedbackForm dictionaryVersion={dictionary?.version} />
      </section>
    </main>
  );
}
