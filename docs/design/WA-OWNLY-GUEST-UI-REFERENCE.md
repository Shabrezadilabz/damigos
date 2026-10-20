# WhatsApp Ownly.food Guest UI Reference → D'aMigo's Guest Webview

**Status:** FINAL — locked into Master Plan v2.0  
**Source:** WhatsApp images `2026-10-18 at 1.28.* AM` (Ownly.food / Roti-Wala.com screenshots)  
**Asset copies:** Cursor workspace `assets/…WhatsApp_Image_2026-10-18*`  
**Companion:** [APPLE-DESIGN-SYSTEM.md](./APPLE-DESIGN-SYSTEM.md) · [STITCH-SCREEN-MAP.md](./STITCH-SCREEN-MAP.md)

---

## 0. How we use this pack

| Layer | Source of truth |
|-------|-----------------|
| **Interaction patterns & IA** | These Ownly WhatsApp screens (adopt) |
| **Typography & motion** | Apple SF Pro + 17 WWDC principles |
| **Brand color & game chrome** | D'aMigo crimson `#E23744` / `#B7122A` + gold `#F3BF51` + CRED charcoal game zone — **not** Ownly magenta |
| **Restaurant-scoped shells** | Stitch `g1`–`g15` (spin, menu, cart, track) |
| **Hub marketplace shells** | Ownly Hub patterns mapped onto Stitch `g17` / `g6_hero` |

> Ownly is a **UX pattern reference**. Do not copy Ownly logos, pink brand, or “Ownly 30” trademark. Re-skin every pattern to D'aMigo.

---

## 1. Screen inventory (from WhatsApp pack)

