import Link from "next/link";
import styles from "./page.module.css";
import { TranslatorPanel } from "@/components/translator-panel";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>沪语转写测试版</p>
        <div className={styles.copy}>
          <h1>把普通话短句转成更常见的上海话汉字写法。</h1>
          <p>
            输入一句普通话，系统会优先命中高频词条和常用短句，返回最多 3
            个更贴近日常使用的上海话写法，适合直接拿来查、比、试。
          </p>
        </div>
        <p className={styles.notice}>
          当前为小范围公开测试。词库持续补充中，结果以常见写法优先；如果你遇到不自然或没命中的句子，可以直接反馈。
        </p>
        <div className={styles.badges}>
          <span>适合短句和日常表达</span>
          <span>提供多个常见候选</span>
          <span>词库持续更新</span>
        </div>
        <div className={styles.actions}>
          <a className={styles.primaryAction} href="#translator">
            立即试用
          </a>
          <Link className={styles.secondaryAction} href="/feedback">
            反馈问题 / 建议
          </Link>
        </div>
      </section>
      <div id="translator">
        <TranslatorPanel />
      </div>
    </main>
  );
}
