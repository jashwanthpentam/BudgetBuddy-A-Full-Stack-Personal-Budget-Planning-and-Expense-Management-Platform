import { useState } from "react";
import MainLayout from "../layouts/MainLayout";

import {
    generateReport,
    downloadJSONReport,
    downloadPDFReport,
    downloadExcelReport,
} from "../services/reportService";

import "./Reports.css";


export default function Reports() {

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [report, setReport] = useState(null);

    const [loading, setLoading] = useState(false);

    const [downloading, setDownloading] = useState(false);

    const [error, setError] = useState("");


    /* ==========================
       GENERATE REPORT
    ========================== */

    const handleGenerateReport = async () => {

        setError("");

        if (!startDate || !endDate) {

            setError(
                "Please select both a start date and an end date."
            );

            return;
        }


        if (startDate > endDate) {

            setError(
                "End date must be on or after the start date."
            );

            return;
        }


        try {

            setLoading(true);

            const data = await generateReport({
                startDate,
                endDate,
            });

            setReport(data);

        }

        catch (error) {

            console.error(
                "Report generation failed:",
                error
            );

            setError(
                "Unable to generate the report. Please try again."
            );

        }

        finally {

            setLoading(false);

        }

    };


    /* ==========================
       DOWNLOAD REPORT
    ========================== */

    const handleDownload = async (type) => {

        if (!startDate || !endDate) {

            setError(
                "Generate a report period first."
            );

            return;
        }


        try {

            setDownloading(true);

            setError("");

            const payload = {
                startDate,
                endDate,
            };


            const response =
                type === "json"
                    ? await downloadJSONReport(payload)
                    : type === "pdf"
                        ? await downloadPDFReport(payload)
                        : await downloadExcelReport(payload);


            const filename =
                type === "json"
                    ? "BudgetBuddy_Report.json"
                    : type === "pdf"
                        ? "BudgetBuddy_Report.pdf"
                        : "BudgetBuddy_Report.xlsx";


            const url =
                window.URL.createObjectURL(
                    response.data
                );


            const link =
                document.createElement("a");


            link.href = url;

            link.download = filename;

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);

        }

        catch (error) {

            console.error(
                "Report download failed:",
                error
            );

            setError(
                `Unable to download the ${type.toUpperCase()} report.`
            );

        }

        finally {

            setDownloading(false);

        }

    };


    /* ==========================
       FORMAT MONEY
    ========================== */

    const formatMoney = (value) => {

        const amount =
            Number(value) || 0;


        return amount.toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 2,
            }
        );

    };


    /* ==========================
       REPORT PERIOD
    ========================== */

    const formatDate = (date) => {

        if (!date) {
            return "";
        }


        return new Date(
            `${date}T00:00:00`
        ).toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                year: "numeric",
            }
        );

    };


    /* ==========================
       STATUS CLASS
    ========================== */

    const getStatusClass = (status) => {

        if (!status) {
            return "";
        }


        const value =
            status.toLowerCase();


        if (
            value.includes("over") ||
            value.includes("improvement")
        ) {

            return "status-danger";

        }


        if (
            value.includes("within") ||
            value.includes("track")
        ) {

            return "status-success";

        }


        return "status-neutral";

    };


    return (

        <MainLayout title="Financial Reports">

            <div className="reports-page">


                {/* ==========================
                    HEADER
                ========================== */}

                <div className="reports-header">

                    <div>

                        <div className="reports-title">

                            <span className="reports-title-icon">
                                📊
                            </span>

                            <div>

                                <h1>
                                    Financial Reports
                                </h1>

                                <p>
                                    Analyze your financial
                                    performance and spending
                                    patterns.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>


                {/* ==========================
                    REPORT GENERATOR
                ========================== */}

                <div className="report-generator">

                    <div className="generator-heading">

                        <div>

                            <h2>
                                Generate Financial Report
                            </h2>

                            <p>
                                Select a date range to
                                analyze your finances.
                            </p>

                        </div>

                    </div>


                    <div className="date-controls">


                        <div className="date-field">

                            <label>
                                Start Date
                            </label>

                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(
                                        e.target.value
                                    );

                                    setReport(null);

                                    setError("");
                                }}
                            />

                        </div>


                        <div className="date-arrow">
                            →
                        </div>


                        <div className="date-field">

                            <label>
                                End Date
                            </label>

                            <input
                                type="date"
                                value={endDate}
                                min={startDate || ""}
                                onChange={(e) => {
                                    setEndDate(
                                        e.target.value
                                    );

                                    setReport(null);

                                    setError("");
                                }}
                            />

                        </div>


                        <button
                            className="generate-btn"
                            onClick={
                                handleGenerateReport
                            }
                            disabled={loading}
                        >

                            {loading
                                ? "⏳ Generating..."
                                : "📊 Generate Report"
                            }

                        </button>

                    </div>


                    {
                        error && (

                            <div className="report-error">

                                ⚠️ {error}

                            </div>

                        )
                    }

                </div>


                {/* ==========================
                    REPORT RESULTS
                ========================== */}

                {
                    report && (

                        <div className="report-results">


                            {/* REPORT PERIOD */}

                            <div className="report-period">

                                <div>

                                    <span>
                                        Report Period
                                    </span>

                                    <strong>
                                        {formatDate(
                                            report.report_period?.start_date
                                        )}

                                        {" "}
                                        →

                                        {" "}

                                        {formatDate(
                                            report.report_period?.end_date
                                        )}
                                    </strong>

                                </div>


                                <div className="period-status">
                                    ✓ Report Generated
                                </div>

                            </div>


                            {/* ==========================
                                SUMMARY CARDS
                            ========================== */}

                            <section>

                                <div className="section-heading">

                                    <div>

                                        <h2>
                                            Financial Summary
                                        </h2>

                                        <p>
                                            Overview of your
                                            financial activity.
                                        </p>

                                    </div>

                                </div>


                                <div className="summary-grid">


                                    <div className="report-card income-card">

                                        <div className="report-card-icon">
                                            💵
                                        </div>

                                        <div>

                                            <span>
                                                Total Income
                                            </span>

                                            <strong>
                                                ₹{formatMoney(
                                                    report.summary?.total_income
                                                )}
                                            </strong>

                                        </div>

                                    </div>


                                    <div className="report-card expense-card">

                                        <div className="report-card-icon">
                                            💳
                                        </div>

                                        <div>

                                            <span>
                                                Total Expenses
                                            </span>

                                            <strong>
                                                ₹{formatMoney(
                                                    report.summary?.total_expense
                                                )}
                                            </strong>

                                        </div>

                                    </div>


                                    <div className="report-card balance-card">

                                        <div className="report-card-icon">
                                            💰
                                        </div>

                                        <div>

                                            <span>
                                                Current Balance
                                            </span>

                                            <strong>
                                                ₹{formatMoney(
                                                    report.summary?.current_balance
                                                )}
                                            </strong>

                                        </div>

                                    </div>


                                    <div className="report-card savings-card">

                                        <div className="report-card-icon">
                                            🎯
                                        </div>

                                        <div>

                                            <span>
                                                Total Savings
                                            </span>

                                            <strong>
                                                ₹{formatMoney(
                                                    report.summary?.total_savings
                                                )}
                                            </strong>

                                        </div>

                                    </div>

                                </div>

                            </section>


                            {/* ==========================
                                BUDGET + SAVINGS
                            ========================== */}

                            <div className="two-column-section">


                                {/* BUDGET */}

                                <section className="report-panel">

                                    <div className="panel-header">

                                        <div>

                                            <h2>
                                                📒 Budget Overview
                                            </h2>

                                            <p>
                                                How your spending
                                                compares with your
                                                budget.
                                            </p>

                                        </div>

                                        <span
                                            className={
                                                getStatusClass(
                                                    report.insights?.budget_status
                                                )
                                            }
                                        >
                                            {
                                                report.insights?.budget_status
                                            }
                                        </span>

                                    </div>


                                    <div className="overview-row">

                                        <span>
                                            Total Budget
                                        </span>

                                        <strong>
                                            ₹{formatMoney(
                                                report.budget?.total_budget
                                            )}
                                        </strong>

                                    </div>


                                    <div className="overview-row">

                                        <span>
                                            Remaining Budget
                                        </span>

                                        <strong>
                                            ₹{formatMoney(
                                                report.budget?.remaining_budget
                                            )}
                                        </strong>

                                    </div>


                                    <div className="progress-container">

                                        <div className="progress-label">

                                            <span>
                                                Budget Utilization
                                            </span>

                                            <strong>
                                                {
                                                    report.analytics?.budget_utilization
                                                }%
                                            </strong>

                                        </div>


                                        <div className="progress-bar">

                                            <div
                                                className="progress-fill budget-progress"
                                                style={{
                                                    width: `${Math.min(
                                                        Number(
                                                            report.analytics?.budget_utilization
                                                        ) || 0,
                                                        100
                                                    )}%`
                                                }}
                                            />

                                        </div>

                                    </div>

                                </section>


                                {/* SAVINGS */}

                                <section className="report-panel">

                                    <div className="panel-header">

                                        <div>

                                            <h2>
                                                🎯 Savings Overview
                                            </h2>

                                            <p>
                                                Progress toward your
                                                savings goals.
                                            </p>

                                        </div>

                                        <span
                                            className={
                                                getStatusClass(
                                                    report.insights?.savings_status
                                                )
                                            }
                                        >
                                            {
                                                report.insights?.savings_status
                                            }
                                        </span>

                                    </div>


                                    <div className="savings-overview">

                                        <div className="goal-stat">

                                            <span>
                                                Active Goals
                                            </span>

                                            <strong>
                                                {
                                                    report.savings?.active_goals || 0
                                                }
                                            </strong>

                                        </div>


                                        <div className="goal-stat">

                                            <span>
                                                Completed
                                            </span>

                                            <strong>
                                                {
                                                    report.savings?.completed_goals || 0
                                                }
                                            </strong>

                                        </div>


                                        <div className="goal-stat">

                                            <span>
                                                Completion Rate
                                            </span>

                                            <strong>
                                                {
                                                    report.analytics?.goal_completion_rate || 0
                                                }%
                                            </strong>

                                        </div>

                                    </div>


                                    <div className="progress-container">

                                        <div className="progress-label">

                                            <span>
                                                Savings Rate
                                            </span>

                                            <strong>
                                                {
                                                    report.analytics?.savings_rate || 0
                                                }%
                                            </strong>

                                        </div>


                                        <div className="progress-bar">

                                            <div
                                                className="progress-fill savings-progress"
                                                style={{
                                                    width: `${Math.min(
                                                        Number(
                                                            report.analytics?.savings_rate
                                                        ) || 0,
                                                        100
                                                    )}%`
                                                }}
                                            />

                                        </div>

                                    </div>

                                </section>

                            </div>


                            {/* ==========================
                                ANALYTICS
                            ========================== */}

                            <section className="report-panel">

                                <div className="section-heading">

                                    <div>

                                        <h2>
                                            📈 Financial Analytics
                                        </h2>

                                        <p>
                                            Key metrics calculated
                                            for the selected period.
                                        </p>

                                    </div>

                                </div>


                                <div className="analytics-grid">


                                    <div className="analytics-item">

                                        <span>
                                            🧾
                                        </span>

                                        <div>

                                            <small>
                                                Expense Transactions
                                            </small>

                                            <strong>
                                                {
                                                    report.analytics?.expense_transactions || 0
                                                }
                                            </strong>

                                        </div>

                                    </div>


                                    <div className="analytics-item">

                                        <span>
                                            💾
                                        </span>

                                        <div>

                                            <small>
                                                Savings Rate
                                            </small>

                                            <strong>
                                                {
                                                    report.analytics?.savings_rate || 0
                                                }%
                                            </strong>

                                        </div>

                                    </div>


                                    <div className="analytics-item">

                                        <span>
                                            📒
                                        </span>

                                        <div>

                                            <small>
                                                Budget Utilization
                                            </small>

                                            <strong>
                                                {
                                                    report.analytics?.budget_utilization || 0
                                                }%
                                            </strong>

                                        </div>

                                    </div>


                                    <div className="analytics-item">

                                        <span>
                                            🎯
                                        </span>

                                        <div>

                                            <small>
                                                Goal Completion
                                            </small>

                                            <strong>
                                                {
                                                    report.analytics?.goal_completion_rate || 0
                                                }%
                                            </strong>

                                        </div>

                                    </div>

                                </div>

                            </section>


                            {/* ==========================
                                INSIGHTS
                            ========================== */}

                            <section className="report-panel">

                                <div className="section-heading">

                                    <div>

                                        <h2>
                                            💡 Financial Insights
                                        </h2>

                                        <p>
                                            Important observations
                                            from your report.
                                        </p>

                                    </div>

                                </div>


                                <div className="insights-grid">


                                    <div className="insight-box">

                                        <span className="insight-icon">
                                            🛒
                                        </span>

                                        <div>

                                            <small>
                                                Highest Expense Category
                                            </small>

                                            <strong>
                                                {
                                                    report.insights?.highest_expense_category
                                                }
                                            </strong>

                                        </div>

                                    </div>


                                    <div className="insight-box">

                                        <span className="insight-icon">
                                            📒
                                        </span>

                                        <div>

                                            <small>
                                                Budget Status
                                            </small>

                                            <strong>
                                                {
                                                    report.insights?.budget_status
                                                }
                                            </strong>

                                        </div>

                                    </div>


                                    <div className="insight-box">

                                        <span className="insight-icon">
                                            🎯
                                        </span>

                                        <div>

                                            <small>
                                                Savings Status
                                            </small>

                                            <strong>
                                                {
                                                    report.insights?.savings_status
                                                }
                                            </strong>

                                        </div>

                                    </div>

                                </div>

                            </section>


                            {/* ==========================
                                RECOMMENDATIONS
                            ========================== */}

                            <section className="recommendation-panel">

                                <div className="section-heading">

                                    <div>

                                        <h2>
                                            💡 Recommendations
                                        </h2>

                                        <p>
                                            Suggestions based on
                                            your financial report.
                                        </p>

                                    </div>

                                </div>


                                <div className="recommendations">


                                    {
                                        report.insights?.budget_status ===
                                        "Over Budget" ? (

                                            <div className="recommendation danger">

                                                <span>
                                                    ⚠️
                                                </span>

                                                <p>
                                                    Reduce unnecessary
                                                    expenses and review
                                                    your highest spending
                                                    categories.
                                                </p>

                                            </div>

                                        ) : (

                                            <div className="recommendation success">

                                                <span>
                                                    ✅
                                                </span>

                                                <p>
                                                    Your spending is
                                                    currently within
                                                    budget. Keep
                                                    maintaining this
                                                    discipline.
                                                </p>

                                            </div>

                                        )
                                    }


                                    {
                                        Number(
                                            report.analytics?.savings_rate
                                        ) < 20 && (

                                            <div className="recommendation warning">

                                                <span>
                                                    💰
                                                </span>

                                                <p>
                                                    Your savings rate is
                                                    below 20%. Consider
                                                    increasing the amount
                                                    you save regularly.
                                                </p>

                                            </div>

                                        )
                                    }


                                    {
                                        Number(
                                            report.savings?.completed_goals
                                        ) > 0 && (

                                            <div className="recommendation success">

                                                <span>
                                                    🎯
                                                </span>

                                                <p>
                                                    You have completed
                                                    savings goals.
                                                    Continue maintaining
                                                    your savings habit.
                                                </p>

                                            </div>

                                        )
                                    }

                                </div>

                            </section>


                            {/* ==========================
                                DOWNLOAD
                            ========================== */}

                            <section className="download-panel">

                                <div>

                                    <h2>
                                        📥 Export Report
                                    </h2>

                                    <p>
                                        Download the generated
                                        financial report for
                                        future reference.
                                    </p>

                                </div>


                                <div className="download-actions">

                                    <button
                                        className="download-json"
                                        onClick={() =>
                                            handleDownload("json")
                                        }
                                        disabled={downloading}
                                    >

                                        {downloading
                                            ? "Preparing..."
                                            : "⬇ Download JSON"
                                        }

                                    </button>


                                    <button
                                        className="download-pdf"
                                        onClick={() =>
                                            handleDownload("pdf")
                                        }
                                        disabled={downloading}
                                    >

                                        {downloading
                                            ? "Preparing..."
                                            : "📄 Download PDF"
                                        }

                                    </button>


                                    <button
                                        className="download-excel"
                                        onClick={() =>
                                            handleDownload("excel")
                                        }
                                        disabled={downloading}
                                    >

                                        {downloading
                                            ? "Preparing..."
                                            : "📗 Download Excel"
                                        }

                                    </button>

                                </div>

                            </section>

                        </div>

                    )
                }


                {/* ==========================
                    EMPTY STATE
                ========================== */}

                {
                    !report &&
                    !loading && (

                        <div className="reports-empty">

                            <div className="empty-icon">
                                📊
                            </div>

                            <h2>
                                Generate your financial report
                            </h2>

                            <p>
                                Select a start date and end date
                                above to view your financial
                                summary, analytics, insights
                                and recommendations.
                            </p>

                        </div>

                    )
                }


            </div>

        </MainLayout>

    );

}