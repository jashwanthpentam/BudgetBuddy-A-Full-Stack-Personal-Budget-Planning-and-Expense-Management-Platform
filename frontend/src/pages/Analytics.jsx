import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { useDateContext } from "../context/DateContext";
import { getAnalytics } from "../services/analyticsService";

import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LineChart,
    Line,
} from "recharts";

import "./Analytics.css";


const CHART_COLORS = [
    "#22c55e",
    "#06b6d4",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#14b8a6",
    "#f97316",
    "#38bdf8",
];


function Analytics() {

    const {
        globalMonth,
        globalYear,
        setGlobalMonth,
        setGlobalYear,
    } = useDateContext();


    const [analytics, setAnalytics] = useState(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");


    useEffect(() => {

        loadAnalytics();

    }, [globalMonth, globalYear]);


    const loadAnalytics = async () => {

        try {

            setLoading(true);
            setError("");

            const data = await getAnalytics(
                globalMonth,
                globalYear
            );

            setAnalytics(data);

        } catch (error) {

            console.error(
                "Analytics error:",
                error
            );

            setError(
                "Unable to load analytics data."
            );

        } finally {

            setLoading(false);

        }
    };


    const formatMoney = (value) => {

        return `₹${Number(value || 0).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 2
            }
        )}`;

    };


    if (loading) {

        return (
            <MainLayout title="Analytics">

                <div className="analytics-state">
                    Loading analytics...
                </div>

            </MainLayout>
        );

    }


    if (error) {

        return (
            <MainLayout title="Analytics">

                <div className="analytics-state error">
                    {error}

                    <button
                        onClick={loadAnalytics}
                    >
                        Retry
                    </button>
                </div>

            </MainLayout>
        );

    }


    if (!analytics) {
        return null;
    }


    const summary = analytics.summary;


    return (

        <MainLayout title="Analytics">

            <div className="analytics-page">

                {/* -------------------------------- */}
                {/* HEADER */}
                {/* -------------------------------- */}

                <div className="analytics-header">

                    <div>

                        <h1>
                            Financial Analytics
                        </h1>

                        <p>
                            Detailed analysis of your
                            financial activity.
                        </p>

                    </div>

                    <div className="analytics-period">

                        <select
                            value={globalMonth}
                            onChange={(e) =>
                                setGlobalMonth(
                                    Number(e.target.value)
                                )
                            }
                        >

                            {[
                                "January",
                                "February",
                                "March",
                                "April",
                                "May",
                                "June",
                                "July",
                                "August",
                                "September",
                                "October",
                                "November",
                                "December",
                            ].map((month, index) => (

                                <option
                                    key={month}
                                    value={index + 1}
                                >
                                    {month}
                                </option>

                            ))}

                        </select>

                        <input
                            type="number"
                            value={globalYear}
                            onChange={(e) =>
                                setGlobalYear(
                                    Number(e.target.value)
                                )
                            }
                        />

                    </div>

                </div>


                {/* -------------------------------- */}
                {/* SUMMARY STATS */}
                {/* -------------------------------- */}

                <div className="analytics-stat-grid">

                    <StatCard
                        title="Income"
                        value={formatMoney(
                            summary.total_income
                        )}
                        icon="💵"
                    />

                    <StatCard
                        title="Expenses"
                        value={formatMoney(
                            summary.total_expense
                        )}
                        icon="💳"
                    />

                    <StatCard
                        title="Savings"
                        value={formatMoney(
                            summary.savings
                        )}
                        icon="💰"
                    />

                    <StatCard
                        title="Savings Rate"
                        value={`${summary.savings_rate}%`}
                        icon="📈"
                    />

                    <StatCard
                        title="Budget Used"
                        value={`${summary.budget_utilization}%`}
                        icon="📒"
                    />

                    <StatCard
                        title="Budget Remaining"
                        value={formatMoney(
                            summary.remaining_budget
                        )}
                        icon="💼"
                    />

                    <StatCard
                        title="Avg. Monthly Expense"
                        value={formatMoney(
                            summary.average_monthly_expense
                        )}
                        icon="📊"
                    />

                    <StatCard
                        title="Transactions"
                        value={summary.transaction_count}
                        icon="🧾"
                    />

                </div>


                {/* -------------------------------- */}
                {/* CHART ROW 1 */}
                {/* -------------------------------- */}

                <div className="analytics-grid two-columns">

                    <AnalyticsCard
                        title="Expense by Category"
                        subtitle="Where your money was spent"
                    >

                        {analytics.expense_by_category.length === 0 ? (

                            <EmptyChart
                                text="No expense data available."
                            />

                        ) : (

                            <ResponsiveContainer
                                width="100%"
                                height={320}
                            >

                                <PieChart>

                                    <Pie
                                        data={
                                            analytics.expense_by_category
                                        }
                                        dataKey="amount"
                                        nameKey="label"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={110}
                                        paddingAngle={3}
                                    >

                                        {analytics
                                            .expense_by_category
                                            .map(
                                                (entry, index) => (

                                                    <Cell
                                                        key={
                                                            entry.category
                                                        }
                                                        fill={
                                                            CHART_COLORS[
                                                                index %
                                                                CHART_COLORS.length
                                                            ]
                                                        }
                                                    />

                                                )
                                            )}

                                    </Pie>

                                    <Tooltip
                                        formatter={(value) =>
                                            formatMoney(value)
                                        }
                                    />

                                    <Legend />

                                </PieChart>

                            </ResponsiveContainer>

                        )}

                    </AnalyticsCard>


                    <AnalyticsCard
                        title="Income by Source"
                        subtitle="Where your income came from"
                    >

                        {analytics.income_by_source.length === 0 ? (

                            <EmptyChart
                                text="No income data available."
                            />

                        ) : (

                            <ResponsiveContainer
                                width="100%"
                                height={320}
                            >

                                <PieChart>

                                    <Pie
                                        data={
                                            analytics.income_by_source
                                        }
                                        dataKey="amount"
                                        nameKey="label"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={110}
                                        paddingAngle={3}
                                    >

                                        {analytics
                                            .income_by_source
                                            .map(
                                                (entry, index) => (

                                                    <Cell
                                                        key={
                                                            entry.source
                                                        }
                                                        fill={
                                                            CHART_COLORS[
                                                                index %
                                                                CHART_COLORS.length
                                                            ]
                                                        }
                                                    />

                                                )
                                            )}

                                    </Pie>

                                    <Tooltip
                                        formatter={(value) =>
                                            formatMoney(value)
                                        }
                                    />

                                    <Legend />

                                </PieChart>

                            </ResponsiveContainer>

                        )}

                    </AnalyticsCard>

                </div>


                {/* -------------------------------- */}
                {/* MONTHLY TREND */}
                {/* -------------------------------- */}

                <AnalyticsCard
                    title="Six-Month Financial Trend"
                    subtitle="Income, expenses and savings"
                >

                    <ResponsiveContainer
                        width="100%"
                        height={350}
                    >

                        <LineChart
                            data={analytics.monthly_trend}
                        >

                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(148,163,184,0.18)"
                            />

                            <XAxis
                                dataKey="label"
                                tick={{
                                    fill: "#cbd5e1"
                                }}
                            />

                            <YAxis
                                tick={{
                                    fill: "#94a3b8"
                                }}
                            />

                            <Tooltip
                                formatter={(value) =>
                                    formatMoney(value)
                                }
                            />

                            <Legend />

                            <Line
                                type="monotone"
                                dataKey="income"
                                stroke="#22c55e"
                                strokeWidth={3}
                                dot
                            />

                            <Line
                                type="monotone"
                                dataKey="expense"
                                stroke="#ef4444"
                                strokeWidth={3}
                                dot
                            />

                            <Line
                                type="monotone"
                                dataKey="savings"
                                stroke="#06b6d4"
                                strokeWidth={3}
                                dot
                            />

                        </LineChart>

                    </ResponsiveContainer>

                </AnalyticsCard>


                {/* -------------------------------- */}
                {/* BUDGET + SAVINGS */}
                {/* -------------------------------- */}

                <div className="analytics-grid two-columns">

                    <AnalyticsCard
                        title="Budget Utilization"
                        subtitle="Category-wise budget performance"
                    >

                        {analytics.budget_utilization.length === 0 ? (

                            <EmptyChart
                                text="No budgets available."
                            />

                        ) : (

                            <ResponsiveContainer
                                width="100%"
                                height={350}
                            >

                                <BarChart
                                    data={
                                        analytics.budget_utilization
                                    }
                                    layout="vertical"
                                    margin={{
                                        left: 20,
                                        right: 20
                                    }}
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="rgba(148,163,184,0.18)"
                                    />

                                    <XAxis
                                        type="number"
                                        tick={{
                                            fill: "#94a3b8"
                                        }}
                                    />

                                    <YAxis
                                        type="category"
                                        dataKey="label"
                                        width={90}
                                        tick={{
                                            fill: "#cbd5e1"
                                        }}
                                    />

                                    <Tooltip
                                        formatter={(value) =>
                                            `${value}%`
                                        }
                                    />

                                    <Bar
                                        dataKey="utilization"
                                        fill="#8b5cf6"
                                        radius={[
                                            0,
                                            8,
                                            8,
                                            0
                                        ]}
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        )}

                    </AnalyticsCard>


                    <AnalyticsCard
                        title="Savings Goals"
                        subtitle="Progress toward your targets"
                    >

                        {analytics.savings_goals.length === 0 ? (

                            <EmptyChart
                                text="No savings goals available."
                            />

                        ) : (

                            <div className="goal-list">

                                {analytics.savings_goals.map(
                                    (goal) => (

                                        <div
                                            className="goal-item"
                                            key={goal.id}
                                        >

                                            <div className="goal-top">

                                                <strong>
                                                    {goal.name}
                                                </strong>

                                                <span>
                                                    {
                                                        goal.progress
                                                    }%
                                                </span>

                                            </div>

                                            <div className="progress-track">

                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width:
                                                            `${Math.min(
                                                                goal.progress,
                                                                100
                                                            )}%`
                                                    }}
                                                />

                                            </div>

                                            <div className="goal-meta">

                                                <span>
                                                    Saved{" "}
                                                    {formatMoney(
                                                        goal.saved_amount
                                                    )}
                                                </span>

                                                <span>
                                                    Target{" "}
                                                    {formatMoney(
                                                        goal.target_amount
                                                    )}
                                                </span>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                        )}

                    </AnalyticsCard>

                </div>


                {/* -------------------------------- */}
                {/* INSIGHTS */}
                {/* -------------------------------- */}

                <div className="insights-card">

                    <h2>
                        💡 Financial Insights
                    </h2>

                    {analytics.insights.length === 0 ? (

                        <p>
                            Add more financial activity
                            to generate insights.
                        </p>

                    ) : (

                        <div className="insight-list">

                            {analytics.insights.map(
                                (insight, index) => (

                                    <div
                                        className="insight-item"
                                        key={index}
                                    >
                                        <span>•</span>

                                        <p>
                                            {insight}
                                        </p>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </div>

            </div>

        </MainLayout>
    );
}


function StatCard({
    title,
    value,
    icon
}) {

    return (

        <div className="analytics-stat-card">

            <div className="stat-icon">
                {icon}
            </div>

            <div>

                <p>
                    {title}
                </p>

                <h2>
                    {value}
                </h2>

            </div>

        </div>

    );
}


function AnalyticsCard({
    title,
    subtitle,
    children
}) {

    return (

        <section className="analytics-card">

            <div className="analytics-card-header">

                <h2>
                    {title}
                </h2>

                <p>
                    {subtitle}
                </p>

            </div>

            {children}

        </section>

    );
}


function EmptyChart({ text }) {

    return (

        <div className="analytics-empty">
            {text}
        </div>

    );
}


export default Analytics;