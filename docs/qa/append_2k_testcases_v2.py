# -*- coding: utf-8 -*-
"""
Append 2000+ CRM and 2000+ Guest test cases (pos + neg) into
YUMM-Full-QA-Scenarios-v2.xlsx as new sheets CRM_TC_2k / Guest_TC_2k.
Does not replace existing sheets.
"""
from __future__ import annotations

from pathlib import Path

from openpyxl import load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

PATH = Path(__file__).resolve().parent / "YUMM-Full-QA-Scenarios-v2.xlsx"
CRM_URL = "https://damigos-crm-web.vercel.app"
GUEST_URL = "https://damigos-guest-web.vercel.app"

TEST_HEADERS = [
    "Test Case ID",
    "Module",
    "Feature / UI control",
    "Scenario (what we are testing)",
    "Preconditions",
    "Steps (do this exactly)",
    "Expected result (PASS)",
    "Negative / FAIL if",
    "Priority",
    "Source",
    "Related product ID",
    "QA notes",
]

THIN = Border(
    left=Side(style="thin", color="E0E0E0"),
    right=Side(style="thin", color="E0E0E0"),
    top=Side(style="thin", color="E0E0E0"),
    bottom=Side(style="thin", color="E0E0E0"),
)
WRAP = Alignment(wrap_text=True, vertical="top")
HEADER_FILL = PatternFill("solid", fgColor="8D4A28")
HEADER_FONT = Font(bold=True, color="FFFFFF", name="Calibri", size=10)


def scenario(module: str, feature: str, what: str, polarity: str) -> str:
    return (
        f"MODULE: {module}\n"
        f"FEATURE / CONTROL: {feature}\n"
        f"POLARITY: {polarity}\n"
        f"WHAT THIS CASE TESTS:\n  {what}\n"
        f"IN SIMPLE WORDS:\n"
        f"  Prove this control/flow for the {polarity.lower()} path.\n"
        f"HOW TO JUDGE:\n"
        f"  PASS only if EVERY Expected ✓ is true.\n"
        f"  FAIL if ANY Negative ✗ happens."
    )


def pre(app: str, bullets: list[str]) -> str:
    lines = [
        f"APP: {app}",
        "DEVICE: Desktop Chrome (+ Mobile Chrome spot-check)",
        "DATA: QA kitchen / QA guest only",
        "",
        "PRECONDITIONS (must be true before Step 1):",
    ]
    for i, b in enumerate(bullets, 1):
        lines.append(f"  {i}) {b}")
    lines.append("  • Screenshot the starting screen")
    return "\n".join(lines)


def steps(lines: list[str]) -> str:
    out = [f"{i}. {s}" for i, s in enumerate(lines, 1)]
    out += [
        "",
        "AFTER STEPS — EVIDENCE:",
        "A. Screenshot final screen.",
        "B. Note IDs, amounts, errors, timestamps in QA notes.",
        "C. Mark PASS/FAIL.",
    ]
    return "\n".join(out)


def exp(lines: list[str]) -> str:
    out = ["PASS when ALL of the following are true:"]
    for i, b in enumerate(lines, 1):
        out.append(f"  ✓ {i}. {b}")
    out.append("  ✓ No unexpected blocking console errors for this action.")
    return "\n".join(out)


def neg(lines: list[str]) -> str:
    out = ["FAIL this case if ANY of the following happen:"]
    for i, b in enumerate(lines, 1):
        out.append(f"  ✗ {i}. {b}")
    out.append("  ✗ Required control missing so steps cannot complete.")
    return "\n".join(out)


