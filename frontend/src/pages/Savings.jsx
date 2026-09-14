import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import BulkActions from "../components/BulkActions";
import "./Savings.css";

import {
    getSavingsSummary,
    getSavingsGoals,
    getSavingsHistory,
    createSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
} from "../services/savingsService";

import useModuleDate from "../hooks/useModuleDate";
import { toast, confirmAction } from "./toast";
import { getDeletionImpact, formatDeletionImpact, bulkDelete } from "../services/deletionService";


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


const INITIAL_SUMMARY = {
    total_target: 0,
    total_saved: 0,
    remaining_amount: 0,
    active_goals: 0,
    completed_goals: 0,
    overall_progress: 0,

    period_income: 0,
    period_expense: 0,
    period_net_savings: 0,

    unallocated_savings: 0,
    allocated_to_active_goals: 0,

    period: null,
};


const INITIAL_FORM = {
    goal_name: "",
    target_amount: "",
    target_date: "",
};


const numericFields = [
    "total_target",
    "total_saved",
    "remaining_amount",
    "active_goals",
    "completed_goals",
    "overall_progress",
    "period_income",
    "period_expense",
    "period_net_savings",
    "unallocated_savings",
    "allocated_to_active_goals",
];


export default function Savings() {

    const [summary, setSummary] =
        useState(INITIAL_SUMMARY);

    const [goals, setGoals] =
        useState([]);

    const [history, setHistory] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [editingGoal, setEditingGoal] =
        useState(null);

    const [searchTerm, setSearchTerm] =
        useState("");

    const [showHistory, setShowHistory] =
        useState(false);

    const [periodType, setPeriodType] =
        useState("month");

    const [customStart, setCustomStart] =
        useState("");

    const [customEnd, setCustomEnd] =
        useState("");

    const [formData, setFormData] =
        useState(INITIAL_FORM);

    const [selectedIds, setSelectedIds] = useState([]);


    const {
        month,
        year,
        setMonth,
        setYear,
    } = useModuleDate();


    // ============================================================
    // PERIOD PARAMETERS
    // ============================================================

    const buildPeriodParams = () => {

        if (periodType === "custom") {

            return {
                period: "custom",
                start_date: customStart,
                end_date: customEnd,
            };
        }


        if (periodType === "lifetime") {

            return {
                period: "lifetime",
            };
        }


        return {
            period: "month",
            month,
            year,
        };
    };


    // ============================================================
    // SAFE SUMMARY NORMALIZATION
    // ============================================================

    const normalizeSummary = (data = {}) => {

        const normalized = {
            ...INITIAL_SUMMARY,
            ...data,
        };


        numericFields.forEach((field) => {

            normalized[field] =
                Number(data[field] ?? 0);

        });


        // Keep nested period object unchanged.
        normalized.period =
            data.period ?? null;


        return normalized;
    };


    // ============================================================
    // FETCH SUMMARY
    // ============================================================

    const fetchSummary = async () => {

        // Do not call backend until both custom dates exist.
        if (
            periodType === "custom" &&
            (!customStart || !customEnd)
        ) {

            setSummary(INITIAL_SUMMARY);

            return;
        }


        const data =
            await getSavingsSummary(
                buildPeriodParams()
            );


        setSummary(
            normalizeSummary(data)
        );
    };


    // ============================================================
    // FETCH GOALS
    // ============================================================

    const fetchGoals = async () => {

        const data =
            await getSavingsGoals();

        setGoals(
            Array.isArray(data)
                ? data
                : []
        );
    };


    // ============================================================
    // FETCH HISTORY
    // ============================================================

    const fetchHistory = async () => {

        const data =
            await getSavingsHistory();

        setHistory(
            Array.isArray(data)
                ? data
                : []
        );
    };


    // ============================================================
    // LOAD PAGE
    // ============================================================

    const loadPage = async () => {

        try {

            setLoading(true);


            await Promise.all([

                fetchSummary(),

                fetchGoals(),

                fetchHistory(),

            ]);

        }

        catch (err) {

            console.error(
                "Unable to load savings data:",
                err
            );


            toast.error(
                "Unable to load savings data"
            );

        }

        finally {

            setLoading(false);

        }
    };


    // ============================================================
    // INITIAL + PERIOD LOAD
    // ============================================================

    useEffect(() => {

        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadPage();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        periodType,
        month,
        year,
        customStart,
        customEnd,
    ]);


    // ============================================================
    // FORM CHANGE
    // ============================================================

    const handleChange = (event) => {

        const {
            name,
            value,
        } = event.target;


        setFormData((current) => ({

            ...current,

            [name]: value,

        }));
    };


    // ============================================================
    // RESET FORM
    // ============================================================

    const resetForm = () => {

        setEditingGoal(null);

        setFormData(
            INITIAL_FORM
        );
    };


    // ============================================================
    // EXTRACT API ERROR
    // ============================================================

    const getErrorMessage = (
        err,
        fallback
    ) => {

        const data =
            err?.response?.data;


        if (!data) {

            return fallback;

        }


        if (
            typeof data === "string"
        ) {

            return data;

        }


        if (data.detail) {

            return data.detail;

        }


        if (data.error) {

            return data.error;

        }


        if (
            typeof data === "object"
        ) {

            const firstKey =
                Object.keys(data)[0];


            if (firstKey) {

                const message =
                    data[firstKey];


                if (
                    Array.isArray(message)
                ) {

                    return message[0];

                }


                if (
                    typeof message ===
                    "string"
                ) {

                    return message;

                }

            }

        }


        return fallback;
    };


    // ============================================================
    // CREATE / UPDATE GOAL
    // ============================================================

    const handleSubmit = async (
        event
    ) => {

        event.preventDefault();


        const goalName =
            formData.goal_name.trim();


        const targetAmount =
            Number(
                formData.target_amount
            );


        if (
            !goalName ||
            !formData.target_amount ||
            !formData.target_date
        ) {

            toast.warning(
                "Please fill all required fields."
            );

            return;
        }


        if (
            Number.isNaN(targetAmount) ||
            targetAmount <= 0
        ) {

            toast.warning(
                "Target amount must be greater than 0."
            );

            return;
        }


        try {

            const payload = {

                goal_name:
                    goalName,

                target_amount:
                    targetAmount,

                target_date:
                    formData.target_date,

            };


            if (editingGoal) {

                await updateSavingsGoal(

                    editingGoal,

                    payload

                );


                toast.success(
                    "Savings goal updated successfully"
                );

            }

            else {

                await createSavingsGoal(
                    payload
                );


                toast.success(
                    "Savings goal created successfully"
                );

            }


            resetForm();


            await loadPage();

        }

        catch (err) {

            console.error(
                "Savings form error:",
                err
            );


            toast.error(

                getErrorMessage(

                    err,

                    "Unable to save savings goal"

                )

            );

        }
    };


    // ============================================================
    // DELETE GOAL
    // ============================================================

    const handleDelete = async (
        goal
    ) => {

        let impact;
        try { impact = await getDeletionImpact("savings", [goal.id]); }
        catch { toast.error("Unable to analyze deletion impact."); return; }
        const confirmed = await confirmAction(
            formatDeletionImpact(impact),
            "Delete savings goal",
            "Delete"
        );


        if (!confirmed) {

            return;

        }


        try {

            await deleteSavingsGoal(
                goal.id
            );


            toast.success(
                "Savings goal deleted successfully"
            );


            // If the currently edited goal
            // was deleted, reset the form.
            if (
                editingGoal ===
                goal.id
            ) {

                resetForm();

            }


            await loadPage();

        }

        catch (err) {

            console.error(
                "Delete savings goal error:",
                err
            );


            toast.error(

                getErrorMessage(

                    err,

                    "Unable to delete savings goal"

                )

            );

        }
    };


    // ============================================================
    // EDIT GOAL
    // ============================================================

    const handleEdit = (
        goal
    ) => {

        // Finalized goals are frozen.
        if (
            goal.is_finalized
        ) {

            toast.warning(
                "Finalized goals cannot be edited."
            );

            return;
        }


        setEditingGoal(
            goal.id
        );


        setFormData({

            goal_name:
                goal.goal_name ?? "",

            target_amount:
                String(
                    goal.target_amount ?? ""
                ),

            target_date:
                goal.target_date ?? "",

        });


        window.scrollTo({

            top: 0,

            behavior: "smooth",

        });
    };


    // ============================================================
    // PAUSE / ACTIVATE GOAL
    // ============================================================

    const handleActiveToggle = async (
        goal
    ) => {

        if (
            goal.is_finalized
        ) {

            toast.warning(
                "Finalized goals cannot be changed."
            );

            return;
        }


        const nextActiveState =
            !goal.is_active;


        try {

            // Use the existing update endpoint.
            // Backend serializer accepts is_active
            // for non-finalized goals.
            await updateSavingsGoal(

                goal.id,

                {

                    goal_name:
                        goal.goal_name,

                    target_amount:
                        goal.target_amount,

                    target_date:
                        goal.target_date,

                    is_active:
                        nextActiveState,

                }

            );


            toast.success(

                nextActiveState

                    ? "Goal activated for allocation"

                    : "Goal paused from allocation"

            );


            await loadPage();

        }

        catch (err) {

            console.error(
                "Goal status update error:",
                err
            );


            toast.error(

                getErrorMessage(

                    err,

                    "Unable to update goal"

                )

            );

        }
    };


    // ============================================================
    // FORMAT AMOUNT
    // ============================================================

    const formatAmount = (
        amount
    ) => {

        const value =
            Number(amount ?? 0);


        return value.toLocaleString(

            "en-IN",

            {

                minimumFractionDigits: 0,

                maximumFractionDigits: 2,

            }

        );
    };


    // ============================================================
    // ACTIVE GOALS
    // ============================================================

    const activeGoals = useMemo(
        () => {

            return goals.filter(

                (goal) =>
                    !goal.is_finalized

            );

        },

        [goals]

    );


    // ============================================================
    // HISTORY GOALS
    // ============================================================

    const finalizedGoals = useMemo(
        () => {

            const combined = [

                ...history,

                ...goals.filter(
                    (goal) =>
                        goal.is_finalized
                ),

            ];


            // Avoid duplicate finalized goals
            // when both endpoints return them.
            const uniqueGoals =
                new Map();


            combined.forEach(
                (goal) => {

                    uniqueGoals.set(
                        goal.id,
                        goal
                    );

                }
            );


            return Array.from(
                uniqueGoals.values()
            );

        },

        [
            goals,
            history,
        ]

    );


    // ============================================================
    // DISPLAY GOALS
    // ============================================================

    const displayGoals =
        showHistory

            ? finalizedGoals

            : activeGoals;


    // ============================================================
    // SEARCH
    // ============================================================

    const filteredGoals = useMemo(
        () => {

            const search =
                searchTerm
                    .trim()
                    .toLowerCase();


            if (!search) {

                return displayGoals;

            }


            return displayGoals.filter(
                (goal) => {

                    const name =
                        (
                            goal.goal_name ??
                            ""
                        )
                            .toLowerCase();


                    const status =
                        (
                            goal.status ??
                            ""
                        )
                            .toLowerCase();


                    const targetDate =
                        String(
                            goal.target_date ??
                            ""
                        );


                    return (

                        name.includes(search) ||

                        status.includes(search) ||

                        targetDate.includes(search)

                    );

                }
            );

        },

        [
            displayGoals,
            searchTerm,
        ]

    );

    const toggleSelection = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    const allVisibleSelected = filteredGoals.length > 0 && filteredGoals.every((item) => selectedIds.includes(item.id));
    const toggleSelectAll = () => setSelectedIds(allVisibleSelected ? [] : filteredGoals.map((item) => item.id));
    const deleteSelected = async () => {
        if (!selectedIds.length) return;
        let impact;
        try { impact = await getDeletionImpact("savings", selectedIds); }
        catch { toast.error("Unable to analyze deletion impact."); return; }
        if (!(await confirmAction(formatDeletionImpact(impact), "Delete selected savings goals", "Delete"))) return;
        try {
            await bulkDelete("savings", selectedIds);
            setSelectedIds([]);
            await loadPage();
            toast.success("Selected savings goals deleted successfully.");
        } catch (error) { toast.error(error?.response?.data?.error || "Bulk delete failed."); }
    };


    // ============================================================
    // OVERALL PROGRESS
    // ============================================================

    const overallProgress =
        Math.min(

            100,

            Math.max(

                0,

                Number(
                    summary.overall_progress ??
                    0
                )

            )

        );


    // ============================================================
    // PERIOD LABEL
    // ============================================================

    const periodLabel =

        periodType ===
        "lifetime"

            ? "Lifetime"

            : periodType ===
                "custom"

                ? (

                    customStart &&
                    customEnd

                        ? `${customStart} → ${customEnd}`

                        : "Select custom dates"

                )

                : `${monthNames[
                    month - 1
                ]} ${year}`;


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <MainLayout
                title="Savings"
            >

                <div
                    className="savings-page"
                >

                    <div
                        className="savings-loading"
                    >

                        <div
                            className="savings-loading-icon"
                        >

                            ₹

                        </div>


                        <h2>
                            Loading Savings
                        </h2>


                        <p>
                            Preparing your savings overview...
                        </p>

                    </div>

                </div>

            </MainLayout>

        );
    }


    // ============================================================
    // PAGE
    // ============================================================

    return (

        <MainLayout
            title="Savings"
        >

            <div
                className="savings-page"
            >


                {/* ====================================================
                    HEADER
                ==================================================== */}

                <div
                    className="savings-header"
                >

                    <div>

                        <div
                            className="savings-breadcrumb"
                        >

                            Finance / Savings

                        </div>


                        <h1
                            className="savings-title"
                        >

                            Savings Planning

                        </h1>


                        <p
                            className="savings-subtitle"
                        >

                            Priority-based goal allocation with
                            finalized goal history and period analytics.

                        </p>

                    </div>


                    {/* PERIOD */}

                    <div
                        className="savings-period"
                    >

                        <div
                            className="savings-period-label"
                        >

                            Viewing

                        </div>


                        <div
                            className="
                                savings-period-controls
                                savings-period-type
                            "
                        >

                            <select
                                value={periodType}

                                onChange={(event) =>
                                    setPeriodType(
                                        event.target.value
                                    )
                                }
                            >

                                <option value="month">
                                    Month & Year
                                </option>

                                <option value="custom">
                                    Custom Period
                                </option>

                                <option value="lifetime">
                                    Lifetime
                                </option>

                            </select>


                            {periodType ===
                                "month" && (

                                <>

                                    <select
                                        value={month}

                                        onChange={(event) =>
                                            setMonth(
                                                Number(
                                                    event.target.value
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

                                        min="2000"

                                        max="2100"

                                        value={year}

                                        onChange={(event) =>
                                            setYear(
                                                Number(
                                                    event.target.value
                                                )
                                            )
                                        }

                                    />

                                </>

                            )}


                            {periodType ===
                                "custom" && (

                                <>

                                    <input

                                        type="date"

                                        value={customStart}

                                        onChange={(event) =>
                                            setCustomStart(
                                                event.target.value
                                            )
                                        }

                                    />


                                    <input

                                        type="date"

                                        value={customEnd}

                                        onChange={(event) =>
                                            setCustomEnd(
                                                event.target.value
                                            )
                                        }

                                    />

                                </>

                            )}

                        </div>

                    </div>

                </div>


                {/* ====================================================
                    STATS
                ==================================================== */}

                <div
                    className="savings-stats"
                >

                    <Stat

                        type="target"

                        icon="◎"

                        label="Active Target"

                        value={
                            `₹ ${formatAmount(
                                summary.total_target
                            )}`
                        }

                        hint="Active savings goals"

                    />


                    <Stat

                        type="saved"

                        icon="✓"

                        label="Period Savings"

                        value={
                            `₹ ${formatAmount(
                                summary.total_saved
                            )}`
                        }

                        hint={periodLabel}

                    />


                    <Stat

                        type="remaining"

                        icon="↗"

                        label="Remaining Goals"

                        value={
                            `₹ ${formatAmount(
                                summary.remaining_amount
                            )}`
                        }

                        hint="Still to allocate"

                    />


                    <Stat

                        type="progress"

                        icon="%"

                        label="Goal Progress"

                        value={
                            `${overallProgress}%`
                        }

                        hint="Active goal completion"

                    />


                    <Stat

                        type="active"

                        icon="●"

                        label="Active Goals"

                        value={
                            summary.active_goals
                        }

                        hint="Included in allocation"

                    />


                    <Stat

                        type="completed"

                        icon="★"

                        label="Finalized Goals"

                        value={
                            summary.completed_goals
                        }

                        hint="Frozen goal history"

                    />

                </div>


                {/* ====================================================
                    OVERALL PROGRESS
                ==================================================== */}

                <div
                    className="
                        savings-progress-card
                    "
                >

                    <div
                        className="
                            savings-progress-header
                        "
                    >

                        <div>

                            <h3>
                                Overall Savings Progress
                            </h3>

                            <p>
                                {periodLabel}
                            </p>

                        </div>


                        <strong>

                            {overallProgress}%

                        </strong>

                    </div>


                    <div
                        className="
                            savings-progress-track
                        "
                    >

                        <div

                            className={
                                `savings-progress-fill ${
                                    overallProgress >= 100
                                        ? "complete"
                                        : overallProgress >= 75
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


                    <div
                        className="
                            savings-progress-footer
                        "
                    >

                        <span>

                            ₹ {
                                formatAmount(
                                    summary
                                        .allocated_to_active_goals
                                )
                            }

                            {" "}
                            allocated to active goals

                        </span>


                        <span>

                            ₹ {
                                formatAmount(
                                    summary
                                        .unallocated_savings
                                )
                            }

                            {" "}
                            unallocated lifetime savings

                        </span>

                    </div>

                </div>


                {/* ====================================================
                    CREATE / EDIT FORM
                ==================================================== */}

                <div
                    className="
                        savings-form-card
                    "
                >

                    <div
                        className="
                            savings-section-heading
                        "
                    >

                        <div>

                            <h2>

                                {
                                    editingGoal

                                        ? "Update Savings Goal"

                                        : "Create Savings Goal"
                                }

                            </h2>


                            <p>

                                {
                                    editingGoal

                                        ? "Modify the selected savings goal."

                                        : "Earlier target dates are prioritized first; higher targets break deadline ties."
                                }

                            </p>

                        </div>


                        {editingGoal && (

                            <button

                                type="button"

                                className="
                                    savings-cancel-btn
                                "

                                onClick={
                                    resetForm
                                }
                            >

                                Cancel Edit

                            </button>

                        )}

                    </div>


                    <form

                        className="
                            savings-form
                        "

                        onSubmit={
                            handleSubmit
                        }
                    >

                        {/* GOAL NAME */}

                        <div
                            className="
                                savings-field
                            "
                        >

                            <label>

                                Goal Name

                                <span>*</span>

                            </label>


                            <input

                                type="text"

                                name="goal_name"

                                placeholder="
                                    e.g. New Laptop
                                "

                                value={
                                    formData.goal_name
                                }

                                onChange={
                                    handleChange
                                }

                                required

                            />

                        </div>


                        {/* AMOUNT */}

                        <div
                            className="
                                savings-field
                            "
                        >

                            <label>

                                Target Amount

                                <span>*</span>

                            </label>


                            <div
                                className="
                                    savings-amount-input
                                "
                            >

                                <span>
                                    ₹
                                </span>


                                <input

                                    type="number"

                                    name="target_amount"

                                    min="0.01"

                                    step="0.01"

                                    placeholder="0.00"

                                    value={
                                        formData
                                            .target_amount
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    required

                                />

                            </div>

                        </div>


                        {/* DATE */}

                        <div
                            className="
                                savings-field
                            "
                        >

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


                        {/* SUBMIT */}

                        <div
                            className="
                                savings-form-action
                            "
                        >

                            <button

                                type="submit"

                                className="
                                    savings-submit-btn
                                "
                            >

                                {
                                    editingGoal

                                        ? "Update Goal"

                                        : "Create Goal"
                                }

                            </button>

                        </div>

                    </form>

                </div>


                {/* ====================================================
                    GOALS HEADER
                ==================================================== */}

                <div
                    className="
                        savings-goals-header
                    "
                >

                    <div>

                        <h2>

                            {
                                showHistory

                                    ? "Goal History"

                                    : "Savings Goals"
                            }

                        </h2>


                        <p>

                            {
                                showHistory

                                    ? "Finalized goals keep their frozen amount and remain available for history."

                                    : "Active and paused goals are shown here. Only active goals participate in automatic allocation."
                            }

                        </p>

                    </div>


                    <div
                        className="
                            savings-header-actions
                        "
                    >

                        <button

                            type="button"

                            className="
                                savings-history-btn
                            "

                            onClick={() => {

                                setShowHistory(
                                    (current) =>
                                        !current
                                );

                                setSearchTerm("");

                            }}
                        >

                            {
                                showHistory

                                    ? "View Savings Goals"

                                    : "View Goal History"
                            }

                        </button>


                        <div
                            className="
                                savings-search
                            "
                        >

                            <span>
                                ⌕
                            </span>


                            <input

                                type="text"

                                placeholder="
                                    Search goals...
                                "

                                value={
                                    searchTerm
                                }

                                onChange={(event) =>
                                    setSearchTerm(
                                        event.target.value
                                    )
                                }

                            />

                        </div>

                    </div>

                </div>


                {/* ====================================================
                    GOALS GRID
                ==================================================== */}

                <div
                    className="
                        savings-goals-grid
                    "
                >

                    {
                        filteredGoals.length === 0

                            ? (

                                <div
                                    className="
                                        savings-empty
                                    "
                                >

                                    <div
                                        className="
                                            savings-empty-icon
                                        "
                                    >

                                        ◎

                                    </div>


                                    <h3>

                                        {
                                            showHistory

                                                ? "No finalized goals yet"

                                                : "No savings goals found"
                                        }

                                    </h3>


                                    <p>

                                        {
                                            showHistory

                                                ? "Finalized goals will appear here after completion."

                                                : "Create a savings goal to start tracking progress."
                                        }

                                    </p>

                                </div>

                            )

                            : (

                                <>
                                <BulkActions count={selectedIds.length} allSelected={allVisibleSelected} onToggleAll={toggleSelectAll} onDelete={deleteSelected} label="savings goals" />

                                {filteredGoals.map(
                                    (goal) => (

                                        <GoalCard

                                            key={
                                                goal.id
                                            }

                                            goal={
                                                goal
                                            }

                                            formatAmount={
                                                formatAmount
                                            }

                                            onEdit={
                                                handleEdit
                                            }

                                            onDelete={
                                                handleDelete
                                            }

                                            onToggle={
                                                handleActiveToggle
                                            }

                                            selected={selectedIds.includes(goal.id)}
                                            onSelect={() => toggleSelection(goal.id)}

                                        />

                                    )
                                )}
                                </>

                            )

                    }

                </div>

            </div>

        </MainLayout>

    );
}


// ============================================================
// STAT COMPONENT
// ============================================================

function Stat({
    type,
    icon,
    label,
    value,
    hint,
}) {

    return (

        <div
            className={
                `savings-stat-card ${type}`
            }
        >

            <div
                className="
                    savings-stat-icon
                "
            >

                {icon}

            </div>


            <div>

                <span>
                    {label}
                </span>


                <h2>
                    {value}
                </h2>


                <small>
                    {hint}
                </small>

            </div>

        </div>

    );
}


// ============================================================
// GOAL CARD
// ============================================================

function GoalCard({
    goal,
    formatAmount,
    onEdit,
    onDelete,
    onToggle,
    selected,
    onSelect,
}) {

    const progress =
        Math.min(

            100,

            Math.max(

                0,

                Number(
                    goal.progress_percentage ??
                    0
                )

            )

        );


    // ========================================================
    // PRIMARY SOURCE OF TRUTH
    // ========================================================

    const isFinalized =
        Boolean(
            goal.is_finalized
        );


    // The backend serializer is authoritative for finalized outcomes.
    // A finalized goal can be either Completed or Not Achieved.
    const displayStatus =
        isFinalized

            ? (goal.status || "Completed")

            : (

                goal.is_active

                    ? "In Progress"

                    : "Paused"

            );


    const statusClass =
        isFinalized

            ? (

                displayStatus === "Not Achieved"

                    ? "not-achieved"

                    : "completed"

            )

            : (

                goal.is_active

                    ? "active"

                    : "paused"

            );


    const finalizedDate =
        goal.finalized_at

            ? new Date(
                goal.finalized_at
            ).toLocaleDateString(
                "en-IN"
            )

            : "Completed";


    return (

        <div
            className="
                savings-goal-card
            "
        >

            <label style={{display:"block",marginBottom:8}}><input type="checkbox" aria-label="Select savings goal" checked={selected} onChange={onSelect} /></label>


            {/* HEADER */}

            <div
                className="
                    savings-goal-header
                "
            >

                <div>

                    <span
                        className="
                            savings-goal-label
                        "
                    >

                        {
                            isFinalized

                                ? "FINALIZED GOAL"

                                : "SAVINGS GOAL"
                        }

                    </span>


                    <h3>

                        {goal.goal_name}

                    </h3>

                </div>


                <span
                    className={
                        `savings-status ${statusClass}`
                    }
                >

                    {displayStatus}

                </span>

            </div>


            {/* VALUES */}

            <div
                className="
                    savings-goal-values
                "
            >

                <div>

                    <span>
                        Target
                    </span>


                    <strong>

                        ₹ {
                            formatAmount(
                                goal.target_amount
                            )
                        }

                    </strong>

                </div>


                <div>

                    <span>

                        {
                            isFinalized

                                ? "Frozen"

                                : "Allocated"
                        }

                    </span>


                    <strong
                        className="
                            goal-saved
                        "
                    >

                        ₹ {
                            formatAmount(
                                goal.saved_amount
                            )
                        }

                    </strong>

                </div>


                <div>

                    <span>
                        Remaining
                    </span>


                    <strong
                        className="
                            goal-remaining
                        "
                    >

                        ₹ {
                            formatAmount(
                                goal.remaining_amount
                            )
                        }

                    </strong>

                </div>

            </div>


            {/* PROGRESS */}

            <div
                className="
                    goal-progress-section
                "
            >

                <div
                    className="
                        goal-progress-header
                    "
                >

                    <span>
                        Progress
                    </span>


                    <strong>

                        {progress}%

                    </strong>

                </div>


                <div
                    className="
                        goal-progress-track
                    "
                >

                    <div

                        className={
                            `goal-progress-fill ${
                                isFinalized
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


            {/* DATE */}

            <div
                className="
                    savings-target-date
                "
            >

                <span>

                    {
                        isFinalized

                            ? "Finalized"

                            : "Target Date"
                    }

                </span>


                <strong>

                    {
                        isFinalized

                            ? finalizedDate

                            : goal.target_date
                    }

                </strong>

            </div>


            {/* META */}

            <div
                className="
                    savings-goal-meta
                "
            >

                {
                    !isFinalized && (

                        <span>

                            Days remaining:

                            {" "}

                            {
                                Number(
                                    goal.days_remaining ??
                                    0
                                )
                            }

                        </span>

                    )
                }


                {
                    !isFinalized && (

                        <span>

                            {
                                goal.is_active

                                    ? "Included in priority allocation"

                                    : "Paused from allocation"
                            }

                        </span>

                    )
                }


                {
                    isFinalized && (

                        <span>

                            Frozen after finalization

                        </span>

                    )
                }

            </div>


            {/* ACTIONS */}

            <div
                className="
                    savings-goal-actions
                "
            >

                {
                    !isFinalized && (

                        <>

                            <button

                                type="button"

                                className="
                                    savings-edit-btn
                                "

                                onClick={() =>
                                    onEdit(goal)
                                }
                            >

                                Edit

                            </button>


                            <button

                                type="button"

                                className="
                                    savings-toggle-btn
                                "

                                onClick={() =>
                                    onToggle(goal)
                                }
                            >

                                {
                                    goal.is_active

                                        ? "Pause"

                                        : "Activate"
                                }

                            </button>

                        </>

                    )}


                <button

                    type="button"

                    className="
                        savings-delete-btn
                    "

                    onClick={() =>
                        onDelete(goal)
                    }
                >

                    Delete

                </button>

            </div>

        </div>

    );
}