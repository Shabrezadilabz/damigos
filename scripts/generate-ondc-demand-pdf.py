"""Generate YUMM ONDC Year-1 Demand Projections PDF (no financials)."""
from __future__ import annotations

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parents[1] / "docs" / "ondc" / "YUMM-ONDC-Demand-Projections-Year1.pdf"
FONT = r"C:\Windows\Fonts\arial.ttf"
FONT_B = r"C:\Windows\Fonts\arialbd.ttf"

# --- Planning inputs ---
LAUNCH_DATE = "24 November 2026"
COUNTING_START = "December 2026"
YEAR_END = "November 2027"
GEO = [
    "BTM Layout",
    "Koramangala",
    "Madiwala",
    "Jayanagar",
    "Christ University / College vicinity",
    "JP Nagar",
    "Silk Board",
    "Adjacent catchments within ~5 km delivery radius",
]

# Monthly net new kitchens after launch cohort
GROWTH = {"Conservative": 50, "Base": 75, "Stretch": 100}
# ONDC orders per live kitchen per day
INTENSITY = {"Conservative": 3, "Base": 6, "Stretch": 10}

# Year-1 months Dec 2026 .. Nov 2027
MONTHS = [
    ("Dec 2026", 31, 0.70),
    ("Jan 2027", 31, 0.85),
    ("Feb 2027", 28, 0.85),
    ("Mar 2027", 31, 0.95),
    ("Apr 2027", 30, 0.95),
    ("May 2027", 31, 0.95),
    ("Jun 2027", 30, 1.00),
    ("Jul 2027", 31, 1.00),
    ("Aug 2027", 31, 1.00),
    ("Sep 2027", 30, 1.00),
    ("Oct 2027", 31, 1.00),
    ("Nov 2027", 30, 1.00),
]

QUARTERS = {
    "Q1 (Dec 2026 – Feb 2027)": MONTHS[0:3],
    "Q2 (Mar 2027 – May 2027)": MONTHS[3:6],
    "Q3 (Jun 2027 – Aug 2027)": MONTHS[6:9],
    "Q4 (Sep 2027 – Nov 2027)": MONTHS[9:12],
}


def fmt(n: float | int) -> str:
    return f"{int(round(n)):,}"


def kitchen_path(monthly_add: int) -> list[tuple[str, int, int, float, int, float]]:
    """Return rows: month, start, end, avg, days, maturity."""
    live = 50  # after launch week
    rows = []
    for name, days, mat in MONTHS:
        start = live
        end = live + monthly_add
        avg = (start + end) / 2
        rows.append((name, start, end, avg, days, mat))
        live = end
    return rows


def orders_for(avg_k: float, intensity: int, days: int, maturity: float) -> dict[str, float]:
    daily = avg_k * intensity * maturity
    return {
        "daily": daily,
        "weekly": daily * 7,
        "monthly": daily * days,
    }