# ---------------------------------------------------------------------------
# CRM catalog — features expanded across roles / states / inputs / devices
# ---------------------------------------------------------------------------
CRM_MODULES: list[tuple[str, str, list[str]]] = [
    ("Onboarding", "Apply form", [
        "Kitchen name required", "GPS pin required", "Owner email format", "Owner phone 10-digit",
        "FSSAI number length", "Logo upload JPG", "Logo upload PNG", "Logo reject EXE",
        "Delivery radius km", "Cuisine tags multi-select", "Submit pending state",
        "Resubmit after reject", "Duplicate kitchen name", "Partners email notify",
        "Curl activate ACTIVE", "PENDING cannot login", "Activate idempotent",
        "Missing FSSAI photo", "Address line length", "City Bangalore default",
    ]),
    ("Auth", "OTP login", [
        "Valid OTP login", "Wrong OTP 3 times", "Expired OTP", "OTP bypass 000000",
        "MSG91 failure fallback", "Session persist refresh", "Logout clears token",
        "Deep link after login", "Staff invite login", "Role OWNER vs MANAGER",
        "Concurrent session", "Token expired mid-page", "Phone not registered",
        "Rate limit OTP request", "Clipboard OTP paste", "Resend OTP cooldown",
    ]),
    ("Dashboard", "Home analytics", [
        "Today orders card", "GMV today", "Pending accept count", "Empty day zero state",
        "Refresh button", "Date range filter", "Recent orders table", "Open order detail",
        "Wallet chip amount", "Guest storefront toggle", "Command palette open",
        "Notifications panel", "Hourly demand dialog", "Commission report",
        "Offline banner", "Slow API skeleton", "Currency INR format",
    ]),
    ("Menu", "Catalog CRUD", [
        "Add category", "Rename category", "Delete empty category", "Delete category with items block",
        "Add item veg", "Add item non-veg", "Price paise→INR", "Price below ₹49 band warn",
        "Price above ₹99 band warn", "Duplicate item name", "Toggle item available",
        "86 item from kitchen", "Publish draft", "Publish with stale draft", "Import CSV",
        "Import image OCR", "Import review accept", "Import review reject row",
        "Guest image dual", "Owner image regenerate", "Category reorder", "Item search",
        "Master menu OFF", "Master menu ON", "Empty menu state", "Thumb compress",
    ]),
    ("Menu images", "AI / upload", [
        "Dish photo upload", "AI dish quality pass", "AI dish quality fail", "Brand kit colors",
        "Poster typography", "Hive timeout", "DeepSeek fallback", "Remove dish photo",
        "Max size reject", "WebP convert", "Catalog match suggest",
    ]),
    ("Orders", "Kitchen board", [
        "New PAID sound", "Accept starts SLA", "Extend prep +5", "Reject with reason",
        "Preparing status", "Ready for pickup", "Dispatch rider", "Delivered OTP",
        "Wrong OTP reject", "KOT print USB", "KOT reprint", "SSE reconnect",
        "Two kitchens isolation", "Filter by status", "Search order id", "Stock 86 mid-order",
        "Shiprocket AWB", "Delivery fee display", "Discount line", "Loyalty applied line",
    ]),
    ("Redeem", "Counter redeem", [
        "Scan claim QR", "Manual claim id", "Already redeemed", "Expired claim",
        "Wrong kitchen claim", "Platform-wide claim", "Min order gate", "Redeem success toast",
    ]),
    ("Grow Offers", "Offers config", [
        "Create percent offer", "Create flat off", "Create free item", "Create no_prize segment",
        "Weight slider", "Activate offer", "Deactivate offer", "Expires days",
        "Min order paise", "Scope restaurant", "Scope platform", "Duplicate title",
        "Preview guest card", "Save validation", "Delete unused offer",
    ]),
    ("Grow Spin", "Spark weights", [
        "Save spin weights sum 100", "Weights not 100 block", "Daily win cap 5",
        "Better luck segment", "Preview play", "Reset defaults",
    ]),
    ("Campaigns", "WA campaigns", [
        "Create draft campaign", "Schedule send", "Cancel scheduled", "Audience filter",
        "Template vars", "Auto dispatch job", "Wallet debit on send", "Insufficient wallet",
        "Poster attach", "Program birthday", "Program winback", "Program streak",
    ]),
    ("Wallet", "Grow wallet", [
        "Balance display", "Welcome credit ₹1000", "Top-up Razorpay", "Top-up fail",
        "Ledger pagination", "Txn detail dialog", "Spendable vs balance", "Bank gate before spend",
        "Negative balance block", "Refund credit", "Filter by type",
    ]),
    ("Payout", "Bank / Razorpay", [
        "Save IFSC valid", "IFSC invalid", "Account number mask", "Razorpay link",
        "First-login force dialog", "Skip then Settings", "Bank validation API fail",
        "Update payout", "Settlement rail view",
    ]),
    ("Stickers", "Print / activate", [
        "Order print pack", "Pay print", "Download PDF", "Activate batch",
        "Consume sticker scan", "Already consumed", "Batch disable", "Ops key guard",
        "Pricing tiers", "Preview design",
    ]),
    ("Settings", "Kitchen settings", [
        "Location lat/lng", "Prep SLA minutes", "Team invite", "Remove staff",
        "Brand theme dialog", "KOT printer select", "Storefront pause", "Notifications prefs",
        "Change phone", "Logout all devices",
    ]),
    ("Reports", "Exports", [
        "Commission CSV", "Orders CSV date range", "Empty range", "PDF download",
        "Timezone IST", "Large range timeout",
    ]),
    ("Security", "Access control", [
        "CSRF ignore JWT API", "XSS in item name", "SQL inject search", "IDOR other kitchen",
        "Open redirect login", "File upload path traversal", "Rate limit API",
    ]),
    ("Performance", "Latency", [
        "Menu load <3s", "Dashboard <3s", "SSE reconnect <5s", "Publish <10s",
        "Import 100 rows", "Image upload 2MB",
    ]),
    ("i18n", "Copy / locale", [
        "INR symbol", "English labels", "Error strings readable", "Empty state copy",
    ]),
    ("Design QA", "Visual", [
        "Sidebar collapse", "Mobile breakpoint", "Focus ring buttons", "Contrast primary",
        "Toast position", "Modal escape close",
    ]),
    ("Native shell", "PWA / app", [
        "Install prompt", "Offline shell", "Push permission", "Deep link orders",
    ]),
    ("Growth CRM", "Customers", [
        "Customer list", "Customer drawer", "Segment filter", "Last order date",
        "Opt-out marketing", "Export customers",
    ]),
    ("Poster", "Campaign poster", [
        "Generate poster", "Edit copy", "Download PNG", "Attach to campaign",
        "Brand colors applied", "AI fail graceful",
    ]),
    ("Kitchen board", "Realtime", [
        "New order flash", "Sound mute", "Column drag", "History tab",
        "Stock panel sync", "Action rail Accept",
    ]),
    ("Pricing", "Bands / markup", [
        "Guest markup publish", "Reference price", "Stale cart price CRM note",
        "49/99 band badges", "Bulk price edit",
    ]),
    ("Brand", "Identity", [
        "Exclusive logo claim", "Logo conflict", "Accent color save", "Reset brand",
    ]),
    ("CRM Nav", "Chrome", [
        "Sidebar Menu", "Sidebar Orders", "Sidebar Grow", "Sidebar Settings",
        "Top header wallet", "Top header profile", "Command palette shortcut",
    ]),
]

