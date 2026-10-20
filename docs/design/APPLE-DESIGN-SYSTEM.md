# D'aMigo's — Apple Design System & WhatsApp Webview Specification

**Status:** Canonical v2.0 FINAL  
**References:**
- `SORRY-STEVE-apple-design-skill_261018_110337.pdf` (Emil Kowalski's 17 WWDC Apple Design Principles)
- `stitch_d_amigo_s_food_hospitality_platform/crimson_guest_experience/DESIGN.md`
- Stitch Guest Screens `g1`–`g18` & CRM Screens `crm_1`–`crm_6`
- **Ownly.food WhatsApp UI pack** → [WA-OWNLY-GUEST-UI-REFERENCE.md](./WA-OWNLY-GUEST-UI-REFERENCE.md) (patterns only; brand stays crimson/gold)

---

## 1. Typography — Apple System Font Stack (Mandatory Replacement)

All Guest Web (`guest-web`) and CRM Web (`crm-web`) surfaces **replace** `Plus Jakarta Sans` and `Inter` with the native Apple San Francisco system font stack and strict optical tracking:

```css
:root {
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  --font-text: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif;
  --font-rounded: "SF Pro Rounded", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: "SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

### Type Scale & Optical Tracking Rules

| Token | Role | Size / Line-Height | Weight | Letter-Spacing | Numeric Feature |
|-------|------|--------------------|--------|----------------|-----------------|
| `headline-xl` | Reward Win / Hero Value (`₹50 OFF`, `Pouch Perk`) | `32px / 38px` (`2rem`) | `800` (Heavy) | `-0.022em` | `tabular-nums` |
| `headline-lg` | Screen Titles (`Biryani Central`, `Your Orders`) | `24px / 30px` (`1.5rem`) | `700` (Bold) | `-0.018em` | `tabular-nums` |
| `headline-md` | Section / Modal Headers (`Bill Summary`, `Switch Kitchen?`) | `20px / 26px` (`1.25rem`) | `700` (Bold) | `-0.012em` | `tabular-nums` |
| `headline-sm` | Card Headers / Restaurant Sub-titles | `17px / 22px` (`1.0625rem`) | `600` (Semibold) | `-0.008em` | — |
| `title-md` | Dish Titles (`Hyderabadi Dum Chicken Biryani`) | `15px / 20px` (`0.9375rem`) | `600` (Semibold) | `-0.004em` | — |
| `price-lg` | Sticky Checkout Total / Grand Total (`₹486`) | `20px / 24px` (`1.25rem`) | `700` (Bold) | `-0.02em` | `font-variant-numeric: tabular-nums` |
| `price-md` | Menu Dish Price / Line-item Price (`₹299`) | `15px / 18px` (`0.9375rem`) | `700` (Bold) | `-0.01em` | `font-variant-numeric: tabular-nums` |
| `body-lg` | Primary Input / Search / OTP (`16px` prevents iOS auto-zoom) | `16px / 24px` (`1rem`) | `400` (Regular) | `0em` | — |
| `body-md` | Dish Descriptions / Address Copy | `14px / 20px` (`0.875rem`) | `400` (Regular) | `-0.003em` | — |
| `body-sm` | Secondary Metadata / Distance / Prep Hints | `12px / 16px` (`0.75rem`) | `400` (Regular) | `0em` | — |
| `label-lg` | Primary CTA Buttons (`Redeem & Place Order`) | `14px / 18px` (`0.875rem`) | `600` (Semibold) | `0.005em` | — |
| `label-md` | Filter Pills / Status Badges (`Bestsellers`, `Preparing`) | `12px / 16px` (`0.75rem`) | `600` (Semibold) | `0.015em` | — |
| `label-sm` | Micro Badges (`0% COMMISSION`, `120 PTS`, `STEP 2 OF 4`) | `10px / 12px` (`0.625rem`) | `700` (Bold) | `0.04em` | `tabular-nums` |

---

## 2. The 17 Apple Design Principles (Emil Kowalski WWDC Specification)

Every interactive component in `guest-web` and `crm-web` must satisfy these 17 engineering rules:

1. **Respond on Press (`pointerdown`), Never Wait for Release:**
   - All buttons, dish `ADD` steppers, category pills, and Spin CTAs apply `transform: scale(0.97)` within `100ms` on `pointerdown` / `touchstart`.
2. **Direct Manipulation (1:1 Pointer Capture):**
   - Dish customizer bottom sheets (`g8`), scratch cards, and kitchen drawers track the user's finger 1:1 during drag before snapping on release.
3. **Interruptible Animations:**
   - Sheet transitions, segmented tab indicators (`[1st Order | 2nd Order]`, `[Active | Past]`), and cart drawers can be reversed mid-flight without snapping to start/end keyframes.
4. **Springs, Not Fixed Easing Curves:**
   - Standard UI transitions use critically damped spring (`damping: 1.0, response: 0.35s`).
   - Bottom sheets, drawers, and fortune-wheel deceleration use under-damped spring (`damping: 0.8, response: 0.30s`).
   - Wheel & badge rotations use (`damping: 0.8, response: 0.40s`).
5. **Velocity Handoff:**
   - Flicking a bottom sheet (`g8` dish sheet or `g1` win sheet) downward transfers the user's swipe velocity (`px/ms`) directly into the spring dismissal solver.
6. **Momentum & Deceleration (`d ≈ 0.998`):**
   - Horizontal category carousels (`g2`), "Your Direct Perks" poster cards (`g17`), and Cross-By 1 km kitchen strips (`g9`) project resting position using Apple scroll deceleration (`d = 0.998`).
7. **Rubber-Banding at Boundaries (`c = 0.55`):**
   - Pulling past the top of a bottom sheet or horizontal perk carousel applies Apple rubber-band resistance: `offset = delta * 0.55`.
8. **Smooth Frames (GPU Compositor Only):**
   - Animate **only** `transform` and `opacity`. Never animate `height`, `width`, `top`, `left`, or `margin`.
9. **Materials & Depth (Single Glass Layer Rule):**
   - Sticky headers (`WhatsApp Webview Chrome`) and floating bottom cart bars use `background: rgba(252, 249, 248, 0.82); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%)`.
   - **Never stack glass-on-glass** (no `backdrop-filter` child inside a `backdrop-filter` parent).
10. **Concentric Border Radii:**
    - Outer card radius equals inner element radius plus padding: `R_outer = R_inner + padding` (e.g., `24px` sheet containing `16px` inner card with `8px`–`12px` padding).
11. **Multimodal Feedback (Motion + Sound + Haptics on Same Frame):**
    - Fire `navigator.vibrate(15)` (on supported mobile devices) + visual spring + audio cue on the **exact same frame** for:
      - Fortune wheel stop & Sparkle Win reveal (`g1`)
      - Dish `+ ADD` / quantity increment (`g2`)
      - UPI Payment Confirmed check-mark (`g12`)
      - CRM Kitchen new `PAID` order alert chime (`crm_5`)
12. **Tabular Numerals Everywhere Currency or Time Changes:**
    - All `₹` amounts, cart subtotals, Cross-By distance meters, and Kitchen `10:00` / `15:00` countdown timers must enforce `font-variant-numeric: tabular-nums` so digits never jitter horizontally.
13. **No Layout Shifts (Zero CLS):**
    - Reserve exact aspect-ratio boxes (`aspect-square` for `96×96px` dish thumbnails, `h-24` for top chrome, `h-[84px]` for sticky checkout dock) before data or images load.
14. **44×44px Minimum Hit Targets:**
    - Every icon button (`refresh`, `close`, `+`, `-`, `+5m` kitchen extension) has at least `44×44px` touch area even when the visual pill is smaller.
15. **Contextual Continuity (Shared Element Feel):**
    - Tapping a dish card expands smoothly into the `g8` Dish Customizer Sheet; tapping `"Redeem & Place Order"` on the `g1` Win Sheet transitions directly to `/r/:slug/menu` with the Sticky Claimed Reward Pill anchored at the top.
16. **Reduced Motion Respect (`prefers-reduced-motion: reduce`):**
    - When enabled, fortune wheel spin and sheet slide animations fall back to `200ms` opacity cross-fades while preserving instant reward/cart state updates.
17. **60-Second "Feel" Verification Gate:**
    - No screen passes Phase DoD unless tested on a `390×844` mobile viewport (Guest) or `1024×768` tablet viewport (Kitchen) for press response, sheet rubber-banding, zero text truncation, and tabular-num stability.

---

## 3. WhatsApp In-App Webview Chrome & Color Architecture

### 3.1 Mandatory Top Chrome (`g1`–`g18`)
When opened from **Spark by D'aMigo** or **D'aMigo Food** WhatsApp links, Guest Web renders a native-feeling two-tier sticky header (`pt-safe`):
1. **Tier 1 — WhatsApp Verified Bar (`36px`–`44px`):**
   - Left: `lock` icon (`#775600` gold/emerald) + `d-amigos.in` + `•` + `verified` badge + `WhatsApp Verified`.
   - Right: `44×44px` `refresh` button + `44×44px` `close` (`×`) button.
