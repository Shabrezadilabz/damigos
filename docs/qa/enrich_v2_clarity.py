# -*- coding: utf-8 -*-
"""
Rewrite Scenario + Steps (+ Preconditions / Expected / Negative) in
YUMM-Full-QA-Scenarios-v2.xlsx so QA can follow without guessing.
Overwrites the SAME v2 file (no new filename).
"""
from __future__ import annotations

import re
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font

PATH = Path(r"d:\ADC\prosols\damigos_main\docs\qa\YUMM-Full-QA-Scenarios-v2.xlsx")

CRM_URL = "https://damigos-crm-web.vercel.app"
GUEST_URL = "https://damigos-guest-web.vercel.app"  # adjust if different host


def split_bits(text: str) -> list[str]:
    if not text:
        return []
    t = str(text).replace("\xa0", " ").strip()
    # split on newlines or " | " or numbered lists
    parts = re.split(r"\n+| \| |\s*\d+[\.\)]\s+", t)
    out = []
    for p in parts:
        p = p.strip(" .-;\t")
        if not p:
            continue
        # further split long sentences on ". " when looks like multiple actions
        if len(p) > 120 and ". " in p:
            for s in p.split(". "):
                s = s.strip()
                if s:
                    out.append(s if s.endswith(".") else s)
        else:
            out.append(p)
    return out


def number_steps(bits: list[str], prefix_actions: list[str] | None = None) -> str:
    steps = []
    if prefix_actions:
        steps.extend(prefix_actions)
    for b in bits:
        # if already starts with verb-ish, keep; else add "Do:"
        steps.append(b)
    lines = []
    for i, s in enumerate(steps, 1):
        s = s[0].upper() + s[1:] if s else s
        lines.append(f"{i}. {s}")
    return "\n".join(lines)


def expand_pre(pre: str, app: str) -> str:
    bits = split_bits(pre) or ["Ready test account for this case"]
    head = [
        f"APP: {app}",
        "DEVICE: Desktop Chrome (latest) unless case says Mobile",
        "DATA: Use a dedicated QA restaurant / guest; do not use production kitchens with real customers",
    ]
    body = ["PRECONDITIONS (must be true before Step 1):"]
    for i, b in enumerate(bits, 1):
        body.append(f"  {i}) {b}")
    body.append("  • Note current date/time and take a screenshot of starting screen")
    return "\n".join(head + [""] + body)


def expand_scenario(title_or_scenario: str, feature: str, module: str) -> str:
    s = (title_or_scenario or "").strip()
    f = (feature or "").strip()
    m = (module or "").strip()
    return (
        f"MODULE: {m}\n"
        f"FEATURE / CONTROL: {f or '—'}\n"
        f"WHAT THIS CASE TESTS:\n"
        f"  {s}\n"
        f"IN SIMPLE WORDS:\n"
        f"  The tester must prove this control/flow behaves correctly for both the happy path "
        f"and the failure notes in the Negative column.\n"
        f"HOW TO JUDGE:\n"
        f"  PASS only if EVERY line in Expected Result is true.\n"
        f"  FAIL if ANY line in Negative / FAIL if happens."
    )


def expand_expected(exp: str) -> str:
    bits = split_bits(exp) or ["UI matches the product behaviour described"]
    lines = ["PASS when ALL of the following are true:"]
    for i, b in enumerate(bits, 1):
        lines.append(f"  ✓ {i}. {b}")
    lines.append("  ✓ No unexpected red error toast (unless the case is testing an error).")
    lines.append("  ✓ Browser console has no uncaught exceptions related to this action.")
    return "\n".join(lines)


def expand_negative(neg: str) -> str:
    bits = split_bits(neg) or ["Any crash, blank screen, or data corruption"]
    lines = ["FAIL this case if ANY of the following happen:"]
    for i, b in enumerate(bits, 1):
        lines.append(f"  ✗ {i}. {b}")
    lines.append("  ✗ Steps cannot be completed because a required button/label is missing.")
    lines.append("  ✗ Result differs from Expected but is not listed here — still FAIL and comment.")
    return "\n".join(lines)


