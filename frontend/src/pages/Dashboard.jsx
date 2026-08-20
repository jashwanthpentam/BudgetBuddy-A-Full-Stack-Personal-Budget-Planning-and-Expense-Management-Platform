import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { getDashboardSummary } from "../services/dashboardService";
import IncomeExpenseBarChart from "../components/Dashboard/IncomeExpenseBarChart";
import "../Dashboard.css";
import { useDateContext } from "../context/DateContext";

export default function Dashboard() {

    const [totalBudget, setTotalBudget] = useState(0);
    const [totalExpense, setTotalExpense] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [totalIncome, setTotalIncome] = useState(0);
    const [balance, setBalance] = useState(0);
    const [remainingBudget, setRemainingBudget] = useState(0);
    const [overspentAmount, setOverspentAmount] = useState(0);
    const [totalSavings, setTotalSavings] = useState(0);
    const [savingsGoals, setSavingsGoals] = useState([]);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [recentAlerts, setRecentAlerts] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const username =
        localStorage.getItem("username") || "User";

    const {
        globalMonth,
        globalYear,
        setGlobalMonth,
        setGlobalYear,
    } = useDateContext();


    /* =====================================================
       MONTHS
    ===================================================== */

    const months = [
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
    ];


    /* =====================================================
       FETCH DASHBOARD
    ===================================================== */

    const fetchDashboard = async () => {

        try {

            setLoading(true);
            setError(false);

            const dashboardRes =
                await getDashboardSummary(
                    globalMonth,
                    globalYear
                );

            setTotalIncome(
                Number(
                    dashboardRes.total_income || 0
                )
            );

            setTotalExpense(
                Number(
                    dashboardRes.total_expense || 0
                )
            );

            setTotalBudget(
                Number(
                    dashboardRes.total_budget || 0
                )
            );

            setBalance(
                Number(
                    dashboardRes.current_balance || 0
                )
            );

            setRemainingBudget(
                Number(
                    dashboardRes.remaining_budget || 0
                )
            );

            setOverspentAmount(
                Number(
                    dashboardRes.overspent_amount || 0
                )
            );

            setTotalSavings(Number(dashboardRes.total_savings || 0));
            setSavingsGoals(dashboardRes.savings_goals || []);
            setUnreadNotifications(Number(dashboardRes.unread_notifications || 0));
            setRecentAlerts(dashboardRes.recent_alerts || []);

            setTransactions(
                dashboardRes.recent_transactions || []
            );

        }

        catch (error) {

            console.log(
                "Dashboard Error:",
                error
            );

            setError(true);

        }

        finally {

            setLoading(false);

        }

    };


    /* =====================================================
       FETCH WHEN MONTH / YEAR CHANGES
    ===================================================== */

    useEffect(() => {

        fetchDashboard();

    }, [
        globalMonth,
        globalYear
    ]);


    /* =====================================================
       FORMAT MONEY
    ===================================================== */

    const formatMoney = (amount) => {

        return Number(
            amount || 0
        ).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 2
            }
        );

    };



    /* =====================================================
       FORMAT TRANSACTION DATE
    ===================================================== */

    const formatTransactionDate = (dateValue) => {

        if (!dateValue) {
            return "—";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return String(dateValue);
        }

        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        );
    };

    /* =====================================================
       CALCULATIONS
    ===================================================== */

    const netCashFlow =
        totalIncome - totalExpense;


    const budgetPercentage =
        totalBudget > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    (totalExpense / totalBudget) * 100
                )
            )
            : 0;


    const budgetStatus =
        overspentAmount > 0
            ? "Overspent"
            : budgetPercentage >= 80
                ? "Near Limit"
                : "Healthy";


    const budgetStatusClass =
        overspentAmount > 0
            ? "danger"
            : budgetPercentage >= 80
                ? "warning"
                : "success";


    /* =====================================================
       TRANSACTION COUNTS
    ===================================================== */

    const transactionStats = useMemo(() => {

        let incomeCount = 0;
        let expenseCount = 0;

        transactions.forEach(
            (transaction) => {

                const type =
                    String(
                        transaction.type || ""
                    ).toUpperCase();

                if (type.includes("INCOME")) {
                    incomeCount++;
                } else if (type.includes("EXPENSE")) {
                    expenseCount++;
                }

            }
        );

        return {
            incomeCount,
            expenseCount,
            total: transactions.length,
        };

    }, [transactions]);


    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {

        return (

            <MainLayout title="Dashboard">

                <div className="dashboard-loading">

                    <div className="loading-circle">
                        ₹
                    </div>

                    <h2>
                        Loading your dashboard
                    </h2>

                    <p>
                        Preparing your financial overview...
                    </p>

                </div>

            </MainLayout>

        );

    }


    /* =====================================================
       ERROR
    ===================================================== */

    if (error) {

        return (

            <MainLayout title="Dashboard">

                <div className="dashboard-error">

                    <div className="error-icon">
                        !
                    </div>

                    <h2>
                        Unable to load dashboard
                    </h2>

                    <p>
                        We couldn't retrieve your financial
                        information.
                    </p>

                    <button
                        onClick={fetchDashboard}
                    >
                        Try Again
                    </button>

                </div>

            </MainLayout>

        );

    }


    /* =====================================================
       MAIN UI
    ===================================================== */

    return (

        <MainLayout title="Dashboard">

            <div className="dashboard-page">


                {/* =================================================
                   HEADER
                ================================================= */}

                <section className="dashboard-hero">

                    <div className="dashboard-heading">

                        <div className="dashboard-breadcrumb">
                            Finance / Dashboard
                        </div>

                        <h1>
                            Welcome back, {username} 👋
                        </h1>

                        <p>
                            Here's your financial overview
                            for the selected period.
                        </p>

                    </div>


                    <div className="dashboard-period">

                        <span className="period-label">
                            VIEWING
                        </span>

                        <div className="period-controls">

                            <select
                                aria-label="Select dashboard month"
                                value={globalMonth}
                                onChange={(e) =>
                                    setGlobalMonth(
                                        Number(
                                            e.target.value
                                        )
                                    )
                                }
                            >

                                {months.map(
                                    (
                                        month,
                                        index
                                    ) => (

                                        <option
                                            key={
                                                index + 1
                                            }
                                            value={
                                                index + 1
                                            }
                                        >
                                            {month}
                                        </option>

                                    )
                                )}

                            </select>


                            <input
                                type="number"
                                min="2000"
                                max="2100"
                                aria-label="Select dashboard year"
                                value={globalYear}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    if (value === "") {
                                        return;
                                    }

                                    const year = Number(value);

                                    if (
                                        Number.isInteger(year) &&
                                        year >= 2000 &&
                                        year <= 2100
                                    ) {
                                        setGlobalYear(year);
                                    }
                                }}
                            />

                        </div>

                    </div>

                </section>


                {/* =================================================
                   PRIMARY FINANCIAL CARDS
                ================================================= */}

                <section className="dashboard-summary-grid">


                    {/* INCOME */}

                    <div className="summary-card income-card">

                        <div className="summary-card-top">

                            <div className="summary-icon">
                                ↑
                            </div>

                            <span>
                                INCOME
                            </span>

                        </div>

                        <h2>
                            ₹{formatMoney(totalIncome)}
                        </h2>

                        <p>
                            Total income received
                        </p>

                        <div className="summary-line" />

                    </div>


                    {/* EXPENSE */}

                    <div className="summary-card expense-card">

                        <div className="summary-card-top">

                            <div className="summary-icon">
                                ↓
                            </div>

                            <span>
                                EXPENSES
                            </span>

                        </div>

                        <h2>
                            ₹{formatMoney(totalExpense)}
                        </h2>

                        <p>
                            Total spending
                        </p>

                        <div className="summary-line" />

                    </div>


                    {/* BUDGET */}

                    <div className="summary-card budget-card">

                        <div className="summary-card-top">

                            <div className="summary-icon">
                                ◫
                            </div>

                            <span>
                                BUDGET
                            </span>

                        </div>

                        <h2>
                            ₹{formatMoney(totalBudget)}
                        </h2>

                        <p>
                            Planned spending limit
                        </p>

                        <div className="summary-line" />

                    </div>


                    {/* BALANCE */}

                    <div className="summary-card balance-card">

                        <div className="summary-card-top">

                            <div className="summary-icon">
                                ₹
                            </div>

                            <span>
                                BALANCE
                            </span>

                        </div>

                        <h2>
                            ₹{formatMoney(balance)}
                        </h2>

                        <p>
                            Current available balance
                        </p>

                        <div className="summary-line" />

                    </div>

                    {/* SAVINGS */}

                    <div className="summary-card savings-card">
                        <div className="summary-card-top">
                            <div className="summary-icon">↗</div>
                            <span>SAVINGS</span>
                        </div>
                        <h2>₹{formatMoney(totalSavings)}</h2>
                        <p>Total savings contributions</p>
                        <div className="summary-line" />
                    </div>

                </section>


                {/* =================================================
                   FINANCIAL HEALTH
                ================================================= */}

                <section className="dashboard-health-grid">


                    {/* NET CASH FLOW */}

                    <div className="health-card">

                        <div className="health-title-row">

                            <div>

                                <span className="health-label">
                                    NET CASH FLOW
                                </span>

                                <h3
                                    className={
                                        netCashFlow >= 0
                                            ? "positive"
                                            : "negative"
                                    }
                                >
                                    {netCashFlow >= 0
                                        ? "+"
                                        : "-"}
                                    ₹
                                    {formatMoney(
                                        Math.abs(
                                            netCashFlow
                                        )
                                    )}
                                </h3>

                            </div>

                            <div className="health-symbol">
                                ↗
                            </div>

                        </div>

                        <p>
                            {netCashFlow >= 0
                                ? "Your income is currently higher than your expenses."
                                : "Your expenses are currently higher than your income."
                            }
                        </p>

                    </div>


                    {/* BUDGET HEALTH */}

                    <div className="health-card">

                        <div className="health-title-row">

                            <div>

                                <span className="health-label">
                                    BUDGET UTILIZATION
                                </span>

                                <h3>
                                    {Math.round(
                                        budgetPercentage
                                    )}%
                                </h3>

                            </div>

                            <span
                                className={
                                    `budget-status ${budgetStatusClass}`
                                }
                            >
                                {budgetStatus}
                            </span>

                        </div>


                        <div className="budget-progress">

                            <div
                                className={
                                    `budget-progress-fill ${budgetStatusClass}`
                                }
                                style={{
                                    width:
                                        `${budgetPercentage}%`
                                }}
                            />

                        </div>


                        <p>

                            {overspentAmount > 0

                                ? `₹${formatMoney(
                                    overspentAmount
                                )} over your budget`

                                : `₹${formatMoney(
                                    remainingBudget
                                )} remaining`

                            }

                        </p>

                    </div>


                    {/* ACTIVITY */}

                    <div className="health-card">

                        <div className="health-title-row">

                            <div>

                                <span className="health-label">
                                    RECENT ACTIVITY
                                </span>

                                <h3>
                                    {transactionStats.total}
                                    {" "}
                                    Transactions
                                </h3>

                            </div>

                            <div className="health-symbol">
                                ↔
                            </div>

                        </div>

                        <div className="activity-row">

                            <span className="activity-income">
                                ↑ {transactionStats.incomeCount}
                                {" "}
                                Income
                            </span>

                            <span className="activity-expense">
                                ↓ {transactionStats.expenseCount}
                                {" "}
                                Expense
                            </span>

                        </div>

                    </div>

                    {/* ALERTS */}

                    <div className="health-card">
                        <div className="health-title-row">
                            <div>
                                <span className="health-label">ALERTS</span>
                                <h3>{unreadNotifications} Unread</h3>
                            </div>
                            <div className="health-symbol">!</div>
                        </div>
                        <p>Recent notifications and reminders waiting for you.</p>
                    </div>

                </section>


                {/* =================================================
                   CHART HEADER
                ================================================= */}

                <section className="section-heading">

                    <div>

                        <h2>
                            Financial Overview
                        </h2>

                        <p>
                            Compare your income and spending
                            for the selected period.
                        </p>

                    </div>

                </section>


                {/* =================================================
                   CHART
                ================================================= */}

                <section className="dashboard-chart-section">

                    <IncomeExpenseBarChart
                        totalIncome={totalIncome}
                        totalExpense={totalExpense}
                    />

                </section>

                {/* =================================================
                   SAVINGS GOALS + ALERTS
                ================================================= */}

                <section className="dashboard-secondary-grid">
                    <div className="transactions-card">
                        <div className="transactions-header">
                            <div>
                                <h2>Savings Goals</h2>
                                <p>Your current goal progress.</p>
                            </div>
                            <span className="transaction-count">{savingsGoals.length} goals</span>
                        </div>
                        <div className="dashboard-goals-list">
                            {savingsGoals.length === 0 ? (
                                <p className="empty-transactions">No savings goals yet.</p>
                            ) : savingsGoals.map((goal) => (
                                <div className="dashboard-goal-row" key={goal.id}>
                                    <div>
                                        <strong>{goal.goal_name}</strong>
                                        <span>{goal.progress_percentage}% complete</span>
                                    </div>
                                    <div className="goal-progress-track">
                                        <div className="goal-progress-fill" style={{ width: `${Math.min(100, Number(goal.progress_percentage || 0))}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="transactions-card">
                        <div className="transactions-header">
                            <div>
                                <h2>Recent Alerts</h2>
                                <p>Unread BudgetBuddy notifications.</p>
                            </div>
                        </div>
                        <div className="dashboard-alert-list">
                            {recentAlerts.length === 0 ? (
                                <p className="empty-transactions">You're all caught up.</p>
                            ) : recentAlerts.map((alert) => (
                                <div className="dashboard-alert-row" key={alert.id}>
                                    <strong>{alert.title}</strong>
                                    <span>{alert.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>


                {/* =================================================
                   TRANSACTIONS
                ================================================= */}

                <section className="transactions-card">

                    <div className="transactions-header">

                        <div>

                            <h2>
                                Recent Transactions
                            </h2>

                            <p>
                                Latest activity from your
                                income and expense records.
                            </p>

                        </div>

                        <span className="transaction-count">
                            {transactions.length}
                            {" "}
                            records
                        </span>

                    </div>


                    <div className="transactions-table-wrapper">

                        <table className="dashboard-table">

                            <thead>

                                <tr>

                                    <th>
                                        DATE
                                    </th>

                                    <th>
                                        TYPE
                                    </th>

                                    <th>
                                        CATEGORY
                                    </th>

                                    <th>
                                        AMOUNT
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {transactions.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="4"
                                            className="empty-transactions"
                                        >
                                            No transactions found
                                            for this period.

                                        </td>

                                    </tr>

                                ) : (

                                    transactions
                                        .slice(0, 7)
                                        .map(
                                            (
                                                transaction,
                                                index
                                            ) => {

                                                const isIncome =
                                                    String(
                                                        transaction.type ||
                                                        ""
                                                    )
                                                        .toUpperCase()
                                                        .includes(
                                                            "INCOME"
                                                        );


                                                return (

                                                    <tr
                                                        key={
                                                            transaction.id ||
                                                            index
                                                        }
                                                    >

                                                        <td>
                                                            {
                                                                formatTransactionDate(
                                                                    transaction.date
                                                                )
                                                            }
                                                        </td>


                                                        <td>

                                                            <span
                                                                className={
                                                                    `transaction-badge ${
                                                                        isIncome
                                                                            ? "income"
                                                                            : "expense"
                                                                    }`
                                                                }
                                                            >

                                                                {isIncome
                                                                    ? "↑ Income"
                                                                    : "↓ Expense"}

                                                            </span>

                                                        </td>


                                                        <td>

                                                            <span className="category-text">
                                                                {
                                                                    transaction.category ||
                                                                    "—"
                                                                }
                                                            </span>

                                                        </td>


                                                        <td>

                                                            <span
                                                                className={
                                                                    `transaction-amount ${
                                                                        isIncome
                                                                            ? "income"
                                                                            : "expense"
                                                                    }`
                                                                }
                                                            >

                                                                {isIncome
                                                                    ? "+"
                                                                    : "-"}
                                                                ₹
                                                                {formatMoney(
                                                                    transaction.amount
                                                                )}

                                                            </span>

                                                        </td>

                                                    </tr>

                                                );

                                            }
                                        )

                                )}

                            </tbody>

                        </table>

                    </div>

                </section>


                {/* =================================================
                   FINANCIAL INSIGHT
                ================================================= */}

                <section className="dashboard-insight">

                    <div className="insight-icon">
                        ✦
                    </div>

                    <div>

                        <span>
                            FINANCIAL SNAPSHOT
                        </span>

                        <p>

                            {netCashFlow >= 0

                                ? `You are currently maintaining a positive cash flow of ₹${formatMoney(
                                    netCashFlow
                                )}.`

                                : `Your expenses exceed your income by ₹${formatMoney(
                                    Math.abs(
                                        netCashFlow
                                    )
                                )}. Review your spending to improve your balance.`

                            }

                        </p>

                    </div>

                </section>

            </div>

        </MainLayout>

    );
}