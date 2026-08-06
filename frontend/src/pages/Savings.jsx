import { useEffect, useState } from "react";
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


export default function Savings() {
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


    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    const fetchSummary = async () => {

        const data = await getSavingsSummary();

        setSummary(data);

    };

    const fetchGoals = async () => {

        const data = await getSavingsGoals();

        setGoals(data);

    };

    const loadPage = async () => {

        try {

            setLoading(true);

            await Promise.all([

                fetchSummary(),

                fetchGoals(),

            ]);

        }

        catch (err) {

            console.log(err);

        }

        finally {

            setLoading(false);

        }

    };

    const handleChange = (e) => {

        setFormData({

            ...formData,

            [e.target.name]: e.target.value,

        });

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            if (editingGoal) {

                await updateSavingsGoal(

                    editingGoal,

                    formData

                );

            }

            else {

                await createSavingsGoal(formData);

            }

            setEditingGoal(null);

            setFormData({

                goal_name: "",

                target_amount: "",

                target_date: "",

            });

            await loadPage();

        }

        catch (err) {

            console.log(err);

        }

    };

    const handleDelete = async (id) => {

        if (!window.confirm("Delete this goal?"))

            return;

        await deleteSavingsGoal(id);

        await loadPage();

    };

    const handleEdit = (goal) => {

        setEditingGoal(goal.id);

        setFormData({

            goal_name: goal.goal_name,

            target_amount: goal.target_amount,

            target_date: goal.target_date,

        });

    };

    useEffect(() => {

        loadPage();

    }, [month, year]);

    if (loading) {
        return (
            <MainLayout title="Savings">
                <div className="savings-container">
                    <h2>Loading Savings...</h2>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Savings">
            <div className="savings-container">
                <div className="page-header">
                    <div>
                        <h1>💰 Savings Analytics</h1>
                        <p
                            style={{
                                color: "#94a3b8",
                                marginTop: "5px",
                            }}
                        >
                            Savings Summary • {monthNames[month - 1]} {year}
                        </p>
                    </div>

                    <div className="page-filters">
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                        >
                            <option value={1}>January</option>
                            <option value={2}>February</option>
                            <option value={3}>March</option>
                            <option value={4}>April</option>
                            <option value={5}>May</option>
                            <option value={6}>June</option>
                            <option value={7}>July</option>
                            <option value={8}>August</option>
                            <option value={9}>September</option>
                            <option value={10}>October</option>
                            <option value={11}>November</option>
                            <option value={12}>December</option>
                        </select>

                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="summary-grid">
                    <div className="summary-card income">
                        <h3>Total Target</h3>
                        <h2>₹{summary.total_target}</h2>
                    </div>

                    <div className="summary-card budget">
                        <h3>Total Saved</h3>
                        <h2>₹{summary.total_saved}</h2>
                    </div>

                    <div className="summary-card expense">
                        <h3>Remaining Amount</h3>
                        <h2>₹{summary.remaining_amount}</h2>
                    </div>

                    <div className="summary-card saved">
                        <h3>Overall Progress</h3>
                        <h2>{summary.overall_progress}%</h2>
                    </div>

                    <div className="summary-card remaining">
                        <h3>Active Goals</h3>
                        <h2>{summary.active_goals}</h2>
                    </div>

                    <div className="summary-card status-green">
                        <h3>Completed Goals</h3>
                        <h2>{summary.completed_goals}</h2>
                    </div>
                </div>

                <div className="progress-section">

                    <h3>Overall Savings Progress</h3>

                    <div className="progress-container">

                        <div
                            className="progress-bar"
                            style={{
                                width: `${summary.overall_progress}%`,
                            }}
                        />

                    </div>

                    <p>{summary.overall_progress}% Completed</p></div><div className="goal-form-container">

                    <h2>

                        {
                            editingGoal
                                ? "Update Savings Goal"
                                : "Create Savings Goal"
                        }

                    </h2>

                    <form
                        className="goal-form"
                        onSubmit={handleSubmit}>

                        <input
                            type="text"
                            name="goal_name"
                            placeholder="Goal Name"
                            value={formData.goal_name}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="number"
                            name="target_amount"
                            placeholder="Target Amount"
                            value={formData.target_amount}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="date"
                            name="target_date"
                            value={formData.target_date}
                            onChange={handleChange}
                            required
                        />

                        <button type="submit">

                            {
                                editingGoal
                                    ? "Update Goal"
                                    : "Create Goal"
                            }

                        </button>

                    </form></div><div className="goal-list">

                    <h2>Your Savings Goals</h2>

                    {
                        goals.length === 0 ? (

                            <p>No savings goals created.</p>

                        ) : (

                            goals.map((goal) => (

                                <div
                                    key={goal.id}
                                    className="goal-card"
                                >

                                    <div className="goal-header">

                                        <h3>{goal.goal_name}</h3>

                                        <span
                                            className={
                                                goal.status === "Completed"
                                                    ? "goal-status completed"
                                                    : "goal-status active"
                                            }>

                                            {goal.status}</span>

                                    </div>

                                    <p>

                                        <strong>Target :</strong>

                                        ₹{goal.target_amount}

                                    </p>

                                    <p>

                                        <strong>Saved :</strong>

                                        ₹{goal.saved_amount}

                                    </p>

                                    <p>

                                        <strong>Remaining :</strong>

                                        ₹{goal.remaining_amount}

                                    </p>

                                    <p>

                                        <strong>Target Date :</strong>

                                        {goal.target_date}

                                    </p>

                                    <div className="progress-container">

                                        <div
                                            className="progress-bar"
                                            style={{
                                                width: `${goal.progress_percentage}%`,
                                            }}
                                        />

                                    </div>

                                    <p className="progress-text">

                                        {goal.progress_percentage}% Completed</p>

                                    <div className="goal-actions">

                                        <button
                                            type="button"
                                            className="edit-btn"
                                            onClick={() => handleEdit(goal)}
                                        >

                                            Edit

                                        </button>

                                        <button
                                            type="button"
                                            className="delete-btn"
                                            onClick={() => handleDelete(goal.id)}
                                        >

                                            Delete

                                        </button>

                                    </div>

                                </div>

                            ))

                        )

                    }

                </div>
            </div>
        </MainLayout>
    );
}