import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
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

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Savings() {
    const [summary, setSummary] = useState({ total_target: 0, total_saved: 0, remaining_amount: 0, active_goals: 0, completed_goals: 0, overall_progress: 0, period_income: 0, period_expense: 0, unallocated_savings: 0, allocated_to_active_goals: 0 });
    const [goals, setGoals] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingGoal, setEditingGoal] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [showHistory, setShowHistory] = useState(false);
    const [periodType, setPeriodType] = useState("month");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [formData, setFormData] = useState({ goal_name: "", target_amount: "", target_date: "" });
    const { month, year, setMonth, setYear } = useModuleDate();

    const buildPeriodParams = () => {
        if (periodType === "custom") return { period: "custom", start_date: customStart, end_date: customEnd };
        if (periodType === "lifetime") return { period: "lifetime" };
        return { period: "month", month, year };
    };

    const fetchSummary = async () => {
        if (periodType === "custom" && (!customStart || !customEnd)) return;
        const data = await getSavingsSummary(buildPeriodParams());
        setSummary((current) => ({ ...current, ...Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Number(value ?? 0)])) }));
    };

    const fetchGoals = async () => setGoals(await getSavingsGoals());
    const fetchHistory = async () => setHistory(await getSavingsHistory());

    const loadPage = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchSummary(), fetchGoals(), fetchHistory()]);
        } catch (err) {
            console.error(err);
            toast.error("Unable to load savings data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPage(); }, [periodType, month, year, customStart, customEnd]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const resetForm = () => { setEditingGoal(null); setFormData({ goal_name: "", target_amount: "", target_date: "" }); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.goal_name || !formData.target_amount || !formData.target_date) return toast.warning("Please fill all required fields.");
        if (Number(formData.target_amount) <= 0) return toast.warning("Target amount must be greater than 0.");
        try {
            if (editingGoal) {
                await updateSavingsGoal(editingGoal, formData);
                toast.success("Savings Goal Updated Successfully");
            } else {
                await createSavingsGoal(formData);
                toast.success("Savings Goal Created Successfully");
            }
            resetForm();
            await loadPage();
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.detail || "Operation Failed");
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirmAction("Are you sure you want to delete this savings goal?", "Delete savings goal", "Delete");
        if (!confirmed) return;
        try { await deleteSavingsGoal(id); toast.success("Savings Goal Deleted Successfully"); await loadPage(); }
        catch (err) { console.error(err); toast.error("Delete Failed"); }
    };

    const handleEdit = (goal) => {
        if (goal.is_finalized) return;
        setEditingGoal(goal.id);
        setFormData({ goal_name: goal.goal_name, target_amount: goal.target_amount, target_date: goal.target_date });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleActiveToggle = async (goal) => {
        if (goal.is_finalized) return;
        try {
            await updateSavingsGoal(goal.id, { goal_name: goal.goal_name, target_amount: goal.target_amount, target_date: goal.target_date, is_active: !goal.is_active });
            toast.success(goal.is_active ? "Goal paused from allocation" : "Goal activated for allocation");
            await loadPage();
        } catch (err) { console.error(err); toast.error("Unable to update goal"); }
    };

    const formatAmount = (amount) => Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    const displayGoals = useMemo(() => (showHistory ? history : goals.filter((goal) => !goal.is_finalized)), [goals, history, showHistory]);
    const filteredGoals = useMemo(() => {
        if (!searchTerm.trim()) return displayGoals;
        const search = searchTerm.toLowerCase();
        return displayGoals.filter((goal) => goal.goal_name?.toLowerCase().includes(search) || goal.status?.toLowerCase().includes(search) || String(goal.target_date).includes(search));
    }, [displayGoals, searchTerm]);

    const overallProgress = Math.min(100, Math.max(0, Number(summary.overall_progress || 0)));
    const periodLabel = periodType === "lifetime" ? "Lifetime" : periodType === "custom" ? `${customStart || "Start"} → ${customEnd || "End"}` : `${monthNames[month - 1]} ${year}`;

    if (loading) return <MainLayout title="Savings"><div className="savings-page"><div className="savings-loading"><div className="savings-loading-icon">₹</div><h2>Loading Savings</h2><p>Preparing your savings overview...</p></div></div></MainLayout>;

    return <MainLayout title="Savings"><div className="savings-page">
        <div className="savings-header"><div><div className="savings-breadcrumb">Finance / Savings</div><h1 className="savings-title">Savings Planning</h1><p className="savings-subtitle">Priority-based goal allocation with frozen completed goals and period analytics.</p></div>
            <div className="savings-period"><div className="savings-period-label">Viewing</div><div className="savings-period-controls savings-period-type">
                <select value={periodType} onChange={(e) => setPeriodType(e.target.value)}><option value="month">Month & Year</option><option value="custom">Custom Period</option><option value="lifetime">Lifetime</option></select>
                {periodType === "month" && <><select value={month} onChange={(e) => setMonth(Number(e.target.value))}>{monthNames.map((name, index) => <option key={index + 1} value={index + 1}>{name}</option>)}</select><input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}/></>}
                {periodType === "custom" && <><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}/><input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}/></>}
            </div></div>
        </div>

        <div className="savings-stats">
            <Stat type="target" icon="◎" label="Active Target" value={`₹ ${formatAmount(summary.total_target)}`} hint="Active savings goals"/>
            <Stat type="saved" icon="✓" label="Period Savings" value={`₹ ${formatAmount(summary.total_saved)}`} hint={periodLabel}/>
            <Stat type="remaining" icon="↗" label="Remaining Goals" value={`₹ ${formatAmount(summary.remaining_amount)}`} hint="Still to allocate"/>
            <Stat type="progress" icon="%" label="Goal Progress" value={`${overallProgress}%`} hint="Active goal completion"/>
            <Stat type="active" icon="●" label="Active Goals" value={summary.active_goals} hint="Included in allocation"/>
            <Stat type="completed" icon="★" label="Finalized Goals" value={summary.completed_goals} hint="Frozen goal history"/>
        </div>

        <div className="savings-progress-card"><div className="savings-progress-header"><div><h3>Overall Savings Progress</h3><p>{periodLabel}</p></div><strong>{overallProgress}%</strong></div><div className="savings-progress-track"><div className={`savings-progress-fill ${overallProgress >= 100 ? "complete" : overallProgress >= 75 ? "good" : "normal"}`} style={{ width: `${overallProgress}%` }}/></div><div className="savings-progress-footer"><span>₹ {formatAmount(summary.allocated_to_active_goals)} allocated to active goals</span><span>₹ {formatAmount(summary.unallocated_savings)} unallocated lifetime savings</span></div></div>

        <div className="savings-form-card"><div className="savings-section-heading"><div><h2>{editingGoal ? "Update Savings Goal" : "Create Savings Goal"}</h2><p>{editingGoal ? "Modify the selected active savings goal." : "Earlier target dates are prioritized first; higher targets break deadline ties."}</p></div>{editingGoal && <button type="button" className="savings-cancel-btn" onClick={resetForm}>Cancel Edit</button>}</div>
            <form className="savings-form" onSubmit={handleSubmit}><div className="savings-field"><label>Goal Name<span>*</span></label><input type="text" name="goal_name" placeholder="e.g. New Laptop" value={formData.goal_name} onChange={handleChange} required/></div><div className="savings-field"><label>Target Amount<span>*</span></label><div className="savings-amount-input"><span>₹</span><input type="number" name="target_amount" min="1" step="0.01" placeholder="0.00" value={formData.target_amount} onChange={handleChange} required/></div></div><div className="savings-field"><label>Target Date<span>*</span></label><input type="date" name="target_date" value={formData.target_date} onChange={handleChange} required/></div><div className="savings-form-action"><button type="submit" className="savings-submit-btn">{editingGoal ? "Update Goal" : "Create Goal"}</button></div></form>
        </div>

        <div className="savings-goals-header"><div><h2>{showHistory ? "Goal History" : "Active Savings Goals"}</h2><p>{showHistory ? "Finalized goals keep their frozen amount and remain available for history." : "Only active goals participate in automatic priority allocation."}</p></div><div className="savings-header-actions"><button type="button" className="savings-history-btn" onClick={() => setShowHistory(!showHistory)}>{showHistory ? "View Active Goals" : "View Goal History"}</button><div className="savings-search"><span>⌕</span><input type="text" placeholder="Search goals..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div></div></div>

        <div className="savings-goals-grid">{filteredGoals.length === 0 ? <div className="savings-empty"><div className="savings-empty-icon">◎</div><h3>{showHistory ? "No finalized goals yet" : "No savings goals found"}</h3><p>{showHistory ? "Completed goals will appear here after they are finalized." : "Create or activate a savings goal to start tracking progress."}</p></div> : filteredGoals.map((goal) => <GoalCard key={goal.id} goal={goal} formatAmount={formatAmount} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleActiveToggle}/>)}</div>
    </div></MainLayout>;
}

