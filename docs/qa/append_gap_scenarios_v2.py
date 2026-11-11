# -*- coding: utf-8 -*-
"""
Append ALL remaining P0–P3 gap scenarios into YUMM-Full-QA-Scenarios-v2.xlsx
(same file). Skips IDs that already exist.
"""
from __future__ import annotations

from pathlib import Path

from openpyxl import load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

PATH = Path(r"d:\ADC\prosols\damigos_main\docs\qa\YUMM-Full-QA-Scenarios-v2.xlsx")
CRM_URL = "https://damigos-crm-web.vercel.app"
GUEST_URL = "https://damigos-guest-web.vercel.app"

THIN = Border(
    left=Side(style="thin", color="E0E0E0"),
    right=Side(style="thin", color="E0E0E0"),
    top=Side(style="thin", color="E0E0E0"),
    bottom=Side(style="thin", color="E0E0E0"),
)
WRAP = Alignment(wrap_text=True, vertical="top")


def scenario(module, feature, what):
    return (
        f"MODULE: {module}\n"
        f"FEATURE / CONTROL: {feature}\n"
        f"WHAT THIS CASE TESTS:\n  {what}\n"
        f"IN SIMPLE WORDS:\n"
        f"  Prove this small flow works end-to-end. PASS only if Expected ✓ all true.\n"
        f"HOW TO JUDGE:\n"
        f"  FAIL if any Negative ✗ happens."
    )


def pre(app, bullets):
    lines = [
        f"APP: {app}",
        "DEVICE: Desktop Chrome (also retest Mobile where noted)",
        "DATA: Use QA kitchen/guest only",
        "",
        "PRECONDITIONS (must be true before Step 1):",
    ]
    for i, b in enumerate(bullets, 1):
        lines.append(f"  {i}) {b}")
    lines.append("  • Screenshot the starting screen")
    return "\n".join(lines)


def steps(nav, body_lines):
    out = []
    for i, s in enumerate(list(nav) + list(body_lines), 1):
        out.append(f"{i}. {s}")
    out.append("")
    out.append("AFTER STEPS — EVIDENCE:")
    out.append("A. Screenshot final screen.")
    out.append("B. Write actual values (IDs, prices, times, errors) in QA notes.")
    out.append("C. Mark PASS/FAIL.")
    return "\n".join(out)


def exp(lines):
    out = ["PASS when ALL of the following are true:"]
    for i, b in enumerate(lines, 1):
        out.append(f"  ✓ {i}. {b}")
    out.append("  ✓ No unexpected console exceptions for this action.")
    return "\n".join(out)


def neg(lines):
    out = ["FAIL this case if ANY of the following happen:"]
    for i, b in enumerate(lines, 1):
        out.append(f"  ✗ {i}. {b}")
    out.append("  ✗ Required button/label missing so steps cannot be completed.")
    return "\n".join(out)


def tc(tid, module, feature, what, pre_bullets, nav, body, exp_lines, neg_lines, prio, source, related, notes, app=None):
    """
    Supports both:
      nav, body, exp, neg, prio, source, related, notes, app
    and shorthand (nav omitted):
      steps, exp, neg, prio, source, related, notes, app
    detected when `body` is a priority string like P0/P1.
    """
    if isinstance(neg_lines, str) and neg_lines in {"P0", "P1", "P2", "P3"}:
        # forgot separate body list: positions shifted
        real_steps = nav
        real_exp = body
        real_neg = exp_lines
        real_prio = neg_lines
        real_source = prio
        real_related = source
        real_notes = related
        real_app = notes
        nav = [f"Open the {module} area"]
        body = real_steps
        exp_lines = real_exp
        neg_lines = real_neg
        prio = real_prio
        source = real_source
        related = real_related
        notes = real_notes if real_notes and not str(real_notes).startswith("CRM web") and not str(real_notes).startswith("Guest") else ""
        app = real_app
    if app is None:
        raise TypeError(f"{tid}: app is required (check nav/body lists)")
    if not isinstance(exp_lines, (list, tuple)):
        raise TypeError(f"{tid}: exp_lines must be list, got {type(exp_lines)} {exp_lines!r}")
    if not isinstance(neg_lines, (list, tuple)):
        raise TypeError(f"{tid}: neg_lines must be list, got {type(neg_lines)} {neg_lines!r}")
    return [
        tid,
        module,
        feature,
        scenario(module, feature, what),
        pre(app, pre_bullets),
        steps(nav, body),
        exp(exp_lines),
        neg(neg_lines),
        prio,
        source,
        related,
        notes,
    ]


def existing_ids(ws):
    s = set()
    for r in range(2, ws.max_row + 1):
        v = ws.cell(r, 1).value
        if v:
            s.add(str(v).strip())
    return s


def append_rows(ws, rows):
    have = existing_ids(ws)
    added = 0
    start = ws.max_row + 1
    for row in rows:
        if row[0] in have:
            continue
        r = ws.max_row + 1
        for c, val in enumerate(row, 1):
            cell = ws.cell(r, c, val)
            cell.alignment = WRAP
            cell.border = THIN
            cell.font = Font(name="Calibri", size=9)
        pr = row[8]
        if pr == "P0":
            ws.cell(r, 9).fill = PatternFill("solid", fgColor="F4B183")
        elif pr == "P1":
            ws.cell(r, 9).fill = PatternFill("solid", fgColor="FFE699")
        elif pr == "P2":
            ws.cell(r, 9).fill = PatternFill("solid", fgColor="C6EFCE")
        else:
            ws.cell(r, 9).fill = PatternFill("solid", fgColor="DDEBF7")
        ws.cell(r, 10).fill = PatternFill("solid", fgColor="FCE4D6")  # Gap-fill source
        ws.row_dimensions[r].height = 170
        added += 1
        have.add(row[0])
    # refresh filter range
    ws.auto_filter.ref = f"A1:{get_column_letter(12)}{ws.max_row}"
    return added, start


