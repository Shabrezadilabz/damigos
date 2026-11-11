# -*- coding: utf-8 -*-
"""Append niche/optional extras into YUMM-Full-QA-Scenarios-v2.xlsx (same file)."""
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
        f"  Optional / niche coverage — still write PASS/FAIL clearly.\n"
        f"  If product does not support this yet, mark N/A + screenshot proof of absence "
        f"OR FAIL as Missing per Priority.\n"
        f"HOW TO JUDGE:\n"
        f"  PASS only if every Expected ✓ is true (or documented N/A for unsupported)."
    )


def pre(app, bullets):
    lines = [
        f"APP: {app}",
        "DEVICE: As stated in steps (Desktop / Mobile / native)",
        "DATA: QA kitchen/guest only",
        "",
        "PRECONDITIONS:",
    ]
    for i, b in enumerate(bullets, 1):
        lines.append(f"  {i}) {b}")
    lines.append("  • Screenshot start state")
    return "\n".join(lines)


def steps(nav, body):
    out = []
    for i, s in enumerate(list(nav) + list(body), 1):
        out.append(f"{i}. {s}")
    out += [
        "",
        "AFTER STEPS — EVIDENCE:",
        "A. Screenshot / recording.",
        "B. Note actual language, locale, device, build version.",
        "C. Mark PASS / FAIL / N/A (with reason).",
    ]
    return "\n".join(out)


def exp(lines):
    out = ["PASS when ALL are true (or each unsupported item explicitly N/A):"]
    for i, b in enumerate(lines, 1):
        out.append(f"  ✓ {i}. {b}")
    return "\n".join(out)


def neg(lines):
    out = ["FAIL if ANY happen (do not silently skip P2/P3):"]
    for i, b in enumerate(lines, 1):
        out.append(f"  ✗ {i}. {b}")
    return "\n".join(out)


def tc(tid, module, feature, what, pre_b, nav, body, ex, ng, prio, related, notes, app=None):
    # Shorthand: forgot separate body list → positions shift; ng becomes prio string
    if isinstance(ng, str) and ng in {"P0", "P1", "P2", "P3"}:
        real_steps, real_ex, real_ng = nav, body, ex
        real_prio, real_related, real_notes, real_app = ng, prio, related, notes
        nav = [f"Open the {module} area"]
        body, ex, ng = real_steps, real_ex, real_ng
        prio, related, notes, app = real_prio, real_related, real_notes, real_app
        if str(notes).startswith("CRM web") or str(notes).startswith("Guest"):
            app, notes = notes, ""
    if app is None:
        raise TypeError(f"{tid}: app required")
    return [
        tid, module, feature,
        scenario(module, feature, what),
        pre(app, pre_b),
        steps(nav, body),
        exp(ex),
        neg(ng),
        prio,
        "Niche-extra",
        related,
        notes,
    ]


def existing(ws):
    return {str(ws.cell(r, 1).value).strip() for r in range(2, ws.max_row + 1) if ws.cell(r, 1).value}


def append(ws, rows):
    have = existing(ws)
    n = 0
    for row in rows:
        if row[0] in have:
            continue
        r = ws.max_row + 1
        for c, v in enumerate(row, 1):
            cell = ws.cell(r, c, v)
            cell.alignment = WRAP
            cell.border = THIN
            cell.font = Font(name="Calibri", size=9)
        pr = row[8]
        ws.cell(r, 9).fill = PatternFill(
            "solid",
            fgColor={"P0": "F4B183", "P1": "FFE699", "P2": "C6EFCE", "P3": "DDEBF7"}.get(pr, "DDEBF7"),
        )
        ws.cell(r, 10).fill = PatternFill("solid", fgColor="FFF2CC")
        ws.row_dimensions[r].height = 175
        n += 1
        have.add(row[0])
    ws.auto_filter.ref = f"A1:{get_column_letter(12)}{ws.max_row}"
    return n


