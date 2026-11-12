# -*- coding: utf-8 -*-
"""Append ONDC + inactive hub cases into YUMM-Full-QA-Scenarios-v2.xlsx Guest_TC_2k."""
from pathlib import Path
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Border, Font, Side

PATH = Path(__file__).resolve().parent / "YUMM-Full-QA-Scenarios-v2.xlsx"
THIN = Border(
    left=Side(style="thin", color="E0E0E0"),
    right=Side(style="thin", color="E0E0E0"),
    top=Side(style="thin", color="E0E0E0"),
    bottom=Side(style="thin", color="E0E0E0"),
)
WRAP = Alignment(wrap_text=True, vertical="top")

CASES = [
    (
        "GST-ONDC-INACT-01",
        "Hub",
        "Inactive kitchens",
        "POSITIVE: kitchens without logo AND without food images are inactive and hidden on hub",
        "Neon has incomplete + complete kitchens; guest API running",
        "1. Restart guest API (runs ensure + markIncomplete).\n2. Open /hub.\n3. Confirm incomplete kitchens absent.",
        "Only kitchens with logo or dish image appear as Direct.",
        "Incomplete kitchen still listed on hub.",
        "P0",
    ),
    (
        "GST-ONDC-INACT-02",
        "Hub",
        "Direct tag",
        "POSITIVE: onboarded complete kitchens show Direct badge",
        "At least one complete hub_listed kitchen",
        "1. Open /hub.\n2. Find Direct kitchen card.",
        "Badge text Direct visible.",
        "No Direct badge on onboarded kitchen.",
        "P0",
    ),
    (
        "GST-ONDC-HUB-01",
        "Hub",
        "ONDC on hub",
        "POSITIVE: ONDC catalog appears on hub without visiting /ondc search UI",
        "Guest web local; /api/ondc/search seeds catalog",
        "1. Open /hub only.\n2. Look for ONDC-tagged cards.",
        "At least one ONDC badge kitchen visible (seed or live).",
        "ONDC only on /ondc page, not hub.",
        "P0",
    ),
    (
        "GST-ONDC-HUB-02",
        "Hub",
        "Direct wins duplicate",
        "POSITIVE: same name Direct+ONDC → only Direct shown",
        "Direct kitchen name overlaps ONDC seed name (normalized)",
        "1. Ensure Direct kitchen with overlapping name.\n2. Open /hub.\n3. Count cards for that name.",
        "Single Direct card; ONDC duplicate absent.",
        "Both Direct and ONDC duplicates shown.",
        "P0",
    ),
    (
        "GST-ONDC-HUB-03",
        "Hub",
        "ONDC only kitchen",
        "POSITIVE: ONDC-only provider shows with ONDC tag",
        "Seed Koramangala Bowl Bar (ONDC) not onboarded Direct",
        "1. Open /hub.\n2. Find ONDC-only kitchen.",
        "ONDC badge; opens /ondc deep link.",
        "Shown as Direct or missing.",
        "P1",
    ),
    (
        "GST-ONDC-NEG-01",
        "Hub",
        "Inactive still in DB",
        "NEGATIVE: inactive does not delete Neon rows",
        "Incomplete kitchen marked inactive",
        "1. Query DB for inactive=true kitchen.\n2. Confirm row exists.",
        "Row present with inactive true; not on hub.",
        "Row wiped from Neon.",
        "P0",
    ),
]


def main():
    wb = load_workbook(PATH)
    ws = wb["Guest_TC_2k"]
    start = ws.max_row + 1
    for i, c in enumerate(CASES):
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
            "ONDC inactive suite",
            "ONDC-HUB",
            "local first",
        ]
        for col, v in enumerate(vals, 1):
            cell = ws.cell(r, col, v)
            cell.alignment = WRAP
            cell.border = THIN
            cell.font = Font(name="Calibri", size=9)
        ws.row_dimensions[r].height = 72
    wb.save(PATH)
    print(f"Appended {len(CASES)} cases to Guest_TC_2k (rows {start}-{start+len(CASES)-1})")


if __name__ == "__main__":
    main()
