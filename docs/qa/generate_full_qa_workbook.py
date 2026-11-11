# -*- coding: utf-8 -*-
"""
Build full YUMM QA workbook:
- Product scenario sheets (CRM + Guest) updated with tester discoveries
- Minute-level CRM_TestCases (tester cases + expanded)
- Minute-level Guest_TestCases (every small control/flow)
"""
from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUT = Path(__file__).resolve().parent / "YUMM-Full-QA-Scenarios-v2.xlsx"

PROD_HEADERS = [
    "Scenario ID",
    "Module",
    "Scenario title (plain English)",
    "Who",
    "Preconditions",
    "Step-by-step",
    "Expected result (pass)",
    "Fail if / negative",
    "Priority",
    "Build status",
    "Source",
    "Notes",
]

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


def status_fill(status: str):
    s = (status or "").lower()
    if s.startswith("implemented") or s == "pass-ready":
        return PatternFill("solid", fgColor="C6EFCE")
    if s.startswith("partial"):
        return PatternFill("solid", fgColor="FFEB9C")
    if s.startswith("missing"):
        return PatternFill("solid", fgColor="FFC7CE")
    if s.startswith("new"):
        return PatternFill("solid", fgColor="DDEBF7")
    if "tester" in s:
        return PatternFill("solid", fgColor="E2D5F1")
    return None


def style_header(ws, headers, color="8D4A28"):
    fill = PatternFill("solid", fgColor=color)
    font = Font(bold=True, color="FFFFFF", name="Calibri", size=10)
    for col, h in enumerate(headers, 1):
        cell = ws.cell(1, col, h)
        cell.fill = fill
        cell.font = font
        cell.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        cell.border = THIN
    ws.row_dimensions[1].height = 34
    ws.freeze_panes = "B2"


def write_rows(ws, headers, rows, widths, status_col=10, prio_col=9, header_color="8D4A28"):
    style_header(ws, headers, header_color)
    wrap = Alignment(wrap_text=True, vertical="top")
    for r_idx, row in enumerate(rows, 2):
        for c_idx, val in enumerate(row, 1):
            cell = ws.cell(r_idx, c_idx, val)
            cell.alignment = wrap
            cell.border = THIN
            cell.font = Font(name="Calibri", size=9)
        sf = status_fill(str(row[status_col - 1]))
        if sf:
            ws.cell(r_idx, status_col).fill = sf
        pr = str(row[prio_col - 1]).upper()
        if pr == "P0":
            ws.cell(r_idx, prio_col).fill = PatternFill("solid", fgColor="F4B183")
        elif pr == "P1":
            ws.cell(r_idx, prio_col).fill = PatternFill("solid", fgColor="FFE699")
        ws.row_dimensions[r_idx].height = 88
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{len(rows) + 1}"


# ---------------------------------------------------------------------------
# Product CRM (high level) — previous bible + NEW from tester
# ---------------------------------------------------------------------------
PRODUCT_CRM = [
    ["C1", "Onboarding", "Full kitchen apply + partners verify + curl activate", "Owner/Ops", "FSSAI ready", "Fill name, GPS, email, phone, logo, delivery, FSSAI → partners@ mail → curl activate", "ACTIVE kitchen can login", "PENDING lost / no email", "P0", "Partial", "Product", ""],
    ["C2", "Brand", "Exclusive logo/graphic pool", "Owner", "No logo", "Pick unique graphic; lock forever", "Not reusable by others", "Shared fallback only", "P0", "Missing", "Product", ""],
    ["C3", "Auth", "Owner login after activate", "Owner", "ACTIVE", "Login → CRM home", "Own kitchen only", "PENDING login", "P0", "Partial", "Product", ""],
    ["C4", "Payout", "First-login bank/Razorpay dialog", "Owner", "First login", "Force payout setup", "Saved bank/Razorpay", "Only buried in Settings", "P0", "Partial", "Product", ""],
    ["C4.1", "Wallet", "₹1000 onboarding Grow credit + poster", "System/Owner", "First login", "Redeem sparkle → navbar ₹1000", "Ledger +1000", "Floor only not gift", "P0", "Missing", "Product", ""],
    ["M-TOGGLE", "Menu", "Master toggle hide/show ENTIRE menu", "Owner", "Menu page", "OFF hides catalog for guest; ON restores; persists refresh", "Guest cannot order when OFF", "UI off but guest still sees menu", "P0", "New from tester", "Tester TC_M03-M08", "NEW vs our bible"],
    ["M1", "Menu", "Immutable original upload copy", "System", "Upload", "Store original_menu_vN downloadable", "Bytes unchanged", "Overwrite only copy", "P0", "Partial", "Product", ""],
    ["M2", "Menu", "Owner edits → regenerate OWNER board + download", "Owner", "Draft/live menu", "Change prices → new owner image → download", "Image = CRM prices", "Old prices on image", "P0", "Missing", "Product", ""],
    ["M3", "Menu", "Publish → GUEST menu image with markup", "System", "Publish", "guest_menu_image_vN with M4 prices", "Guest can open image", "Same as owner board", "P0", "Missing", "Product", ""],
    ["M4", "Pricing", "Guest +₹5–15 then snap 99/49 endings", "System", "Owner price", "Band rules by price range", "Ends 49/99", "Ugly endings", "P0", "New (proposed)", "Product", ""],
    ["M5", "Trust", "Cart = guest menu image price; silent micro-fees", "Guest", "Published", "No Item care lines", "Clean bill", "Fee archaeology", "P0", "Partial", "Product", ""],
    ["M-ITEM", "Menu", "Per-item active/out-of-stock toggle", "Owner", "Item row", "Toggle item off → guest cannot add", "Persists", "Wrong item toggles", "P0", "New from tester", "Tester TC_Action_001", ""],
    ["M-CRUD", "Menu", "Add / Edit / Delete item with validation", "Owner", "Menu", "CRUD + confirm delete + invalid blocked", "List updates", "Blank name allowed", "P0", "New from tester", "Tester", ""],
    ["M-SRCH", "Menu", "Search / category / sort / scroll", "Owner", "20+ items", "Filter/sort works; clear restores", "Accurate counts", "Stuck filter", "P1", "New from tester", "Tester", ""],
    ["M-UPLD", "Menu", "Upload PDF/JPG quality + reject bad files", "Owner", "Import", "Valid parse; bad format/size rejected", "Clear errors", "500 on bad file", "P0", "Partial", "Tester+Product", ""],
    ["M-CONC", "Menu", "Two admins concurrent edit same item", "Owners", "2 sessions", "Optimistic lock / no silent wipe", "Latest valid fields", "Stale overwrite", "P1", "New from tester", "Tester TC_CONC_001", ""],
    ["C11", "Grow", "Grow hub tabs Offers/Campaigns/Wallet/Poster", "Owner", "Login", "All tabs load", "Data saves", "Blank crash", "P0", "Implemented", "Product", ""],
    ["C12", "Grow Games", "Spin/scratch config + Better luck + weights=100%", "Owner", "Offers", "Configure segments; guest plays via sticker", "Weights validated", "0% still wins", "P0", "Partial", "Tester+Product", ""],
    ["K1", "Campaigns", "Auto programs when checkbox ON", "System", "ON + wallet", "Scheduler sends", "Eligible only", "Manual-only forever", "P0", "Partial", "Product", ""],
    ["K2", "Campaigns", "Checkbox OFF stops program", "Owner", "Was ON", "Uncheck → no sends", "State persists", "Still sends", "P0", "Implemented", "Tester+Product", ""],
    ["K3", "Poster", "AI poster ONLY manual trigger + validity", "Owner", "Wallet", "Generate/approve/bind dish/expiry", "Expired dead", "Auto like campaigns", "P0", "Partial", "Product", ""],
    ["K-WIZ", "Campaigns", "New campaign 4-step wizard + mock Kapso send", "Owner", "Campaigns tab", "Audience→Message→Schedule→Review; Send now mock", "Exact labels per tester", "Live WA claimed falsely", "P0", "New from tester", "Tester TC-CAMP", ""],
    ["K-SHIELD", "Campaigns", "Spam shield UI 1 msg / 7 days (current code)", "System", "Broadcasts", "Skip recent; show skipped count", "Shield not a switch", "Click disables cap", "P0", "New from tester", "Tester", "Product wants 6h/1h later"],
    ["WAL", "Wallet", "Balance, spendable, ₹1000 reserved, packs, history filters", "Owner", "Grow wallet", "Stub/live topup; All/Top-ups/Spends; txn detail", "Math correct", "Credits from spendable", "P0", "Partial", "Tester TC-WAL", ""],
    ["ORD", "Orders", "List / Kitchen / Menu86 / Redeem + detail dialog + Ctrl+K", "Owner", "Orders", "Masked phone; badges; tracking; search routing", "PII safe", "Full phone shown", "P0", "New from tester", "Tester TC-ORD", ""],
    ["NOTIF", "Nav", "Notification bell badge + realtime + mute", "Owner", "CRM open", "Badge/list/mark read; sound toggle", "Realtime without F5", "Badge stuck", "P1", "New from tester", "Tester TC_NOTIF", ""],
    ["S1-S3", "Stickers", "Request batch; YUMM validity; one scan burns code", "Owner/Ops/Guest", "Active kitchen", "Print kit; expire; collapse", "No infinite farm", "Reusable code", "P0", "Partial", "Product", ""],
    ["C20-C25", "Growth CRM", "Commission report, sticker funnel, co-fund first Direct, busy-hour, reheat, home ticker", "Owner/System", "Varies", "See product bible", "Metrics true", "Vanity only", "P1-P2", "Mixed/New", "Product Part7", ""],
]

