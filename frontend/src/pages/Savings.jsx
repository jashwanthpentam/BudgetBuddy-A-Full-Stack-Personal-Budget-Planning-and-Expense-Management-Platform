import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import "./Savings.css";

import {
    getSavingsSummary,
    getSavingsGoals,
    createSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
} from "../services/savingsService";

import useModuleDate from "../hooks/useModuleDate";


import { toast, confirmAction } from "./toast";
export default function Savings() {

    /* =====================================================
       STATE
    ===================================================== */

    const [summary, setSummary] = useState({
        total_target: 0,
        total_saved: 0,
        remaining_amount: 0,
        active_goals: 0,
        completed_goals: 0,
        overall_progress: 0,
    });

    const [goals, setGoals] = useState([]);

    const [loading, setLoading] = useState(true);

    const [editingGoal, setEditingGoal] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        goal_name: "",
        target_amount: "",
        target_date: "",
    });

    const {
        month,
        year,
        setMonth,
        setYear,
    } = useModuleDate();


    /* =====================================================
       MONTHS
    ===================================================== */

    const monthNames = [
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
       FETCH SUMMARY
    ===================================================== */

    const fetchSummary = async () => {

        try {

            const data =
                await getSavingsSummary();

            setSummary({
                total_target:
                    Number(data.total_target || 0),

                total_saved:
                    Number(data.total_saved || 0),

                remaining_amount:
                    Number(
                        data.remaining_amount || 0
                    ),

                active_goals:
                    Number(data.active_goals || 0),

                completed_goals:
                    Number(
                        data.completed_goals || 0
                    ),

                overall_progress:
                    Number(
                        data.overall_progress || 0
                    ),
            });

        } catch (err) {

            console.log(err);

        }

    };


    /* =====================================================
       FETCH GOALS
    ===================================================== */

    const fetchGoals = async () => {

        try {

            const data =
                await getSavingsGoals();

            setGoals(data);

        } catch (err) {

            console.log(err);

        }

    };


    /* =====================================================
       LOAD PAGE
    ===================================================== */

    const loadPage = async () => {

        try {

            setLoading(true);

            await Promise.all([
                fetchSummary(),
                fetchGoals(),
            ]);

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       EFFECT
    ===================================================== */

    useEffect(() => {

        loadPage();

    }, [month, year]);


    /* =====================================================
       FORM CHANGE
    ===================================================== */

    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]:
                e.target.value,
        });

    };


    /* =====================================================
       SUBMIT
    ===================================================== */

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (
            !formData.goal_name ||
            !formData.target_amount ||
            !formData.target_date
        ) {

            toast.warning("Please fill all required fields.");

            return;

        }


        if (
            Number(formData.target_amount) <= 0
        ) {

            toast.warning("Target amount must be greater than 0.");

            return;

        }


        try {

            if (editingGoal) {

                await updateSavingsGoal(
                    editingGoal,
                    formData
                );

                toast.success("Savings Goal Updated Successfully");

            } else {

                await createSavingsGoal(
                    formData
                );

                toast.success("Savings Goal Created Successfully");

            }


            resetForm();

            await loadPage();

        } catch (err) {

            console.log(err);

            toast.error("Operation Failed");

        }

    };


    /* =====================================================
       RESET FORM
    ===================================================== */

    const resetForm = () => {

        setEditingGoal(null);

        setFormData({
            goal_name: "",
            target_amount: "",
            target_date: "",
        });

    };


    /* =====================================================
       DELETE
    ===================================================== */

    const handleDelete = async (id) => {

        const confirmed = await confirmAction(
            "Are you sure you want to delete this savings goal?",
            "Delete savings goal",
            "Delete"
        );

        if (!confirmed) {
            return;
        }


        try {

            await deleteSavingsGoal(id);

            toast.success("Savings Goal Deleted Successfully");

            await loadPage();

        } catch (err) {

            console.log(err);

            toast.error("Delete Failed");

        }

    };


    /* =====================================================
       EDIT
    ===================================================== */

    const handleEdit = (goal) => {

        setEditingGoal(goal.id);

        setFormData({
            goal_name:
                goal.goal_name,

            target_amount:
                goal.target_amount,

            target_date:
                goal.target_date,
        });


        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });

    };


    /* =====================================================
       FORMAT MONEY
    ===================================================== */

    const formatAmount = (amount) => {

        return Number(
            amount || 0
        ).toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }
        );

    };


    /* =====================================================
       FILTER GOALS
    ===================================================== */

    const filteredGoals = useMemo(() => {

        if (!searchTerm.trim()) {

            return goals;

        }

        const search =
            searchTerm.toLowerCase();

        return goals.filter(
            (goal) => {

                return (
                    goal.goal_name
                        ?.toLowerCase()
                        .includes(search) ||

                    goal.status
                        ?.toLowerCase()
                        .includes(search) ||

                    String(
                        goal.target_date
                    ).includes(search)
                );

            }
        );

    }, [goals, searchTerm]);


    /* =====================================================
       PROGRESS
    ===================================================== */

    const overallProgress =
        Math.min(
            100,
            Math.max(
                0,
                Number(
                    summary.overall_progress || 0
                )
            )
        );


    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {

        return (

            <MainLayout title="Savings">

                <div className="savings-page">

                    <div className="savings-loading">

                        <div className="savings-loading-icon">
                            ₹
                        </div>

                        <h2>
                            Loading Savings
                        </h2>

                        <p>
                            Preparing your savings
                            overview...
                        </p>

                    </div>

                </div>

            </MainLayout>

        );

    }


    /* =====================================================
       UI
    ===================================================== */

    return (

        <MainLayout title="Savings">

            <div className="savings-page">


                {/* =================================================
                   HEADER
                ================================================= */}

                <div className="savings-header">

                    <div>

                        <div className="savings-breadcrumb">
                            Finance / Savings
                        </div>

                        <h1 className="savings-title">
                            Savings Planning
                        </h1>

                        <p className="savings-subtitle">

                            Build savings goals,
                            track progress and
                            stay on target.

                        </p>

                    </div>


                    {/* PERIOD */}

                    <div className="savings-period">

                        <div className="savings-period-label">
                            Viewing
                        </div>

                        <div className="savings-period-controls">

                            <select
                                value={month}
                                onChange={(e) =>
                                    setMonth(
                                        Number(
                                            e.target.value
                                        )
                                    )
                                }
                            >

                                {monthNames.map(
                                    (
                                        name,
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
                                            {name}
                                        </option>

                                    )
                                )}

                            </select>


                            <input
                                type="number"
                                value={year}
                                onChange={(e) =>
                                    setYear(
                                        Number(
                                            e.target.value
                                        )
                                    )
                                }
                            />

                        </div>

                    </div>

                </div>


                {/* =================================================
                   SUMMARY
                ================================================= */}

                <div className="savings-stats">


                    <div className="savings-stat-card target">

                        <div className="savings-stat-icon">
                            ◎
                        </div>

                        <div>

                            <span>
                                Total Target
                            </span>

                            <h2>
                                ₹{" "}
                                {formatAmount(
                                    summary.total_target
                                )}
                            </h2>

                            <small>
                                Planned savings
                            </small>

                        </div>

                    </div>


                    <div className="savings-stat-card saved">

                        <div className="savings-stat-icon">
                            ✓
                        </div>

                        <div>

                            <span>
                                Total Saved
                            </span>

                            <h2>
                                ₹{" "}
                                {formatAmount(
                                    summary.total_saved
                                )}
                            </h2>

                            <small>
                                Amount accumulated
                            </small>

                        </div>

                    </div>


                    <div className="savings-stat-card remaining">

                        <div className="savings-stat-icon">
                            ↗
                        </div>

                        <div>

                            <span>
                                Remaining
                            </span>

                            <h2>
                                ₹{" "}
                                {formatAmount(
                                    summary.remaining_amount
                                )}
                            </h2>

                            <small>
                                Still to save
                            </small>

                        </div>

                    </div>


                    <div className="savings-stat-card progress">

                        <div className="savings-stat-icon">
                            %
                        </div>

                        <div>

                            <span>
                                Overall Progress
                            </span>

                            <h2>
                                {overallProgress}%
                            </h2>

                            <small>
                                Savings completion
                            </small>

                        </div>

                    </div>


                    <div className="savings-stat-card active">

                        <div className="savings-stat-icon">
                            ●
                        </div>

                        <div>

                            <span>
                                Active Goals
                            </span>

                            <h2>
                                {summary.active_goals}
                            </h2>

                            <small>
                                Currently running
                            </small>

                        </div>

                    </div>


                    <div className="savings-stat-card completed">

                        <div className="savings-stat-icon">
                            ★
                        </div>

                        <div>

                            <span>
                                Completed Goals
                            </span>

                            <h2>
                                {summary.completed_goals}
                            </h2>

                            <small>
                                Goals achieved
                            </small>

                        </div>

                    </div>

                </div>


                {/* =================================================
                   OVERALL PROGRESS
                ================================================= */}

                <div className="savings-progress-card">

                    <div className="savings-progress-header">

                        <div>

                            <h3>
                                Overall Savings Progress
                            </h3>

                            <p>
                                {monthNames[
                                    month - 1
                                ]}{" "}
                                {year}
                            </p>

                        </div>

                        <strong>
                            {overallProgress}%
                        </strong>

                    </div>


                    <div className="savings-progress-track">

                        <div
                            className={
                                `savings-progress-fill ${
                                    overallProgress >=
                                    100
                                        ? "complete"
                                        : overallProgress >=
                                          75
                                        ? "good"
                                        : "normal"
                                }`
                            }
                            style={{
                                width:
                                    `${overallProgress}%`,
                            }}
                        />

                    </div>


                    <div className="savings-progress-footer">

                        <span>
                            ₹{" "}
                            {formatAmount(
                                summary.total_saved
                            )}{" "}
                            saved
                        </span>

                        <span>
                            ₹{" "}
                            {formatAmount(
                                summary.total_target
                            )}{" "}
                            target
                        </span>

                    </div>

                </div>


                {/* =================================================
                   CREATE / UPDATE FORM
                ================================================= */}

                <div className="savings-form-card">

                    <div className="savings-section-heading">

                        <div>

                            <h2>
                                {editingGoal
                                    ? "Update Savings Goal"
                                    : "Create Savings Goal"}
                            </h2>

                            <p>
                                {editingGoal
                                    ? "Modify your selected savings goal."
                                    : "Define a financial target and start tracking it."}
                            </p>

                        </div>


                        {editingGoal && (

                            <button
                                type="button"
                                className="savings-cancel-btn"
                                onClick={
                                    resetForm
                                }
                            >
                                Cancel Edit
                            </button>

                        )}

                    </div>


                    <form
                        className="savings-form"
                        onSubmit={
                            handleSubmit
                        }
                    >


                        <div className="savings-field">

                            <label>
                                Goal Name
                                <span>*</span>
                            </label>

                            <input
                                type="text"
                                name="goal_name"
                                placeholder="e.g. New Laptop"
                                value={
                                    formData.goal_name
                                }
                                onChange={
                                    handleChange
                                }
                                required
                            />

                        </div>


                        <div className="savings-field">

                            <label>
                                Target Amount
                                <span>*</span>
                            </label>

                            <div className="savings-amount-input">

                                <span>
                                    ₹
                                </span>

                                <input
                                    type="number"
                                    name="target_amount"
                                    min="1"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={
                                        formData.target_amount
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                />

                            </div>

                        </div>


                        <div className="savings-field">

                            <label>
                                Target Date
                                <span>*</span>
                            </label>

                            <input
                                type="date"
                                name="target_date"
                                value={
                                    formData.target_date
                                }
                                onChange={
                                    handleChange
                                }
                                required
                            />

                        </div>


                        <div className="savings-form-action">

                            <button
                                type="submit"
                                className="savings-submit-btn"
                            >
                                {editingGoal
                                    ? "Update Goal"
                                    : "Create Goal"}
                            </button>

                        </div>

                    </form>

                </div>


                {/* =================================================
                   GOALS HEADER
                ================================================= */}

                <div className="savings-goals-header">

                    <div>

                        <h2>
                            Your Savings Goals
                        </h2>

                        <p>
                            Track every goal and
                            monitor your progress.
                        </p>

                    </div>


                    <div className="savings-search">

                        <span>
                            ⌕
                        </span>

                        <input
                            type="text"
                            placeholder="Search goals..."
                            value={
                                searchTerm
                            }
                            onChange={(e) =>
                                setSearchTerm(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                </div>


                {/* =================================================
                   GOALS
                ================================================= */}

                <div className="savings-goals-grid">

                    {filteredGoals.length === 0 ? (

                        <div className="savings-empty">

                            <div className="savings-empty-icon">
                                ◎
                            </div>

                            <h3>
                                No savings goals found
                            </h3>

                            <p>
                                Create your first
                                savings goal to
                                start tracking
                                progress.
                            </p>

                        </div>

                    ) : (

                        filteredGoals.map(
                            (goal) => {

                                const progress =
                                    Math.min(
                                        100,
                                        Math.max(
                                            0,
                                            Number(
                                                goal.progress_percentage ||
                                                    0
                                            )
                                        )
                                    );

                                const isCompleted =
                                    goal.status ===
                                    "Completed";


                                return (

                                    <div
                                        className="savings-goal-card"
                                        key={goal.id}
                                    >


                                        {/* GOAL HEADER */}

                                        <div className="savings-goal-header">

                                            <div>

                                                <span className="savings-goal-label">
                                                    SAVINGS GOAL
                                                </span>

                                                <h3>
                                                    {
                                                        goal.goal_name
                                                    }
                                                </h3>

                                            </div>


                                            <span
                                                className={
                                                    isCompleted
                                                        ? "savings-status completed"
                                                        : "savings-status active"
                                                }
                                            >
                                                {goal.status}
                                            </span>

                                        </div>


                                        {/* GOAL VALUES */}

                                        <div className="savings-goal-values">


                                            <div>

                                                <span>
                                                    Target
                                                </span>

                                                <strong>
                                                    ₹{" "}
                                                    {formatAmount(
                                                        goal.target_amount
                                                    )}
                                                </strong>

                                            </div>


                                            <div>

                                                <span>
                                                    Saved
                                                </span>

                                                <strong className="goal-saved">
                                                    ₹{" "}
                                                    {formatAmount(
                                                        goal.saved_amount
                                                    )}
                                                </strong>

                                            </div>


                                            <div>

                                                <span>
                                                    Remaining
                                                </span>

                                                <strong className="goal-remaining">
                                                    ₹{" "}
                                                    {formatAmount(
                                                        goal.remaining_amount
                                                    )}
                                                </strong>

                                            </div>

                                        </div>


                                        {/* PROGRESS */}

                                        <div className="goal-progress-section">

                                            <div className="goal-progress-header">

                                                <span>
                                                    Progress
                                                </span>

                                                <strong>
                                                    {progress}%
                                                </strong>

                                            </div>


                                            <div className="goal-progress-track">

                                                <div
                                                    className={
                                                        `goal-progress-fill ${
                                                            isCompleted
                                                                ? "complete"
                                                                : ""
                                                        }`
                                                    }
                                                    style={{
                                                        width:
                                                            `${progress}%`,
                                                    }}
                                                />

                                            </div>

                                        </div>


                                        {/* TARGET DATE */}

                                        <div className="savings-target-date">

                                            <span>
                                                Target Date
                                            </span>

                                            <strong>
                                                {goal.target_date}
                                            </strong>

                                        </div>


                                        {/* ACTIONS */}

                                        <div className="savings-goal-actions">

                                            <button
                                                type="button"
                                                className="savings-edit-btn"
                                                onClick={() =>
                                                    handleEdit(
                                                        goal
                                                    )
                                                }
                                            >
                                                Edit
                                            </button>


                                            <button
                                                type="button"
                                                className="savings-delete-btn"
                                                onClick={() =>
                                                    handleDelete(
                                                        goal.id
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </div>

                                );

                            }
                        )

                    )}

                </div>

            </div>

        </MainLayout>

    );

}