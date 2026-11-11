/** @jsxImportSource react */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../../../../src/components/ui/badge";

describe("crm/frontend ui/badge", () => {
  describe("positive", () => {
    it("renders children text", () => {
      render(<Badge>Open</Badge>);
      expect(screen.getByText("Open")).toBeTruthy();
    });
  });

  describe("negative", () => {
    it("does not invent missing label", () => {
      const { container } = render(<Badge>{""}</Badge>);
      expect(container.textContent).toBe("");
    });
  });
});