PRODUCT_GUEST = [
    ["G1", "Scan", "Sticker opens that kitchen only", "Guest", "Valid code", "Scan → kitchen", "Correct restaurantId", "All-hub generic", "P0", "Partial", "Product", ""],
    ["G1b", "Anti-abuse", "Max 5 unredeemed same-type wins", "Guest", "Has wins", "Block 6th until redeem", "Message clear", "Unlimited farm", "P0", "Missing", "Product", ""],
    ["G2", "Games", "Spin/scratch after scan; one play per burned code", "Guest", "Unused code", "Play → claim", "One play", "Replay code", "P0", "Partial", "Product+Tester", ""],
    ["G2b", "Conversion", "10-min claim timer after win", "Guest", "Won", "Countdown; expire policy", "Urgency UI", "Forever wins", "P0", "New (proposed)", "Product Part7", ""],
    ["G3", "Delivery", "First Direct delivery free", "Guest", "First order", "Checkout ₹0 delivery", "Second charged", "Always free", "P0", "Implemented", "Product", ""],
    ["G4", "Delivery", "15d idle → 20% delivery waiver YUMM", "Guest", "Idle 15d", "Checkout discount delivery", "Platform funded", "Food winback confusion", "P1", "Missing", "Product", ""],
    ["G5", "Streak", "Cross-kitchen streak pool", "Guest", "Orders", "Advance streak; rewards", "Visible counter", "None", "P1", "Missing", "Product", ""],
    ["G6", "Refer", "Both sides ₹100–200 / scratch", "Guests", "Code", "Share → qualify → credit", "Once each", "UI only", "P1", "Partial", "Product", ""],
    ["G7-G8", "Wallet/Rewards", "Streak vs rewards; YUMM vs kitchen sections", "Guest", "Credits", "Open wallet/rewards", "Clear split", "Mixed mess", "P1", "Partial", "Product", ""],
    ["G9", "Hub", "Search restaurant/dish; filters", "Guest", "Hub data", "Search+filter", "Relevant", "Broken dish search", "P0", "Partial", "Product", ""],
    ["G10", "Spark", "Scan → WA opt-in → link → app", "Guest", "Scan", "Consent + deep link", "Stored consent", "Blast without opt-in", "P0", "Partial", "Product", ""],
    ["G10b", "GPS", "Ask once; re-ask if moved", "Guest", "App", "Location rules", "No nag same area", "Every page ask", "P0", "Partial", "Product", ""],
    ["G11", "Geo hub", "Nearby first then widen", "Guest", "GPS", "Geo sort + Beyond label", "Nearby first", "Ignores GPS", "P0", "Partial", "Product", ""],
    ["G12", "Merch", "Savings vs other apps UI", "Guest", "Prices", "Strike/compare", "Clear", "Confusing", "P1", "Partial", "Product", ""],
    ["G14-G16", "Spark rules", "Shortest validity; 6h lock; 1h if ultra-short", "System", "Multi eligible", "Scheduler rules", "No spam", "7d only today", "P0", "Missing", "Product", "vs tester 7d shield"],
    ["G17", "Trust", "Tap guest menu image proof", "Guest", "M3", "Open image = cart prices", "Match", "Mismatch", "P0", "Missing", "Product", ""],
    ["G18-G22", "Retention UX", "Reorder, exclusive dish, rating scratch, group order, tracking", "Guest", "Varies", "See bible", "Works", "Missing", "P1-P2", "Mixed/New", "Product Part7", ""],
    ["G23", "ONDC", "Direct offers vs ONDC platform offers", "Guest", "Mixed hub", "Branch by source", "No false kitchen claim", "Wrong offers", "P1", "Partial", "Product", ""],
    ["G25", "Bill", "Silent micro-fees folded", "Guest", "Checkout", "Food+delivery only lines", "Clean", "Fee rows", "P0", "Partial", "Product", ""],
    ["X2-X9", "Growth extras", "Rain help, sold-out regen, favorites WA, pin unfinished win, opt-in gate spin, menu-match badge, quiet hours", "Guest/System", "Varies", "Part 7", "As specified", "—", "P1-P2", "New (proposed)", "Product Part7", ""],
]


def tc(tid, module, feature, scenario, pre, steps, exp, neg, prio, source, related="", notes=""):
    return [tid, module, feature, scenario, pre, steps, exp, neg, prio, source, related, notes]