def crm_rows():
    app = f"CRM web ({CRM_URL})"
    R = []
    # ---- Multi-language / RTL ----
    R.append(tc(
        "TC-I18N-02", "i18n", "Language switcher",
        "If CRM supports language switch, changing language updates all primary labels without layout break",
        ["Language switcher visible OR document absence", "Owner logged in"],
        [f"Open {CRM_URL}/menu"],
        ["Locate language control (header/settings)", "Switch to second language if available", "Visit Menu, Orders, Grow, Settings", "Switch back"],
        ["Labels translate or N/A documented", "No overlapping text", "Numbers/currency still correct"],
        ["Half-translated critical buttons", "Crash on switch"],
        "P2", "i18n", "Optional until product ships locales", app,
    ))
    R.append(tc(
        "TC-I18N-03", "i18n", "RTL layout",
        "RTL language (e.g. Arabic/Urdu if ever enabled) mirrors layout; icons/chevrons flip correctly",
        ["RTL locale available OR N/A"],
        [f"Open {CRM_URL}/"],
        ["Enable RTL locale", "Check nav, tables, modals"],
        ["Content flows RTL", "No clipped CTAs"],
        ["LTR leftover breaking forms"],
        "P3", "i18n", "Niche until RTL markets", app,
    ))
    R.append(tc(
        "TC-I18N-04", "i18n", "Locale dates & currency",
        "en-IN vs other locale formatting for dates/money stays unambiguous",
        ["Owner login"],
        [f"Open {CRM_URL}/orders and /grow?tab=wallet"],
        ["Record date format and ₹ formatting", "Change browser locale if product follows browser"],
        ["Currency always clear as INR/₹", "No paise shown as rupees"],
        ["Ambiguous 01/02/2026 meaning", "Raw paise"],
        "P2", "i18n", "", app,
    ))

    # ---- Security / pen beyond tenant ----
    R.append(tc(
        "TC-SEC-01", "Security", "XSS in menu item name",
        "Script tags in dish name do not execute in CRM or guest",
        ["Owner can edit item name"],
        [f"Open {CRM_URL}/menu"],
        ["Set name to <script>alert(1)</script>Biryani", "Save", "View in CRM list", "View on guest menu"],
        ["Shown as escaped text", "No alert()", "No DOM XSS"],
        ["Script executes"],
        "P1", "security", "Pen-test lite — treat as required smoke", app,
    ))
    R.append(tc(
        "TC-SEC-02", "Security", "XSS in campaign name",
        "Campaign name with HTML/JS is escaped in Campaigns list",
        ["Campaigns access"],
        [f"Open {CRM_URL}/grow?tab=campaigns"],
        ["Create campaign name with <img src=x onerror=alert(1)>", "Save draft", "View card"],
        ["Escaped / sanitized", "No script run"],
        ["HTML renders active"],
        "P1", "security", "", app,
    ))
    R.append(tc(
        "TC-SEC-03", "Security", "IDOR order detail",
        "Guessing another kitchen's order id returns 403/empty — never order payload",
        ["Two kitchens A/B", "Logged in as A", "Know B order id"],
        [f"As A, attempt open B order via API/UI if id exposed"],
        ["Confirm denied"],
        ["403/Not found", "No guest phone/items of B"],
        ["B order visible"],
        "P0", "security", "Beyond basic tenant UI check", app,
    ))
    R.append(tc(
        "TC-SEC-04", "Security", "CSRF / cookie flags smoke",
        "Auth cookies not obviously missing Secure/HttpOnly on production HTTPS (spot check)",
        ["Prod or staging HTTPS"],
        ["DevTools → Application → Cookies for CRM host"],
        ["Inspect session cookie flags"],
        ["HttpOnly present for session", "Secure on HTTPS"],
        ["Session cookie readable by JS without HttpOnly on prod"],
        "P2", "security", "Smoke only — not full pen-test", app,
    ))
    R.append(tc(
        "TC-SEC-05", "Security", "Rate limit login",
        "Rapid wrong OTP/password attempts get throttled",
        ["Login page"],
        [f"Open {CRM_URL}/start"],
        ["Submit wrong credentials 10+ times quickly"],
        ["Throttle/lock message OR increasing delay", "No unlimited brute"],
        ["Unlimited attempts with no backoff"],
        "P2", "security", "", app,
    ))
    R.append(tc(
        "TC-LOAD-01", "Performance", "CRM menu 500 items load",
        "Menu page with ~500 items remains usable",
        ["QA kitchen seeded with ~500 items OR highest available"],
        [f"Open {CRM_URL}/menu", "Time to interactive", "Search one item", "Toggle one item"],
        ["Initial usable < 5s target", "Search works", "No tab crash"],
        ["Freeze >15s", "Browser OOM"],
        "P2", "load", "", app,
    ))
    R.append(tc(
        "TC-LOAD-02", "Performance", "Orders list 1000 rows smoke",
        "Orders history with large volume paginates/virtualizes without freeze",
        ["Kitchen with many orders if available"],
        [f"Open {CRM_URL}/orders", "Scroll / page"],
        ["List remains responsive", "Search Ctrl+K still works"],
        ["Loads all 1000 DOM nodes and freezes"],
        "P2", "load", "", app,
    ))
    R.append(tc(
        "TC-LOAD-03", "Performance", "Campaign preview audience large",
        "Audience preview for large guest set returns without timeout UX hang",
        ["Many guests in kitchen"],
        [f"Open New campaign wizard", "Select All guests", "Wait preview"],
        ["Preview numbers or clear timeout error", "UI not stuck Sending forever"],
        ["Infinite spinner no message"],
        "P2", "load", "", app,
    ))

    # ---- Pixel design QA CRM ----
    R.append(tc(
        "TC-UI-PIX-01", "Design QA", "CRM vs Ownly/reference spacing",
        "Menu and Grow primary screens match agreed design reference spacing/typography (not pixel-perfect Swiggy clone)",
        ["Design reference doc/screens available"],
        [f"Open {CRM_URL}/menu and /grow?tab=offers"],
        ["Compare to docs/design or Figma/reference screenshots", "Note major deviations"],
        ["No overlapping controls", "Primary CTA contrast OK", "Deviations logged"],
        ["Unusable clutter ignored"],
        "P2", "design", "Pixel QA = major defects, not 1px diffs", app,
    ))
    R.append(tc(
        "TC-UI-PIX-02", "Design QA", "CRM mobile 375 visual",
        "CRM critical paths readable at 375px vs desktop reference",
        ["Chrome device mode 375"],
        [f"Visit Menu, Orders list, Wallet"],
        ["Screenshot each", "Compare readability"],
        ["No truncated primary CTAs", "Tables scroll horizontally if needed"],
        ["Pay/Save button unreachable"],
        "P2", "design", "", app,
    ))

    # ---- Native shell (if WebView wrappers later) ----
    R.append(tc(
        "TC-NATIVE-CRM-01", "Native shell", "CRM inside Android WebView",
        "If a native wrapper hosts CRM, login + menu works offline-cache policy as designed",
        ["Android WebView build OR N/A"],
        ["Open CRM in wrapper", "Login", "Open menu"],
        ["Functions parity with Chrome", "Back button behaviour documented"],
        ["Blank WebView cookies broken"],
        "P3", "native", "Only when native wrapper exists", app,
    ))
    return R