def crm_gap_rows():
    app = f"CRM web ({CRM_URL})"
    R = []
    # ---- P0 Auth / session ----
    R.append(tc(
        "TC-AUTH-01", "Auth", "Login success",
        "Owner can log in with valid credentials/OTP and reach CRM home",
        ["Valid ACTIVE kitchen owner account", "Logged out / incognito"],
        [f"Open {CRM_URL}/start (or login panel)"],
        ["Enter valid phone/email + OTP/password as designed", "Complete login", "Land on CRM home or first-login checklist"],
        ["Session established", "Own kitchen name visible", "Left nav works"],
        ["Login rejected for valid user", "Blank home", "Sees another kitchen"],
        "P0", "Gap-fill", "C3", "Critical gate", app,
    ))
    R.append(tc(
        "TC-AUTH-02", "Auth", "Login failure",
        "Wrong OTP/password is rejected with clear error",
        ["Valid account", "Logged out"],
        [f"Open {CRM_URL}/start"],
        ["Enter wrong OTP/password 1–2 times", "Read error"],
        ["Clear error message", "No session cookie for CRM APIs", "Can retry"],
        ["Silent fail", "Logs in anyway", "Account locked with no message"],
        "P0", "Gap-fill", "C3", "", app,
    ))
    R.append(tc(
        "TC-AUTH-03", "Auth", "Logout",
        "Logout clears session and blocks CRM pages",
        ["Logged in"],
        ["Click logout/sign out"],
        [f"Confirm redirect to login/start", f"Try open {CRM_URL}/menu directly"],
        ["Logged out", "Protected routes show login / Invalid session"],
        ["Still can open /menu with data"],
        "P0", "Gap-fill", "C3", "", app,
    ))
    R.append(tc(
        "TC-AUTH-04", "Auth", "Expired session mid-action",
        "API 401 while editing menu shows session error and does not corrupt data",
        ["Logged in", "Menu item open for edit"],
        ["Clear/expire auth token (DevTools) or wait expiry"],
        ["Try Save on edit modal"],
        ["Invalid session / login prompt", "Item not half-saved with blank fields"],
        ["Silent save", "Wipes item name"],
        "P0", "Gap-fill", "C3", "", app,
    ))
    R.append(tc(
        "TC-AUTH-05", "Auth", "Two tabs same owner",
        "Two CRM tabs same login stay consistent; logout in one invalidates the other on next API",
        ["Logged in tab A and tab B"],
        ["Logout in tab A"],
        ["In tab B click Refresh/Save on Menu"],
        ["Tab B gets session error or re-auth", "No cross-kitchen leak"],
        ["Tab B continues writing as if logged in forever with no warning"],
        "P0", "Gap-fill", "C3", "", app,
    ))
    R.append(tc(
        "TC-AUTH-06", "Auth", "Tenant isolation",
        "Owner A cannot read Owner B restaurant data by URL guessing",
        ["Two kitchens A and B", "Logged in as A"],
        [f"While on A, try APIs/UI for B restaurant id if exposed"],
        ["Confirm 403/empty — never B menu/orders"],
        ["Only A data visible"],
        ["B orders/menu visible to A"],
        "P0", "Gap-fill", "C3", "Security", app,
    ))

    # ---- P0 Dual menu / publish ----
    R.append(tc(
        "TC-MENU-IMG-05", "Menu images", "Republish regenerates guest image",
        "After owner price change + publish, guest menu image updates to new guest prices",
        ["Published menu", "Note old guest image price for one dish"],
        [f"Open {CRM_URL}/menu"],
        ["Change one dish owner price", "Regenerate/publish", "Open guest menu image for same dish"],
        ["New guest image reflects new rule-based guest price", "Cart matches new image"],
        ["Guest image stuck on old price", "Cart mismatch"],
        "P0", "Gap-fill", "M3", "", app,
    ))
    R.append(tc(
        "TC-MENU-IMG-06", "Menu images", "Version history",
        "Previous owner/guest menu versions remain downloadable after republish",
        ["At least 2 publishes"],
        [f"Open {CRM_URL}/menu version/history UI (or downloads list)"],
        ["Download previous owner board", "Open current guest board"],
        ["Old file still opens", "Current is latest"],
        ["Old version overwritten permanently with no archive"],
        "P0", "Gap-fill", "M6", "If UI missing → FAIL + note Missing", app,
    ))
    R.append(tc(
        "TC-MENU-IMG-07", "Menu images", "Sold-out removed on regen",
        "Marking item unavailable removes/greys it on next guest menu image regeneration",
        ["Published dish available"],
        [f"Open {CRM_URL}/menu"],
        ["Set dish unavailable/86", "Trigger guest image regen/publish", "Open guest menu image"],
        ["Dish not shown as orderable on image (hidden/grey)", "Guest cannot add"],
        ["Still large available on guest board"],
        "P0", "Gap-fill", "X3", "", app,
    ))
    R.append(tc(
        "TC-MENU-RULE-03", "Pricing", "99/49 never broken by manual guest override",
        "Owner cannot set arbitrary guest-facing ugly prices outside rule engine",
        ["Menu item owner price set"],
        [f"Open {CRM_URL}/menu"],
        ["Publish and inspect guest price endings for 5 dishes across bands"],
        ["All guest prices end with 49 or 99 per policy"],
        ["Ends with 1–8 other than 9/4 patterns outside policy"],
        "P0", "Gap-fill", "M4", "", app,
    ))

    # ---- P0 Payments / settlement CRM side ----
    R.append(tc(
        "TC-PAY-03", "Payout", "Update bank details",
        "Changing IFSC/account saves and shows confirmation",
        ["Existing payout info"],
        [f"Open {CRM_URL}/settings payout"],
        ["Change account number/IFSC to another valid test value", "Save", "Refresh"],
        ["New values persist", "Success toast"],
        ["Invalid IFSC saved without warning", "Values revert silently"],
        "P0", "Gap-fill", "C4", "", app,
    ))
    R.append(tc(
        "TC-PAY-04", "Payout", "Invalid bank validation",
        "Bad IFSC / short account blocked",
        ["Payout form open"],
        [f"Open {CRM_URL}/settings payout"],
        ["Enter invalid IFSC (e.g. 123)", "Save"],
        ["Inline/error validation", "Old valid bank retained"],
        ["Accepts garbage and overwrites good bank"],
        "P0", "Gap-fill", "C4", "", app,
    ))
    R.append(tc(
        "TC-PAY-05", "Payout", "Settlement visibility",
        "Owner can see daily/EOD settlement entries or empty state",
        ["Kitchen with Direct paid orders OR empty"],
        [f"Open settlements/payout history in Settings or Grow"],
        ["Open settlement list"],
        ["Rows OR clear empty state", "Amounts in currency not paise"],
        ["Crash", "Raw paise", "Other kitchen settlements"],
        "P0", "Gap-fill", "C4", "", app,
    ))
    R.append(tc(
        "TC-PAY-06", "Payout", "Freeze payout",
        "If freeze exists, frozen kitchen cannot receive payout until unfrozen",
        ["Ops freeze capability or flag"],
        [f"Open {CRM_URL}/settings payout or ops freeze control"],
        ["Freeze kitchen payout", "Attempt settlement run / view status"],
        ["Status shows frozen", "No silent pay"],
        ["Pays while frozen"],
        "P0", "Gap-fill", "C4", "Skip only if feature absent — mark N/A with screenshot", app,
    ))

    # ---- P0 Campaigns live vs mock ----
    R.append(tc(
        "TC-CAMP-11", "Campaigns", "Mock vs live labeling",
        "Send now (mock Kapso) is never described as live WhatsApp in UI",
        ["Scheduled campaign card"],
        [f"Open {CRM_URL}/grow?tab=campaigns"],
        ["Read Send now button label and any helper text", "Send once in stub/mock env"],
        ["Label contains mock OR docs say mock", "Success does not claim Meta live delivery unless live mode on"],
        ["UI says Live WhatsApp sent while WALLET/KAPSO is stub"],
        "P0", "Gap-fill", "K-WIZ", "", app,
    ))
    R.append(tc(
        "TC-CAMP-12", "Campaigns", "Insufficient wallet blocks schedule",
        "Audience preview shortfall blocks scheduling and offers Top up link",
        ["Wallet below estimated debit"],
        [f"Open New campaign wizard"],
        ["Choose large audience", "Read Est. debit vs wallet", "Try Next/Schedule"],
        ["Amber shortfall", "Top up wallet link to /grow?tab=wallet", "Cannot schedule unpaid blast"],
        ["Schedules anyway with empty wallet"],
        "P0", "Gap-fill", "K-WIZ", "", app,
    ))
    R.append(tc(
        "TC-CAMP-13", "Campaigns", "Product lock 6h vs build 7d gap",
        "Document actual spam shield duration and compare to product 6h target",
        ["Shield UI visible", "Two eligible guests/kitchens if possible"],
        [f"Open {CRM_URL}/grow?tab=campaigns"],
        ["Read shield copy (1 msg / 7 days vs 6h)", "Record exact text", "File gap if not 6h/1h"],
        ["Actual rule written in QA notes", "FAIL vs product target if still 7d only"],
        ["Tester ignores mismatch"],
        "P0", "Gap-fill", "G15", "Gap test", app,
    ))

    # ---- P0 Stickers more ----
    R.append(tc(
        "TC-STK-05", "Stickers", "Wrong kitchen token rejected",
        "Token for kitchen A opened while session expects B still resolves to A only (no B offers)",
        ["Token kitchen A"],
        ["Open guest scan URL for A"],
        ["Confirm restaurant A only"],
        ["Offers/config from A"],
        ["Shows B menu/offers"],
        "P0", "Gap-fill", "S1-S3", "", app,
    ))
    R.append(tc(
        "TC-STK-06", "Stickers", "Batch quantity exact",
        "Request 10 stickers creates exactly 10 unique codes",
        ["Stickers request UI"],
        [f"Open stickers request at {CRM_URL}/settings"],
        ["Request quantity 10", "Download/list codes", "Count unique tokens"],
        ["Exactly 10 unique tokens", "All bound to this restaurant"],
        ["Duplicates", "Wrong count", "Null tokens"],
        "P0", "Gap-fill", "S1", "", app,
    ))

    # ---- P0 Wallet onboarding ----
    R.append(tc(
        "TC-WAL-ONB-02", "Wallet", "Welcome credit once only",
        "Onboarding ₹1000 cannot be claimed twice",
        ["First login credit available OR already claimed"],
        [f"Open wallet / welcome modal"],
        ["Claim once", "Refresh", "Try claim again"],
        ["Only one +1000 ledger credit", "Second claim blocked/hidden"],
        ["Double credit"],
        "P0", "Gap-fill", "C4.1", "", app,
    ))
    R.append(tc(
        "TC-WAL-06", "Wallet", "Debit on campaign send",
        "Successful campaign dispatch debits wallet and appears under Spends",
        ["Wallet funded", "Sendable campaign"],
        [f"Open {CRM_URL}/grow?tab=wallet and note balance"],
        ["Send/mock dispatch a campaign", "Return to Wallet", "Open History → Spends"],
        ["Balance decreased by expected amount", "Spend row present"],
        ["Balance unchanged after success", "Spend missing"],
        "P0", "Gap-fill", "WAL", "", app,
    ))

    # ---- P0 Redeem / kitchen ----
    R.append(tc(
        "TC-RDM-03", "Redeem", "Wrong guest phone",
        "Redeem with unknown phone shows not found — no debit",
        ["Redeem counter open"],
        [f"Open {CRM_URL}/orders/redeem"],
        ["Enter unused phone", "Attempt redeem"],
        ["Clear not-found error", "No wallet movement"],
        ["Creates fake guest credit"],
        "P0", "Gap-fill", "ORD", "", app,
    ))
    R.append(tc(
        "TC-KIT-03", "Kitchen board", "New order appears without full refresh",
        "Place guest order → kitchen board shows new ticket (poll/realtime)",
        ["Kitchen board open", "Guest can checkout"],
        [f"Keep {CRM_URL}/orders/kitchen open"],
        ["Place a new guest Direct order", "Watch board ≤30–60s"],
        ["New ticket appears or live indicator updates", "Sound if unmuted"],
        ["Needs manual F5 always"],
        "P0", "Gap-fill", "ORD", "", app,
    ))

    # ---- P1 ----
    R.append(tc(
        "TC-KIT-04", "Kitchen board", "Sound mute",
        "Mute stops chime; unmute restores",
        ["Kitchen board", "Incoming order capability"],
        [f"Open {CRM_URL}/orders/kitchen"],
        ["Mute sound", "Trigger new order", "Unmute", "Trigger another"],
        ["No chime when muted", "Chime when unmuted (if feature exists)"],
        ["Sound loops endlessly", "Mute does nothing"],
        "P1", "Gap-fill", "ORD", "", app,
    ))
    R.append(tc(
        "TC-STOCK-02", "Menu 86", "86 blocks guest add immediately",
        "Marking 86/out of stock blocks guest add without waiting for full republish if live flag used",
        ["Item available"],
        [f"Open {CRM_URL}/orders/stock or menu item toggle"],
        ["Mark 86", "On guest try Add"],
        ["Guest cannot add", "CRM shows inactive"],
        ["Guest still adds"],
        "P1", "Gap-fill", "M-ITEM", "", app,
    ))
    R.append(tc(
        "TC-POST-03", "Poster", "Poster bridges to campaign/offer",
        "Approving poster creates/links offer with validity dates",
        ["Poster generated", "Wallet ok"],
        [f"Open Grow Poster"],
        ["Approve poster", "Set validity 2 days", "Open Offers/Campaigns"],
        ["Linked offer exists", "Expires after validity"],
        ["Poster only image with no offer link"],
        "P1", "Gap-fill", "K3", "", app,
    ))
    R.append(tc(
        "TC-POST-04", "Poster", "Wallet debit for generation",
        "Generate poster debits AI/wallet per pricing rules",
        ["Known balance"],
        [f"Open {CRM_URL}/grow poster tab; note wallet balance"],
        ["Generate poster", "Open wallet ledger/history"],
        ["Debit row for AI/poster", "Balance decreased"],
        ["Free unlimited generate with no ledger"],
        "P1", "Gap-fill", "K3", "", app,
    ))
    R.append(tc(
        "TC-COFUND-01", "Growth CRM", "Co-fund first Direct",
        "First Direct discount split 50% kitchen wallet / 50% YUMM when enabled",
        ["Co-fund enabled", "Guest first Direct", "Wallet funded"],
        [f"Open CRM Grow/settings co-fund control if present ({CRM_URL}/grow)"],
        ["Enable co-fund if UI exists", "Guest places first Direct with discount", "Check kitchen wallet ledger + platform note"],
        ["Split amounts correct", "Guest sees single discount"],
        ["Kitchen charged 100%", "Double discount"],
        "P1", "Gap-fill", "C25", "If missing mark Missing", app,
    ))
    R.append(tc(
        "TC-HOME-02", "Dashboard", "KPI accuracy",
        "Home scans/orders/wallet match APIs for today",
        ["Known activity today"],
        [f"Open {CRM_URL}/"],
        ["Compare KPI numbers to orders list / wallet / sticker scans"],
        ["Within expected tolerance (exact or same-day filter)"],
        ["Random zeros while data exists"],
        "P1", "Gap-fill", "C24", "", app,
    ))
    R.append(tc(
        "TC-NOTIF-03", "CRM Nav", "Mark all read",
        "Mark all as read clears badge to 0",
        ["Unread > 0"],
        [f"Stay on any CRM page with header ({CRM_URL})"],
        ["Open bell", "Click Mark all as read"],
        ["Badge 0", "Items marked read"],
        ["Badge stuck"],
        "P1", "Gap-fill", "NOTIF", "", app,
    ))
    R.append(tc(
        "TC-SET-03", "Settings", "Brand theme save",
        "Brand colors/logo save and reflect on guest header if designed",
        ["Settings brand"],
        [f"Open {CRM_URL}/settings brand"],
        ["Change theme/logo", "Save", "Open guest restaurant"],
        ["CRM shows new brand", "Guest reflects if product says so"],
        ["Save no-op"],
        "P1", "Gap-fill", "C2", "", app,
    ))
    R.append(tc(
        "TC-GROW-OFF-01", "Grow Offers", "Dine-only flag",
        "Offer marked dine-only is not applicable on online Direct checkout",
        ["Create dine-only offer"],
        ["Save dine-only", "As guest try apply online"],
        ["Online apply rejected", "Dine path may allow if exists"],
        ["Online accepts dine-only"],
        "P1", "Gap-fill", "C13", "", app,
    ))
    R.append(tc(
        "TC-GROW-OFF-02", "Grow Offers", "Loyalty credit multiplier dropdown",
        "1 credit = ₹1 / 0.5 / 0.75 saves and applies on redeem math",
        ["Loyalty config UI"],
        ["Set multiplier 0.5", "Save", "Redeem test credits"],
        ["Stored value 0.5", "Redeem ₹ math matches"],
        ["Dropdown missing", "Always ₹1"],
        "P1", "Gap-fill", "C13", "", app,
    ))
    R.append(tc(
        "TC-STK-07", "Stickers", "Analytics funnel",
        "Batch shows printed/scanned/ordered counts if analytics UI exists",
        ["Batch with scans and orders"],
        ["Open sticker analytics"],
        ["Funnel numbers increase correctly"],
        ["Wrong attribution", "UI missing → note Missing"],
        "P1", "Gap-fill", "X5", "", app,
    ))
    R.append(tc(
        "TC-MENU-MOB-01", "Menu", "Mobile viewport CRM menu",
        "Menu page usable at 375px width",
        ["Owner login"],
        ["Resize 375px", f"Open {CRM_URL}/menu"],
        ["Can toggle/search/add without horizontal trap"],
        ["Buttons unreachable"],
        "P1", "Gap-fill", "M-CRUD", "", app,
    ))

    # ---- P2 ----
    R.append(tc(
        "TC-CAMP-14", "Campaigns", "Busy-hour autopilot window",
        "Auto campaign only fires inside configured Fri–Sun/dinner window when enabled",
        ["Autopilot config if present", "Wallet ok"],
        ["Set window", "Observe outside vs inside window"],
        ["No send outside window", "Send inside window"],
        ["Sends at 3am", "Feature missing → N/A"],
        "P2", "Gap-fill", "C22", "", app,
    ))
    R.append(tc(
        "TC-CAMP-15", "Campaigns", "Reheat audience one-tap",
        "Reheat suggestion lists guests who ordered a dish N days ago",
        ["Past item orders"],
        ["Open reheat/suggestion UI if present", "Queue send respecting locks"],
        ["Audience matches dish buyers", "Spam locks respected"],
        ["Blasts everyone"],
        "P2", "Gap-fill", "C23", "", app,
    ))
    R.append(tc(
        "TC-REP-01", "Reports", "Commission saved report",
        "Weekly/manual commission saved PDF or screen matches Direct GMV math",
        ["Direct orders exist"],
        ["Open commission report", "Export if available"],
        ["Savings roughly aggregator% × Direct GMV"],
        ["Nonsense zeros", "Wrong kitchen"],
        "P2", "Gap-fill", "C20", "", app,
    ))
    R.append(tc(
        "TC-PERF-01", "Menu", "Large catalog performance",
        "Menu with 200+ items remains interactive (<3s interactions)",
        ["Large menu QA kitchen"],
        [f"Open {CRM_URL}/menu", "Search and toggle one item"],
        ["Search <3s", "Toggle responds", "No browser freeze"],
        ["Tab lock >10s"],
        "P2", "Gap-fill", "M-SRCH", "", app,
    ))
    R.append(tc(
        "TC-I18N-01", "CRM Nav", "Currency formatting en-IN",
        "All money uses ₹ and en-IN grouping consistently",
        ["Pages with money"],
        ["Spot-check Menu, Orders, Wallet, Campaigns"],
        ["No raw paise", "Consistent ₹"],
        ["Paise shown as rupees by mistake"],
        "P2", "Gap-fill", "—", "", app,
    ))
    R.append(tc(
        "TC-A11Y-01", "CRM Nav", "Keyboard basic",
        "Can tab to primary buttons and activate with Enter on Login/Menu Add",
        ["Logged out then logged in"],
        ["Tab through login", "Tab to Add Item"],
        ["Focus visible", "Enter activates"],
        ["Focus lost invisible"],
        "P2", "Gap-fill", "—", "", app,
    ))
    R.append(tc(
        "TC-ERR-01", "CRM Nav", "Offline banner",
        "Going offline shows friendly state; coming online recovers",
        ["Any CRM page"],
        ["DevTools offline", "Click around", "Back online refresh"],
        ["Friendly offline/error", "Recovers"],
        ["White crash only"],
        "P2", "Gap-fill", "—", "", app,
    ))

    # ---- P3 ----
    R.append(tc(
        "TC-A11Y-02", "CRM Nav", "Contrast smoke",
        "Primary text contrast readable on cream/dark headers",
        ["Grow + Menu pages"],
        ["Visual check headings and buttons"],
        ["Text readable"],
        ["Light gray on cream unreadable"],
        "P3", "Gap-fill", "—", "", app,
    ))
    R.append(tc(
        "TC-HELP-01", "CRM Nav", "Empty state CTAs",
        "Every major empty state has a next action button",
        ["Empty menu, empty campaigns, empty orders kitchen"],
        ["Visit each empty page"],
        ["CTA present (Add item / New campaign / etc.)"],
        ["Dead empty white"],
        "P3", "Gap-fill", "—", "", app,
    ))
    R.append(tc(
        "TC-HELP-02", "Settings", "Tooltip wallet explain",
        "Wallet hover/tooltip explains AI/campaigns/menu scan uses",
        ["Navbar or wallet label"],
        ["Hover wallet"],
        ["Explanation visible"],
        ["No help text"],
        "P3", "Gap-fill", "C17", "", app,
    ))
    return R