# ---------------------------------------------------------------------------
# CRM minute-level tests: tester verbatim-normalized + expanded
# ---------------------------------------------------------------------------
def crm_tests():
    rows = []
    # --- From tester Menu ---
    rows += [
        tc("TC_M01", "Menu", "Page load", "Menu page renders for authenticated session", "Signed-in owner", "Open /menu. Wait load. Check categories, items, prices, action buttons. Open browser console.", "Loads ≤3s; UI complete; no JS errors", "Infinite spinner, 500, broken CSS/HTML", "P0", "Tester", "M-CRUD"),
        tc("TC_M02", "Menu", "Empty state", "No items/categories", "Kitchen with empty menu", "Open /menu", 'Empty banner + "Add Item" CTA', "Blank white / infinite skeleton / null crash", "P0", "Tester", "M-CRUD"),
        tc("TC_M03", "Menu", "Master menu toggle", "Initial toggle matches backend", "Known active/inactive menu flag", "Open /menu; read toggle + tooltip", "Matches DB; label accurate", "Wrong default; spinner forever", "P0", "Tester", "M-TOGGLE"),
        tc("TC_M04", "Menu", "Master menu toggle", "Turn OFF hides entire menu", "Menu ON with items", "Turn OFF toggle", "Gray/inactive; catalog hidden; inactive message", "Items still visible/interactive", "P0", "Tester", "M-TOGGLE"),
        tc("TC_M05", "Menu", "Master menu toggle", "Turn ON restores menu", "Menu OFF", "Turn ON", "Green; full catalog without hard refresh", "Needs F5; blank cards", "P0", "Tester", "M-TOGGLE"),
        tc("TC_M06", "Menu", "Master menu toggle", "Network fail on toggle", "Break toggle API", "Toggle; observe", "Reverts; toast Failed…; visibility unchanged", "Local hide while backend failed", "P0", "Tester", "M-TOGGLE"),
        tc("TC_M07", "Menu", "Permissions", "Unauthorized cannot toggle", "Read-only role if exists", "Try toggle", "Disabled or 403; state unchanged", "Silent UI toggle", "P1", "Tester", ""),
        tc("TC_M08", "Menu", "Master menu toggle", "Persistence + guest impact", "Toggle OFF", "Refresh CRM; open guest restaurant menu", "CRM stays OFF; guest cannot order/see menu", "Refresh resets; guest still orders", "P0", "Tester", "M-TOGGLE"),
        tc("TC_SRCH_001", "Menu", "Search box", "Realtime filter items", "Many items", "Type partial name; special chars", "Instant filter; no reload", "Case break; crash on symbols", "P0", "Tester", "M-SRCH"),
        tc("TC_SRCH_002", "Menu", "Search clear", "Clear restores full list", "Filtered list", "Clear search", "Full list back", "Stuck filtered", "P0", "Tester", "M-SRCH"),
        tc("TC_Action_001", "Menu", "Item On/Off", "Disable one item", "Item active", "Toggle item off; refresh; check guest", "Out of stock/inactive saved; guest cannot add", "Reverts; wrong item", "P0", "Tester", "M-ITEM"),
        tc("TC_Action_002", "Menu", "Edit button", "Edit item details", "Existing item", "Edit name/price; save", "Card updates; toast; modal had current data", "Empty name/negative price allowed", "P0", "Tester", "M-CRUD"),
        tc("TC_Action_003", "Menu", "Delete button", "Delete with confirm", "Existing item", "Delete → Cancel; Delete → Confirm", "Cancel keeps; Confirm removes from UI+DB", "No confirm; ghost until reload", "P0", "Tester", "M-CRUD"),
        tc("TC_ADD_001", "Menu", "Add item", "Add valid single item", "Menu page", "Add Item; fill required; submit once", "Appears in list; form clears", "Double-submit duplicates; blank required pass", "P0", "Tester", "M-CRUD"),
        tc("TC_ALL_001", "Menu", "Category + pagination", "Filter category with 20+ items", "Categorized catalog", "Select category; page/scroll", "Only that category; counts align", "Page not reset → empty page", "P1", "Tester", "M-SRCH"),
        tc("TC_UPLD_001", "Menu", "Upload menu", "Valid PDF/JPG/PNG upload", "Import entry", "Open upload; select valid file", "Progress; OCR/attach success toast", "Valid rejected; UI freeze no progress", "P0", "Tester", "M-UPLD"),
        tc("TC_UPLD_002", "Menu", "Upload menu", "Reject bad format/oversized", "Upload modal", "Try .exe / huge file", "Client reject clear message", "500; silent upload", "P0", "Tester", "M-UPLD"),
        tc("TC_CONC_001", "Menu", "Concurrency", "Two admins edit same item", "2 sessions", "A price ₹250; B status Inactive same second", "No silent field wipe; consistent result", "Stale overwrite unrelated fields", "P1", "Tester", "M-CONC"),
        tc("TC_SORT_001", "Menu", "Sort/filter", "Price asc / veg tag", "Mixed catalog", "Sort low-high; filter veg", "Numeric sort; veg only", "₹100 before ₹20 alpha; wrong exclude", "P1", "Tester", "M-SRCH"),
        tc("TC_NOTIF_001", "CRM Nav", "Bell icon", "Open notifications; clear badge", "Unread >0", "Click bell; mark read", "List+timestamps; badge →0", "Won't open; badge stuck", "P1", "Tester", "NOTIF"),
        tc("TC_NOTIF_002", "CRM Nav", "Bell realtime", "New order increments badge/sound", "Menu page open", "Place guest order; mute test", "Badge++ without F5; sound if unmuted", "Needs refresh; sound loop", "P1", "Tester", "NOTIF"),
    ]
    # Grow offers from tester
    rows += [
        tc("TC_GROW_001", "Grow Offers", "Tab load", "Default offers tab", "Login", "Open /grow?tab=offers", "Offers highlighted; cards render", "Invalid tab crashes", "P0", "Tester", "C11"),
        tc("TC_GROW_002", "Grow Offers", "List data", "Offer cards metadata", "Offers exist", "Inspect cards", "Title, reward, expiry, status, CTA", "Empty without placeholder", "P0", "Tester", "C12"),
        tc("TC_GROW_003", "Grow Offers", "Status filters", "Active/Draft/Expired/Paused", "Mixed statuses", "Click each filter", "List matches; URL ok", "Contradictory = infinite loader", "P1", "Tester", "C12"),
        tc("TC_GROW_004", "Grow Offers", "Search", "Search title/code", "Offers exist", "Type title; try <script>", "Realtime filter; sanitized no XSS", "Crash on symbols", "P1", "Tester", "C12"),
        tc("TC_GROW_005", "Grow Offers", "Create", "Happy path new offer", "Offers tab", "Create; fill; submit", "Toast; list append; modal close", "Network fail loses form", "P0", "Tester", "C12"),
        tc("TC_GROW_006", "Grow Offers", "Validation", "Blank/negative/end before start", "Create modal", "Submit invalid", "Inline errors; blocked", "End<start allowed", "P0", "Tester", "C12"),
        tc("TC_GROW_007", "Grow Offers", "Edit", "Edit discount/desc", "Existing offer", "Edit save", "UI updates; toast", "Silent overwrite concurrency", "P0", "Tester", "C12"),
        tc("TC_GROW_008", "Grow Offers", "Activate toggle", "Deactivate/pause", "Active offer", "Toggle; double-click rapidly", "Status badge updates; debounced", "Duplicate API storms", "P0", "Tester", "C12"),
        tc("TC_GROW_009", "Grow Offers", "Delete", "Confirm archive/delete", "Offer exists", "Delete confirm/cancel; force 500", "Cancel safe; confirm removed; 500 keeps+alert", "No confirm", "P0", "Tester", "C12"),
        tc("TC_GROW_010", "Grow Offers", "Pagination", "20+ offers", "Many offers", "Next/scroll; ?page=9999", "Loads; OOB safe", "Crash OOB", "P2", "Tester", "C12"),
        tc("TC_GROW_011", "Grow Offers", "Responsive", "375px / 768px", "Offers page", "Resize", "Usable touch targets", "Overlapping buttons", "P2", "Tester", "C12"),
        tc("TC_GROW_012", "Grow Offers", "Auth guard", "No session / read-only", "Cleared cookie", "Open /grow?tab=offers", "Redirect login with return; RO disabled actions", "Edit without auth", "P0", "Tester", "C11"),
    ]
    # Spin from tester
    rows += [
        tc("TC_SPIN_001", "Grow Spin", "Preview wheel", "Wheel renders segments", "Spin config", "Open preview", "Segments+labels+pointer", "Broken images only", "P0", "Tester", "C12"),
        tc("TC_SPIN_002", "Grow Spin", "Spin animation", "Stops on server winner", "Playable", "Spin Now", "Aligns to server slice; win modal", "Stuck between slices forever", "P0", "Tester", "C12"),
        tc("TC_SPIN_003", "Grow Spin", "Reward code", "Coupon after win", "Winning spin", "Inspect modal", "Code/copy/profile save", "Expired campaign eats quota wrongly", "P0", "Tester", "C12"),
        tc("TC_SPIN_004", "Grow Spin", "Daily limit", "Second spin blocked", "Limit 1/day used", "Try again; spam click", "Disabled+message; 1 API only", "Multi awards", "P0", "Tester", "C12"),
        tc("TC_SPIN_005", "Grow Spin", "Weights", "0% never wins; total 100%", "Admin weights", "Set 90/0; save invalid totals", "0% never; validate 100%", "0% wins; 80% total accepted", "P0", "Tester", "C12"),
        tc("TC_SPIN_006", "Grow Spin", "Lead gate", "Form before spin if enabled", "Gate on", "Invalid email; valid submit", "Blocks invalid; unlocks wheel", "Empty passes", "P1", "Tester", "C12"),
        tc("TC_SPIN_007", "Grow Spin", "Redeem", "Apply spin code checkout", "Won code", "Apply in guest checkout", "Discount applies; single-use", "Reuse works", "P0", "Tester", "C12"),
        tc("TC_SPIN_008", "Grow Spin", "Offline mid-spin", "Disconnect during spin", "Spinning", "Kill network; restore", "Graceful reconcile; no lost token", "Crash eats spin", "P1", "Tester", "C12"),
        tc("TC_SPIN_009", "Grow Spin", "Admin CRUD slices", "Add/edit/delete segments", "Admin", "CRUD; reload guest", "Live UI matches; warn delete-in-use", "Silent delete active", "P0", "Tester", "C12"),
        tc("TC_SPIN_010", "Grow Spin", "Mobile", "Touch spin", "Phone", "Tap/swipe spin", "Fits viewport; close works", "Overflow cut labels", "P1", "Tester", "C12"),
    ]
    # Campaigns tester
    rows += [
        tc("TC-CAMP-01", "Campaigns", "Page load", "Campaigns tab valid session", "Login", "Open /grow?tab=campaigns", "Grow heading; Campaigns selected; left columns present", "Invalid session; stuck Loading", "P0", "Tester", "K1"),
        tc("TC-CAMP-02", "Campaigns", "Header + shield", "Broadcast header & 7d shield copy", "Any campaigns mix", "Read header+shield", "Active badge excludes Sent/Failed; shield not a switch", "Click disables cap", "P0", "Tester", "K-SHIELD"),
        tc("TC-CAMP-03", "Campaigns", "Program catalog", "Automated programs load", "Programs API", "Read enabled+disabled rows", "On/Off; Offer:; Template: if any", "False empty on error", "P0", "Tester", "K1"),
        tc("TC-CAMP-04", "Campaigns", "Program checkbox", "Toggle program on/off", "Programs listed", "Check/uncheck; leave tab return", "Disabled while saving; persists; count ±1", "Failed save flips UI", "P0", "Tester", "K2"),
        tc("TC-CAMP-05", "Campaigns", "Empty broadcasts", "No manual campaigns", "Empty list", "Open Campaigns", "No manual broadcasts yet copy; New campaign available", "Empty shows Load failed", "P1", "Tester", "K-WIZ"),
        tc("TC-CAMP-06", "Campaigns", "Broadcast cards", "Status pills audience cost schedule", "Draft/Scheduled/Sent/Failed exist", "Read one card each", "Fields correct; Send now only Scheduled", "Invalid Date; send on Sent", "P0", "Tester", "K-WIZ"),
        tc("TC-CAMP-07", "Campaigns", "Send now mock", "Mock Kapso dispatch", "Scheduled card", "Click Send now; double click; force fail", "Sending…; reload; fail keeps Scheduled", "Double send; called live WA", "P0", "Tester", "K-WIZ"),
        tc("TC-CAMP-08", "Campaigns", "Wizard open/close", "4 steps dialog", "Campaigns", "New campaign; Next/Back/Close", "Step 1–4; Back disabled on 1; backdrop/Esc don't close", "Esc closes; progress desync", "P0", "Tester", "K-WIZ"),
        tc("TC-CAMP-09", "Campaigns", "Audience step", "Name required + preview math", "Wizard step1", "Blank name; radios; shortfall link", "Name your campaign; preview debit/wallet; topup link", "Next with blank name", "P0", "Tester", "K-WIZ"),
        tc("TC-CAMP-10", "Campaigns", "Template step", "Approved templates only", "Step2", "Dropdown; block templates API", "Kapso-approved only; Next blocked if empty", "Free-type template", "P0", "Tester", "K-WIZ"),
    ]
    # Wallet tester
    rows += [
        tc("TC-WAL-01", "Wallet", "Balance card", "Balance/spendable/reserved/credits", "Wallet API", "Open /grow?tab=wallet; compare API", "Spendable never <0; reserved default ₹1000; credits from balance/msg cost", "Credits from spendable; Refresh header doesn't fetch wallet", "P0", "Tester", "WAL"),
        tc("TC-WAL-02", "Wallet", "Top-up packs", "Stub vs Razorpay packs", "Wallet tab", "Click pack stub; live pay/close; double click", "Stub credits; live only after success; buttons … disabled", "Credit before Razorpay; double credit", "P0", "Tester", "WAL"),
        tc("TC-WAL-03", "Wallet", "History filters", "All / Top-ups / Spends", "Mixed ledger", "Switch filters", "Rules per kind/amount; empty copy correct", "Top-up under Spends wrongly", "P0", "Tester", "WAL"),
        tc("TC-WAL-04", "Wallet", "Txn detail dialog", "Open row details", "History rows", "Open credit+spend; close X/Close/backdrop", "Currency not paise; no null fields", "undefined rows", "P0", "Tester", "WAL"),
        tc("TC-WAL-05", "Wallet", "Errors", "Load fail / topup fail", "Block APIs", "Open tab; fail topup; recover", "Load failed replaces card; topup fail keeps balance", "Stuck Loading… / … buttons", "P0", "Tester", "WAL"),
    ]
    # Orders tester
    rows += [
        tc("TC-ORD-01", "Orders", "List load", "Orders list session", "Login", "Open /orders", "Headers Order Guest Status Discount Total When", "Stuck Loading; full empty wrong", "P0", "Tester", "ORD"),
        tc("TC-ORD-02", "Orders", "Section nav", "List/Kitchen/Menu86/Redeem", "Orders", "Click each section", "Correct routes; List selected back", "Kitchen UI on List", "P0", "Tester", "ORD"),
        tc("TC-ORD-03", "Orders", "Row fields", "Masked phone + amounts", "Orders with/without phone/discount", "Compare row vs source", "# + 8 chars; •••• last4; — for zero discount", "Full phone; ₹0 discount; raw paise", "P0", "Tester", "ORD"),
        tc("TC-ORD-04", "Orders", "Status badges", "Color by status", "Mixed statuses", "Inspect badges", "READY/DISPATCHED/DELIVERED green; CANCELLED/FAILED amber; PAID lime; else gray", "Wrong colors", "P0", "Tester", "ORD"),
        tc("TC-ORD-05", "Orders", "Empty list", "No orders", "Empty restaurant", "Open /orders", "No orders yet copy; headers remain", "Empty as Load failed", "P1", "Tester", "ORD"),
        tc("TC-ORD-06", "Orders", "Refresh errors", "Fail then Refresh", "Block API", "Open; restore; Refresh; fail again", "Error above headers; keep rows on fail refresh", "Fail shown as zero orders", "P0", "Tester", "ORD"),
        tc("TC-ORD-07", "Orders", "Open detail", "Click/Enter/Space", "Order row", "Open via mouse/keyboard", "Order details dialog; #DM- title", "Navigate away", "P0", "Tester", "ORD"),
        tc("TC-ORD-08", "Orders", "Detail content", "Guest money address items", "Rich + sparse orders", "Open both", "Masked guest; PIN; fees only >0; line totals", "Full phone; zero fee row", "P0", "Tester", "ORD"),
        tc("TC-ORD-09", "Orders", "Friendly status", "Label vs code", "Many statuses", "Open details", "PAID/ACCEPTED/PREPARING→Preparing; DISPATCHED→Out for delivery; etc", "PAID labeled Served", "P1", "Tester", "ORD"),
        tc("TC-ORD-10", "Orders", "Tracking + SLA", "Shipment + prep deadline", "With/without shipment", "Open; Track shipment", "New tab track; no empty blocks", "Dead track link", "P0", "Tester", "ORD"),
        tc("TC-ORD-11", "Orders", "Close dialog", "X / Close / backdrop / Open kitchen", "Dialog open", "Close variants; Open kitchen", "List intact; kitchen route", "Esc closes (if product says no); click inside closes", "P1", "Tester", "ORD"),
        tc("TC-ORD-12", "Orders", "Header search Ctrl+K", "Find order routing", "Orders exist", "Ctrl+K; pick in-progress vs finished", "In-progress→kitchen; finished→/orders; no full phone", "Wrong screen; opens detail only", "P0", "Tester", "ORD"),
    ]

    # Expanded minute CRM — onboarding, settings, stickers, poster, kitchen, redeem, dual menu
    exp = [
        tc("TC-ONB-01", "Onboarding", "Start page", "Start page loads", "Logged out", "Open /start", "Onboarding/login UI", "Blank crash", "P0", "Expanded", "C1"),
        tc("TC-ONB-02", "Onboarding", "Required fields", "Submit without name/phone/email", "Form open", "Submit empty", "Inline errors; no API success", "Creates kitchen", "P0", "Expanded", "C1"),
        tc("TC-ONB-03", "Onboarding", "FSSAI", "Valid vs invalid FSSAI", "Form", "Enter bad then good FSSAI", "Verify feedback", "Accepts garbage silently", "P0", "Expanded", "C1"),
        tc("TC-ONB-04", "Onboarding", "GPS pin", "Precise location required", "Form", "Skip pin vs set pin", "Pin saved lat/lng", "Submit without location if mandatory", "P0", "Expanded", "C1"),
        tc("TC-ONB-05", "Onboarding", "Partners email", "partners@damigos.in notified", "Submit app", "Submit; check ops inbox/logs", "Email sent with kitchen id", "No email", "P0", "Expanded", "C1"),
        tc("TC-ONB-06", "Onboarding", "Curl activate", "Ops curl marks ACTIVE", "PENDING app", "Run activation", "Owner can login", "Still PENDING", "P0", "Expanded", "C1"),
        tc("TC-ONB-07", "Brand", "Logo upload", "Upload logo PNG", "Settings/onboarding", "Upload valid logo", "Shows on CRM+guest", "Broken image", "P0", "Expanded", "C2"),
        tc("TC-ONB-08", "Brand", "Exclusive pool", "Pick graphic; second kitchen cannot", "Two kitchens", "Kitchen A picks asset X; B opens pool", "X absent for B", "Both can pick X", "P0", "Expanded", "C2"),
        tc("TC-PAY-01", "Payout", "Settings bank form", "Save account fields", "Settings payout", "Enter account/IFSC; save", "Persisted", "Accepts invalid IFSC without warn", "P0", "Expanded", "C4"),
        tc("TC-PAY-02", "Payout", "First login dialog", "Bank dialog on first login", "New owner", "Login first time", "Dialog before main CRM", "No prompt", "P0", "Expanded", "C4"),
        tc("TC-WAL-ONB-01", "Wallet", "Onboarding ₹1000", "Claim welcome credit", "First login", "Redeem animation", "Balance +1000; once only", "Claim twice", "P0", "Expanded", "C4.1"),
        tc("TC-WAL-NAV-01", "Wallet", "Navbar balance", "Shows balance + tooltip", "Credited wallet", "Hover navbar wallet", "Tooltip AI/campaigns/scan", "Missing", "P1", "Expanded", "C17"),
        tc("TC-MENU-IMG-01", "Menu images", "Download owner board", "After price edit download", "Menu with items", "Change price; generate; download", "File prices match CRM", "Old prices", "P0", "Expanded", "M2"),
        tc("TC-MENU-IMG-02", "Menu images", "Guest image after publish", "Publish creates guest board", "Draft ready", "Publish; open guest restaurant menu image", "Guest prices 99/49 rules", "Owner prices shown to guest", "P0", "Expanded", "M3"),
        tc("TC-MENU-IMG-03", "Menu images", "Image↔cart lock", "Dish ₹299 image = cart", "Guest image live", "Add dish from menu", "Cart ₹299", "Mismatch", "P0", "Expanded", "M5"),
        tc("TC-MENU-IMG-04", "Menu images", "Hover zoom + refetch", "CRM thumb zoom/refetch", "Item with image", "Hover; click refetch", "Zoom; new mapping possible", "No control", "P1", "Expanded", "M8"),
        tc("TC-MENU-RULE-01", "Pricing", "Band ₹100–200 → ~+5 → x99", "Compute guest price", "Owner ₹180", "Publish; check guest price", "Ends 99; delta ~5–15 policy", "₹185 ugly", "P0", "Expanded", "M4"),
        tc("TC-MENU-RULE-02", "Pricing", "Band ₹250–350 → ~+10 → 99/49", "Owner ₹300", "Publish", "Check guest", "299/309/349 per rule table", "Arbitrary", "P0", "Expanded", "M4"),
        tc("TC-STK-01", "Stickers", "Request batch", "Request N stickers", "Settings stickers", "Request 50", "Batch 50 codes restaurant-bound", "Wrong kitchen codes", "P0", "Expanded", "S1-S3"),
        tc("TC-STK-02", "Stickers", "YUMM validity", "Ops sets expiry", "Batch", "Set expires yesterday; scan", "No new win; friendly message", "Still wins", "P0", "Expanded", "S1-S3"),
        tc("TC-STK-03", "Stickers", "Burn on scan", "Second scan same code", "Unused code", "Scan twice", "Second collapsed", "Second win", "P0", "Expanded", "S1-S3"),
        tc("TC-STK-04", "Stickers", "Print kit download", "PDF/PNG kit", "Batch ready", "Download print", "QR scannable", "Broken QR", "P1", "Expanded", "C21"),
        tc("TC-POST-01", "Poster", "Generate variants", "AI poster manual", "Wallet>0", "Enter headline; generate", "Variants shown; wallet debit rule", "Auto without click", "P0", "Expanded", "K3"),
        tc("TC-POST-02", "Poster", "Approve + validity", "Bind dish + expiry", "Generated", "Approve; set 3 days; wait/simulate expiry", "Offer expires with poster", "Lives forever", "P0", "Expanded", "K3"),
        tc("TC-KIT-01", "Kitchen board", "Lanes load", "Open /orders/kitchen", "PAID orders", "Open kitchen", "Live dot; lanes; sound control", "Blank", "P0", "Expanded", "ORD"),
        tc("TC-KIT-02", "Kitchen board", "Advance status", "Accept → prep → ready", "PAID order", "Move statuses", "Guest/order updates", "Illegal skip without warn", "P0", "Expanded", "ORD"),
        tc("TC-STOCK-01", "Menu 86", "Stock page", "Open /orders/stock", "Restaurant linked", "Open Menu 86", "Stock UI", "Select restaurant empty wrong", "P1", "Expanded", "ORD"),
        tc("TC-RDM-01", "Redeem", "Counter redeem wallet", "Redeem guest credits", "Guest with credits", "Open /orders/redeem; wallet mode", "Burns real balance; kitchen wallet credit", "Fake ₹150", "P0", "Expanded", "ORD"),
        tc("TC-RDM-02", "Redeem", "Counter redeem claim", "Claim mode", "Open claim", "mode=claim", "Closes claim; no fake wallet", "Wrong mode", "P0", "Expanded", "ORD"),
        tc("TC-SET-01", "Settings", "Settings page load", "Open /settings", "Login", "Open settings sections", "Brand/location/payout/stickers reachable", "Crash", "P0", "Expanded", "C4"),
        tc("TC-SET-02", "Settings", "Location panel", "Save lat/lng", "Settings location", "Set pin save", "Persists", "Lost on refresh", "P0", "Expanded", "C1"),
        tc("TC-HOME-01", "Dashboard", "Home KPIs", "Scans/orders/wallet visible", "Activity exists", "Open CRM home", "Numbers match APIs", "Always zero", "P1", "Expanded", "C24"),
        tc("TC-CAMP-MSG-01", "Campaigns", "Checkbox OFF no auto send", "Disable weekend program", "Was sending", "Uncheck; wait schedule window", "No new weekend msgs", "Still sends", "P0", "Expanded", "K2"),
        tc("TC-CAMP-AUTO-01", "Campaigns", "Auto run when ON", "Eligible guest gets program", "Program ON wallet OK", "Make guest eligible; wait job", "Msg or queue entry created", "Nothing forever", "P0", "Expanded", "K1"),
    ]
    rows.extend(exp)
    return rows


