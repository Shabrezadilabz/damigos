import { describe, expect, it } from "vitest";

/** Mirrors settings.ts guestHubVisible without loading the full route module */
function guestHubVisible(
  row: { orderingEnabled: boolean; hubListed: boolean; inactive: boolean },
  liveMenuCount: number,
) {
  return row.orderingEnabled && liveMenuCount > 0 && row.hubListed && !row.inactive;
}

describe("guest hub visibility", () => {
  it("is visible when open, live menu, hub listed, active", () => {
    expect(
      guestHubVisible({ orderingEnabled: true, hubListed: true, inactive: false }, 3),
    ).toBe(true);
  });

  it("is hidden when inactive or not hub listed", () => {
    expect(
      guestHubVisible({ orderingEnabled: true, hubListed: false, inactive: false }, 2),
    ).toBe(false);
    expect(
      guestHubVisible({ orderingEnabled: true, hubListed: true, inactive: true }, 2),
    ).toBe(false);
  });

  it("is hidden when guest ordering is off or no live items", () => {
    expect(
      guestHubVisible({ orderingEnabled: false, hubListed: true, inactive: false }, 2),
    ).toBe(false);
    expect(
      guestHubVisible({ orderingEnabled: true, hubListed: true, inactive: false }, 0),
    ).toBe(false);
  });
});