CRM_ROLES = ["OWNER", "MANAGER", "STAFF_READ"]
CRM_STATES = ["ACTIVE kitchen", "PENDING kitchen", "PAUSED storefront", "Wallet empty", "Wallet funded"]
CRM_DEVICES = ["Desktop Chrome", "Mobile Chrome", "Tablet landscape"]
CRM_INPUTS = [
    "happy path valid data",
    "empty required field",
    "max-length string",
    "unicode / emoji input",
    "SQL-like inject string",
    "network offline mid-save",
    "slow 3G throttle",
    "double-click submit",
]

GUEST_MODULES: list[tuple[str, str, list[str]]] = [
    ("Hub", "Home chrome", [
        "Hub load kitchens", "Location open GPS", "GPS denied Settings", "Veg toggle on",
        "Veg toggle off", "Search enter", "Refer & Win ₹200", "Rewards gift icon",
        "Credits wallet icon", "Profile avatar", "Poster carousel autoplay",
        "Today offers rail", "All offers list", "Live orders banner", "Address sheet save",
        "Deep link ?ref posters", "Deep link ?posters=1", "Collection festival",
        "Collection bestsellers", "Kitchen card open",
    ]),
    ("Hub", "Filters / search", [
        "Search no results", "Search special chars", "Clear search", "Sort ETA",
        "Sort rating", "Veg hides non-veg cards", "Perk claim badge",
    ]),
    ("Restaurant", "Menu shop", [
        "Menu load", "Add item", "Qty increment", "Qty decrement remove",
        "Veg filter menu", "Category jump", "Item detail", "Out of stock disable",
        "Master menu OFF block", "Apply claim", "Remove claim", "Loyalty toggle",
        "Sticky cart dock", "Switch kitchen modal", "Price stale refresh",
        "Micro-fee silent total", "Cross-By nearby", "Paused kitchen",
    ]),
    ("Checkout", "Review / pay", [
        "Open checkout", "Delivery pincode", "GPS fill pin", "Unserviceable pin",
        "Select claim", "Apply loyalty", "Tip optional", "Razorpay success",
        "Razorpay fail → payment-failed", "Double pay guard", "Empty cart block",
        "Min order for claim", "Group Cross-By checkout", "Address required",
        "OTP profile gate", "Consent marketing", "Consent game",
    ]),
    ("Delivery", "Fees / OTP", [
        "Fee quote", "First order free", "Shiprocket track link", "Delivery OTP WA",
        "Wrong OTP", "Verified delivered",
    ]),
    ("Orders", "Track / history", [
        "Orders list", "Active filter", "Past filter", "Track timeline",
        "Prep countdown", "1st/2nd order toggle", "Reorder CTA", "Group track",
        "Post-order rewards sheet", "Redeem from sheet", "Rules & conditions",
        "Confirmed=1 celebrate", "Empty orders",
    ]),
    ("Guest Auth", "OTP / profile", [
        "OTP verify", "Wrong OTP", "Profile name save", "Consents save",
        "Logout", "Session restore", "Phone change", "Incomplete profile gate",
    ]),
    ("Me", "Profile hub", [
        "Me page load", "Edit profile", "Addresses CRUD", "Offers reminders",
        "Feedback submit", "Settings prefs", "About page", "Help mailto",
        "Avatar upload", "Rate app",
    ]),
    ("Me Loyalty", "Credits", [
        "Total credits", "Per-kitchen balance", "Zero state", "Menu deep link",
        "Signed-out state",
    ]),
    ("Me Rewards", "Claims / scan", [
        "Rewards grid", "Redeem claim", "Scan packaging CTA", "Camera permission",
        "Manual token", "Posters overlay", "Login then redirect", "Refer ₹200 tile",
        "Rules text", "Empty claims",
    ]),
    ("Scan", "Sticker flow", [
        "Resolve token", "Consumed sticker", "Invalid token", "Scan-error page",
        "Redirect play", "Batch disabled",
    ]),
    ("Spark", "Play / claim", [
        "Opt-in WA", "Spin win", "No prize better luck", "Claim reward",
        "Daily win cap", "TTL expired", "Confetti win sheet", "Continue menu",
    ]),
    ("Refer", "Save & Win", [
        "Share native", "WhatsApp friend", "Invalid phone", "Scratch tease",
        "Code persist", "Win up to ₹200 copy",
    ]),
    ("Rewards", "Posters overlay", [
        "Claim poster", "Restaurant offers poster", "All offers poster",
        "Refer poster", "Close all", "Backdrop dismiss", "Auth redirect",
        "Swipe carousel",
    ]),
    ("Location", "GPS", [
        "Auto locate on open", "Retry GPS", "Nominatim fail", "Save current location",
        "Pick saved address", "Manage addresses link",
    ]),
    ("Post-order", "GPay sheet", [
        "Total rewards header", "Won card", "Scratch unlocked", "Kitchen perk",
        "Refer ₹200", "Redeem button", "Track order dismiss",
    ]),
    ("Platform offer", "Scope", [
        "Platform claim on cart", "One platform per cart", "Kitchen scoped isolation",
    ]),
    ("ONDC", "Discovery", [
        "ONDC page load", "Search callback", "GPS Bangalore", "BPP list",
    ]),
    ("Security", "Guest", [
        "XSS search", "IDOR order id", "Token theft logout", "Open redirect",
        "Upload avatar type",
    ]),
    ("Performance", "Guest", [
        "Hub <3s", "Menu <3s", "Checkout <3s", "Image lazy load",
    ]),
    ("Design QA", "Guest UI", [
        "Safe area header", "Bottom dock", "Modal focus trap", "Contrast",
        "Icon-only rewards", "No d-amigos strip",
    ]),
    ("i18n", "Guest copy", [
        "INR format", "Error copy", "Empty states",
    ]),
    ("Native", "PWA", [
        "Add to home", "Offline hub shell", "Back gesture",
    ]),
    ("Native iOS", "Safari", [
        "Safe area", "Share sheet", "Geolocation prompt",
    ]),
    ("Native Android", "Chrome", [
        "Install banner", "Back closes sheet", "Camera scan",
    ]),
    ("Streak", "Loyalty streak", [
        "Streak day mark", "Reward available", "Expire midnight", "Learn more",
    ]),
    ("Spark recv", "Receiver", [
        "Opt-in link", "Token set", "Play URL",
    ]),
    ("Me Wallet split", "Credits UX", [
        "Wallet icon opens loyalty", "Gift opens posters", "No ₹0.00 chip label",
    ]),
]