| # | Ownly screen | D'aMigo Guest route | Phase |
|---|--------------|---------------------|-------|
| WA-01 | Hub Home (location + VEG + festival hero + Pick Cravings + 30-min promise) | `/hub` | ✅ |
| WA-02 | Hub Home (Bestsellers under ₹X + What's On Your Mind) | `/hub` | ✅ |
| WA-03 | All Restaurants feed (wide cards + Lowest Price badge) | `/hub` | ✅ |
| WA-04 | Category collection (Healthy Choices / Top Brands / New / Max 30 mins) | `/hub/collections/:slug` | ✅ |
| WA-05 | Search results (Biryani / Shawarma) + sticky cart | `/hub/search?q=` | ✅ |
| WA-06 | Bestsellers under ₹149 dish rail / list | `/hub/collections/bestsellers` | ✅ |
| WA-07 | Restaurant menu — Top Picks 2-col + Best Value banner | `/r/:slug/menu` | P1 |
| WA-08 | Menu FAB overlay (category jump list) | `/r/:slug/menu` | P1 |
| WA-09 | Location permission sheet on map | `/checkout` address step | P1 |
| WA-10 | Select delivery location + Add new address sheet | `/checkout` | P1 |
| WA-11 | Checkout bill — transparent fees + FREE delivery | `/checkout` | P1 |
| WA-12 | Guest profile (Past Orders, Addresses, Settings, Help) | `/me` | P1 |

---

## 2. Canonical patterns to adopt (D'aMigo tokens)

### P-UI-01 Sticky dual-layer cart dock (all Hub + Menu + Search)

```
┌─────────────────────────────────────────┐
│  lime strip: active offer / savings line │  ← surface success green
├─────────────────────────────────────────┤
│ [logo] Restaurant · View menu ▶  [Checkout N Item] [×] │
└─────────────────────────────────────────┘
```

- Frosted white dock + single glass blur (Apple rule)  
- CTA = D'aMigo crimson stadium pill  
- Dismissible `×` does not clear cart — only hides dock until next add

### P-UI-02 Hub header chrome

- Left: **Current location** + chevron + address line  
- Right: **VEG** toggle (green) + profile avatar  
- Row: pill **Search** + optional mini referral/promo tile  
- Festival / platform hero card (full-bleed, not inset collage)

### P-UI-03 Craving / category rails

- Circular food cutouts (“What's On Your Mind?” / “Pick Your Cravings!”)  
- Momentum scroll `d≈0.998`, rubber-band edges  
- Labels under circles in `label-md`

### P-UI-04 Restaurant card (list + horizontal)

| Element | Spec |
|---------|------|
| Image | Large rounded (`16–20px`), food-forward |
| Badge TL | `Lowest Price` (green) **or** `Delivery Promise` (crimson/gold pill) |
| Name | `headline-sm` SF Pro |
| Meta | ★ rating (green) · `(reviews)` · ⚡ ETA mins · `area · km` |
| Cuisine | `body-sm` grey |
| Distance | Right-aligned `tabular-nums` |

### P-UI-05 Restaurant menu (Ownly Top Picks × Stitch g2)

| Element | Spec |
|---------|------|
| Header | Name · ★ rating pill · ETA · area chevron · Search · Share |
| Best Value banner | Green seal + “X% lower than other apps” + owner `reference_price` basis |
| Filters | Filters · Veg · Non-Veg · Egg pills |
| Top Picks | **2-column** grid: image + crimson **Add** overlay + green ₹ pill + “Other Apps: ₹A–₹B” |
| Menu FAB | Dark stadium “Menu” → category jump sheet (Apple sheet springs) |
| Prep badge | Optional `⚡ 10m Ready` / `🔥 15m Fresh` from `prep_category` |

### P-UI-06 Location permission sheet

- Map dimmed behind  
- Bottom sheet handle + pink→**crimson** pin icon  
- Title “Device location is off”  
- CTA “Grant location permission”  
- Secondary: “Search an area or address”

### P-UI-07 Transparent checkout bill

Adapt Ownly honesty tone to **D'aMigo fee truth** (DEC-003):

| Line | Display |
|------|---------|
| Cart Total | ₹… |
| Restaurant Scoped Reward | − ₹… (green) |
| Platform Offer | − ₹… (green) |
| Delivery | ₹XX struck → **FREE** if first-order subsidy; else Shiprocket + ₹5 |
| Convenience | ₹2 (always shown — never hide) |
| GST 5% | ₹… |
| Packaging / mystery fees | Label struck + copy “Not on D'aMigo's” (Ownly tone OK) |
| Trust seal | “CERTIFIED NO NONSENSE” → rebrand **“Direct D2C · No Aggregator Markup”** |
| Banner | “No confusing fees. No hidden charges.” in crimson bar |

### P-UI-08 Profile

- Crimson→magenta **D'aMigo gradient** header (not Ownly pink clone — use brand crimson ramp)  
- Name + phone · Edit  
- Cards: Past Orders · Addresses · App Settings · Help  
- Feedback / rate card optional P2  
- Logout + © D'aMigo's

---

## 3. Mapping vs Stitch `g*`

| Ownly pattern | Stitch keep | Merge rule |
|---------------|-------------|------------|
| Sticky checkout dock | `g2` cart bar | Replace with dual-layer P-UI-01 |
| Best Value + Other Apps ₹ | `g2` Est. elsewhere chip | Use green ₹ pill + grey “Other Apps” line |
| Top Picks 2-col | `g2` list | Support **grid Top Picks** + list for other categories |
| Menu FAB | — | Add (new) |
| Hub rails | `g17` | Ownly IA wins for Hub; keep “Your Direct Perks” poster rail |
| Location sheet | `g6_location` | Ownly permission sheet + map |
| Bill honesty | `g10` dashed invoice | Keep dashed tax invoice structure + Ownly honesty banner/seal |
| Profile | `g5` profile | Ownly card list layout |
| WA chrome | all `g*` | Keep lock + d-amigos.in + verified |

---

## 4. Explicit non-goals from Ownly

- Do **not** adopt Ownly magenta as primary brand  
- Do **not** promise “Max 30 mins or 50% back” unless Product later adds a platform SLA product (separate DEC)  
- Do **not** hide ₹2 convenience fee  
- Do **not** copy Ownly illustrations/mascots  
- Multi-restaurant Cross-By remains D'aMigo-specific (Ownly sticky bar is single-restaurant; Cross-By dock shows primary kitchen + “+1 kitchen” chip in P1.5)

---

## 5. Design tokens delta (from Ownly pack)

| Token | D'aMigo value | Ownly inspiration |
|-------|---------------|-------------------|
| `--cta` | `#E23744` | Their magenta CTA shape/placement |
| `--success` | `#16A34A` | Ratings, FREE, Lowest Price, veg |
| `--promo-strip` | `#DCFCE7` bg / `#166534` text | Sticky offer strip |
| `--card-radius` | `16px`–`20px` | Soft Apple cards |
| `--dock-radius` | `9999px` stadium CTAs | Checkout / Add |
| Fonts | SF Pro stack | Clean sans hierarchy |

---

## 6. Traceability

| Pattern ID | Feature IDs | Tests |
|------------|-------------|-------|
| P-UI-01 | G-03.06, G-07.* | TC-D-005, TC-G-046 |
| P-UI-02…04 | G-07.01..03 | TC-G-090..093 |
| P-UI-05 | G-03.*, G-03.05 | TC-G-040..045, TC-D-002 |
| P-UI-06 | G-04.02 | TC-G-051..053 |
| P-UI-07 | G-04.08..09 | TC-G-056..059 |
| P-UI-08 | G-02.*, G-06.* | TC-G-080, TC-G-034 |

**Decision:** DEC-016 in [DECISION-LOG.md](../tracking/DECISION-LOG.md)
