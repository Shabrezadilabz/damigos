/** @jsxImportSource react */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../../../../src/components/ui/badge";

describe("guest/frontend ui/badge", () => {
  describe("positive", () => {
    it("renders badge copy", () => {
      render(<Badge variant="secondary">Guest</Badge>);
      expect(screen.getByText("Guest")).toBeTruthy();
    });
  });

  describe("negative", () => {
    it("empty children render empty badge", () => {
      const { container } = render(<Badge />);
      expect(container.querySelector("div")?.textContent ?? "").toBe("");
    });
  });
});