def guest_rows():
    app = f"Guest web ({GUEST_URL})"
    R = []
    # i18n / RTL
    R.append(tc(
        "TC-GI18N-01", "i18n", "Guest language",
        "Guest language switch (if any) updates hub/menu/checkout labels",
        ["Switcher exists OR N/A"],
        [f"Open {GUEST_URL}/hub"],
        ["Switch language", "Open restaurant menu + checkout"],
        ["Labels update", "Prices still ₹ clear"],
        ["Broken checkout labels"],
        "P2", "i18n", "", app,
    ))
    R.append(tc(
        "TC-GI18N-02", "i18n", "Guest RTL",
        "RTL locale mirrors hub cards and sticky cart",
        ["RTL locale OR N/A"],
        [f"Open {GUEST_URL}/hub with RTL"],
        ["Check card alignment", "Open cart dock"],
        ["RTL layout coherent"],
        ["Cart dock unusable"],
        "P3", "i18n", "", app,
    ))

    # ONDC deep
    R.append(tc(
        "TC-GONDC-03", "ONDC", "ONDC search returns sellers",
        "ONDC search UI returns restaurant/items from preprod/prod network per env",
        ["ONDC keys configured", "Network reachable"],
        [f"Open {GUEST_URL}/ondc"],
        ["Run search for a Bangalore pin/city", "Wait results"],
        ["Results or clear empty/error from network", "No unhandled exception"],
        ["Hard crash", "Fake success with empty silently if error"],
        "P1", "ondc-deep", "", app,
    ))
    R.append(tc(
        "TC-GONDC-04", "ONDC", "ONDC select → quote → checkout path",
        "Selecting an ONDC item can proceed through quote/checkout steps implemented",
        ["Search results available"],
        ["Select item", "Proceed quote/checkout as UI allows"],
        ["Each step has clear status", "Failure shows message"],
        ["Stuck without message"],
        "P1", "ondc-deep", "", app,
    ))
    R.append(tc(
        "TC-GONDC-05", "ONDC", "ONDC vs Direct badge",
        "Hub/restaurant shows source Direct vs ONDC so guest knows offer rules differ",
        ["Both sources in hub if available"],
        [f"Open {GUEST_URL}/hub"],
        ["Find Direct kitchen", "Find ONDC entry", "Compare badges/labels"],
        ["Source distinguishable", "ONDC path does not show kitchen Grow spin as if Direct sticker"],
        ["Indistinguishable sources causing wrong offer expectations"],
        "P1", "ondc-deep", "", app,
    ))
    R.append(tc(
        "TC-GONDC-06", "ONDC", "ONDC cancel/fail order UX",
        "Failed ONDC confirm shows payment-failed or order-failed guidance",
        ["Ability to force fail OR simulate"],
        ["Attempt ONDC order fail path"],
        ["Friendly error", "No false PAID"],
        ["Silent fail"],
        "P2", "ondc-deep", "", app,
    ))
    R.append(tc(
        "TC-GONDC-07", "ONDC", "ONDC delivery tracking",
        "ONDC order status updates appear on guest order detail when callbacks exist",
        ["ONDC order in progress"],
        [f"Open {GUEST_URL}/orders/{{id}}"],
        ["Refresh over time", "Note status changes"],
        ["Status progresses or explains pending", "No blank forever without text"],
        ["Always empty tracking"],
        "P2", "ondc-deep", "", app,
    ))

    # Security guest
    R.append(tc(
        "TC-GSEC-01", "Security", "XSS search query",
        "Hub search input with script does not execute",
        ["Hub open"],
        [f"Open {GUEST_URL}/hub/search"],
        ["Search <script>alert(1)</script>", "Submit"],
        ["No alert", "Safe empty/results"],
        ["XSS executes"],
        "P1", "security", "", app,
    ))
    R.append(tc(
        "TC-GSEC-02", "Security", "IDOR guest order",
        "Guest A cannot open Guest B order id",
        ["Two guest sessions", "B order id"],
        [f"As A open {GUEST_URL}/orders/{{B_id}}"],
        ["Observe response"],
        ["Denied/empty", "No B address/phone"],
        ["B order details visible"],
        "P0", "security", "", app,
    ))
    R.append(tc(
        "TC-GSEC-03", "Security", "Sticker token enumeration",
        "Random /s/{guess} does not reveal other kitchens' active offers payload beyond generic error",
        ["Valid token format known"],
        [f"Open {GUEST_URL}/s/randominvalidtoken123"],
        ["Note response"],
        ["Generic scan-error", "No stack/PII"],
        ["Leaks restaurant list/secrets"],
        "P2", "security", "", app,
    ))

    # Load guest
    R.append(tc(
        "TC-GLOAD-01", "Performance", "Hub 100 kitchens",
        "Hub with many kitchens scrolls without multi-second jank",
        ["Many hubListed kitchens"],
        [f"Open {GUEST_URL}/hub", "Fling scroll", "Open one restaurant"],
        ["Scroll usable", "Open <3s"],
        ["Tab freeze"],
        "P2", "load", "", app,
    ))
    R.append(tc(
        "TC-GLOAD-02", "Performance", "Restaurant menu 300 dishes",
        "Large menu page remains filterable",
        ["Large published menu"],
        [f"Open /r/{{id}}/menu", "Use veg filter", "Add item"],
        ["Filter works", "Add works"],
        ["Page unusable"],
        "P2", "load", "", app,
    ))

    # Pixel / competitor feel
    R.append(tc(
        "TC-GUI-PIX-01", "Design QA", "Hub vs Ownly/Swiggy/Zomato reference",
        "Guest hub visual hierarchy matches agreed Ownly-inspired reference; flag major Swiggy/Zomato UX gaps (cart dock, filters, restaurant row)",
        ["Reference screenshots/docs available (WA-OWNLY or design-reference)"],
        [f"Open {GUEST_URL}/hub", "Compare to reference", "Open restaurant row + sticky cart"],
        ["Primary order path obvious", "Major gaps logged with screenshots", "Not required 1:1 pixel Swiggy"],
        ["Cannot find how to order", "QA skips because 'looks fine' without reference"],
        "P2", "design", "Pixel QA = conversion blockers", app,
    ))
    R.append(tc(
        "TC-GUI-PIX-02", "Design QA", "Checkout bill clarity vs aggregators",
        "Checkout bill is as clear as Swiggy/Zomato (items, delivery, total) without fee archaeology",
        ["Cart with 2+ items"],
        [f"Open checkout", "Screenshot bill", "Compare mental model to aggregator"],
        ["Total understandable in 3 seconds", "No mystery fees labeled oddly"],
        ["Confusing fee rows"],
        "P1", "design", "", app,
    ))
    R.append(tc(
        "TC-GUI-PIX-03", "Design QA", "Menu image proof UI",
        "Guest menu image open/close feels trustworthy (zoom, close, match badge)",
        ["Guest menu image exists"],
        ["Open image", "Pinch/zoom if mobile", "Close", "Check badge"],
        ["Can read prices", "Can dismiss", "Badge present or logged Missing"],
        ["Cannot close image overlay"],
        "P2", "design", "", app,
    ))

    # Native iOS/Android
    R.append(tc(
        "TC-GNATIVE-01", "Native iOS", "Guest in iOS Safari / WA WebView",
        "Critical path scan→menu→checkout works in iOS Safari and WhatsApp in-app browser",
        ["iPhone test device", "WA installed"],
        ["Open guest hub in Safari", "Complete light path", "Open same link from WhatsApp"],
        ["Both can browse", "Auth/cookies work or clear guidance", "Pay sheet works or known limitation documented"],
        ["WA WebView blank white with no message"],
        "P1", "native", "PWA/Safari focus — still required for India WA", app,
    ))
    R.append(tc(
        "TC-GNATIVE-02", "Native Android", "Guest in Chrome / WA WebView",
        "Critical path works in Android Chrome and WhatsApp WebView",
        ["Android device"],
        ["Chrome hub path", "WA link path", "Checkout attempt"],
        ["Parity with desktop for browse", "Known Razorpay WebView limits documented"],
        ["Unhandled crash"],
        "P1", "native", "", app,
    ))
    R.append(tc(
        "TC-GNATIVE-03", "Native PWA", "Add to Home Screen",
        "If PWA enabled, Add to Home Screen launches standalone and keeps session",
        ["PWA manifest present OR N/A"],
        ["Install PWA", "Relaunch from icon", "Open /me"],
        ["Standalone UI", "Session persists per design"],
        ["Install broken", "Always opens blank"],
        "P3", "native", "", app,
    ))
    R.append(tc(
        "TC-GNATIVE-04", "Native", "Push permission smoke",
        "If web push used, permission prompt and denial are handled",
        ["Push feature OR N/A"],
        ["Trigger permission", "Deny", "Allow on retry if applicable"],
        ["No crash on deny", "App remains usable"],
        ["Crash on deny"],
        "P3", "native", "", app,
    ))
    return R


