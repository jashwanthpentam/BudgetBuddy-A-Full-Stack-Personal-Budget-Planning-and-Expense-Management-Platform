import { useState } from "react";
import MainLayout from "../layouts/MainLayout";
import "./Reports.css";
import {
    generateReport,
    downloadJSONReport,
    downloadPDFReport,
} from "../services/reportService";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";

export default function Reports() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const COLORS = [
        "#3b82f6",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#06b6d4",
    ];

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            alert("Please select both Start Date and End Date.");
            return;
        }

        try {
            setLoading(true);
            const data = await generateReport({
                startDate,
                endDate,
            });
            setReport(data);
        } catch (error) {
            console.error(error);
            alert("Failed to generate report.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (type) => {
        if (!startDate || !endDate) {
            alert("Please select both Start Date and End Date.");
            return;
        }

        try {
            setDownloading(true);
            const payload = { startDate, endDate };
            const response = type === "json" 
                ? await downloadJSONReport(payload) 
                : await downloadPDFReport(payload);
                
            const filename = type === "json" ? "BudgetBuddy_Report.json" : "BudgetBuddy_Report.pdf";
            
            const url = window.URL.createObjectURL(response.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert(`Failed to download ${type.toUpperCase()} report.`);
        } finally {
            setDownloading(false);
        }
    };

    return (

    <MainLayout title="Financial Reports">

        <div className="reports-container">

            <div className="report-header">

                <div>

                    <h1>📊 Financial Reports</h1>

                    <p>

                        Analyze your financial performance

                    </p>

                </div>

            </div>

            <div className="report-filter">

                <div className="filter-group">

                    <label>Start Date</label>

                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) =>
                            setStartDate(e.target.value)
                        }
                    />

                </div>

                <div className="filter-group">

                    <label>End Date</label>

                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) =>
                            setEndDate(e.target.value)
                        }
                    />

                </div>

                <button
                    className="generate-btn"
                    onClick={handleGenerateReport}
                    disabled={loading}
                >

                    {

                        loading

                            ? "Generating..."

                            : "Generate Report"

                    }

                </button>

            </div>

            {

                report && (

                    <>

                        <div className="summary-grid">

                            <div className="summary-card">

                                <h3>Total Income</h3>

                                <h2>

                                    ₹{report.summary.total_income}

                                </h2>

                            </div>

                            <div className="summary-card">

                                <h3>Total Expense</h3>

                                <h2>

                                    ₹{report.summary.total_expense}

                                </h2>

                            </div>

                            <div className="summary-card">

                                <h3>Current Balance</h3>

                                <h2>

                                    ₹{report.summary.current_balance}

                                </h2>

                            </div>

                            <div className="summary-card">

                                <h3>Total Savings</h3>

                                <h2>

                                    ₹{report.summary.total_savings}

                                </h2>

                            </div>

                        </div>

                        <div className="chart-grid">

                            <div className="chart-card">

                                <h2>Income vs Expense</h2>

                                <ResponsiveContainer
                                    width="100%"
                                    height={300}
                                >

                                    <BarChart
                                        data={[
                                            {
                                                name: "Income",
                                                amount:
                                                    report.charts
                                                        .income_vs_expense
                                                        .income,
                                            },
                                            {
                                                name: "Expense",
                                                amount:
                                                    report.charts
                                                        .income_vs_expense
                                                        .expense,
                                            },
                                        ]}
                                    >

                                        <CartesianGrid strokeDasharray="3 3" />

                                        <XAxis dataKey="name" />

                                        <YAxis />

                                        <Tooltip />

                                        <Bar
                                            dataKey="amount"
                                            fill="#3b82f6"
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            </div>

                            <div className="chart-card">

                                <h2>Expense Categories</h2>

                                <ResponsiveContainer
                                    width="100%"
                                    height={300}
                                >

                                    <PieChart>

                                        <Pie
                                            data={
                                                report.charts
                                                    .expense_by_category
                                            }
                                            dataKey="total"
                                            nameKey="category"
                                            outerRadius={100}
                                            label
                                        >

                                            {
                                                report.charts
                                                    .expense_by_category
                                                    .map((entry, index) => (

                                                        <Cell
                                                            key={index}
                                                            fill={
                                                                COLORS[
                                                                    index %
                                                                    COLORS.length
                                                                ]
                                                            }
                                                        />

                                                    ))
                                            }

                                        </Pie>

                                        <Tooltip />

                                    </PieChart>

                                </ResponsiveContainer>

                            </div>

                        </div>

                        <div className="report-section">

                            <h2>

                                Analytics

                            </h2>

                            <ul>

                                <li>

                                    Expense Transactions :

                                    {

                                        report.analytics.expense_transactions

                                    }

                                </li>

                                <li>

                                    Savings Rate :

                                    {

                                        report.analytics.savings_rate

                                    }%

                                </li>

                                <li>

                                    Budget Utilization :

                                    {

                                        report.analytics.budget_utilization

                                    }%

                                </li>

                                <li>

                                    Goal Completion Rate :

                                    {

                                        report.analytics.goal_completion_rate

                                    }%

                                </li>

                            </ul>

                        </div>

                        <div className="report-section">

                            <h2>

                                Insights

                            </h2>

                            <ul>

                                <li>

                                    Highest Expense Category :

                                    {

                                        report.insights.highest_expense_category

                                    }

                                </li>

                                <li>

                                    Budget Status :

                                    {

                                        report.insights.budget_status

                                    }

                                </li>

                                <li>

                                    Savings Status :

                                    {

                                        report.insights.savings_status

                                    }

                                </li>

                            </ul>

                        </div>

                        <div className="report-section">

                            <h2>

                                Recommendations

                            </h2>

                            <ul>

                                {

                                    report.insights.budget_status ===
                                    "Over Budget"

                                        ?

                                        (

                                            <li>

                                                Reduce unnecessary expenses.

                                            </li>

                                        )

                                        :

                                        (

                                            <li>

                                                Spending is within budget.

                                            </li>

                                        )

                                }

                                {

                                    report.analytics.savings_rate < 20 &&

                                    (

                                        <li>

                                            Increase monthly savings.

                                        </li>

                                    )

                                }

                                {

                                    report.savings?.completed_goals > 0 &&

                                    (

                                        <li>

                                            Continue completing savings goals.

                                        </li>

                                    )

                                }

                            </ul>

                        </div>

                        <div className="export-buttons">

                            <button

                                onClick={() =>
                                    handleDownload("json")
                                }

                                disabled={downloading}

                            >

                                Download JSON

                            </button>

                            <button

                                onClick={() =>
                                    handleDownload("pdf")
                                }

                                disabled={downloading}

                            >

                                Download PDF

                            </button>

                        </div>

                    </>

                )

            }

        </div>

    </MainLayout>

);
}