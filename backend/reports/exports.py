import json
from datetime import datetime
from io import BytesIO

from django.http import FileResponse, HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .utils import build_report, get_date_range


class ExportJSONView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date, end_date = get_date_range(request)

        if start_date and end_date:
            if isinstance(start_date, str):
                start_date = datetime.strptime(
                    start_date,
                    "%Y-%m-%d"
                ).date()

            if isinstance(end_date, str):
                end_date = datetime.strptime(
                    end_date,
                    "%Y-%m-%d"
                ).date()

        if not start_date or not end_date:
            return HttpResponse(
                "Invalid Date Range",
                status=400,
            )

        report = build_report(
            request,
            start_date,
            end_date,
        )

        response = HttpResponse(
            json.dumps(
                report,
                indent=4,
                default=str,
            ),
            content_type="application/json",
        )

        response[
            "Content-Disposition"
        ] = (
            f'attachment; filename="BudgetBuddy_Report_{start_date}_to_{end_date}.json"'
        )

        return response


class ExportPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date, end_date = get_date_range(request)

        if start_date and end_date:
            if isinstance(start_date, str):
                start_date = datetime.strptime(
                    start_date,
                    "%Y-%m-%d"
                ).date()

            if isinstance(end_date, str):
                end_date = datetime.strptime(
                    end_date,
                    "%Y-%m-%d"
                ).date()

        if not start_date or not end_date:
            return HttpResponse(
                "Invalid Date Range",
                status=400,
            )

        report = build_report(
            request,
            start_date,
            end_date,
        )

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer)
        styles = getSampleStyleSheet()
        elements = []

        table_style = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ])

        elements.append(
            Paragraph(
                "<font size='24'><b>BudgetBuddy</b></font>",
                styles["Title"]
            )
        )
        elements.append(
            Paragraph(
                "<font size='14'>Personal Budget Planning & Expense Management Platform</font>",
                styles["Normal"]
            )
        )
        elements.append(Spacer(1, 0.15 * inch))

        elements.append(
            Paragraph(
                f"<b>Report Period :</b> {start_date}  →  {end_date}",
                styles["Normal"]
            )
        )
        elements.append(
            Paragraph(
                f"<b>Generated On :</b> {datetime.now().strftime('%d-%m-%Y %I:%M %p')}",
                styles["Normal"]
            )
        )
        elements.append(Spacer(1, 0.25 * inch))

        elements.append(
            Table(
                [[""]],
                colWidths=[450],
                style=TableStyle([
                    ("LINEBELOW", (0, 0), (-1, -1), 1, colors.grey)
                ])
            )
        )
        elements.append(Spacer(1, 0.15 * inch))

        elements.append(
            Paragraph(
                "<font size='16'><b>Financial Summary</b></font>",
                styles["Heading2"]
            )
        )
        elements.append(Spacer(1, 0.1 * inch))

        summary = report["summary"]

        table_data = [
            ["Financial Summary", "Amount (₹)"],
            ["Total Income", summary["total_income"]],
            ["Total Expense", summary["total_expense"]],
            ["Current Balance", summary["current_balance"]],
            ["Total Savings", summary["total_savings"]],
        ]

        table = Table(table_data)
        table.setStyle(table_style)

        elements.append(table)
        elements.append(Spacer(1, 0.3 * inch))

        budget = report["budget"]
        elements.append(
            Paragraph(
                "<font size='16'><b>Budget Summary</b></font>",
                styles["Heading2"]
            )
        )
        elements.append(Spacer(1, 0.1 * inch))

        budget_table = Table([
            ["Budget", "Amount (₹)"],
            ["Total Budget", budget["total_budget"]],
            ["Remaining Budget", budget["remaining_budget"]],
            ["Status", report["insights"]["budget_status"]],
        ])
        budget_table.setStyle(table_style)
        elements.append(budget_table)

        elements.append(Spacer(1, 0.25 * inch))

        savings = report["savings"]
        elements.append(
            Paragraph(
                "<font size='16'><b>Savings Summary</b></font>",
                styles["Heading2"]
            )
        )
        elements.append(Spacer(1, 0.1 * inch))

        savings_table = Table([
            ["Savings Goal", "Count"],
            ["Active Goals", savings["active_goals"]],
            ["Completed Goals", savings["completed_goals"]],
            ["Savings Rate", f"{report['analytics']['savings_rate']} %"],
        ])
        savings_table.setStyle(table_style)
        elements.append(savings_table)

        elements.append(Spacer(1, 0.25 * inch))

        insights = report["insights"]
        elements.append(
            Paragraph(
                "<font size='16'><b>Insights</b></font>",
                styles["Heading2"]
            )
        )
        for key, value in insights.items():
            elements.append(
                Paragraph(
                    f"• {key.replace('_', ' ').title()} : {value}",
                    styles["Normal"]
                )
            )

        elements.append(Spacer(1, 0.25 * inch))

        analytics = report["analytics"]
        elements.append(
            Paragraph(
                "<font size='16'><b>Analytics</b></font>",
                styles["Heading2"]
            )
        )
        for key, value in analytics.items():
            elements.append(
                Paragraph(
                    f"• {key.replace('_', ' ').title()} : {value}",
                    styles["Normal"]
                )
            )
        elements.append(Spacer(1, 0.25 * inch))

        elements.append(
            Paragraph(
                "<font size='16'><b>Recommendations</b></font>",
                styles["Heading2"]
            )
        )
        recommendations = []
        if report["insights"]["budget_status"] == "Over Budget":
            recommendations.append(
                "• Reduce unnecessary expenses."
            )
        else:
            recommendations.append(
                "• Budget utilization is under control."
            )
        if report["savings"]["completed_goals"] > 0:
            recommendations.append(
                "• Continue maintaining your savings habit."
            )
        else:
            recommendations.append(
                "• Focus on completing your current savings goals."
            )
        if report["analytics"]["savings_rate"] < 20:
            recommendations.append(
                "• Try increasing your monthly savings."
            )
        for item in recommendations:
            elements.append(
                Paragraph(
                    item,
                    styles["Normal"]
                )
            )

        elements.append(Spacer(1, 0.4 * inch))
        elements.append(
            Paragraph(
                "<b>Generated by BudgetBuddy</b>",
                styles["Italic"]
            )
        )
        elements.append(
            Paragraph(
                "Personal Budget Planning & Expense Management Platform",
                styles["Italic"]
            )
        )

        doc.build(elements)
        buffer.seek(0)

        return FileResponse(
            buffer,
            as_attachment=True,
            filename=(
                f"BudgetBuddy_Report_"
                f"{start_date}_to_{end_date}.pdf"
            ),
            content_type='application/pdf'
        )
        