def product_rows(kind: str):
    def pr(pid, module, title, who, bullets, step, ex, ng, prio, notes):
        return [
            pid, module,
            f"BUSINESS GOAL:\n  {title}\nACTOR:\n  {who}\nMODULE:\n  {module}\nNICHE EXTRA:\n  Yes — optional until roadmap prioritizes it.",
            who,
            pre("CRM" if kind == "CRM" else "Guest", bullets),
            steps([f"Cover product niche area {pid}"], step),
            exp(ex),
            neg(ng),
            prio, "Niche-extra", "extras", notes,
        ]

    if kind == "CRM":
        return [
            pr("C-I18N", "i18n", "CRM multi-language + RTL readiness", "Owner",
               ["Locale flags if any"],
               ["Switch language", "Check RTL if enabled"],
               ["Usable UI or N/A"], ["Half translation breaking ops"], "P2", "Maps TC-I18N-*"),
            pr("C-SECLOAD", "Security/Load", "XSS/IDOR/rate-limit + large catalog load", "Owner/QA",
               ["Two kitchens", "Large menu if possible"],
               ["Run TC-SEC-* and TC-LOAD-*"],
               ["No XSS/IDOR", "Large menu usable"], ["Data leak"], "P1", "Maps TC-SEC/LOAD"),
            pr("C-DESIGN", "Design QA", "CRM visual QA vs reference (not 1px)", "Owner/QA",
               ["Reference screens"],
               ["Compare Menu/Grow"],
               ["Major defects logged"], ["Ignored clutter"], "P2", "Maps TC-UI-PIX-*"),
            pr("C-NATIVE", "Native", "CRM Android WebView wrapper (if any)", "Owner",
               ["Wrapper build or N/A"],
               ["Login+menu in wrapper"],
               ["Parity or N/A"], ["Broken cookies"], "P3", "Maps TC-NATIVE-CRM-01"),
        ]
    return [
        pr("G-I18N", "i18n", "Guest language/RTL", "Guest",
           ["Locale support or N/A"], ["Switch lang/RTL"], ["Usable or N/A"], ["Broken checkout"], "P2", ""),
        pr("G-ONDC-DEEP", "ONDC", "Deep ONDC search→quote→order→track", "Guest",
           ["ONDC env live"], ["Search", "Quote", "Fail path", "Track"],
           ["Each step clear"], ["Crash"], "P1", "Maps TC-GONDC-03..07"),
        pr("G-SECLOAD", "Security/Load", "Guest XSS/IDOR + hub/menu load", "Guest",
           ["Two guests"], ["XSS search", "IDOR order", "Large hub"],
           ["Safe + usable"], ["PII leak"], "P1", ""),
        pr("G-DESIGN", "Design QA", "Hub/checkout vs Ownly/Swiggy/Zomato reference", "Guest/QA",
           ["References"], ["Compare hub+checkout+menu image"],
           ["Conversion blockers logged"], ["Cannot order"], "P2", ""),
        pr("G-NATIVE", "Native", "iOS/Android Safari/Chrome/WA WebView + PWA", "Guest",
           ["Real devices"], ["Safari", "WA WebView", "Android Chrome", "PWA optional"],
           ["Critical path works or limits documented"], ["WA blank"], "P1", "Maps TC-GNATIVE-*"),
    ]


