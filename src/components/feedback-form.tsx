"use client";

import { useState } from "react";
import styles from "./feedback-form.module.css";

type FeedbackFormProps = {
  dictionaryVersion?: string;
};

type StatusState =
  | { type: "idle"; message: string | null }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export function FeedbackForm({ dictionaryVersion = "" }: FeedbackFormProps) {
  const [inputText, setInputText] = useState("");
  const [expectedText, setExpectedText] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusState>({ type: "idle", message: null });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: null });

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          inputText,
          expectedText,
          message,
          contact,
          dictionaryVersion,
          website,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "提交失败");
      }

      setInputText("");
      setExpectedText("");
      setMessage("");
      setContact("");
      setWebsite("");
      setStatus({ type: "success", message: "反馈已收到，后续会用于补词和优化结果。" });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "提交失败",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="inputText">原句</label>
        <textarea
          id="inputText"
          className={styles.textarea}
          placeholder="例如：怎么回事 / 你在做什么 / 今天下雨了"
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="expectedText">你认为更自然的写法</label>
        <input
          id="expectedText"
          className={styles.input}
          placeholder="例如：哪能为实事"
          value={expectedText}
          onChange={(event) => setExpectedText(event.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="message">问题说明或建议</label>
        <textarea
          id="message"
          className={styles.textarea}
          placeholder="可以写：结果不常用、意思不对、缺少候选、想补充常见说法。"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="contact">联系方式，可选</label>
        <input
          id="contact"
          className={styles.input}
          placeholder="邮箱、微信或其他联系方式"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
        />
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">请留空</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {dictionaryVersion ? (
        <p className={styles.meta}>提交时词库版本：{dictionaryVersion}</p>
      ) : null}

      {status.message ? (
        <div className={`${styles.status} ${status.type === "error" ? styles.error : styles.success}`}>
          {status.message}
        </div>
      ) : null}

      <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "提交中..." : "提交反馈"}
      </button>
    </form>
  );
}
