from django.urls import path

from .views import (
    MonthlyFinancialReportView,
    ExpenseReportView,
    SavingsReportView,
    FinancialSummaryView,
    GenerateReportView,
)

from .exports import(
    ExportJSONView,
    ExportPDFView,
)

urlpatterns = [

    path(
        "monthly/",
        MonthlyFinancialReportView.as_view(),
        name="monthly-report",
    ),

    path(
        "expenses/",
        ExpenseReportView.as_view(),
        name="expense-report",
    ),

    path(
        "savings/",
        SavingsReportView.as_view(),
        name="savings-report",
    ),

    path(
        "summary/",
        FinancialSummaryView.as_view(),
        name="financial-summary",
    ),

    path(
        "generate/",
        GenerateReportView.as_view(),
        name="generate-report",
    ),

    path(
        "export/json/",
        ExportJSONView.as_view(),
        name="export-json",
    ),

    path(
        "export/pdf/",
        ExportPDFView.as_view(),
        name="export-pdf",
    ),
]