# Extra step prefixes / suffixes by module keywords for CRM
CRM_HINTS = {
    "Menu": [
        f"Open CRM → go to {CRM_URL}/menu (or left nav Menu).",
        "Wait until the page finishes loading (no 'Loading…' spinner).",
    ],
    "Grow Offers": [
        f"Open CRM → go to {CRM_URL}/grow?tab=offers.",
        "Confirm the Offers (or Offers & game) tab is selected.",
    ],
    "Grow Spin": [
        f"Open CRM → {CRM_URL}/grow?tab=offers (Spin / game section).",
        "Open the spin wheel preview or configuration panel named in the case.",
    ],
    "Campaigns": [
        f"Open CRM → {CRM_URL}/grow?tab=campaigns.",
        "Wait until 'Loading Grow…' disappears.",
    ],
    "Wallet": [
        f"Open CRM → {CRM_URL}/grow?tab=wallet.",
        "Wait until wallet card finishes loading.",
    ],
    "Orders": [
        f"Open CRM → {CRM_URL}/orders.",
        "Confirm left nav Orders is highlighted.",
    ],
    "Onboarding": [
        f"Open CRM start flow → {CRM_URL}/start (use incognito if needed).",
    ],
    "Brand": [
        f"Open CRM Settings / brand section ({CRM_URL}/settings).",
    ],
    "Payout": [
        f"Open CRM Settings → Payout / bank section ({CRM_URL}/settings).",
    ],
    "Stickers": [
        f"Open CRM Settings → Stickers (or Grow stickers entry).",
    ],
    "Poster": [
        f"Open CRM → {CRM_URL}/grow (Poster / AI poster tab).",
    ],
    "Kitchen board": [
        f"Open CRM → {CRM_URL}/orders/kitchen.",
    ],
    "Menu 86": [
        f"Open CRM → {CRM_URL}/orders/stock.",
    ],
    "Redeem": [
        f"Open CRM → {CRM_URL}/orders/redeem.",
    ],
    "Settings": [
        f"Open CRM → {CRM_URL}/settings.",
    ],
    "Dashboard": [
        f"Open CRM home → {CRM_URL}/ (logged in).",
    ],
    "CRM Nav": [
        f"Stay on any CRM page with the top header visible ({CRM_URL}).",
    ],
    "Menu images": [
        f"Open CRM Menu → {CRM_URL}/menu with items already imported.",
    ],
    "Pricing": [
        f"Use CRM Menu publish flow + Guest restaurant menu to compare prices.",
    ],
    "Auth": [
        f"Use CRM login at {CRM_URL}/start or login panel.",
    ],
}

GUEST_HINTS = {
    "Hub": [
        f"Open Guest app → {GUEST_URL}/hub.",
        "Allow or deny location only as the case requires; note which you chose.",
    ],
    "Scan": [
        f"Use a real sticker token URL: {GUEST_URL}/s/{{token}} (replace with QA token).",
    ],
    "Spark": [
        f"Land on Spark from a scan, or open {GUEST_URL}/wa/spark with valid query params from scan redirect.",
    ],
    "Location": [
        f"Open Guest hub/app ({GUEST_URL}/hub) with browser location permission controlled in site settings.",
    ],
    "Rewards": [
        f"Have a valid scan/play session; open rewards/spin UI from scan flow or {GUEST_URL}/me/rewards.",
    ],
    "Me Rewards": [
        f"Open {GUEST_URL}/me/rewards while signed in as guest.",
    ],
    "Me Loyalty": [
        f"Open {GUEST_URL}/me/loyalty while signed in as guest.",
    ],
    "Me Wallet split": [
        f"Open {GUEST_URL}/me (profile) and open wallet/rewards/loyalty entries.",
    ],
    "Restaurant": [
        f"Open a hubListed restaurant: {GUEST_URL}/r/{{restaurantId}}/menu.",
    ],
    "Checkout": [
        f"Add items to cart then open {GUEST_URL}/r/{{restaurantId}}/checkout.",
    ],
    "Delivery": [
        f"Place/open an order under {GUEST_URL}/orders/{{orderId}}.",
    ],
    "Me": [
        f"Open {GUEST_URL}/me.",
    ],
    "Orders": [
        f"Open {GUEST_URL}/orders.",
    ],
    "Refer": [
        f"Open {GUEST_URL}/hub/save-and-win (or Me referral entry).",
    ],
    "Streak": [
        f"Open guest profile/streak UI from {GUEST_URL}/me after Direct orders.",
    ],
    "Spark recv": [
        "Use two test kitchens + one guest phone/WA test number; trigger campaign eligibility from CRM.",
        "Watch WhatsApp (Kapso test) AND in-app Offers.",
    ],
    "ONDC": [
        f"Open {GUEST_URL}/ondc.",
    ],
    "Platform offer": [
        f"Open {GUEST_URL}/hub during the time window in the case.",
    ],
    "Post-order": [
        f"Use a DELIVERED order at {GUEST_URL}/orders/{{orderId}}.",
    ],
}