class Doc(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("ArialBody", "", 8)
        self.set_text_color(90, 90, 90)
        self.cell(0, 6, "YUMM  |  ONDC Demand Projections  |  Year 1 (Dec 2026 – Nov 2027)  |  Confidential", ln=1)
        self.set_draw_color(180, 180, 180)
        self.line(15, 12, 195, 12)
        self.ln(4)

    def footer(self):
        self.set_y(-14)
        self.set_font("ArialBody", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Page {self.page_no()}  |  Powered by D'aMigo's Technologies Pvt Ltd  |  For ONDC coordination", align="C")

    def _reset_x(self):
        self.set_x(self.l_margin)

    def h1(self, text: str):
        self._reset_x()
        self.set_font("ArialBold", "", 16)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 8, text)
        self.ln(2)

    def h2(self, text: str):
        self.ln(2)
        self._reset_x()
        self.set_font("ArialBold", "", 12)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def body(self, text: str):
        self._reset_x()
        self.set_font("ArialBody", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text: str):
        self._reset_x()
        self.set_font("ArialBody", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5.5, f"-  {text}")

    def table(self, headers: list[str], rows: list[list[str]], col_w: list[float]):
        self._reset_x()
        self.set_font("ArialBold", "", 8)
        self.set_fill_color(35, 35, 45)
        self.set_text_color(255, 255, 255)
        for h, w in zip(headers, col_w):
            self.cell(w, 7, h, border=1, fill=True, align="C")
        self.ln()
        self.set_font("ArialBody", "", 8)
        self.set_text_color(30, 30, 30)
        fill = False
        for row in rows:
            self._reset_x()
            if fill:
                self.set_fill_color(245, 245, 248)
            else:
                self.set_fill_color(255, 255, 255)
            for cell, w in zip(row, col_w):
                self.cell(w, 6.2, cell, border=1, fill=True, align="C")
            self.ln()
            fill = not fill
        self._reset_x()
        self.ln(2)


def build() -> Path:
    pdf = Doc(format="A4", unit="mm")
    pdf.set_margins(15, 15, 15)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_font("ArialBody", "", FONT)
    pdf.add_font("ArialBold", "", FONT_B)

    # COVER
    pdf.add_page()
    pdf.set_fill_color(28, 28, 36)
    pdf.rect(0, 0, 210, 297, style="F")
    pdf.set_y(70)
    pdf.set_font("ArialBody", "", 12)
    pdf.set_text_color(200, 200, 210)
    pdf.cell(0, 8, "BUYER APPLICATION  ·  NETWORK DEMAND PLAN", align="C", ln=1)
    pdf.ln(8)
    pdf.set_font("ArialBold", "", 32)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 14, "YUMM", align="C", ln=1)
    pdf.set_font("ArialBody", "", 14)
    pdf.set_text_color(220, 220, 230)
    pdf.cell(0, 8, "ONDC Demand Projections & Onboarding Plan", align="C", ln=1)
    pdf.cell(0, 8, "Year 1  |  Quarterly View", align="C", ln=1)
    pdf.ln(16)
    pdf.set_font("ArialBody", "", 11)
    pdf.set_text_color(180, 180, 190)
    pdf.cell(0, 7, "Beta geography: South Bengaluru micro-markets", align="C", ln=1)
    pdf.cell(0, 7, "BTM · Koramangala · Madiwala · Jayanagar · Christ College", align="C", ln=1)
    pdf.cell(0, 7, "JP Nagar · Silk Board  (+ ~5 km delivery catchment)", align="C", ln=1)
    pdf.ln(20)
    pdf.set_text_color(160, 160, 170)
    pdf.cell(0, 7, f"Planned go-live: {LAUNCH_DATE}", align="C", ln=1)
    pdf.cell(0, 7, f"Projection counting window: {COUNTING_START} – {YEAR_END}", align="C", ln=1)
    pdf.ln(30)
    pdf.set_font("ArialBody", "", 10)
    pdf.set_text_color(170, 170, 180)
    pdf.cell(0, 6, "Powered by", align="C", ln=1)
    pdf.set_font("ArialBold", "", 12)
    pdf.set_text_color(230, 230, 240)
    pdf.cell(0, 7, "D'aMigo's Technologies Pvt Ltd", align="C", ln=1)
    pdf.set_font("ArialBody", "", 9)
    pdf.set_text_color(140, 140, 150)
    pdf.cell(0, 6, "Prepared for ONDC coordination  |  Confidential", align="C", ln=1)

    # 1. PURPOSE
    pdf.add_page()
    pdf.h1("1. Purpose of this document")
    pdf.body(
        "This document presents YUMM's Year-1 demand and seller-onboarding projections for ONDC "
        "coordination. It focuses on planned live-kitchen capacity, expected ONDC order intensity, "
        "and quarterly milestones for a controlled beta in South Bengaluru. Figures are planning "
        "estimates with explicitly labelled assumptions — not commitments of network performance."
    )
    pdf.h2("Document principles")
    pdf.bullet("Brand: YUMM (consumer / buyer experience)")
    pdf.bullet("Operating entity: D'aMigo's Technologies Pvt Ltd")
    pdf.bullet("Channel in scope for demand tables: ONDC network orders")
    pdf.bullet("No commercial yield, fee, or cost figures are included")
    pdf.bullet("All volume ranges are scenario-based (Conservative / Base / Stretch)")

    # 2. SCOPE
    pdf.h2("2. Beta scope & service geography")
    pdf.body(
        f"YUMM plans to commence beta operations on {LAUNCH_DATE}, with projection counting from "
        f"{COUNTING_START}. Onboarding of the initial cohort of 50 restaurants is planned in the "
        "first week of launch. ONDC discovery and fulfilment for the beta are scoped to the "
        "following micro-markets and their immediate surroundings:"
    )
    for g in GEO:
        pdf.bullet(g)
    pdf.body(
        "Fulfilment intent for beta: manage delivery within approximately 5 km of these operating "
        "clusters to protect SLA reliability during early network learning. Catalog exposure for "
        "ONDC search in beta is intended to prioritise sellers active in these catchments."
    )

    # 3. ASSUMPTIONS
    pdf.h2("3. Planning assumptions (labelled)")
    pdf.body("A1 — Launch cohort: 50 restaurants live within the first week of go-live.")
    pdf.body("A2 — Ongoing onboarding: +50 to +100 restaurants net new each month after launch (scenario band).")
    pdf.body("A3 — Demand metric: ONDC orders per live kitchen per day (OPK/day).")
    pdf.body("A4 — Intensity scenarios: Conservative 3 · Base 6 · Stretch 10 OPK/day.")
    pdf.body(
        "A5 — Maturity factor: early months apply a learning curve (0.70 → 1.00) so Day-1 intensity "
        "is not assumed at full run-rate."
    )
    pdf.body(
        "A6 — Monthly order volume uses average live kitchens in the month = (start + end) / 2, "
        "then × OPK/day × maturity × days in month."
    )
    pdf.body("A7 — Weekly view = daily × 7; quarterly view = sum of the three months in the quarter.")
    pdf.body("A8 — Geography held to South Bengaluru beta catchments through Year 1 unless separately expanded.")
    pdf.body("A9 — Projections assume stable ONDC PreProd/Prod readiness, seller catalog quality, and local logistics coverage.")

    # 4. LIVE KITCHEN BASIS
    pdf.add_page()
    pdf.h1("4. Live-kitchen basis (how to read demand)")
    pdf.body(
        "Demand is expressed from the live kitchen as the atomic unit. For any scenario:"
    )
    pdf.bullet("Daily ONDC orders ≈ Live kitchens × OPK/day × maturity")
    pdf.bullet("Weekly ONDC orders ≈ Daily × 7")
    pdf.bullet("Monthly ONDC orders ≈ Daily × days in month")
    pdf.bullet("Quarterly ONDC orders ≈ Sum of monthly totals in the quarter")
    pdf.ln(1)
    pdf.h2("4.1 Order intensity reference (per live kitchen)")
    pdf.table(
        ["Scenario", "OPK / day", "OPK / week", "OPK / 30-day month", "Use"],
        [
            ["Conservative", "3", "21", "90", "Early beta / cautious"],
            ["Base", "6", "42", "180", "Primary planning case"],
            ["Stretch", "10", "70", "300", "High utilisation"],
        ],
        [32, 28, 30, 40, 50],
    )
    pdf.body(
        "Illustrative: at Base intensity with 50 live kitchens and maturity 1.0 → ~300 ONDC orders/day, "
        "~2,100/week, ~9,000/month (30-day month)."
    )

    # 5. ONBOARDING
    pdf.h2("5. Restaurant onboarding plan (Year 1)")
    pdf.body(
        "Launch week establishes 50 live kitchens. Thereafter, monthly onboarding is planned in the "
        "50–100 band. Tables below show Conservative (+50/mo), Base (+75/mo), and Stretch (+100/mo)."
    )

    for label, add in GROWTH.items():
        rows = kitchen_path(add)
        pdf.h2(f"5.{list(GROWTH).index(label)+1} Live kitchens — {label} (+{add}/month)")
        pdf.table(
            ["Month", "Start", "End", "Avg live"],
            [[m, str(s), str(e), f"{a:.0f}"] for m, s, e, a, _, _ in rows],
            [40, 35, 35, 40],
        )

    # Quarterly kitchen snapshot at quarter end
    pdf.add_page()
    pdf.h1("6. Quarterly onboarding snapshot (end-of-quarter live kitchens)")
    q_rows = []
    for qname, months in QUARTERS.items():
        # end kitchens = start of year path end for last month in quarter
        cells = [qname]
        for label, add in GROWTH.items():
            path = kitchen_path(add)
            # find last month of this quarter
            last_name = months[-1][0]
            end_k = next(e for m, s, e, a, d, mat in path if m == last_name)
            cells.append(fmt(end_k))
        q_rows.append(cells)
    pdf.table(
        ["Quarter", "Conservative", "Base", "Stretch"],
        q_rows,
        [70, 35, 35, 35],
    )
    pdf.body(
        "Year-1 ending live kitchens (Nov 2027): Conservative 650 · Base 950 · Stretch 1,250 "
        "(from 50 at launch + 12 months of net adds)."
    )

    # 7. DEMAND by quarter - Base growth with three intensities, and also show base intensity across growth
    pdf.h2("7. ONDC order demand — quarterly totals")
    pdf.body(
        "Primary planning grid uses Base kitchen growth (+75/month) across three intensity scenarios. "
        "Maturity factors from Section 3 are applied."
    )

    path_base = kitchen_path(75)
    path_by_month = {m: (s, e, a, d, mat) for m, s, e, a, d, mat in path_base}

    for intens_label, opk in INTENSITY.items():
        rows = []
        for qname, months in QUARTERS.items():
            q_orders = 0.0
            # representative daily at quarter mid using average of monthly dailies
            dailies = []
            for mname, days, mat in months:
                _s, _e, avg, d, maturity = path_by_month[mname][0], path_by_month[mname][1], path_by_month[mname][2], path_by_month[mname][3], path_by_month[mname][4]
                # fix unpack - path_by_month values are (s,e,a,d,mat)
                s, e, avg, d, maturity = path_by_month[mname]
                o = orders_for(avg, opk, d, maturity)
                q_orders += o["monthly"]
                dailies.append(o["daily"])
            avg_daily = sum(dailies) / len(dailies)
            rows.append(
                [
                    qname,
                    fmt(avg_daily),
                    fmt(avg_daily * 7),
                    fmt(q_orders / 3),  # avg month in quarter
                    fmt(q_orders),
                ]
            )
        pdf.h2(f"7.{list(INTENSITY).index(intens_label)+1} Base kitchen growth · {intens_label} intensity ({opk} OPK/day)")
        pdf.table(
            ["Quarter", "Avg daily", "Avg weekly", "Avg monthly", "Quarter total"],
            rows,
            [58, 28, 28, 32, 34],
        )

    # Year totals
    pdf.add_page()
    pdf.h1("8. Year-1 ONDC order totals (Base kitchen growth)")
    year_rows = []
    for intens_label, opk in INTENSITY.items():
        total = 0.0
        for m, s, e, avg, days, mat in path_base:
            total += orders_for(avg, opk, days, mat)["monthly"]
        # average daily across year rough = total / 365
        year_rows.append(
            [
                intens_label,
                f"{opk}",
                fmt(total / 365),
                fmt(total / 52),
                fmt(total / 12),
                fmt(total),
            ]
        )
    pdf.table(
        ["Scenario", "OPK/day", "Avg daily", "Avg weekly", "Avg monthly", "Year total"],
        year_rows,
        [30, 22, 28, 28, 30, 32],
    )
    pdf.body(
        "Interpretation: Base intensity is the recommended planning case for ONDC capacity discussions. "
        "Conservative supports contingency planning; Stretch indicates headroom if utilisation accelerates."
    )

    # Sensitivity: same Base intensity, three growth rates for Q1 and Year
    pdf.h2("8.1 Sensitivity — kitchen growth band at Base intensity (6 OPK/day)")
    sens = []
    for grow_label, add in GROWTH.items():
        path = kitchen_path(add)
        # Q1 total
        q1 = 0.0
        year = 0.0
        for m, s, e, avg, days, mat in path:
            mo = orders_for(avg, 6, days, mat)["monthly"]
            year += mo
            if m in ("Dec 2026", "Jan 2027", "Feb 2027"):
                q1 += mo
        end = path[-1][2]
        sens.append([grow_label, f"+{add}/mo", fmt(end), fmt(q1), fmt(year)])
    pdf.table(
        ["Growth case", "Adds", "EOY kitchens", "Q1 orders", "Year orders"],
        sens,
        [32, 25, 35, 35, 35],
    )

    # 9. Quarterly operating plan
    pdf.h2("9. Quarterly operating plan (non-financial)")
    pdf.body("Q1 — Launch & stabilise (Dec 2026 – Feb 2027)")
    pdf.bullet("Go-live 24 Nov 2026; 50 restaurants in week one; projection clock from Dec 2026")
    pdf.bullet("Prove ONDC search → select → order → fulfil loop in beta catchments")
    pdf.bullet("Protect ~5 km delivery radius; monitor SLA and catalog quality")
    pdf.bullet("Continue monthly onboarding within 50–100 band")

    pdf.body("Q2 — Densify beta catchments (Mar – May 2027)")
    pdf.bullet("Increase live-kitchen density across BTM / Koramangala / JP Nagar / Silk Board axis")
    pdf.bullet("Raise maturity toward full intensity; tighten discovery relevance for area codes")
    pdf.bullet("Expand seller readiness playbooks (catalog, hours, packaging, handoff)")

    pdf.body("Q3 — Scale within South Bengaluru (Jun – Aug 2027)")
    pdf.bullet("Sustain monthly onboarding cadence; deepen coverage inside the same micro-markets")
    pdf.bullet("Improve peak-hour capacity planning with live-kitchen based forecasts")
    pdf.bullet("Strengthen exception handling (cancel/update/status) with ONDC workflows")

    pdf.body("Q4 — Year-1 consolidation (Sep – Nov 2027)")
    pdf.bullet("Consolidate Year-1 live base; validate sustained OPK performance")
    pdf.bullet("Document lessons for any subsequent geography expansion (separate decision)")
    pdf.bullet("Align with ONDC on production readiness evidence from beta operations")

    # 10. ONDC collaboration
    pdf.add_page()
    pdf.h1("10. What we seek from ONDC coordination")
    pdf.bullet("Confirmation of buyer-app onboarding / production promotion pathway aligned to Nov 2026 go-live")
    pdf.bullet("Guidance on city/area code configuration for the listed South Bengaluru catchments")
    pdf.bullet("Support for catalog and transaction monitoring during beta ramp")
    pdf.bullet("Feedback loop on network-side constraints that could affect the demand ranges above")

    pdf.h2("11. Summary for ONDC")
    pdf.bullet("Brand: YUMM · Powered by D'aMigo's Technologies Pvt Ltd")
    pdf.bullet("Beta launch: 24 November 2026 · 50 restaurants in week one")
    pdf.bullet("Demand counting: December 2026 – November 2027 (quarterly)")
    pdf.bullet("Geography: BTM, Koramangala, Madiwala, Jayanagar, Christ College, JP Nagar, Silk Board + ~5 km")
    pdf.bullet("Onboarding: +50 to +100 kitchens per month after launch")
    pdf.bullet("ONDC order planning case (Base): 6 orders per live kitchen per day, with maturity ramp")
    pdf.bullet("All figures are labelled scenarios for capacity and readiness planning")

    pdf.ln(6)
    pdf.set_font("ArialBody", "", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0,
        5,
        "Disclaimer: This document is a forward-looking operating plan for coordination purposes. "
        "Actual order volumes will depend on seller readiness, network conditions, consumer adoption, "
        "and operational execution. Ranges should be re-forecast after the first 60–90 days of live data.",
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    return OUT


if __name__ == "__main__":
    path = build()
    print("Wrote", path)
