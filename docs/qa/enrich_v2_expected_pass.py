# -*- coding: utf-8 -*-
"""Second pass: make Expected + Negative fully explicit on the same v2 file."""
from pathlib import Path
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font

PATH = Path(r"d:\ADC\prosols\damigos_main\docs\qa\YUMM-Full-QA-Scenarios-v2.xlsx")

# Extra explicit PASS text for key cases (appended/replaced into Expected)
CRM_EXPECTED = {
    "TC_M01": """PASS when ALL are true:
  ✓ 1. /menu opens for logged-in owner within ~3 seconds.
  ✓ 2. Categories list (or empty-state) is visible.
  ✓ 3. Item rows/cards show name and price where items exist.
  ✓ 4. Action controls (Add / Edit / toggles / Upload) are visible as designed.
  ✓ 5. Browser console has no error from the menu page load.
FAIL if: infinite spinner, HTTP 500, broken layout, or unreadable HTML.""",
    "TC_M04": """PASS when ALL are true:
  ✓ 1. Master toggle switches to OFF/inactive (gray) immediately after click.
  ✓ 2. CRM menu catalog (categories + items) is hidden OR shows clear inactive empty message.
  ✓ 3. Guest menu for the SAME restaurant no longer allows browsing/ordering that catalog.
  ✓ 4. After CRM refresh, toggle stays OFF and catalog stays hidden.
FAIL if: items still visible/clickable in CRM or guest after OFF; toggle colour changes but menu DOM still interactive; refresh resets to ON unexpectedly.""",
    "TC_M05": """PASS when ALL are true:
  ✓ 1. Master toggle returns to ON/active (green).
  ✓ 2. Full categories + items reappear without requiring a hard browser refresh.
  ✓ 3. Guest can see and add items again after refresh/reopen.
FAIL if: CRM needs F5 to show items; guest still blocked after ON.""",
    "TC_Action_001": """PASS when ALL are true:
  ✓ 1. The specific item toggle turns OFF/gray (not other rows).
  ✓ 2. Item shows Out of stock / inactive label.
  ✓ 3. After CRM refresh, that item stays inactive.
  ✓ 4. Guest cannot add that item to cart (disabled/hidden).
FAIL if: wrong item changes; UI off but refresh restores active; guest can still order it.""",
    "TC_UPLD_002": """PASS when ALL are true:
  ✓ 1. Unsupported format is rejected BEFORE upload completes.
  ✓ 2. Oversized file is rejected with clear max-size message.
  ✓ 3. No server 500 / blank hang.
  ✓ 4. No silent attach without success/error feedback.
FAIL if: bad file uploads anyway; UI freezes; unhandled exception.""",
    "TC-CAMP-01": """PASS when ALL are true:
  ✓ 1. Heading Grow is visible.
  ✓ 2. Campaigns tab is the selected tab.
  ✓ 3. Left area shows Campaign broadcasts AND Automated campaign programs.
  ✓ 4. Loading Grow… does not stay forever.
FAIL if: Invalid session with empty body when session is valid; unknown tab opens blank Campaigns; stuck loading.""",
    "TC-CAMP-04": """PASS when ALL are true:
  ✓ 1. While saving, the clicked checkbox is disabled (no double toggle).
  ✓ 2. On success, On/Off label and row style update.
  ✓ 3. Enabled fraction badge changes by exactly ±1.
  ✓ 4. After leaving to Offers and returning, state is unchanged.
  ✓ 5. On API failure: checkbox reverts, error toast/message shown, other rows still clickable.
FAIL if: UI flips but server did not save; failed save still changes count; other rows freeze.""",
    "TC-WAL-01": """PASS when ALL are true:
  ✓ 1. Wallet tab selected; title Marketing Wallet / Credits & Billing visible.
  ✓ 2. Card shows Balance, Spendable, reserved minimum, message credits.
  ✓ 3. Spendable never displays below ₹0.
  ✓ 4. Reserved minimum shows API value OR defaults to ₹1,000 if API omits it.
  ✓ 5. Credits are derived from balance ÷ message cost (default ₹2.50), not from spendable alone.
  ✓ 6. Low-balance warning only when below reserved minimum.
FAIL if: healthy wallet shows low warning; credits computed from spendable; header Refresh alone silently changes wallet without documented reload behaviour mismatch left uncommented.""",
    "TC-ORD-03": """PASS when ALL are true:
  ✓ 1. Order column format: # + first 8 of id, uppercase.
  ✓ 2. Guest phone masked with last 4 only — full number never appears.
  ✓ 3. Discount > 0 shows minus currency; discount 0 shows — (not ₹0).
  ✓ 4. Total is currency, not raw paise.
  ✓ 5. Missing phone shows — not undefined.
FAIL if: PII full phone visible; ₹0 discount shown; paise integers shown as rupees.""",
    "TC-MENU-IMG-03": """PASS when ALL are true:
  ✓ 1. Guest menu IMAGE shows dish price (example ₹299).
  ✓ 2. Cart/checkout line for that dish is the SAME number.
  ✓ 3. Bill has no Item care / WhatsApp Direct / YUMM rail labeled rows.
FAIL if: image ₹299 but cart ₹280/₹305; fee archaeology rows visible.""",
    "TC-STK-03": """PASS when ALL are true:
  ✓ 1. First scan allows the designed play/offer once.
  ✓ 2. Second scan of same token does NOT grant a new win.
  ✓ 3. UI clearly says already used / collapsed.
FAIL if: same sticker can be farmed for multiple wins.""",
    "TC-RDM-01": """PASS when ALL are true:
  ✓ 1. Wallet redeem mode burns the guest's REAL loyalty balance (not a fake ₹150).
  ✓ 2. Kitchen wallet/ledger reflects the redeem credit as designed.
  ✓ 3. Guest balance decreases accordingly after success.
FAIL if: fake default credits; wrong guest charged; silent failure.""",
}