def guest_gap_rows():
    app = f"Guest / YUMM web ({GUEST_URL})"
    R = []
    # P0 auth/session guest
    R.append(tc(
        "TC-GAUTH-01", "Guest Auth", "Guest session start",
        "Guest can start session (OTP/WA) and stay signed in on refresh",
        ["Test phone"],
        [f"Open {GUEST_URL}/hub", "Complete guest auth as designed"],
        ["Signed-in state on /me", "Refresh keeps session"],
        ["Loses session every refresh unexpectedly"],
        "P0", "Gap-fill", "G10", "", app,
    ))
    R.append(tc(
        "TC-GAUTH-02", "Guest Auth", "Expired guest session",
        "Expired session on checkout sends user to re-auth without losing clarity",
        ["Cart filled", "Expire token"],
        ["Open checkout", "Pay"],
        ["Clear re-login/session message"],
        ["Charges without session", "White error"],
        "P0", "Gap-fill", "G25", "", app,
    ))
    R.append(tc(
        "TC-GPAY-01", "Checkout", "Razorpay success",
        "Successful payment creates order and redirects to order confirmation/detail",
        ["Cart + address", "Razorpay test success"],
        [f"Checkout {GUEST_URL}/r/{{id}}/checkout", "Pay success"],
        ["Order id created", "Status PAID/accepted path", "Cart cleared"],
        ["Paid but no order", "Double charge UI"],
        "P0", "Gap-fill", "G22", "", app,
    ))
    R.append(tc(
        "TC-GPAY-02", "Checkout", "Razorpay dismiss/fail",
        "Closing Razorpay or failing pay does not create paid order; cart retained",
        ["Cart ready"],
        ["Open Razorpay", "Dismiss/fail", "Return"],
        ["No PAID order", "Cart still has items", "Can retry"],
        ["Order marked PAID without payment", "Cart wiped"],
        "P0", "Gap-fill", "G22", "", app,
    ))
    R.append(tc(
        "TC-GPAY-03", "Checkout", "Retry after fail",
        "After payment-failed page user can retry checkout",
        ["Forced fail"],
        [f"Land {GUEST_URL}/payment-failed", "Retry"],
        ["Returns to checkout/pay", "Eventually can succeed"],
        ["Dead end"],
        "P0", "Gap-fill", "G22", "", app,
    ))
    R.append(tc(
        "TC-GPAY-04", "Checkout", "Folded fee math backend",
        "Guest total equals dish guest prices + delivery quote; no surprise jump at Razorpay",
        ["Known cart"],
        ["Note checkout total", "Open Razorpay amount"],
        ["Razorpay amount matches checkout total"],
        ["Razorpay higher by hidden fees not shown"],
        "P0", "Gap-fill", "G25", "", app,
    ))

    # P0 5-in-1 / stickers matrix
    R.append(tc(
        "TC-GSCAN-06", "Scan", "5-in-1 across 3 kitchens",
        "Wins from 3 different kitchens still count toward global 5 unredeemed cap",
        ["Ability to scan 3 kitchens"],
        ["Collect wins until 5", "Try 6th from new kitchen"],
        ["6th blocked"],
        ["Cap is per-kitchen only"],
        "P0", "Gap-fill", "G1b", "", app,
    ))
    R.append(tc(
        "TC-GSCAN-07", "Scan", "Burn + 5-in-1 together",
        "Burned sticker cannot be used to bypass 5-in-1 by rescanning",
        ["5 unredeemed", "Old burned token"],
        ["Rescan burned token", "Try new token"],
        ["Burned = no win", "New token still blocked by 5-in-1"],
        ["Rescan grants win"],
        "P0", "Gap-fill", "G1b", "", app,
    ))
    R.append(tc(
        "TC-GSPK-05", "Spark recv", "In-app all offers while WA only one",
        "After shortest-validity WA send, Offers page still lists all eligible offers",
        ["Multiple eligible offers"],
        ["Receive one WA/Spark", f"Open {GUEST_URL}/me/offers or hub perks"],
        ["All eligible visible in-app"],
        ["In-app only shows the one WA offer"],
        "P0", "Gap-fill", "G14", "", app,
    ))
    R.append(tc(
        "TC-GSPK-06", "Spark recv", "1h ultra-short priority",
        "Offer expiring in ≤1h is sent before longer ones; lock becomes 1h",
        ["Offer A TTL 1h", "Offer B TTL 7d"],
        ["Trigger scheduler", "Record what was sent and next lock"],
        ["A sent first", "Subsequent lock ~1h (product)", "Note if build differs"],
        ["B sent while A expires unused"],
        "P0", "Gap-fill", "G16", "", app,
    ))
    R.append(tc(
        "TC-GMENU-01", "Restaurant", "Inactive kitchen master OFF",
        "When CRM master menu OFF, guest restaurant shows unavailable and checkout blocked",
        ["CRM toggled OFF"],
        [f"Open {GUEST_URL}/r/{{id}}/menu"],
        ["Confirm unavailable", "Try checkout"],
        ["Cannot place order"],
        ["Still can pay"],
        "P0", "Gap-fill", "M-TOGGLE", "", app,
    ))
    R.append(tc(
        "TC-GMENU-02", "Restaurant", "Guest image after CRM republish",
        "After CRM republish, hard refresh guest shows new menu image prices",
        ["CRM republished"],
        ["Hard refresh guest menu image"],
        ["New prices visible", "Cart matches"],
        ["Cached old image forever"],
        "P0", "Gap-fill", "M3", "", app,
    ))
    R.append(tc(
        "TC-GHUB-12", "Hub", "Empty hub state",
        "No kitchens shows friendly empty — not crash",
        ["QA env with zero hubListed OR filtered to none"],
        [f"Open {GUEST_URL}/hub"],
        ["Empty illustration/message"],
        ["JS crash"],
        "P0", "Gap-fill", "G9", "", app,
    ))
    R.append(tc(
        "TC-GLOC-04", "Location", "GPS accuracy used for sort",
        "With GPS, first kitchens are nearer than last (approx)",
        ["GPS on", "Multiple kitchens with coords"],
        [f"Open {GUEST_URL}/hub", "Note first 3 vs last 3 distances if shown"],
        ["Nearby bias present OR explicit distance/ETA"],
        ["Random order ignoring coords when product promises geo"],
        "P0", "Gap-fill", "G11", "", app,
    ))

    # P1
    R.append(tc(
        "TC-GREF-03", "Refer", "Self-refer blocked",
        "Guest cannot use own referral code",
        ["Own code"],
        ["Enter own code"],
        ["Rejected"],
        ["Credits both sides to self"],
        "P1", "Gap-fill", "G6", "", app,
    ))
    R.append(tc(
        "TC-GREF-04", "Refer", "Already registered B",
        "Referral qualifies only for new guest per policy",
        ["B already registered"],
        ["Apply A code as B"],
        ["Blocked or no reward per rules"],
        ["Pays referral for existing users if policy forbids"],
        "P1", "Gap-fill", "G6", "", app,
    ))
    R.append(tc(
        "TC-GREF-05", "Refer", "Same device multi-account abuse smoke",
        "Rapid multiple accounts on same browser do not infinitely farm referral",
        ["Abuse attempt"],
        ["Create 3 accounts quickly with same referrer if possible"],
        ["Rate limit / block / only first qualifies"],
        ["Unlimited farm"],
        "P1", "Gap-fill", "G6", "", app,
    ))
    R.append(tc(
        "TC-GREORDER-01", "Orders", "Reorder sold-out handling",
        "Reorder skips/flags unavailable items",
        ["Past order with an item now 86"],
        ["Tap Order again"],
        ["Unavailable flagged", "Other items added"],
        ["Adds 86 item silently"],
        "P1", "Gap-fill", "G18", "", app,
    ))
    R.append(tc(
        "TC-GWEBVIEW-01", "Spark", "WhatsApp in-app WebView CTA",
        "Link from WA opens guest app usable inside in-app browser",
        ["Kapso/WA test message"],
        ["Tap CTA in WhatsApp"],
        ["Page loads", "Can navigate menu"],
        ["Broken cookies blank in WebView"],
        "P1", "Gap-fill", "G10", "", app,
    ))
    R.append(tc(
        "TC-GMOB-01", "Hub", "Mobile hub 375px",
        "Hub usable on phone width",
        ["Mobile emulator"],
        [f"Open {GUEST_URL}/hub at 375px"],
        ["Cards tapable", "Filters reachable"],
        ["Overlapping CTAs"],
        "P1", "Gap-fill", "G13", "", app,
    ))
    R.append(tc(
        "TC-GMOB-02", "Checkout", "Mobile checkout",
        "Checkout pay button reachable above fold/safe area",
        ["Cart"],
        ["Checkout at 375px"],
        ["Pay visible", "Address fields usable"],
        ["Pay hidden behind keyboard forever"],
        "P1", "Gap-fill", "G25", "", app,
    ))
    R.append(tc(
        "TC-GX6-01", "Hub", "Finish your win CTA",
        "Unredeemed win shows CTA to that kitchen",
        ["Unredeemed claim"],
        [f"Open {GUEST_URL}/hub"],
        ["See CTA", "Tap opens kitchen/claim"],
        ["No CTA"],
        "P1", "Gap-fill", "X6", "", app,
    ))
    R.append(tc(
        "TC-GX7-01", "Rewards", "Spin gated on Spark opt-in",
        "Without marketing opt-in, browse works but spin blocked if product rule X7 on",
        ["Scan land", "Opt-in skipped"],
        ["Browse menu", "Try spin"],
        ["Browse ok", "Spin asks opt-in"],
        ["Spin without consent when rule requires it"],
        "P1", "Gap-fill", "X7", "", app,
    ))
    R.append(tc(
        "TC-GX8-01", "Restaurant", "Menu match badge",
        "Badge under guest menu image explains prices match photo",
        ["Guest image live"],
        ["Open menu image area"],
        ["Badge visible", "Tap explains policy"],
        ["No trust badge when markup used"],
        "P1", "Gap-fill", "X8", "", app,
    ))
    R.append(tc(
        "TC-GSTK-02", "Streak", "Streak increments on Direct only",
        "Aggregator mention doesn't increment; Direct paid does",
        ["Streak UI"],
        ["Complete Direct order", "Check streak"],
        ["+1 after Direct"],
        ["Increments without order"],
        "P1", "Gap-fill", "G5", "", app,
    ))
    R.append(tc(
        "TC-GONDC-02", "ONDC", "No kitchen Grow win on ONDC order",
        "Ordering ONDC source does not consume kitchen sticker win incorrectly",
        ["ONDC path available", "Kitchen win pending"],
        ["Place ONDC order if possible"],
        ["Kitchen claim still intact", "Platform offer rules apply instead"],
        ["Kitchen claim auto-consumed"],
        "P1", "Gap-fill", "G23", "", app,
    ))

    # P2
    R.append(tc(
        "TC-GRAIN-02", "Platform offer", "Rain window only",
        "Rain delivery help only when rule true",
        ["Ability to toggle rain flag/mock"],
        ["Checkout with rain on/off"],
        ["Subsidy only when on"],
        ["Always subsidized"],
        "P2", "Gap-fill", "X2", "", app,
    ))
    R.append(tc(
        "TC-GBF-02", "Platform offer", "Breakfast outside window hidden",
        "Breakfast gift hidden at night",
        ["Outside breakfast hours"],
        [f"Open {GUEST_URL}/hub"],
        ["No breakfast gift"],
        ["Still shown"],
        "P2", "Gap-fill", "G24", "", app,
    ))
    R.append(tc(
        "TC-GGRP-01", "Orders", "Group order create",
        "Host creates group cart link",
        ["Feature enabled"],
        ["Create group order", "Open link as member"],
        ["Member can add dishes", "Host pays once"],
        ["Crash", "Feature missing → N/A"],
        "P2", "Gap-fill", "G21", "", app,
    ))
    R.append(tc(
        "TC-GSTK-03", "Streak", "Streak freeze insurance",
        "Paying freeze protects streak for window",
        ["Active streak", "Freeze offer"],
        ["Buy freeze", "Skip a day", "Check streak"],
        ["Streak preserved"],
        ["Freeze free unlimited", "Missing → N/A"],
        "P2", "Gap-fill", "G5b", "", app,
    ))
    R.append(tc(
        "TC-GQUIET-01", "Me", "Quiet hours",
        "Spark not sent in quiet hours when set",
        ["Opted in", "Quiet hours 23:00–07:00"],
        ["Set quiet hours", "Trigger campaign in quiet window"],
        ["No WA in quiet hours"],
        ["Ignores prefs"],
        "P2", "Gap-fill", "X9", "", app,
    ))
    R.append(tc(
        "TC-GRATE-02", "Post-order", "Low rating no scratch",
        "Rating 1–3 does not grant scratch (or alternate path only)",
        ["Delivered order"],
        ["Rate 2 stars"],
        ["No high-value scratch", "Feedback recorded"],
        ["Same reward as 5★"],
        "P2", "Gap-fill", "G20", "", app,
    ))
    R.append(tc(
        "TC-GEXCL-01", "Restaurant", "Only on YUMM badge",
        "Exclusive dish shows badge and is orderable",
        ["CRM flagged exclusive"],
        ["Find dish on guest menu"],
        ["Badge visible", "Can add"],
        ["No badge"],
        "P2", "Gap-fill", "G19", "", app,
    ))
    R.append(tc(
        "TC-GFAV-01", "Hub", "Favorites weekend personalization",
        "Favorited dish appears in weekend messaging/copy when campaign runs",
        ["Favorite a dish", "Weekend campaign ON"],
        ["Favorite item", "Trigger weekend Spark"],
        ["Copy mentions dish or filtered audience"],
        ["Same generic spam"],
        "P2", "Gap-fill", "X4", "", app,
    ))
    R.append(tc(
        "TC-GPERF-01", "Hub", "Hub with many kitchens",
        "50+ kitchens list remains scrollable without multi-second jank",
        ["Many hubListed kitchens"],
        [f"Open {GUEST_URL}/hub", "Scroll quickly"],
        ["Usable scroll", "Images lazy ok"],
        ["Tab freeze"],
        "P2", "Gap-fill", "G9", "", app,
    ))
    R.append(tc(
        "TC-GERR-01", "Hub", "API 500 friendly",
        "Hub API failure shows retry — not infinite skeleton",
        ["Block hub API"],
        [f"Open {GUEST_URL}/hub"],
        ["Error + retry"],
        ["Infinite skeleton"],
        "P2", "Gap-fill", "G9", "", app,
    ))

    # P3
    R.append(tc(
        "TC-GA11Y-01", "Hub", "Focus order mobile",
        "Filter chips reachable via keyboard/screen reader smoke",
        ["Desktop keyboard"],
        ["Tab through hub filters"],
        ["Focus visible"],
        ["Cannot reach filters"],
        "P3", "Gap-fill", "G13", "", app,
    ))
    R.append(tc(
        "TC-GCOPY-01", "Spark", "Cheesy copy present",
        "Spark invite messages use friendly marketing copy not raw URLs only",
        ["Spark page"],
        ["Read invite text"],
        ["Human-readable CTA copy"],
        ["Only raw token URL"],
        "P3", "Gap-fill", "G10", "", app,
    ))
    R.append(tc(
        "TC-GHELP-01", "Me", "Empty rewards CTA",
        "Empty rewards page suggests scan/order next action",
        ["Guest with zero claims"],
        [f"Open {GUEST_URL}/me/rewards"],
        ["CTA to scan/hub"],
        ["Blank dead end"],
        "P3", "Gap-fill", "G8", "", app,
    ))
    R.append(tc(
        "TC-GHELP-02", "Checkout", "Address empty CTA",
        "No address shows Add address button",
        ["Guest without addresses"],
        ["Open checkout"],
        ["Add address CTA"],
        ["Pay enabled with no address"],
        "P3", "Gap-fill", "GCHK", "", app,
    ))
    return R


