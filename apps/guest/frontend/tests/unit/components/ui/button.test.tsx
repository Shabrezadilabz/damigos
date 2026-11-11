/** @jsxImportSource react */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../../../../src/components/ui/button";

describe("guest/frontend ui/button", () => {
  describe("positive", () => {
    it("renders and is enabled by default", () => {
      render(<Button type="button">Continue</Button>);
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    });
  });

  describe("negative", () => {
    it("disabled button stays disabled", async () => {
      const user = userEvent.setup();
      let n = 0;
      render(
        <Button type="button" disabled onClick={() => {
          n += 1;
        }}
        >
          Locked
        </Button>,
      );
      const btn = screen.getByRole("button", { name: "Locked" });
      expect(btn).toBeDisabled();
      await user.click(btn);
      expect(n).toBe(0);
    });
  });
});