def guest_tests():
    rows = []
    # Hub
    rows += [
        tc("TC-GHUB-01", "Hub", "Hub load", "Hub loads kitchens", "Guest session", "Open /hub", "Restaurant list/cards", "Blank forever", "P0", "Expanded", "G9"),
        tc("TC-GHUB-02", "Hub", "Kitchen card fields", "Name, cover, sample dish, rating/ETA if shown", "Listed kitchens", "Inspect card", "No undefined; images or placeholder", "Broken layout", "P0", "Expanded", "G9"),
        tc("TC-GHUB-03", "Hub", "Search page", "Open /hub/search", "Hub", "Search restaurant name", "Matches", "No results when should", "P0", "Expanded", "G9"),
        tc("TC-GHUB-04", "Hub", "Dish search", "Search dish name", "Menus published", "Type dish", "Restaurants with dish", "Restaurant-only search", "P0", "Expanded", "G9"),
        tc("TC-GHUB-05", "Hub", "Veg filter", "Veg toggle", "Mixed menus", "Enable veg", "Only veg", "Non-veg remains", "P0", "Expanded", "G9"),
        tc("TC-GHUB-06", "Hub", "Under 149 / bestsellers", "Collection under 149", "Priced items", "Open bestsellers/under 149", "Items ≤149 guest price", ">149 included", "P1", "Expanded", "G9"),
        tc("TC-GHUB-07", "Hub", "Healthy collection", "Healthy slug", "Collection data", "Open collections/healthy", "Relevant items", "404 crash", "P1", "Expanded", "G9"),
        tc("TC-GHUB-08", "Hub", "Geo nearby first", "With GPS", "Location allowed", "Open hub", "Nearby kitchens first", "Ignores GPS", "P0", "Expanded", "G11"),
        tc("TC-GHUB-09", "Hub", "Widen area label", "Scroll beyond radius", "GPS on", "Scroll more", "Beyond your area label", "Silent far kitchens unmarked", "P1", "Expanded", "G11"),
        tc("TC-GHUB-10", "Hub", "Unredeemed win pin", "Kitchen with claim first", "Unredeemed claim", "Open hub", "That kitchen boosted + CTA", "Buried", "P1", "Expanded", "X6"),
        tc("TC-GHUB-11", "Hub", "Save & win page", "Open save-and-win", "Guest", "Open /hub/save-and-win", "Refer UI loads", "Crash", "P1", "Expanded", "G6"),
    ]
    # Scan / Spark
    rows += [
        tc("TC-GSCAN-01", "Scan", "Valid token", "Open /s/{token}", "Unused valid sticker", "Open link", "Redirect Spark/kitchen", "scan-error wrongly", "P0", "Expanded", "G1"),
        tc("TC-GSCAN-02", "Scan", "Invalid token", "Bad token", "—", "Open /s/bad", "Friendly scan-error", "500 stack", "P0", "Expanded", "G1"),
        tc("TC-GSCAN-03", "Scan", "Expired bundle", "YUMM expired batch", "Expired code", "Scan", "Expired message; no new win", "Still spins", "P0", "Expanded", "S2"),
        tc("TC-GSCAN-04", "Scan", "Burned code", "Rescan used code", "Already scanned", "Scan again", "Already used", "Second win", "P0", "Expanded", "S3"),
        tc("TC-GSCAN-05", "Scan", "Restaurant lock", "Code kitchen A", "Token A", "Land flow", "Only kitchen A", "Kitchen B", "P0", "Expanded", "G1"),
        tc("TC-GSPARK-01", "Spark", "Page load", "Open /wa/spark", "From scan", "Load spark", "Opt-in UI + CTA", "Blank", "P0", "Expanded", "G10"),
        tc("TC-GSPARK-02", "Spark", "Opt-in marketing", "Accept marketing", "Spark", "Opt in", "Consent stored marketing=true", "No store still blast", "P0", "Expanded", "G10"),
        tc("TC-GSPARK-03", "Spark", "Decline / skip policy", "Skip opt-in", "Spark", "Skip if allowed", "Browse ok; spin gated if X7", "Forced order block", "P1", "Expanded", "X7"),
        tc("TC-GSPARK-04", "Spark", "Deep link to app", "Cheesy link opens order", "Opted in", "Tap link", "Opens guest order for kitchen", "404", "P0", "Expanded", "G10"),
        tc("TC-GLOC-01", "Location", "First GPS prompt", "Ask once", "New session", "Open app", "Prompt once", "Every navigation", "P0", "Expanded", "G10b"),
        tc("TC-GLOC-02", "Location", "Deny permission", "GPS denied", "Prompt", "Deny", "Graceful fallback list", "Hard crash", "P0", "Expanded", "G10b"),
        tc("TC-GLOC-03", "Location", "Moved city re-ask", "Far coordinate change", "Had location", "Simulate move", "Re-prompt", "Never re-ask", "P1", "Expanded", "G10b"),
    ]
    # Games / rewards
    rows += [
        tc("TC-GGAME-01", "Rewards", "Spin after scan", "Play spin", "Valid scanId", "Spin", "Result + claim", "Play without scan", "P0", "Expanded", "G2"),
        tc("TC-GGAME-02", "Rewards", "Scratch path", "If scratch configured", "Scratch kitchen", "Play scratch", "Shuffle then reveal", "Broken UI", "P0", "Expanded", "G2"),
        tc("TC-GGAME-03", "Rewards", "Better luck", "Can land Better luck", "Configured", "Play until or force", "Message; no false coupon", "Fake code", "P1", "Expanded", "C12"),
        tc("TC-GGAME-04", "Rewards", "Daily limit", "Hit kitchen daily spin limit", "Limit reached", "Spin again", "Blocked message", "Extra win", "P0", "Expanded", "G2"),
        tc("TC-GGAME-05", "Rewards", "5-in-1 cap", "Sixth unredeemed blocked", "5 unredeemed", "Try new kitchen spin", "Blocked until redeem", "Allows 6th", "P0", "Expanded", "G1b"),
        tc("TC-GGAME-06", "Rewards", "10-min timer", "Claim countdown", "Just won", "See timer; expire", "Expires per policy", "No timer", "P0", "Expanded", "G2b"),
        tc("TC-GREW-01", "Me Rewards", "List claims", "Open /me/rewards", "Claims exist", "Open page", "YUMM vs kitchen split if designed", "Empty wrong", "P0", "Expanded", "G8"),
        tc("TC-GREW-02", "Me Rewards", "Scan rewards entry", "Open /me/rewards/scan", "Guest", "Open", "Scan help UI", "Crash", "P1", "Expanded", "G2"),
        tc("TC-GLOY-01", "Me Loyalty", "Per kitchen credits", "Open /me/loyalty", "Past orders credits", "Open", "Restaurant-level lines", "Wrong totals", "P0", "Expanded", "G7"),
        tc("TC-GWAL-01", "Me Wallet split", "Streak vs rewards buckets", "Open me wallet/profile", "Both types", "Inspect", "Separate labels", "Mixed one number only", "P1", "Expanded", "G7"),
    ]
    # Restaurant / menu / cart
    rows += [
        tc("TC-GR-01", "Restaurant", "Restaurant page", "Open /r/{id}", "HubListed", "Open", "Header+menu entry", "404 active kitchen", "P0", "Expanded", "G9"),
        tc("TC-GR-02", "Restaurant", "Menu page", "Open /r/{id}/menu", "Published", "Open menu", "Dishes+prices", "Draft dishes shown", "P0", "Expanded", "C6"),
        tc("TC-GR-03", "Restaurant", "Guest menu image", "Tap menu board", "guest_menu_image", "Tap image", "Fullscreen; prices visible", "Missing", "P0", "Expanded", "G17"),
        tc("TC-GR-04", "Restaurant", "Menu match badge", "Badge under image", "Image live", "Read badge", "Prices match this menu photo", "None", "P1", "Expanded", "X8"),
        tc("TC-GR-05", "Restaurant", "Add available item", "Add to cart", "Available dish", "Add", "Cart count++", "No feedback", "P0", "Expanded", "G12"),
        tc("TC-GR-06", "Restaurant", "Unavailable item", "Disabled / opacity", "Item off", "Try add", "Cannot add", "Adds anyway", "P0", "Expanded", "M-ITEM"),
        tc("TC-GR-07", "Restaurant", "Price display", "Guest price 99/49", "Markup rules", "Read price", "Ends 49/99", "Owner raw price", "P0", "Expanded", "M4"),
        tc("TC-GR-08", "Restaurant", "Other apps compare", "Strike/compare UI", "referencePrice", "Inspect dish", "Shows other apps band", "Confusing double charge", "P1", "Expanded", "G12"),
        tc("TC-GR-09", "Restaurant", "Veg filter on menu", "Filter dishes", "Mixed", "Toggle veg", "Only veg", "Non-veg left", "P1", "Expanded", "G9"),
        tc("TC-GR-10", "Restaurant", "Exclusive YUMM dish badge", "Only on YUMM", "Flagged dish", "Find badge", "Visible", "Missing", "P2", "Expanded", "G19"),
        tc("TC-GR-11", "Restaurant", "Master menu OFF", "Kitchen toggled menu off", "CRM OFF", "Open guest menu", "Unavailable message", "Still orderable", "P0", "Expanded", "M-TOGGLE"),
    ]
    # Checkout / delivery / payment
    rows += [
        tc("TC-GCHK-01", "Checkout", "Checkout page", "Open checkout", "Cart nonempty", "Open /r/{id}/checkout", "Address+pay UI", "Empty crash", "P0", "Expanded", "G25"),
        tc("TC-GCHK-02", "Checkout", "Bill lines clean", "No fee archaeology", "Cart", "Read bill", "Food + delivery only labels", "Item care / WA fee rows", "P0", "Expanded", "G25"),
        tc("TC-GCHK-03", "Checkout", "Image price lock", "Line = menu image", "Known ₹299 dish", "Checkout", "Line ₹299", "₹280", "P0", "Expanded", "M5"),
        tc("TC-GCHK-04", "Checkout", "First delivery free", "Eligible first order", "Never ordered Direct", "Checkout delivery", "₹0 delivery", "Charged", "P0", "Expanded", "G3"),
        tc("TC-GCHK-05", "Checkout", "Second order delivery", "Not first", "Prior order", "Checkout", "Delivery >0 (unless other offer)", "Still free wrongly", "P0", "Expanded", "G3"),
        tc("TC-GCHK-06", "Checkout", "15d delivery waiver", "Idle 15d", "Old order", "Checkout", "20% delivery off platform", "No waiver", "P1", "Expanded", "G4"),
        tc("TC-GCHK-07", "Checkout", "Apply reward claim", "Attach win", "Unexpired claim", "Apply", "Discount correct", "Expired applies", "P0", "Expanded", "G2"),
        tc("TC-GCHK-08", "Checkout", "Dine-only offer blocked", "Online checkout", "Dine-only offer", "Try apply online", "Rejected", "Applies online", "P0", "Expanded", "C13"),
        tc("TC-GCHK-09", "Checkout", "Address required", "Missing address", "Checkout", "Pay without address", "Blocked", "Allows pay", "P0", "Expanded", "G10b"),
        tc("TC-GCHK-10", "Checkout", "Payment fail page", "Force fail", "Checkout", "Fail pay", "/payment-failed helpful", "Silent lose cart", "P0", "Expanded", "G22"),
        tc("TC-GCHK-11", "Checkout", "ONDC source offers", "ONDC kitchen path", "ONDC item", "Checkout", "No kitchen sticker offer; platform rules", "Kitchen win applied", "P1", "Expanded", "G23"),
        tc("TC-GDEL-01", "Delivery", "ETA shown", "After place order", "Paid order", "Open order detail", "ETA/status", "Blank forever", "P0", "Expanded", "G22"),
        tc("TC-GDEL-02", "Delivery", "Tracking updates", "Webhook status", "Dispatched", "Refresh order", "Status advances", "Stuck PAID", "P0", "Expanded", "G22"),
    ]
    # Me / profile / offers
    rows += [
        tc("TC-GME-01", "Me", "Profile home", "Open /me", "Logged guest", "Open", "Links loyalty/rewards/offers/settings", "Crash", "P0", "Expanded", "G7"),
        tc("TC-GME-02", "Me", "Edit profile", "Open /me/edit", "Guest", "Change name/photo save", "Persists", "Lost", "P1", "Expanded", "—"),
        tc("TC-GME-03", "Me", "Addresses", "CRUD address", "/me/addresses", "Add/edit/delete", "List updates; default works", "Cannot delete last without warn", "P0", "Expanded", "GCHK"),
        tc("TC-GME-04", "Me", "Offers page", "Open /me/offers", "Offers", "Open", "Shows eligible", "Empty wrong", "P1", "Expanded", "G8"),
        tc("TC-GME-05", "Me", "Feedback", "Submit feedback", "/me/feedback", "Submit text", "Success", "500 silent", "P2", "Expanded", "—"),
        tc("TC-GME-06", "Me", "Settings", "Open settings", "/me/settings", "Toggle prefs/quiet hours if any", "Saved", "No-op", "P2", "Expanded", "X9"),
        tc("TC-GME-07", "Me", "About", "Open about", "/me/about", "Open", "Content", "Blank", "P3", "Expanded", "—"),
        tc("TC-GORD-01", "Orders", "Orders list", "Open /orders", "Past orders", "Open", "List statuses", "Empty wrong", "P0", "Expanded", "G22"),
        tc("TC-GORD-02", "Orders", "Order detail", "Open /orders/{id}", "Order exists", "Open", "Items+total+status", "Wrong order", "P0", "Expanded", "G22"),
        tc("TC-GORD-03", "Orders", "Reorder", "Order again CTA", "Past Direct", "Tap reorder", "Cart filled", "Missing", "P1", "Expanded", "G18"),
        tc("TC-GORD-04", "Orders", "Group order", "Open group order", "Supported", "Open /orders/group/{id}", "Group cart UI", "404 always", "P2", "Expanded", "G21"),
        tc("TC-GRATE-01", "Post-order", "Rating ≥4 scratch", "After delivered", "Delivered", "Rate 5", "Scratch reward", "No prompt", "P2", "Expanded", "G20"),
    ]
    # Refer / streak / spark rules guest-observable
    rows += [
        tc("TC-GREF-01", "Refer", "Share code", "Generate/share", "save-and-win", "Share WA", "Code stable", "New code every open abuse", "P1", "Expanded", "G6"),
        tc("TC-GREF-02", "Refer", "Both get credit", "B completes qualify action", "A referred B", "Complete", "Both +₹100–200 once", "Only one side", "P1", "Expanded", "G6"),
        tc("TC-GSTK-01", "Streak", "Streak counter", "Visible after orders", "2 Direct orders", "Open profile/streak", "Count 2", "Missing", "P1", "Expanded", "G5"),
        tc("TC-GSPK-01", "Spark recv", "Shortest validity first", "2 eligible offers", "Guest eligible A 1h B 7d", "Wait send", "Receives A first", "B first", "P0", "Expanded", "G14"),
        tc("TC-GSPK-02", "Spark recv", "6h hard lock", "Got msg from kitchen A", "t0", "Kitchen B eligible within 6h", "No Spark B", "B sends immediately", "P0", "Expanded", "G15"),
        tc("TC-GSPK-03", "Spark recv", "1h lock short TTL", "Offer TTL 1h sent", "After send", "Another eligible", "Lock 1h not 6h", "Blocked 6h wrongly", "P0", "Expanded", "G16"),
        tc("TC-GSPK-04", "Spark recv", "In-app shows all", "Multiple offers", "Eligible many", "Open offers section", "All visible", "Only last WA", "P0", "Expanded", "G14"),
        tc("TC-GONDC-01", "ONDC", "ONDC page", "Open /ondc", "Dev/prod flag", "Open", "Diagnostic or catalog per env", "Unhandled crash", "P2", "Expanded", "G23"),
        tc("TC-GBF-01", "Platform offer", "Breakfast window", "Morning gift", "In window", "Hub shows gift", "₹50–100 band", "All day", "P2", "Expanded", "G24"),
        tc("TC-GRAIN-01", "Platform offer", "Rain delivery help", "Rain rule on", "Checkout", "See subsidy badge", "Only in window", "Always", "P2", "Expanded", "X2"),
    ]
    return rows