def product_gap_rows(kind: str):
    """Lightweight product rows for bible sheets."""
    rows = []
    # Reuse compact product format matching PROD_HEADERS
    def pr(pid, module, title, who, precond, step, ex, ng, prio, status, notes):
        pre_list = [precond] if isinstance(precond, str) else precond
        return [
            pid, module,
            f"BUSINESS GOAL:\n  {title}\nACTOR:\n  {who}\nMODULE:\n  {module}",
            who,
            pre(f"{'CRM' if kind=='CRM' else 'Guest'}", pre_list),
            steps([f"Follow product journey for {pid}"], step if isinstance(step, list) else [step]),
            exp(ex if isinstance(ex, list) else [ex]),
            neg(ng if isinstance(ng, list) else [ng]),
            prio, status, "Gap-fill", notes,
        ]

    if kind == "CRM":
        rows.append(pr("C-AUTH", "Auth", "Secure owner login/logout/session expiry/tenant isolation", "Owner",
                       "ACTIVE kitchen", ["Login", "Logout", "Expire mid-save", "No cross-kitchen"],
                       ["Session safe", "No data leak"], ["Cross-tenant leak"], "P0", "Missing/Partial", "Maps TC-AUTH-*"))
        rows.append(pr("C-PAY-EOD", "Payout", "Bank validation + settlement visibility + freeze", "Owner/Ops",
                       "Payout settings", ["Save bank", "View settlements", "Freeze"],
                       ["Validations work"], ["Pays while frozen"], "P0", "Partial", "Maps TC-PAY-*"))
        rows.append(pr("C-IMG-VER", "Menu images", "Republish + version archive + sold-out regen", "Owner/System",
                       "Published menu", ["Edit price publish", "Download old version", "86 regen"],
                       ["Guest image updates"], ["Stale image"], "P0", "Missing", "Maps TC-MENU-IMG-05..07"))
        rows.append(pr("C-MOCK", "Campaigns", "Mock Kapso clearly labeled; wallet gate schedule", "Owner",
                       "Campaigns", ["Read mock label", "Schedule with low wallet"],
                       ["Cannot unpaid schedule"], ["Claims live WA in stub"], "P0", "Partial", "Maps TC-CAMP-11/12"))
        rows.append(pr("C-P1SET", "Growth CRM", "Poster bridge, co-fund, KPI accuracy, 86 instant, sound mute", "Owner",
                       "Grow/Orders", ["Approve poster→offer", "Co-fund", "KPI check", "86", "Mute"],
                       ["Each works or marked Missing"], ["Silent wrong ledger"], "P1", "Mixed", ""))
        rows.append(pr("C-P2SET", "Growth CRM", "Busy-hour, reheat, commission report, large menu perf, a11y smoke", "Owner",
                       "Optional features", ["Run each if present"],
                       ["Document pass/N/A"], ["Untested assumed pass"], "P2", "New (proposed)", ""))
        rows.append(pr("C-P3SET", "CRM UX", "Empty CTAs, wallet tooltip, contrast", "Owner",
                       "Various empty pages", ["Visual pass"],
                       ["CTAs exist"], ["Dead ends"], "P3", "New (proposed)", ""))
    else:
        rows.append(pr("G-PAY", "Checkout", "Razorpay success/fail/retry + amount match", "Guest",
                       "Cart", ["Pay ok", "Dismiss", "Retry", "Amount match"],
                       ["Orders correct"], ["Paid without order"], "P0", "Partial", "Maps TC-GPAY-*"))
        rows.append(pr("G-CAP", "Anti-abuse", "5-in-1 cross-kitchen + burn matrix", "Guest",
                       "Multiple stickers", ["Hit cap", "Rescan burned"],
                       ["No farm"], ["Bypass"], "P0", "Missing", "Maps TC-GSCAN-06/07"))
        rows.append(pr("G-LOCK", "Spark rules", "6h/1h locks + in-app shows all", "System/Guest",
                       "Multi offers", ["Measure lock", "Check in-app list"],
                       ["Matches product or gap filed"], ["Ignored"], "P0", "Missing", "Maps TC-GSPK-*"))
        rows.append(pr("G-P1SET", "Retention", "Refer abuse, reorder 86, WebView, mobile, ONDC claim isolation", "Guest",
                       "Various", ["Run TC-GREF/GMOB/GONDC"],
                       ["Abuse blocked"], ["Farm open"], "P1", "Mixed", ""))
        rows.append(pr("G-P2SET", "Growth extras", "Rain, breakfast window, group, freeze, quiet hours, favorites", "Guest",
                       "Flags on", ["Each window/rule"],
                       ["Pass/N/A documented"], ["Always-on subsidy"], "P2", "New (proposed)", ""))
        rows.append(pr("G-P3SET", "Guest UX", "Copy quality, empty CTAs, a11y smoke", "Guest",
                       "Empty states", ["Visual"],
                       ["CTAs exist"], ["Dead ends"], "P3", "New (proposed)", ""))
    return rows


