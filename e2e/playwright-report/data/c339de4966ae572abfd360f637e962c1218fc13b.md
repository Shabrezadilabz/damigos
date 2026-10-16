# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guest\spin-daily-limit.spec.ts >> TC-G-021 daily spin limit >> second spin same day blocked when logged in
- Location: guest\spin-daily-limit.spec.ts:7:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { guestOtpToken, guestResolveScan, loadE2eFixtures } from "../fixtures";
  3  | 
  4  | const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";
  5  | 
  6  | test.describe("TC-G-021 daily spin limit", () => {
  7  |   test("second spin same day blocked when logged in", async () => {
  8  |     const fx = await loadE2eFixtures();
  9  |     test.skip(!fx?.alternateScanToken, "Re-run db:seed for 2+ sticker tokens in DEV-BATCH-001");
  10 | 
  11 |     const token = await guestOtpToken(fx!.devGuestPhone, fx!.otpBypass);
  12 |     await fetch(`${guestApi}/v1/me/consents`, {
  13 |       method: "POST",
  14 |       headers: {
  15 |         "Content-Type": "application/json",
  16 |         Authorization: `Bearer ${token}`,
  17 |       },
  18 |       body: JSON.stringify({ transactional: true, marketing: false, game: true }),
  19 |     });
  20 |     const first = await guestResolveScan(fx!.sampleScanToken);
  21 | 
  22 |     const spin1 = await fetch(`${guestApi}/v1/rewards/spin`, {
  23 |       method: "POST",
  24 |       headers: {
  25 |         "Content-Type": "application/json",
  26 |         Authorization: `Bearer ${token}`,
  27 |       },
  28 |       body: JSON.stringify({
  29 |         restaurantId: first.restaurantId,
  30 |         scanId: first.scanEventId,
  31 |         mode: "spin",
  32 |       }),
  33 |     });
> 34 |     expect(spin1.ok).toBeTruthy();
     |                      ^ Error: expect(received).toBeTruthy()
  35 |     const play1 = (await spin1.json()) as { playId: string };
  36 | 
  37 |     const claim = await fetch(`${guestApi}/v1/rewards/claim`, {
  38 |       method: "POST",
  39 |       headers: {
  40 |         "Content-Type": "application/json",
  41 |         Authorization: `Bearer ${token}`,
  42 |       },
  43 |       body: JSON.stringify({ playId: play1.playId }),
  44 |     });
  45 |     expect(claim.ok).toBeTruthy();
  46 | 
  47 |     const second = await guestResolveScan(fx!.alternateScanToken!);
  48 |     const spin2 = await fetch(`${guestApi}/v1/rewards/spin`, {
  49 |       method: "POST",
  50 |       headers: {
  51 |         "Content-Type": "application/json",
  52 |         Authorization: `Bearer ${token}`,
  53 |       },
  54 |       body: JSON.stringify({
  55 |         restaurantId: second.restaurantId,
  56 |         scanId: second.scanEventId,
  57 |         mode: "spin",
  58 |       }),
  59 |     });
  60 |     expect(spin2.status).toBe(429);
  61 |     const err = (await spin2.json()) as { error?: { code: string } };
  62 |     expect(err.error?.code).toBe("SPIN_DAILY_LIMIT");
  63 |   });
  64 | });
  65 | 
```