GUEST_ROLES = ["SIGNED_OUT", "SIGNED_IN_INCOMPLETE", "SIGNED_IN_COMPLETE"]
GUEST_STATES = [
    "Empty cart",
    "Cart with items",
    "Claim available",
    "No claims",
    "GPS allowed",
    "GPS denied",
    "Veg-only on",
]
GUEST_DEVICES = ["Desktop Chrome", "Mobile Chrome", "iOS Safari"]
GUEST_INPUTS = [
    "happy path valid data",
    "empty required field",
    "invalid phone / pin",
    "unicode / emoji",
    "offline mid-action",
    "double tap CTA",
    "slow network",
    "expired session",
]


def build_cases(
    *,
    prefix: str,
    app_url: str,
    app_label: str,
    modules: list[tuple[str, str, list[str]]],
    roles: list[str],
    states: list[str],
    devices: list[str],
    inputs: list[str],
    target: int,
) -> list[list[str]]:
    rows: list[list[str]] = []
    n = 0
    polarities = ("POSITIVE", "NEGATIVE")

    # Primary expansion: module × feature × polarity × role × state
    for module, area, features in modules:
        for feature in features:
            for polarity in polarities:
                for role in roles:
                    for state in states:
                        if n >= target:
                            return rows
                        n += 1
                        tc_id = f"{prefix}-{n:04d}"
                        device = devices[n % len(devices)]
                        inp = inputs[n % len(inputs)]
                        related = f"{module[:3].upper()}-{n % 40 + 1}"
                        prio = "P0" if n % 7 == 0 else ("P1" if n % 3 == 0 else "P2")
                        what = (
                            f"{polarity}: {feature} as {role} while '{state}' "
                            f"using '{inp}' on {device}."
                        )
                        if polarity == "POSITIVE":
                            pre_b = [
                                f"Open {app_url}",
                                f"Role/session: {role}",
                                f"App state: {state}",
                                f"Device: {device}",
                            ]
                            step_b = [
                                f"Navigate to {module} → {area} → {feature}.",
                                f"Perform the happy path for: {feature}.",
                                f"Use input profile: {inp} (valid variant).",
                                "Confirm UI feedback (toast/nav/state change).",
                                "Refresh once and re-check persistence if applicable.",
                            ]
                            exp_b = [
                                f"{feature} completes without error.",
                                f"State remains consistent for {role} / {state}.",
                                "Amounts/IDs/labels match UI copy.",
                                "User can continue the next natural step.",
                            ]
                            neg_b = [
                                "Silent failure with no feedback.",
                                "Data corrupted or wrong kitchen/guest scope.",
                                "Crash / white screen / infinite spinner >15s.",
                            ]
                        else:
                            pre_b = [
                                f"Open {app_url}",
                                f"Role/session: {role}",
                                f"App state: {state}",
                                f"Device: {device}",
                                "Prepare invalid/hostile input or denied permission as needed.",
                            ]
                            step_b = [
                                f"Navigate to {module} → {area} → {feature}.",
                                f"Attempt the failure path for: {feature}.",
                                f"Force condition: {inp}.",
                                "Observe validation / error / block behavior.",
                                "Confirm system did not partially commit bad data.",
                            ]
                            exp_b = [
                                "Action is blocked or recovers safely.",
                                "Clear error or empty/disabled state shown.",
                                "No privileged data leak across kitchens/guests.",
                                "User can correct input and retry when relevant.",
                            ]
                            neg_b = [
                                "Invalid action still succeeds.",
                                "Partial write left inconsistent data.",
                                "App crash or stuck loading.",
                                "Error message missing or misleading.",
                            ]

                        rows.append(
                            [
                                tc_id,
                                module,
                                f"{area} · {feature}",
                                scenario(module, feature, what, polarity),
                                pre(app_label, pre_b),
                                steps(step_b),
                                exp(exp_b),
                                neg(neg_b),
                                prio,
                                "Generated 2k suite",
                                related,
                                f"{polarity} · {role} · {state} · {device}",
                            ]
                        )

    # Secondary fill if still short: feature × input × polarity × device
    if n < target:
        flat_features: list[tuple[str, str, str]] = []
        for module, area, features in modules:
            for feature in features:
                flat_features.append((module, area, feature))
        i = 0
        while n < target:
            module, area, feature = flat_features[i % len(flat_features)]
            polarity = polarities[n % 2]
            role = roles[n % len(roles)]
            state = states[n % len(states)]
            device = devices[n % len(devices)]
            inp = inputs[i % len(inputs)]
            n += 1
            i += 1
            tc_id = f"{prefix}-{n:04d}"
            what = f"{polarity} edge: {feature} / {inp} ({role}, {state})."
            rows.append(
                [
                    tc_id,
                    module,
                    f"{area} · {feature}",
                    scenario(module, feature, what, polarity),
                    pre(app_label, [f"Open {app_url}", f"{role}", f"{state}", f"{device}"]),
                    steps(
                        [
                            f"Open {module} / {feature}.",
                            f"Execute {polarity.lower()} path with {inp}.",
                            "Capture evidence.",
                        ]
                    ),
                    exp(
                        [
                            "Outcome matches polarity expectation.",
                            "No cross-tenant data leak.",
                            "UI remains usable.",
                        ]
                    ),
                    neg(
                        [
                            "Opposite polarity incorrectly allowed.",
                            "Crash or data corruption.",
                        ]
                    ),
                    "P2" if n % 2 else "P1",
                    "Generated 2k suite",
                    f"EDGE-{n}",
                    f"fill · {polarity}",
                ]
            )
    return rows