def hints_for(module: str, app: str) -> list[str]:
    table = CRM_HINTS if app == "CRM" else GUEST_HINTS
    if module in table:
        return list(table[module])
    # fuzzy
    for k, v in table.items():
        if k.lower() in (module or "").lower() or (module or "").lower() in k.lower():
            return list(v)
    if app == "CRM":
        return [f"Open CRM ({CRM_URL}) signed in as the restaurant owner for this case."]
    return [f"Open Guest app ({GUEST_URL}) as the test guest for this case."]


def expand_steps(module: str, feature: str, steps: str, app: str) -> str:
    bits = split_bits(steps)
    prefix = hints_for(module, app)
    # Add feature reminder
    if feature:
        prefix = prefix + [f"Focus on the control/feature: «{feature}»."]
    body = number_steps(bits, prefix_actions=prefix)
    tail = (
        "\n\nAFTER STEPS — EVIDENCE:\n"
        "A. Screenshot the final screen.\n"
        "B. Write actual values you saw (prices, badges, counts, error text) in the QA notes.\n"
        "C. Mark PASS/FAIL using Expected vs Negative columns."
    )
    return body + tail


def enrich_test_sheet(ws, app: str):
    """
    Columns:
    1 ID, 2 Module, 3 Feature, 4 Scenario, 5 Preconditions, 6 Steps,
    7 Expected, 8 Negative, 9 Priority, 10 Source, 11 Related, 12 Notes
    """
    for r in range(2, ws.max_row + 1):
        module = ws.cell(r, 2).value or ""
        feature = ws.cell(r, 3).value or ""
        scenario = ws.cell(r, 4).value or ""
        pre = ws.cell(r, 5).value or ""
        steps = ws.cell(r, 6).value or ""
        exp = ws.cell(r, 7).value or ""
        neg = ws.cell(r, 8).value or ""

        # Avoid double-enriching if already enriched
        if str(scenario).startswith("MODULE:"):
            continue

        ws.cell(r, 4).value = expand_scenario(str(scenario), str(feature), str(module))
        ws.cell(r, 5).value = expand_pre(str(pre), "CRM web" if app == "CRM" else "Guest / YUMM web")
        ws.cell(r, 6).value = expand_steps(str(module), str(feature), str(steps), app)
        ws.cell(r, 7).value = expand_expected(str(exp))
        ws.cell(r, 8).value = expand_negative(str(neg))

        for c in (4, 5, 6, 7, 8):
            cell = ws.cell(r, c)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.font = Font(name="Calibri", size=9)
        ws.row_dimensions[r].height = 160


def enrich_product_sheet(ws, app: str):
    """
    1 ID, 2 Module, 3 title, 4 Who, 5 Preconditions, 6 Step-by-step,
    7 Expected, 8 Fail if, 9 Priority, 10 Status, 11 Source, 12 Notes
    """
    for r in range(2, ws.max_row + 1):
        module = ws.cell(r, 2).value or ""
        title = ws.cell(r, 3).value or ""
        who = ws.cell(r, 4).value or ""
        pre = ws.cell(r, 5).value or ""
        steps = ws.cell(r, 6).value or ""
        exp = ws.cell(r, 7).value or ""
        neg = ws.cell(r, 8).value or ""

        if str(title).startswith("BUSINESS GOAL:"):
            continue

        ws.cell(r, 3).value = (
            f"BUSINESS GOAL:\n  {title}\n"
            f"ACTOR:\n  {who}\n"
            f"MODULE:\n  {module}\n"
            f"WHY IT MATTERS:\n"
            f"  This is a product requirement. QA should map it to the matching Test Case rows "
            f"and confirm the user-visible behaviour is understandable and correct."
        )
        ws.cell(r, 5).value = expand_pre(str(pre), "CRM" if app == "CRM" else "Guest")
        # product steps — more narrative
        bits = split_bits(str(steps))
        prefix = hints_for(str(module), app)
        prefix = [
            "This is a PRODUCT scenario (not only a UI click test).",
            "Walk the full journey below as the actor named in Who.",
        ] + prefix
        ws.cell(r, 6).value = number_steps(bits, prefix_actions=prefix) + (
            "\n\nPRODUCT CHECK:\n"
            "• Explain to a new teammate in one sentence what success looks like.\n"
            "• If any step is impossible in current build, mark status gap in Notes (Partial/Missing)."
        )
        ws.cell(r, 7).value = expand_expected(str(exp))
        ws.cell(r, 8).value = expand_negative(str(neg))
        for c in (3, 5, 6, 7, 8):
            ws.cell(r, c).alignment = Alignment(wrap_text=True, vertical="top")
            ws.cell(r, c).font = Font(name="Calibri", size=9)
        ws.row_dimensions[r].height = 170