function Stat({ type, icon, label, value, hint }) { return <div className={`savings-stat-card ${type}`}><div className="savings-stat-icon">{icon}</div><div><span>{label}</span><h2>{value}</h2><small>{hint}</small></div></div>; }

function GoalCard({ goal, formatAmount, onEdit, onDelete, onToggle }) {
    const progress = Math.min(100, Math.max(0, Number(goal.progress_percentage || 0)));
    const isCompleted = goal.status === "Completed";
    return <div className="savings-goal-card"><div className="savings-goal-header"><div><span className="savings-goal-label">{isCompleted ? "FINALIZED GOAL" : "SAVINGS GOAL"}</span><h3>{goal.goal_name}</h3></div><span className={isCompleted ? "savings-status completed" : goal.is_active ? "savings-status active" : "savings-status paused"}>{goal.status}</span></div>
        <div className="savings-goal-values"><div><span>Target</span><strong>₹ {formatAmount(goal.target_amount)}</strong></div><div><span>{isCompleted ? "Frozen" : "Allocated"}</span><strong className="goal-saved">₹ {formatAmount(goal.saved_amount)}</strong></div><div><span>Remaining</span><strong className="goal-remaining">₹ {formatAmount(goal.remaining_amount)}</strong></div></div>
        <div className="goal-progress-section"><div className="goal-progress-header"><span>Progress</span><strong>{progress}%</strong></div><div className="goal-progress-track"><div className={`goal-progress-fill ${isCompleted ? "complete" : ""}`} style={{ width: `${progress}%` }}/></div></div>
        <div className="savings-target-date"><span>{isCompleted ? "Finalized" : "Target Date"}</span><strong>{isCompleted ? (goal.finalized_at ? new Date(goal.finalized_at).toLocaleDateString("en-IN") : "Completed") : goal.target_date}</strong></div>
        <div className="savings-goal-meta"><span>Days remaining: {goal.days_remaining}</span>{!isCompleted && <span>{goal.is_active ? "Included in priority allocation" : "Paused from allocation"}</span>}</div>
        <div className="savings-goal-actions">{!isCompleted && <><button type="button" className="savings-edit-btn" onClick={() => onEdit(goal)}>Edit</button><button type="button" className="savings-toggle-btn" onClick={() => onToggle(goal)}>{goal.is_active ? "Pause" : "Activate"}</button></>}<button type="button" className="savings-delete-btn" onClick={() => onDelete(goal.id)}>Delete</button></div>
    </div>;
}
