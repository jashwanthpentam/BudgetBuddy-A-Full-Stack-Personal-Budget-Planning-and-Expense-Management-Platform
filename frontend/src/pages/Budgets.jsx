import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import API from "../services/api";
import { getDashboardSummary } from "../services/dashboardService";
import useModuleDate from "../hooks/useModuleDate";
import { toast, confirmAction } from "./toast";
import "./Budgets.css";

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);

  const [form, setForm] = useState({
    category: "",
    budget_amount: "",
    month: "",
    year: new Date().getFullYear(),
  });

  const [editingId, setEditingId] = useState(null);

  const [summary, setSummary] = useState({
    budget_amount: 0,
    total_expense: 0,
    remaining_budget: 0,
    overspent_amount: 0,
  });

  const [selectedSummary, setSelectedSummary] = useState(null);

  const [selectedBudget, setSelectedBudget] = useState(null);

  const [showSummary, setShowSummary] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const {
    month,
    year,
    setMonth,
    setYear,
  } = useModuleDate();


  /* =====================================================
     CONSTANTS
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

  const categories = [
    {
      value: "FOOD",
      label: "Food",
    },
    {
      value: "TRAVEL",
      label: "Travel",
    },
    {
      value: "SHOPPING",
      label: "Shopping",
    },
    {
      value: "EDUCATION",
      label: "Education",
    },
    {
      value: "ENTERTAINMENT",
      label: "Entertainment",
    },
    {
      value: "HEALTHCARE",
      label: "Healthcare",
    },
    {
      value: "BILLS",
      label: "Bills",
    },
    {
      value: "MISCELLANEOUS",
      label: "Miscellaneous",
    },
  ];


  /* =====================================================
     FETCH
  ===================================================== */

  useEffect(() => {
    fetchBudgets();
    fetchOverallSummary();
  }, [month, year]);


  const fetchBudgets = async () => {
    try {
      // Fetch only the budgets for the currently selected
      // month and year. The backend also enforces the
      // authenticated-user filter.
      const res = await API.get("/budgets/", {
        params: {
          month,
          year,
        },
      });

      setBudgets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch budgets:", err);
      setBudgets([]);
    }
  };


  const fetchOverallSummary = async () => {
    try {
      const data = await getDashboardSummary(
        month,
        year
      );

      setSummary({
        budget_amount: Number(data.total_budget || 0),
        total_expense: Number(data.total_expense || 0),
        remaining_budget: Number(
          data.remaining_budget || 0
        ),
        overspent_amount: Number(
          data.overspent_amount || 0
        ),
      });
    } catch (err) {
      console.log(err);
    }
  };


  /* =====================================================
     SAVE BUDGET
  ===================================================== */

  const saveBudget = async () => {
    if (
      !form.category ||
      !form.budget_amount ||
      !form.month ||
      !form.year
    ) {
      toast.warning("Please fill all required fields.");
      return;
    }

    if (Number(form.budget_amount) <= 0) {
      toast.warning("Budget amount must be greater than 0.");
      return;
    }

    try {
      if (editingId) {
        await API.put(
          `/budgets/${editingId}/`,
          form
        );

        toast.success("Budget Updated Successfully");
      } else {
        await API.post(
          "/budgets/",
          form
        );

        toast.success("Budget Added Successfully");
      }

      resetForm();

      fetchBudgets();
      fetchOverallSummary();

    } catch (err) {
      console.log(err);

      if (err.response?.data) {
        const message =
          err.response?.data?.error ||
          err.response?.data?.detail ||
          (typeof err.response?.data === "string"
            ? err.response.data
            : "Operation Failed");

        toast.error(message);
      } else {
        toast.error("Operation Failed");
      }
    }
  };


  /* =====================================================
     RESET FORM
  ===================================================== */

  const resetForm = () => {
    setForm({
      category: "",
      budget_amount: "",
      month: "",
      year: new Date().getFullYear(),
    });

    setEditingId(null);
  };


  /* =====================================================
     DELETE
  ===================================================== */

  const deleteBudget = async (id) => {
    const confirmed = await confirmAction(
      "Are you sure you want to delete this budget?",
      "Delete budget",
      "Delete"
    );

    if (!confirmed) {
      return;
    }

    try {
      await API.delete(
        `/budgets/${id}/`
      );

      fetchBudgets();
      fetchOverallSummary();

      toast.success("Budget Deleted Successfully");

    } catch (err) {
      console.log(err);
      toast.error("Delete Failed");
    }
  };


  /* =====================================================
     EDIT
  ===================================================== */

  const editBudget = (budget) => {
    setEditingId(budget.id);

    setForm({
      category: budget.category,
      budget_amount: budget.budget_amount,
      month: budget.month,
      year: budget.year,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  /* =====================================================
     VIEW SUMMARY
  ===================================================== */

  const fetchSummary = async (budget) => {
    try {
      const res = await API.get(
        `/budgets/${budget.id}/summary/`
      );

      setSelectedBudget(budget);
      setSelectedSummary(res.data);
      setShowSummary(true);

    } catch (err) {
      console.log(err);
      toast.error("Unable to load budget summary.");
    }
  };


  /* =====================================================
     FORMAT
  ===================================================== */

  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    );
  };


  const getCategoryLabel = (category) => {
    const found = categories.find(
      (item) => item.value === category
    );

    return found
      ? found.label
      : category || "Unknown";
  };


  const getCategoryClass = (category) => {
    return `budget-category-${(
      category || "miscellaneous"
    ).toLowerCase()}`;
  };


  /* =====================================================
     FILTERED BUDGETS
  ===================================================== */

  const filteredBudgets = useMemo(() => {
    if (!searchTerm.trim()) {
      return budgets;
    }

    const search =
      searchTerm.toLowerCase();

    return budgets.filter((budget) => {
      const category =
        getCategoryLabel(
          budget.category
        ).toLowerCase();

      const monthName =
        monthNames[
          Number(budget.month) - 1
        ]?.toLowerCase() || "";

      return (
        category.includes(search) ||
        monthName.includes(search) ||
        String(budget.year).includes(search) ||
        String(
          budget.budget_amount
        ).includes(search)
      );
    });
  }, [budgets, searchTerm]);


  /* =====================================================
     OVERALL UTILIZATION
  ===================================================== */

  const utilization = useMemo(() => {
    if (
      Number(summary.budget_amount) <= 0
    ) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (Number(summary.total_expense) /
          Number(summary.budget_amount)) *
          100
      )
    );
  }, [summary]);


  /* =====================================================
     STATUS
  ===================================================== */

  const budgetStatus =
    Number(summary.overspent_amount) > 0
      ? "Overspent"
      : Number(summary.remaining_budget) <=
        Number(summary.budget_amount) * 0.2
      ? "Near Limit"
      : "On Track";


  return (
    <MainLayout title="Budgets">

      <div className="budget-page">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="budget-header">

          <div>

            <div className="budget-breadcrumb">
              Finance / Budgets
            </div>

            <h1 className="budget-title">
              Budget Planning
            </h1>

            <p className="budget-subtitle">
              Plan your spending, control expenses
              and stay within your financial limits.
            </p>

          </div>


          {/* PERIOD */}

          <div className="budget-period-selector">

            <div className="budget-period-label">
              Viewing
            </div>

            <div className="budget-period-controls">

              <select
                value={month}
                onChange={(e) =>
                  setMonth(
                    Number(e.target.value)
                  )
                }
              >

                {monthNames.map(
                  (name, index) => (
                    <option
                      key={index + 1}
                      value={index + 1}
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
                    Number(e.target.value)
                  )
                }
              />

            </div>

          </div>

        </div>


        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <div className="budget-stats">


          {/* Budget */}

          <div className="budget-stat-card budget-total">

            <div className="budget-stat-icon">
              ₹
            </div>

            <div>

              <span>
                Total Budget
              </span>

              <h2>
                ₹{" "}
                {formatAmount(
                  summary.budget_amount
                )}
              </h2>

              <small>
                Planned spending
              </small>

            </div>

          </div>


          {/* Expense */}

          <div className="budget-stat-card budget-spent">

            <div className="budget-stat-icon">
              ↗
            </div>

            <div>

              <span>
                Total Spent
              </span>

              <h2>
                ₹{" "}
                {formatAmount(
                  summary.total_expense
                )}
              </h2>

              <small>
                {utilization}% of budget used
              </small>

            </div>

          </div>


          {/* Remaining */}

          <div className="budget-stat-card budget-remaining">

            <div className="budget-stat-icon">
              ✓
            </div>

            <div>

              <span>
                Remaining
              </span>

              <h2>
                ₹{" "}
                {formatAmount(
                  summary.remaining_budget
                )}
              </h2>

              <small>
                Available to spend
              </small>

            </div>

          </div>


          {/* Overspent */}

          <div className="budget-stat-card budget-over">

            <div className="budget-stat-icon">
              !
            </div>

            <div>

              <span>
                Overspent
              </span>

              <h2>
                ₹{" "}
                {formatAmount(
                  summary.overspent_amount
                )}
              </h2>

              <small>
                {budgetStatus}
              </small>

            </div>

          </div>

        </div>


        {/* =================================================
            UTILIZATION BAR
        ================================================= */}

        <div className="budget-progress-card">

          <div className="budget-progress-header">

            <div>

              <h3>
                Budget Utilization
              </h3>

              <p>
                {monthNames[
                  Number(month) - 1
                ]}{" "}
                {year}
              </p>

            </div>

            <strong>
              {utilization}%
            </strong>

          </div>


          <div className="budget-progress-track">

            <div
              className={`budget-progress-fill ${
                utilization >= 100
                  ? "danger"
                  : utilization >= 80
                  ? "warning"
                  : "safe"
              }`}
              style={{
                width: `${utilization}%`,
              }}
            />

          </div>


          <div className="budget-progress-footer">

            <span>
              ₹{" "}
              {formatAmount(
                summary.total_expense
              )}{" "}
              spent
            </span>

            <span>
              ₹{" "}
              {formatAmount(
                summary.budget_amount
              )}{" "}
              planned
            </span>

          </div>

        </div>


        {/* =================================================
            FORM
        ================================================= */}

        <div className="budget-form-card">

          <div className="budget-section-heading">

            <div>

              <h2>
                {editingId
                  ? "Update Budget"
                  : "Create New Budget"}
              </h2>

              <p>
                {editingId
                  ? "Modify your selected budget."
                  : "Set a spending limit for a category."}
              </p>

            </div>


            {editingId && (
              <button
                className="budget-cancel-btn"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}

          </div>


          <div className="budget-form-grid">


            {/* Amount */}

            <div className="budget-field">

              <label>
                Budget Amount <span>*</span>
              </label>

              <div className="budget-amount-input">

                <span>₹</span>

                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={
                    form.budget_amount
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      budget_amount:
                        e.target.value,
                    })
                  }
                />

              </div>

            </div>


            {/* Category */}

            <div className="budget-field">

              <label>
                Category <span>*</span>
              </label>

              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category:
                      e.target.value,
                  })
                }
              >

                <option value="">
                  Select category
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  )
                )}

              </select>

            </div>


            {/* Month */}

            <div className="budget-field">

              <label>
                Budget Month <span>*</span>
              </label>

              <select
                value={form.month}
                onChange={(e) =>
                  setForm({
                    ...form,
                    month:
                      e.target.value,
                  })
                }
              >

                <option value="">
                  Select month
                </option>

                {monthNames.map(
                  (name, index) => (
                    <option
                      key={index + 1}
                      value={index + 1}
                    >
                      {name}
                    </option>
                  )
                )}

              </select>

            </div>


            {/* Year */}

            <div className="budget-field">

              <label>
                Budget Year <span>*</span>
              </label>

              <input
                type="number"
                placeholder="Year"
                value={form.year}
                onChange={(e) =>
                  setForm({
                    ...form,
                    year:
                      e.target.value,
                  })
                }
              />

            </div>

          </div>


          <div className="budget-form-actions">

            <button
              className="budget-submit-btn"
              onClick={saveBudget}
            >
              {editingId
                ? "Update Budget"
                : "Create Budget"}
            </button>


            {editingId && (
              <button
                className="budget-secondary-btn"
                onClick={resetForm}
              >
                Clear
              </button>
            )}

          </div>

        </div>


        {/* =================================================
            BUDGET LIST
        ================================================= */}

        <div className="budget-list-card">


          <div className="budget-list-header">

            <div>

              <h2>
                Budget Plans
              </h2>

              <p>
                {filteredBudgets.length}{" "}
                budget
                {filteredBudgets.length !== 1
                  ? "s"
                  : ""}{" "}
                found
              </p>

            </div>


            {/* SEARCH */}

            <div className="budget-search-box">

              <span>
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search budgets..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
              />

            </div>

          </div>


          {/* TABLE */}

          <div className="budget-table-wrapper">

            <table className="budget-table">

              <thead>

                <tr>

                  <th>
                    Category
                  </th>

                  <th>
                    Budget
                  </th>

                  <th>
                    Month
                  </th>

                  <th>
                    Year
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredBudgets.length === 0 ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="budget-table-message"
                    >

                      <div className="budget-empty-state">

                        <div className="budget-empty-icon">
                          ₹
                        </div>

                        <h3>
                          No budgets found
                        </h3>

                        <p>
                          Create a budget to
                          start planning your
                          spending.
                        </p>

                      </div>

                    </td>

                  </tr>

                ) : (

                  filteredBudgets.map(
                    (budget) => (

                      <tr
                        key={budget.id}
                      >

                        {/* Category */}

                        <td>

                          <span
                            className={`budget-category-badge ${getCategoryClass(
                              budget.category
                            )}`}
                          >
                            {getCategoryLabel(
                              budget.category
                            )}
                          </span>

                        </td>


                        {/* Amount */}

                        <td>

                          <span className="budget-amount">
                            ₹{" "}
                            {formatAmount(
                              budget.budget_amount
                            )}
                          </span>

                        </td>


                        {/* Month */}

                        <td>

                          <span className="budget-month">

                            {
                              monthNames[
                                Number(
                                  budget.month
                                ) - 1
                              ] ||
                                budget.month
                            }

                          </span>

                        </td>


                        {/* Year */}

                        <td>

                          <span className="budget-year">
                            {budget.year}
                          </span>

                        </td>


                        {/* Status */}

                        <td>

                          <span className="budget-status planned">
                            Planned
                          </span>

                        </td>


                        {/* Actions */}

                        <td>

                          <div className="budget-action-buttons">

                            <button
                              className="budget-view-btn"
                              onClick={() =>
                                fetchSummary(
                                  budget
                                )
                              }
                            >
                              View
                            </button>


                            <button
                              className="budget-edit-btn"
                              onClick={() =>
                                editBudget(
                                  budget
                                )
                              }
                            >
                              Edit
                            </button>


                            <button
                              className="budget-delete-btn"
                              onClick={() =>
                                deleteBudget(
                                  budget.id
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>


        {/* =================================================
            SUMMARY MODAL
        ================================================= */}

        {showSummary &&
          selectedSummary && (
            <div
              className="budget-modal-overlay"
              onClick={() =>
                setShowSummary(false)
              }
            >

              <div
                className="budget-summary-modal"
                onClick={(e) =>
                  e.stopPropagation()
                }
              >

                <div className="budget-modal-header">

                  <div>

                    <span>
                      Budget Summary
                    </span>

                    <h2>
                      {getCategoryLabel(
                        selectedBudget?.category
                      )}
                    </h2>

                  </div>

                  <button
                    className="budget-modal-close"
                    onClick={() =>
                      setShowSummary(false)
                    }
                  >
                    ×
                  </button>

                </div>


                <div className="budget-modal-grid">

                  <div>

                    <span>
                      Budget
                    </span>

                    <strong>
                      ₹{" "}
                      {formatAmount(
                        selectedSummary.budget_amount
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Spent
                    </span>

                    <strong className="modal-spent">
                      ₹{" "}
                      {formatAmount(
                        selectedSummary.total_expense
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Remaining
                    </span>

                    <strong className="modal-remaining">
                      ₹{" "}
                      {formatAmount(
                        selectedSummary.remaining_budget
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Overspent
                    </span>

                    <strong className="modal-overspent">
                      ₹{" "}
                      {formatAmount(
                        selectedSummary.overspent_amount
                      )}
                    </strong>

                  </div>

                </div>


                <div className="budget-modal-footer">

                  <button
                    className="budget-modal-done"
                    onClick={() =>
                      setShowSummary(false)
                    }
                  >
                    Done
                  </button>

                </div>

              </div>

            </div>
          )}

      </div>

    </MainLayout>
  );
}