def write_sheet(wb, title: str, rows: list[list[str]], header_color: str) -> None:
    if title in wb.sheetnames:
        del wb[title]
    ws = wb.create_sheet(title)
    fill = PatternFill("solid", fgColor=header_color)
    for col, h in enumerate(TEST_HEADERS, 1):
        cell = ws.cell(1, col, h)
        cell.fill = fill
        cell.font = HEADER_FONT
        cell.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        cell.border = THIN
    ws.row_dimensions[1].height = 34
    ws.freeze_panes = "B2"

    for r_idx, row in enumerate(rows, 2):
        for c_idx, val in enumerate(row, 1):
            cell = ws.cell(r_idx, c_idx, val)
            cell.alignment = WRAP
            cell.border = THIN
            cell.font = Font(name="Calibri", size=9)
        pr = str(row[8]).upper()
        if pr == "P0":
            ws.cell(r_idx, 9).fill = PatternFill("solid", fgColor="F4B183")
        elif pr == "P1":
            ws.cell(r_idx, 9).fill = PatternFill("solid", fgColor="FFE699")
        # keep rows compact for 2k scale
        ws.row_dimensions[r_idx].height = 64

    widths = [14, 14, 28, 42, 36, 36, 36, 32, 10, 16, 14, 28]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    last = len(rows) + 1
    ws.auto_filter.ref = f"A1:{get_column_letter(len(TEST_HEADERS))}{last}"

    dv = DataValidation(type="list", formula1='"P0,P1,P2,P3"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"I2:I{last}")


def update_readme(wb, crm_n: int, guest_n: int) -> None:
    if "README" not in wb.sheetnames:
        return
    ws = wb["README"]
    # append note at bottom
    r = (ws.max_row or 1) + 2
    ws.cell(r, 1, "=== Added sheets (2k suites) ===")
    ws.cell(r, 1).font = Font(bold=True, name="Calibri", size=11)
    ws.cell(r + 1, 1, f"CRM_TC_2k — {crm_n} test cases (POSITIVE + NEGATIVE), generated suite")
    ws.cell(r + 2, 1, f"Guest_TC_2k — {guest_n} test cases (POSITIVE + NEGATIVE), generated suite")
    ws.cell(
        r + 3,
        1,
        "Use filters on Module / Priority / QA notes (polarity). Existing CRM_TestCases & Guest_TestCases unchanged.",
    )


def main() -> None:
    target = 2100  # >2000 each
    crm_rows = build_cases(
        prefix="CRM2K",
        app_url=CRM_URL,
        app_label="CRM",
        modules=CRM_MODULES,
        roles=CRM_ROLES,
        states=CRM_STATES,
        devices=CRM_DEVICES,
        inputs=CRM_INPUTS,
        target=target,
    )
    guest_rows = build_cases(
        prefix="GST2K",
        app_url=GUEST_URL,
        app_label="Guest",
        modules=GUEST_MODULES,
        roles=GUEST_ROLES,
        states=GUEST_STATES,
        devices=GUEST_DEVICES,
        inputs=GUEST_INPUTS,
        target=target,
    )

    wb = load_workbook(PATH)
    write_sheet(wb, "CRM_TC_2k", crm_rows, "1F4E79")
    write_sheet(wb, "Guest_TC_2k", guest_rows, "0B6E4F")
    update_readme(wb, len(crm_rows), len(guest_rows))
    wb.save(PATH)
    print(f"Wrote {PATH}")
    print(f"CRM_TC_2k: {len(crm_rows)} cases")
    print(f"Guest_TC_2k: {len(guest_rows)} cases")
    print(f"Sheets now: {wb.sheetnames}")


if __name__ == "__main__":
    main()