2. **Tier 2 — Contextual Store / Hub Bar (`48px`–`56px`):**
   - Restaurant Logo + Restaurant Name (`Biryani Box Koramangala`) + Subtitle (`Packaging Delivery • Direct D2C` — **never** `"Table 04"` or `"Dine-in"`).
   - Right: Scoped or Hub Loyalty Pill (`★ 120 Pts` in `#ffdea3` / `#775600`) + Guest Profile Avatar.

### 3.2 Color Tokens (Warm Alabaster + Electric Crimson + CRED Charcoal Gold)

| Token | Hex | Usage |
|-------|-----|-------|
| `surface` / `background` | `#FCF9F8` | Warm alabaster base canvas |
| `surface-container-lowest` | `#FFFFFF` | Elevated dish cards, tax invoice bill card, active order card |
| `surface-container-low` | `#F6F3F2` | Recessed input fields, bill container well, segmented control track |
| `surface-container-high` | `#EAE7E7` | Dividers (`1px` subtle) & inactive pills |
| `inverse-surface` | `#161616` / `#313030` | CRED-style Dark Charcoal Gamified Hero Zone (`g1`) & VIP Perks Banner (`g2`) |
| `primary` | `#B7122A` / `#E23744` | Zomato/Swiggy appetizing crimson for primary CTAs, `ADD` buttons, live badges |
| `tertiary` / `gold` | `#D4A338` / `#F3BF51` | Burnished Gold for Fortune Wheel, Scratch Card, Sparkle Win Sheet, Coins/Perks |
| `veg-green` | `#16A34A` | FSSAI Veg dot & savings callouts (`You saved ₹85 on this order!`) |
| `nonveg-red` | `#DC2626` | FSSAI Non-Veg triangle/dot |