GUEST_EXPECTED = {
    "TC-GSCAN-01": """PASS when ALL are true:
  ✓ 1. Valid /s/{token} redirects into Spark or that restaurant flow.
  ✓ 2. Restaurant id matches the sticker's kitchen.
  ✓ 3. No crash / raw stack trace.
FAIL if: opens wrong kitchen; false scan-error for valid token.""",
    "TC-GSCAN-04": """PASS when ALL are true:
  ✓ 1. Second open of same token shows already used / collapsed.
  ✓ 2. No new spin/scratch win is created.
FAIL if: second win issued.""",
    "TC-GGAME-05": """PASS when ALL are true:
  ✓ 1. With 5 unredeemed same-type wins, a new play is blocked.
  ✓ 2. Message tells guest to redeem first.
  ✓ 3. After redeeming one, a new play can proceed.
FAIL if: 6th win allowed; block never lifts after redeem.""",
    "TC-GCHK-02": """PASS when ALL are true:
  ✓ 1. Bill shows dish lines + delivery (or Free) only as customer-facing rows.
  ✓ 2. No Item care / WhatsApp Direct / YUMM rail / platform fee itemization rows.
FAIL if: fee archaeology labels appear on the guest bill.""",
    "TC-GCHK-04": """PASS when ALL are true:
  ✓ 1. First-time Direct guest sees delivery ₹0 / Free at checkout.
  ✓ 2. Placing that order keeps delivery free as quoted.
FAIL if: first order charged delivery incorrectly.""",
    "TC-GR-03": """PASS when ALL are true:
  ✓ 1. Tapping menu board opens fullscreen/guest menu image.
  ✓ 2. Prices on the image are readable.
  ✓ 3. User can close and continue to order.
FAIL if: no image entry point; image fails to open.""",
    "TC-GSPK-02": """PASS when ALL are true:
  ✓ 1. After Kitchen A marketing Spark at T0, Kitchen B does not message inside 6 hours (product rule).
  ✓ 2. After lock window, B can message (subject to ranking).
  ✓ 3. If build still uses 7-day shield, document actual lock length and mark FAIL vs product target 6h.
FAIL if: B messages immediately with no lock; tester cannot tell which rule ran.""",
    "TC-GCHK-03": """PASS when ALL are true:
  ✓ 1. Dish price on guest menu image equals checkout line price exactly.
FAIL if: any mismatch between image and cart for the same dish.""",
}


def patch(ws, mapping: dict):
    for r in range(2, ws.max_row + 1):
        tid = str(ws.cell(r, 1).value or "").strip()
        if tid in mapping:
            ws.cell(r, 7).value = mapping[tid]
            ws.cell(r, 7).alignment = Alignment(wrap_text=True, vertical="top")
            ws.cell(r, 7).font = Font(name="Calibri", size=9)
            # also expand negative if still short
            neg = str(ws.cell(r, 8).value or "")
            if neg.count("✗") < 2 and "FAIL" in mapping[tid]:
                # pull FAIL lines from expected block if present
                pass


def main():
    wb = load_workbook(PATH)
    patch(wb["CRM_TestCases"], CRM_EXPECTED)
    patch(wb["Guest_TestCases"], GUEST_EXPECTED)

    # Generic: for any Expected still only 1 checkmark content line, append guidance
    for sheet in ("CRM_TestCases", "Guest_TestCases", "Product_CRM", "Product_Guest"):
        ws = wb[sheet]
        exp_col = 7
        for r in range(2, ws.max_row + 1):
            val = str(ws.cell(r, exp_col).value or "")
            if val.count("✓") <= 2 and "PASS when ALL" in val:
                extra = (
                    "\n  ✓ Also verify labels/spelling match the product UI (not approximate)."
                    "\n  ✓ Also verify the change survives one refresh where persistence matters."
                )
                if extra.strip() not in val:
                    ws.cell(r, exp_col).value = val + extra
                    ws.cell(r, exp_col).alignment = Alignment(wrap_text=True, vertical="top")

    wb.save(PATH)
    print("Updated Expected clarity in", PATH)


if __name__ == "__main__":
    main()
