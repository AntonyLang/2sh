import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("shows the public testing notice and feedback entry", () => {
    render(<Home />);

    expect(screen.getByText("沪语转写测试版")).toBeDefined();
    expect(screen.getByRole("link", { name: "反馈问题 / 建议" }).getAttribute("href")).toBe("/feedback");
    expect(screen.getByText(/小范围公开测试/)).toBeDefined();
  });
});