def readme(ws):
    ws["A1"] = "YUMM QA Workbook — Product scenarios + minute-level test cases"
    ws["A1"].font = Font(bold=True, size=14, color="8D4A28")
    lines = [
        "",
        "SHEETS",
        "1) Product_CRM — business scenarios (what product must do) including NEW items from tester file.",
        "2) Product_Guest — guest business scenarios + Part 7 growth extras.",
        "3) CRM_TestCases — minute-level QA cases for CRM (Menu, Grow, Spin, Campaigns, Wallet, Orders, Onboarding, Stickers, Poster, Kitchen, Redeem…). Includes ALL cases from tester scenarios.xlxs.xlsx.",
        "4) Guest_TestCases — minute-level QA cases for every guest page/control (Hub, Scan, Spark, GPS, Games, Menu image, Checkout, Me, Orders, Refer, Spark rules…).",
        "",
        "WHAT WAS NEW IN TESTER FILE (merged)",
        "• Master menu ON/OFF toggle + persistence to guest",
        "• Per-item disable, CRUD validation, search/sort/pagination, upload reject, concurrency",
        "• Notification bell realtime",
        "• Grow offers CRUD/filters/auth guard detail",
        "• Spin weights=100%, mid-spin offline, daily limit, mobile",
        "• Campaigns wizard 4 steps, mock Kapso, 7-day spam shield UI copy",
        "• Wallet reserved ₹1000, packs stub/live, history filters, txn dialog",
        "• Orders list/kitchen/stock/redeem, masked phone, badges, detail, Ctrl+K search",
        "",
        "STILL PRODUCT RULES TO REMEMBER WHILE TESTING",
        "• Two menus: OWNER downloadable board vs GUEST 99/49 markup image; cart must match guest image.",
        "• Campaigns automatic when checkbox ON; only AI Poster is manual.",
        "• Stickers: YUMM validity; one scan burns code; 5-in-1 unredeemed cap (guest).",
        "• Target Spark locks 6h/1h (product); current code may still show 7-day shield — test both and file gaps.",
        "",
        "HOW QA USES THIS",
        "Filter Priority=P0 first. Execute Steps exactly. Mark PASS only if Expected matches and Negative did not happen.",
        "Source column: Tester = from your tester Excel; Expanded = added for full coverage; Product = scenario bible.",
        "",
        "Original tester file: Downloads/scenarios.xlxs.xlsx (Sheet1 Menu/Grow/Spin, Sheet2 Campaigns/Wallet, Sheet3 Orders).",
    ]
    for i, line in enumerate(lines, 2):
        ws.cell(i, 1, line)
        bold = line.startswith("SHEETS") or line.startswith("WHAT") or line.startswith("STILL") or line.startswith("HOW") or line.startswith("Original")
        ws.cell(i, 1).font = Font(name="Calibri", size=11, bold=bold)
    ws.column_dimensions["A"].width = 118


