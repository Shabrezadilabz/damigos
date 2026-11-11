/** @jsxImportSource react */
import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../../../../src/components/ui/button";

describe("crm/frontend ui/button", () => {
  afterEach(() => cleanup());

  describe("positive", () => {
    it("renders label and handles click", async () => {
      const user = userEvent.setup();
      let clicked = 0;
      render(
        <Button
          type="button"
          onClick={() => {
            clicked += 1;
          }}
        >
          Save
        </Button>,
      );
      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(clicked).toBe(1);
    });
  });

  describe("negative", () => {
    it("does not fire click when disabled", async () => {
      const user = userEvent.setup();
      let clicked = 0;
      render(
        <Button
          type="button"
          disabled
          onClick={() => {
            clicked += 1;
          }}
        >
          Locked Save
        </Button>,
      );
      const btn = screen.getByRole("button", { name: "Locked Save" });
      expect(btn).toBeDisabled();
      await user.click(btn);
      expect(clicked).toBe(0);
    });
  });
});