def main():
    wb = load_workbook(PATH)
    a1 = append(wb["CRM_TestCases"], crm_rows())
    a2 = append(wb["Guest_TestCases"], guest_rows())
    a3 = append(wb["Product_CRM"], product_rows("CRM"))
    a4 = append(wb["Product_Guest"], product_rows("Guest"))

    readme = wb["README"]
    r = readme.max_row + 2
    readme.cell(r, 1, "NICHE EXTRAS APPEND")
    readme.cell(r, 1).font = Font(bold=True, size=12, color="8D4A28")
    for i, line in enumerate([
        f"Added niche extras → CRM_TestCases +{a1}, Guest_TestCases +{a2}, Product_CRM +{a3}, Product_Guest +{a4}.",
        "Filter Source = Niche-extra (yellow) to review only these rows.",
        "Categories: i18n/RTL, ONDC deep paths, security/load pen-smoke, pixel/design QA vs references, iOS/Android/WA WebView/PWA.",
        "These are optional roadmap items — still testable: mark N/A if not built, with screenshot proof.",
    ]):
        readme.cell(r + 1 + i, 1, line)

    wb.save(PATH)
    print(f"Updated {PATH}")
    print(f"CRM+{a1} Guest+{a2} ProductCRM+{a3} ProductGuest+{a4}")
    print(f"CRM total={wb['CRM_TestCases'].max_row-1} Guest total={wb['Guest_TestCases'].max_row-1}")


if __name__ == "__main__":
    main()
