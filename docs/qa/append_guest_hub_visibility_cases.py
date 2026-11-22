# -*- coding: utf-8 -*-
"""Append guest hub visibility + CRM storefront cases into YUMM-Full-QA-Scenarios-v2.xlsx."""
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.styles import Alignment, Border, Font, Side

PATH = Path(__file__).resolve().parent / "YUMM-Full-QA-Scenarios-v2.xlsx"
CRM_URL = "https://damigos-crm-web.vercel.app"
GUEST_URL = "https://damigos-guest-web.vercel.app"
THIN = Border(
    left=Side(style="thin", color="E0E0E0"),
    right=Side(style="thin", color="E0E0E0"),
    top=Side(style="thin", color="E0E0E0"),
    bottom=Side(style="thin", color="E0E0E0"),
)
WRAP = Alignment(wrap_text=True, vertical="top")

CRM_CASES = [
    (
        "CRM-GHV-01",
        "Menu",
        "Publish → hub listed",
        "POSITIVE: publish sets hub_listed and clears inactive",
        f"Owner logged in at {CRM_URL}; kitchen has draft items",
        "1. Menu → publish all drafts.\n2. Settings/ops or header toggle → open Guest menu.\n3. Note storefront badge.",
        "Live on guest app (guestVisible=true); publish succeeded.",
        "guestVisible false after publish + open toggle.",
        "P0",
        "C-01.03 / C-03",
    ),
    (
        "CRM-GHV-02",
        "Settings",
        "Guest storefront toggle",
        "POSITIVE: open guest orders sets hub_listed when live menu exists",
        "Published live item (draft=false, available=true)",
        "1. Turn Guest menu On.\n2. Refresh operations panel.",
        "guestVisible true; hubListed true in API /settings/operations.",
        "Toggle on but guestVisible false with live menu.",
        "P0",
        "C-06.03",
    ),
    (
        "CRM-GHV-03",
        "Settings",
        "Storefront blockers",
        "NEGATIVE: amber hint when open but not on hub",
        "Kitchen hubListed false OR inactive true; open toggle",
        "1. Open settings guest storefront panel.\n2. Read amber helper text.",
        "Shows publish or logo/dish photo hint.",
        "No hint while guest cannot see kitchen.",
        "P1",
        "C-06.03",
    ),
    (
        "CRM-GHV-04",
        "Menu",
        "Out of stock in CRM",
        "POSITIVE: mark item unavailable in CRM",
        "Published item on menu",
        "1. Toggle item Available off.\n2. Save.",
        "Item shows unavailable in CRM list.",
        "Still shows available in CRM.",
        "P1",
        "C-03",
    ),
]

GUEST_CASES = [
    (
        "GST-GHV-01",
        "Hub",
        "New kitchen on hub",
        "POSITIVE: published + open kitchen appears on hub",
        "CRM kitchen Bangalore, published, guest open",
        f"1. Open {GUEST_URL}/hub.\n2. Search kitchen name.",
        "Direct kitchen card visible with menu link.",
        "Kitchen missing from hub after publish.",
        "P0",
        "G-07.01",
    ),
    (
        "GST-GHV-02",
        "Menu",
        "Sold out visible",
        "POSITIVE: unavailable dish shows Sold out, no add",
        "Guest menu has item with available=false",
        "1. Open /r/{{restaurantId}}/menu.\n2. Find unavailable dish.",
        "Sold out label; Add disabled.",
        "Item hidden entirely or Add enabled.",
        "P0",
        "G-03.01",
    ),
    (
        "GST-GHV-03",
        "Menu",
        "Ordering paused",
        "POSITIVE: guest off still shows published menu read-only",
        "CRM Guest menu Off; published items exist",
        "1. Open menu deep link.\n2. Read pause banner.",
        "ORDERING_PAUSED banner; dishes listed with prices.",
        "Empty menu or 404.",
        "P0",
        "G-15",
    ),
    (
        "GST-GHV-04",
        "Hub",
        "Published without stored images",
        "POSITIVE: kitchen not auto-inactive when menu published",
        "No logo; catalog-only images; published menu",
        "1. Hit guest-api deploy (ensure schema).\n2. Open hub.",
        "Kitchen still listed as Direct.",
        "Kitchen inactive hidden despite published menu.",
        "P0",
        "G-07.01",
    ),
    (
        "GST-GHV-05",
        "Cart",
        "Sold out blocked",
        "NEGATIVE: cannot add unavailable item to cart",
        "Guest on menu with sold-out item",
        "1. Try Add on sold-out (should be disabled).\n2. If API forced, POST cart add.",
        "Add blocked; cart rejects unavailable.",
        "Unavailable item in cart.",
        "P0",
        "G-04",
    ),
]


def append_rows(ws, cases, source: str) -> int:
    start = ws.max_row + 1
    for i, c in enumerate(cases):
        r = start + i
        vals = [
            c[0],
            c[1],
            c[2],
            c[3],
            c[4],
            c[5],
            c[6],
            c[7],
            c[8],
            source,
            c[9],
            "prod Vercel 0bd0b28",
        ]
        for col, v in enumerate(vals, 1):
            cell = ws.cell(r, col, v)
            cell.alignment = WRAP
            cell.border = THIN
            cell.font = Font(name="Calibri", size=9)
        ws.row_dimensions[r].height = 80
    return len(cases)


def main():
    wb = load_workbook(PATH)
    n_crm = append_rows(wb["CRM_TC_2k"], CRM_CASES, "Guest hub visibility suite")
    n_gst = append_rows(wb["Guest_TC_2k"], GUEST_CASES, "Guest hub visibility suite")
    wb.save(PATH)
    print(f"Appended {n_crm} CRM + {n_gst} Guest cases to {PATH.name}")


if __name__ == "__main__":
    main()