def main():
    wb = load_workbook(PATH)
    crm_ws = wb["CRM_TestCases"]
    guest_ws = wb["Guest_TestCases"]
    prod_c = wb["Product_CRM"]
    prod_g = wb["Product_Guest"]

    a1, _ = append_rows(crm_ws, crm_gap_rows())
    a2, _ = append_rows(guest_ws, guest_gap_rows())
    a3, _ = append_rows(prod_c, product_gap_rows("CRM"))
    a4, _ = append_rows(prod_g, product_gap_rows("Guest"))

    # README note
    readme = wb["README"]
    r = readme.max_row + 2
    readme.cell(r, 1, "GAP-FILL APPEND")
    readme.cell(r, 1).font = Font(bold=True, size=12, color="8D4A28")
    for i, line in enumerate([
        f"Added CRM_TestCases +{a1} (Auth, dual-menu, payout, campaigns gap, stickers, wallet once, kitchen, P1–P3).",
        f"Added Guest_TestCases +{a2} (Pay, 5-in-1 matrix, Spark locks, refer abuse, mobile, Part7 P2/P3).",
        f"Added Product_CRM +{a3}, Product_Guest +{a4} summary rows.",
        "Source column = Gap-fill (orange). Filter Source=Gap-fill to review new rows only.",
        "If a feature is not built, mark FAIL/Missing in notes — do not skip P0 silently.",
    ]):
        readme.cell(r + 1 + i, 1, line)

    try:
        wb.save(PATH)
        print(f"Updated {PATH}")
    except PermissionError:
        alt = PATH.with_name("YUMM-Full-QA-Scenarios-v2.xlsx")
        # try alternate clear name only if locked
        alt = PATH.with_name("YUMM-Full-QA-Scenarios-v2-GAPS.xlsx")
        wb.save(alt)
        print(f"Locked; wrote {alt}")
        return

    print(f"CRM+{a1} Guest+{a2} ProductCRM+{a3} ProductGuest+{a4}")
    print(f"CRM total rows={crm_ws.max_row-1} Guest total={guest_ws.max_row-1}")


if __name__ == "__main__":
    main()