# Hand-crafted ultra-clear overrides for the hardest / most confusing cases
OVERRIDES_CRM_STEPS = {
    "TC_M04": """1. Open CRM Menu page and confirm the MASTER menu toggle (whole catalog) is currently ON / active (green).
2. Count how many categories and items are visible; screenshot.
3. Click the MASTER toggle to turn the entire menu OFF.
4. Watch the toggle colour/label change to inactive/gray.
5. Confirm the item list/categories disappear from this CRM menu view (or show inactive empty state).
6. Without refreshing yet, open Guest restaurant menu for the SAME kitchen in another tab.
7. Confirm guest cannot browse/order the catalog (hidden/unavailable message).
8. Refresh CRM Menu — toggle must still be OFF and catalog still hidden.""",
    "TC_M08": """1. With MASTER menu toggle OFF (from TC_M04), hard refresh CRM (Ctrl+F5).
2. Confirm toggle still OFF and catalog still hidden in CRM.
3. Open Guest URL for this restaurant menu.
4. Confirm guest sees inactive/unavailable — cannot add dishes or checkout those items.
5. Turn MASTER toggle ON in CRM.
6. Refresh guest — full menu returns and ordering works again.""",
    "TC-CAMP-04": """1. Open Grow → Campaigns tab.
2. Write down the enabled fraction badge text (e.g. 3 / 8 enabled).
3. Find one program row that shows Off (unchecked).
4. Click its checkbox ON — while saving, confirm the checkbox is disabled/not double-clickable.
5. On success: row shows On, styling changes, enabled count increased by 1.
6. Find a program that is On; click to turn Off; confirm count decreases by 1.
7. Open Offers & game tab, then return to Campaigns.
8. Confirm both programs kept the new On/Off values (persisted).""",
    "TC-WAL-01": """1. Open Grow → Wallet tab; wait until Loading wallet… is gone.
2. From network tab or API response, note: balancePaise, spendable (or compute), reserved minimum, credits.
3. On the card read labels: Kitchen wallet balance, Spendable, keep min {amount} reserved, message credits line.
4. Confirm Spendable is never shown below ₹0.
5. If API omits reserved minimum, UI should show ₹1,000 reserved.
6. Confirm message credits are based on balance ÷ per-message cost (default ₹2.50), NOT based on spendable alone.
7. For a low-balance kitchen, confirm warning: Below {reserved} — top up before wallet spends.
8. For a healthy wallet, that warning must NOT appear.
9. Click header Refresh — confirm this does NOT by itself reload wallet numbers (only full page reload does), matching current product behaviour.""",
    "TC-ORD-03": """1. Open /orders with at least one order that has phone + discount > 0, and one without phone/discount.
2. For a normal row, check Order column = # + first 8 characters of id in UPPERCASE.
3. Guest column must show masked phone ending with last 4 digits — NEVER the full number.
4. Discount column: if discount > 0 show minus + currency amount; if zero show em-dash — (not ₹0).
5. Total column shows currency (rupees), not raw paise.
6. When column shows local date/time — not Invalid Date.
7. Missing phone must show — not the text undefined.""",
    "TC-MENU-IMG-03": """1. In CRM, publish menu so guest_menu_image exists and note one dish guest price ending with 99 or 49 (example Butter Chicken ₹299).
2. Open Guest restaurant → open the GUEST menu image (tap board) and confirm that dish shows ₹299 on the image.
3. Add the same dish to cart / open checkout line item.
4. Confirm the cart/checkout line price is exactly ₹299 (same as image).
5. Confirm the bill does NOT show separate rows like Item care ₹2, WhatsApp Direct ₹2, or YUMM rail ₹11 — fees must be folded silently if present.""",
    "TC-STK-03": """1. Obtain one unused sticker token for kitchen A (from CRM batch).
2. Open /s/{token} first time — complete scan → play/offer path as designed; note win/claim if any.
3. Confirm backend/token status is burned/used (or UI says used).
4. Open the EXACT same /s/{token} again.
5. Confirm message like Already used / collapsed — NO second spin/win granted.
6. Confirm deep link may still open restaurant browse, but not a new reward play.""",
}

