import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TranslatorPanel } from "@/components/translator-panel";

const mockPayload = {
  input: "你好",
  normalizedInput: "你好",
  dictionaryVersion: "dict-2026-03-23",
  updatedAt: "2026-03-23T10:00:00.000Z",
  unmatchedSpans: [],
  candidates: [
    {
      text: "侬好",
      score: 320,
      sources: ["curated"],
      segments: [
        {
          input: "你好",
          output: "侬好",
          matched: true,
          start: 0,
          end: 2,
          sources: ["curated"],
        },
      ],
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TranslatorPanel", () => {
  it("submits input and renders translation results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify(mockPayload), { status: 200 });
      }),
    );

    const user = userEvent.setup();
    render(<TranslatorPanel />);

    await user.type(screen.getByLabelText("普通话输入框"), "你好");
    await user.click(screen.getByRole("button", { name: "转成上海话" }));

    expect(await screen.findByText("侬好")).toBeDefined();
    expect(screen.getByText("精选词库")).toBeDefined();
  });
});
