"""
Kural 1-Way — PDF report generation.

Exposes:
  parse_report_datetime(value, end_of_day=False) -> datetime
      Shared date-range parsing used both here and by main.py's
      date-filtered /api/dashboard/submissions endpoint, so both use
      identical UTC calendar-day semantics.

  build_report_pdf(submissions, client_name, date_from, date_to) -> bytes
      Queries `submissions` for the given (inclusive) UTC date range and
      renders the result into a PDF: a summary strip of counts followed
      by a table of every matching submission. Returns raw PDF bytes.

main.py imports both and calls build_report_pdf() from the
/api/dashboard/report route; it doesn't build PDFs itself.
"""

from datetime import datetime, timedelta, timezone


from io import BytesIO
from pathlib import Path
from typing import Optional

from fastapi import HTTPException
from pymongo.collection import Collection
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as ReportLabTTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

IST = timezone(timedelta(hours=5, minutes=30))
# ---------------------------------------------------------------------------
# Unicode font registration
# ---------------------------------------------------------------------------
# ReportLab's built-in PDF fonts (Helvetica, Times, Courier) only cover
# Latin-1 — any Tamil (or other non-Latin) codepoint renders as a "missing
# glyph" box. This is a font problem, not a storage/encoding one: MongoDB
# and Python strings hold the Tamil text correctly the whole way through.
# Noto Sans Tamil covers both the Tamil block and Basic Latin, so one font
# handles transcripts/summaries that mix English and Tamil.
FONTS_DIR = Path(__file__).parent / "fonts"
UNICODE_FONT_NAME = "NotoSansTamil"
try:
    pdfmetrics.registerFont(
        ReportLabTTFont(UNICODE_FONT_NAME, str(FONTS_DIR / "NotoSansTamil-Regular.ttf"))
    )
except Exception as exc:  # noqa: BLE001 — degrade to Helvetica rather than crash the app
    print(f"⚠️  Could not load {UNICODE_FONT_NAME} font, Tamil text will not render in PDFs: {exc}")
    UNICODE_FONT_NAME = "Helvetica"

REPORT_STATUS_LABELS = {"completed": "Completed", "processing": "Processing", "failed": "Failed"}


def parse_report_datetime(value: str, end_of_day: bool = False) -> datetime:
    """Parse a date/time as IST and convert it to UTC for MongoDB queries."""
    value = value.strip()

    try:
        if len(value) == 10:  # YYYY-MM-DD
            dt = datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=IST)

            if end_of_day:
                dt = dt + timedelta(days=1) - timedelta(microseconds=1)

            return dt.astimezone(timezone.utc)

        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))

        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=IST)

        return dt.astimezone(timezone.utc)

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date {value!r}; expected YYYY-MM-DD.",
        )


def build_report_pdf(
    submissions: Collection,
    client_name: str,
    date_from: Optional[str],
    date_to: Optional[str],
) -> bytes:
    """Query submissions in the given (inclusive) UTC date range and render
    them into a PDF: a summary strip of counts, followed by a table of
    every matching submission."""
    query: dict = {"client_name": client_name}
    created_at_filter = {}
    if date_from:
        created_at_filter["$gte"] = parse_report_datetime(date_from)
    if date_to:
        created_at_filter["$lte"] = parse_report_datetime(date_to, end_of_day=True)
    if created_at_filter:
        query["created_at"] = created_at_filter

    docs = list(submissions.find(query).sort("created_at", 1))

    total = len(docs)
    completed = sum(1 for d in docs if d.get("status") == "completed")
    processing = sum(1 for d in docs if d.get("status") == "processing")
    failed = sum(1 for d in docs if d.get("status") == "failed")
    audio_count = sum(1 for d in docs if d.get("kind") == "audio")
    text_count = sum(1 for d in docs if d.get("kind") == "text")

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        title="Kural 1-Way Feedback Report",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("ReportTitle", parent=styles["Title"], fontSize=18, spaceAfter=2)
    meta_style = ParagraphStyle("ReportMeta", parent=styles["Normal"], textColor=colors.HexColor("#555555"))
    cell_style = ParagraphStyle(
        "Cell", parent=styles["Normal"], fontName=UNICODE_FONT_NAME, fontSize=8, leading=10
    )
    header_cell_style = ParagraphStyle(
        "HeaderCell", parent=cell_style, textColor=colors.white, fontName="Helvetica-Bold"
    )

    range_label = f"{date_from or 'earliest'} \u2014 {date_to or 'latest'}"
    now_ist = datetime.now(IST)
    elements = [
        Paragraph("Kural 1-Way \u2014 Feedback Report", title_style),
        Paragraph(f"Client: {client_name}", meta_style),
        Paragraph(f"Date range: {range_label} (IST)", meta_style),
        Paragraph(f"Generated: {now_ist.strftime('%Y-%m-%d %H:%M IST')}", meta_style),
        Spacer(1, 8 * mm),
    ]

    summary_table = Table(
        [
            ["Total", "Completed", "Processing", "Failed", "Audio", "Text"],
            [str(total), str(completed), str(processing), str(failed), str(audio_count), str(text_count)],
        ],
        hAlign="LEFT",
    )
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0C8A7D")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E7EE")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements += [summary_table, Spacer(1, 8 * mm)]

    table_data = [
        [
            Paragraph("Time (IST)", header_cell_style),
            Paragraph("Type", header_cell_style),
            Paragraph("Status", header_cell_style),
            Paragraph("Transcript", header_cell_style),
            Paragraph("Summary", header_cell_style),
        ]
    ]
    for d in docs:
        created = d.get("created_at")
        created_ist = created.astimezone(IST) if created else None
        table_data.append(
            [
                Paragraph(
            created_ist.strftime("%Y-%m-%d %H:%M") if created_ist else "—",
            cell_style
        ),
                Paragraph((d.get("kind") or "\u2014").title(), cell_style),
                Paragraph(REPORT_STATUS_LABELS.get(d.get("status"), d.get("status") or "\u2014"), cell_style),
                Paragraph(d.get("transcript_text") or "\u2014", cell_style),
                Paragraph(
                    d.get("summary")
                    or (d.get("error") if d.get("status") == "failed" else None)
                    or "\u2014",
                    cell_style,
                ),
            ]
        )

    if len(table_data) == 1:
        elements.append(Paragraph("No submissions found in this date range.", styles["Normal"]))
    else:
        report_table = Table(
            table_data,
            colWidths=[26 * mm, 16 * mm, 20 * mm, 62 * mm, 58 * mm],
            repeatRows=1,
        )
        report_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#12141C")),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E4E7EE")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F6F2")]),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        elements.append(report_table)

    doc.build(elements)
    return buffer.getvalue()