def main():
    wb = Workbook()
    ws0 = wb.active
    ws0.title = "README"
    readme(ws0)

    widths_prod = [12, 14, 42, 14, 22, 42, 32, 28, 8, 16, 14, 22]
    ws1 = wb.create_sheet("Product_CRM", 1)
    write_rows(ws1, PROD_HEADERS, PRODUCT_CRM, widths_prod, status_col=10, prio_col=9, header_color="8D4A28")

    ws2 = wb.create_sheet("Product_Guest", 2)
    write_rows(ws2, PROD_HEADERS, PRODUCT_GUEST, widths_prod, status_col=10, prio_col=9, header_color="2F5D4A")

    widths_tc = [14, 14, 20, 36, 22, 42, 36, 30, 8, 12, 14, 18]
    crm = crm_tests()
    guest = guest_tests()
    ws3 = wb.create_sheet("CRM_TestCases", 3)
    write_rows(ws3, TEST_HEADERS, crm, widths_tc, status_col=10, prio_col=9, header_color="7A2F0E")
    # Source col is 10 — color by source keyword
    for r in range(2, len(crm) + 2):
        src = str(ws3.cell(r, 10).value or "")
        if src == "Tester":
            ws3.cell(r, 10).fill = PatternFill("solid", fgColor="E2D5F1")
        elif src == "Expanded":
            ws3.cell(r, 10).fill = PatternFill("solid", fgColor="DDEBF7")

    ws4 = wb.create_sheet("Guest_TestCases", 4)
    write_rows(ws4, TEST_HEADERS, guest, widths_tc, status_col=10, prio_col=9, header_color="1D5C40")
    for r in range(2, len(guest) + 2):
        src = str(ws4.cell(r, 10).value or "")
        if src == "Expanded":
            ws4.cell(r, 10).fill = PatternFill("solid", fgColor="DDEBF7")

    # dropdowns
    for ws, n in ((ws3, len(crm)), (ws4, len(guest))):
        dv = DataValidation(type="list", formula1='"P0,P1,P2,P3"', allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f"I2:I{n+1}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)
    print(f"Wrote {OUT}")
    print(f"Product_CRM={len(PRODUCT_CRM)} Product_Guest={len(PRODUCT_GUEST)}")
    print(f"CRM_TestCases={len(crm)} Guest_TestCases={len(guest)}")


if __name__ == "__main__":
    main()