OVERRIDES_GUEST_STEPS = {
    "TC-GSCAN-04": """1. Take a sticker token that was already successfully scanned once in TC-GSCAN-01 (burned).
2. Paste the same URL /s/{token} in a new browser session.
3. Observe the landing message.
4. Confirm you cannot start a new spin/scratch win from this token.
5. Confirm you are guided to existing claim redeem OR restaurant menu — not a fresh reward.""",
    "TC-GGAME-05": """1. Prepare a guest who already has 5 unredeemed wins of the same type (document claim IDs).
2. Scan a NEW valid sticker from another kitchen.
3. Attempt to play spin/scratch again.
4. Confirm system BLOCKS the new win and explains guest must redeem existing wins first (5-in-1 rule).
5. Redeem one win via Direct order/counter as designed.
6. Confirm a new play is allowed afterward.""",
    "TC-GCHK-02": """1. Add 2–3 dishes to cart and open checkout.
2. Expand/read the full bill summary.
3. Confirm you see normal lines: each dish name + price, and Delivery (or Free).
4. Confirm you do NOT see labeled fee rows: Item care, WhatsApp Direct, YUMM rail, platform fee itemization.
5. Screenshot the bill for evidence.""",
    "TC-GSPK-02": """1. Using CRM, make guest eligible for marketing from Kitchen A and Kitchen B.
2. Trigger/send (or wait for auto job) so guest receives Spark/WA marketing from Kitchen A at time T0; record timestamp.
3. Within 6 hours, ensure Kitchen B is also eligible/trying to send.
4. Confirm guest does NOT receive Kitchen B marketing Spark inside the 6-hour hard lock.
5. After 6 hours, confirm Kitchen B can send (subject to shortest-validity ranking).
6. NOTE: If build still enforces 7-day shield instead of 6h, FAIL against product target and note actual behaviour.""",
}


def apply_step_overrides(ws, overrides: dict, steps_col: int = 6):
    for r in range(2, ws.max_row + 1):
        tid = str(ws.cell(r, 1).value or "").strip()
        if tid in overrides:
            # keep evidence footer
            ws.cell(r, steps_col).value = (
                overrides[tid]
                + "\n\nAFTER STEPS — EVIDENCE:\n"
                "A. Screenshot the final screen.\n"
                "B. Write actual values you saw in QA notes.\n"
                "C. Mark PASS/FAIL using Expected vs Negative columns."
            )
            ws.cell(r, steps_col).alignment = Alignment(wrap_text=True, vertical="top")


def update_readme(ws):
    ws["A1"] = "YUMM QA Workbook v2 — CLEAR steps (updated in place)"
    ws["A1"].font = Font(bold=True, size=14, color="8D4A28")
    # append clarity note at bottom
    r = ws.max_row + 2
    ws.cell(r, 1, "CLARITY UPDATE")
    ws.cell(r, 1).font = Font(bold=True, size=12, color="8D4A28")
    notes = [
        "Scenario / Steps / Preconditions / Expected / Negative columns were expanded so testers do not guess.",
        "Each Scenario now states MODULE + FEATURE + WHAT WE TEST + HOW TO JUDGE PASS/FAIL.",
        "Each Steps column starts with exact URL/navigation, then numbered actions, then EVIDENCE checklist.",
        "Expected uses ✓ checklist. Negative uses ✗ checklist.",
        "If a step mentions a feature not visible in build, mark FAIL and comment Partial/Missing — do not skip silently.",
        f"CRM base URL used in steps: {CRM_URL}",
        f"Guest base URL used in steps: {GUEST_URL} (change in enrich script if your QA host differs).",
    ]
    for i, n in enumerate(notes):
        ws.cell(r + 1 + i, 1, n)


def main():
    if not PATH.exists():
        raise SystemExit(f"Missing {PATH}")
    wb = load_workbook(PATH)
    enrich_product_sheet(wb["Product_CRM"], "CRM")
    enrich_product_sheet(wb["Product_Guest"], "Guest")
    enrich_test_sheet(wb["CRM_TestCases"], "CRM")
    enrich_test_sheet(wb["Guest_TestCases"], "Guest")
    apply_step_overrides(wb["CRM_TestCases"], OVERRIDES_CRM_STEPS)
    apply_step_overrides(wb["Guest_TestCases"], OVERRIDES_GUEST_STEPS)
    update_readme(wb["README"])

    # widen key columns
    for name in ("Product_CRM", "Product_Guest", "CRM_TestCases", "Guest_TestCases"):
        ws = wb[name]
        ws.column_dimensions["C"].width = 36
        ws.column_dimensions["D"].width = 44
        ws.column_dimensions["E"].width = 36
        ws.column_dimensions["F"].width = 56
        ws.column_dimensions["G"].width = 42
        ws.column_dimensions["H"].width = 36

    try:
        wb.save(PATH)
        print(f"Updated in place: {PATH}")
    except PermissionError:
        alt = PATH.with_name("YUMM-Full-QA-Scenarios-v2-CLEAR.xlsx")
        wb.save(alt)
        print(f"v2 locked; wrote {alt} — close Excel and rename over v2")


if __name__ == "__main__":
    main()
