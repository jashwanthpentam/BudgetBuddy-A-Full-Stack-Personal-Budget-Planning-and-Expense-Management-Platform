import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import API from "../services/api";
import { getDashboardSummary } from "../services/dashboardService";
import useModuleDate from "../hooks/useModuleDate";
import "./Expenses.css";

import { toast, confirmAction } from "./toast";
export default function Expenses() {
  const [expenses, setExpenses] = useState([]);

  const [form, setForm] = useState({
    amount: "",
    category: "",
    description: "",
    expense_date: "",
  });

  const [totalExpense, setTotalExpense] = useState(0);

  const [editingId, setEditingId] = useState(null);

  const [categoryFilter, setCategoryFilter] = useState("");

  const [sortBy, setSortBy] = useState("latest");

  const [searchTerm, setSearchTerm] = useState("");

  const {
    month,
    year,
    setMonth,
    setYear,
  } = useModuleDate();

  /* =====================================================
     FETCH DATA
  ===================================================== */

  useEffect(() => {
    fetchExpenses();
    fetchTotalExpense();
  }, [categoryFilter, sortBy, month, year]);

  const fetchExpenses = async () => {
    try {
      let url = "/expenses/?";

      if (categoryFilter) {
        url += `category=${categoryFilter}&`;
      }

      if (sortBy) {
        url += `sort=${sortBy}`;
      }

      const res = await API.get(url);

      setExpenses(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchTotalExpense = async () => {
    try {
      const summary = await getDashboardSummary(
        month,
        year
      );

      setTotalExpense(
        Number(summary.total_expense || 0)
      );
    } catch (err) {
      console.log(err);
    }
  };

  /* =====================================================
     DERIVED STATISTICS
  ===================================================== */

  const averageExpense = useMemo(() => {
    if (expenses.length === 0) return 0;

    const total = expenses.reduce(
      (sum, expense) =>
        sum + Number(expense.amount || 0),
      0
    );

    return total / expenses.length;
  }, [expenses]);

  const highestExpense = useMemo(() => {
    if (expenses.length === 0) return 0;

    return Math.max(
      ...expenses.map((expense) =>
        Number(expense.amount || 0)
      )
    );
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) {
      return expenses;
    }

    const search = searchTerm.toLowerCase();

    return expenses.filter((expense) =>
      `${expense.category || ""} ${expense.description || ""} ${expense.expense_date || ""} ${expense.amount || ""}`
        .toLowerCase()
        .includes(search)
    );
  }, [expenses, searchTerm]);

  /* =====================================================
     SAVE / UPDATE EXPENSE
  ===================================================== */

  const addExpense = async () => {
    try {
      if (
        !form.category ||
        !form.amount ||
        !form.expense_date
      ) {
        toast.warning("Please fill all required fields.");
        return;
      }

      if (Number(form.amount) <= 0) {
        toast.warning("Amount must be greater than 0.");
        return;
      }

      if (editingId) {
        await API.put(
          `/expenses/${editingId}/`,
          form
        );

        toast.success("Expense Updated Successfully");

        setEditingId(null);
      } else {
        await API.post(
          "/expenses/",
          form
        );

        toast.success("Expense Added Successfully");
      }

      resetForm();

      fetchExpenses();
      fetchTotalExpense();

    } catch (err) {
      console.log(err);

      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
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
      amount: "",
      category: "",
      description: "",
      expense_date: "",
    });

    setEditingId(null);
  };

  /* =====================================================
     DELETE EXPENSE
  ===================================================== */

  const deleteExpense = async (id) => {
    const confirmDelete = await confirmAction(
      "Are you sure you want to delete this expense?",
      "Delete expense",
      "Delete"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/expenses/${id}/`);

      fetchExpenses();
      fetchTotalExpense();

      toast.success("Expense Deleted Successfully");
    } catch (err) {
      console.log(err);
      toast.error("Delete Failed");
    }
  };

  /* =====================================================
     EDIT EXPENSE
  ===================================================== */

  const editExpense = (expense) => {
    setEditingId(expense.id);

    setForm({
      amount: expense.amount,
      category: expense.category,
      description: expense.description || "",
      expense_date: expense.expense_date,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const getCategoryLabel = (category) => {
    const labels = {
      FOOD: "Food",
      TRAVEL: "Travel",
      SHOPPING: "Shopping",
      EDUCATION: "Education",
      ENTERTAINMENT: "Entertainment",
      HEALTHCARE: "Healthcare",
      BILLS: "Bills",
      MISCELLANEOUS: "Miscellaneous",
    };

    return labels[category] || category;
  };

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <MainLayout title="Expenses">

      <div className="expense-page">

        {/* ================================================
            HEADER
        ================================================= */}

        <div className="expense-header">

          <div>
            <div className="expense-breadcrumb">
              Finance / Expenses
            </div>

            <h1 className="expense-title">
              Expense Management
            </h1>

            <p className="expense-subtitle">
              Track, manage and analyze your spending
              for the selected period.
            </p>
          </div>

          {/* Period */}

          <div className="expense-period-selector">

            <div className="expense-period-label">
              Viewing
            </div>

            <div className="expense-period-controls">

              <select
                value={month}
                onChange={(e) =>
                  setMonth(Number(e.target.value))
                }
              >
                {Array.from(
                  { length: 12 },
                  (_, i) => (
                    <option
                      key={i + 1}
                      value={i + 1}
                    >
                      {
                        [
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
                        ][i]
                      }
                    </option>
                  )
                )}
              </select>

              <input
                type="number"
                value={year}
                onChange={(e) =>
                  setYear(Number(e.target.value))
                }
              />

            </div>
          </div>

        </div>


        {/* ================================================
            STAT CARDS
        ================================================= */}

        <div className="expense-stats">

          <div className="expense-stat-card total">

            <div className="expense-stat-icon">
              ₹
            </div>

            <div>
              <span>Total Expense</span>

              <h2>
                ₹ {formatAmount(totalExpense)}
              </h2>

              <small>
                Selected period
              </small>
            </div>

          </div>


          <div className="expense-stat-card transactions">

            <div className="expense-stat-icon">
              ↗
            </div>

            <div>
              <span>Transactions</span>

              <h2>
                {expenses.length}
              </h2>

              <small>
                Expense records
              </small>
            </div>

          </div>


          <div className="expense-stat-card average">

            <div className="expense-stat-icon">
              ≈
            </div>

            <div>
              <span>Average Expense</span>

              <h2>
                ₹ {formatAmount(averageExpense)}
              </h2>

              <small>
                Per transaction
              </small>
            </div>

          </div>


          <div className="expense-stat-card highest">

            <div className="expense-stat-icon">
              ↑
            </div>

            <div>
              <span>Highest Expense</span>

              <h2>
                ₹ {formatAmount(highestExpense)}
              </h2>

              <small>
                Highest transaction
              </small>
            </div>

          </div>

        </div>


        {/* ================================================
            ADD / UPDATE EXPENSE
        ================================================= */}

        <div className="expense-form-card">

          <div className="expense-section-heading">

            <div>
              <h2>
                {editingId
                  ? "Update Expense"
                  : "Add New Expense"}
              </h2>

              <p>
                {editingId
                  ? "Modify the selected expense transaction."
                  : "Record a new expense transaction."}
              </p>
            </div>

            {editingId && (
              <button
                className="expense-cancel-btn"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}

          </div>


          <div className="expense-form-grid">

            {/* Amount */}

            <div className="expense-field">

              <label>
                Amount <span>*</span>
              </label>

              <div className="expense-amount-input">

                <span>₹</span>

                <input
                  type="number"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value,
                    })
                  }
                />

              </div>

            </div>


            {/* Category */}

            <div className="expense-field">

              <label>
                Expense Category <span>*</span>
              </label>

              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value,
                  })
                }
              >

                <option value="">
                  Select category
                </option>

                <option value="FOOD">
                  Food
                </option>

                <option value="TRAVEL">
                  Travel
                </option>

                <option value="SHOPPING">
                  Shopping
                </option>

                <option value="EDUCATION">
                  Education
                </option>

                <option value="ENTERTAINMENT">
                  Entertainment
                </option>

                <option value="HEALTHCARE">
                  Healthcare
                </option>

                <option value="BILLS">
                  Bills
                </option>

                <option value="MISCELLANEOUS">
                  Miscellaneous
                </option>

              </select>

            </div>


            {/* Date */}

            <div className="expense-field">

              <label>
                Expense Date <span>*</span>
              </label>

              <input
                type="date"
                value={form.expense_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    expense_date:
                      e.target.value,
                  })
                }
              />

            </div>


            {/* Description */}

            <div className="expense-field">

              <label>
                Description
              </label>

              <input
                type="text"
                placeholder="e.g. Monthly groceries"
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description:
                      e.target.value,
                  })
                }
              />

            </div>

          </div>


          <div className="expense-form-actions">

            <button
              className="expense-submit-btn"
              onClick={addExpense}
            >
              {editingId
                ? "Update Expense"
                : "Add Expense"}
            </button>

            {editingId && (
              <button
                className="expense-secondary-btn"
                onClick={resetForm}
              >
                Clear
              </button>
            )}

          </div>

        </div>


        {/* ================================================
            EXPENSE TRANSACTIONS
        ================================================= */}

        <div className="expense-list-card">

          <div className="expense-list-header">

            <div>

              <h2>
                Expense Transactions
              </h2>

              <p>
                {filteredExpenses.length}{" "}
                transaction
                {filteredExpenses.length !== 1
                  ? "s"
                  : ""}{" "}
                found
              </p>

            </div>


            <div className="expense-list-filters">

              {/* Search */}

              <div className="expense-search-box">

                <span>
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                />

              </div>


              {/* Category */}

              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value)
                }
              >

                <option value="">
                  All Categories
                </option>

                <option value="FOOD">
                  Food
                </option>

                <option value="TRAVEL">
                  Travel
                </option>

                <option value="SHOPPING">
                  Shopping
                </option>

                <option value="EDUCATION">
                  Education
                </option>

                <option value="ENTERTAINMENT">
                  Entertainment
                </option>

                <option value="HEALTHCARE">
                  Healthcare
                </option>

                <option value="BILLS">
                  Bills
                </option>

                <option value="MISCELLANEOUS">
                  Miscellaneous
                </option>

              </select>


              {/* Sort */}

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value)
                }
              >

                <option value="">
                  Default
                </option>

                <option value="latest">
                  Latest
                </option>

                <option value="oldest">
                  Oldest
                </option>

                <option value="highest">
                  Highest Amount
                </option>

                <option value="lowest">
                  Lowest Amount
                </option>

              </select>

            </div>

          </div>


          {/* ==============================================
              TABLE
          ============================================== */}

          <div className="expense-table-wrapper">

            <table className="expense-table">

              <thead>

                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>

              </thead>


              <tbody>

                {filteredExpenses.length === 0 ? (

                  <tr>

                    <td
                      colSpan="5"
                      className="expense-table-message"
                    >

                      <div className="expense-empty-state">

                        <div className="expense-empty-icon">
                          ₹
                        </div>

                        <h3>
                          No expenses found
                        </h3>

                        <p>
                          Try changing your filters
                          or add a new expense.
                        </p>

                      </div>

                    </td>

                  </tr>

                ) : (

                  filteredExpenses.map(
                    (expense) => (

                      <tr
                        key={expense.id}
                      >

                        <td>
                          <span className="expense-date">
                            {formatDate(
                              expense.expense_date
                            )}
                          </span>
                        </td>


                        <td>

                          <span
                            className={`expense-category-badge category-${expense.category?.toLowerCase()}`}
                          >
                            {getCategoryLabel(
                              expense.category
                            )}
                          </span>

                        </td>


                        <td>

                          <span className="expense-description">

                            {expense.description ||
                              "No description"}

                          </span>

                        </td>


                        <td>

                          <span className="expense-amount">
                            − ₹{" "}
                            {formatAmount(
                              expense.amount
                            )}
                          </span>

                        </td>


                        <td>

                          <div className="expense-action-buttons">

                            <button
                              className="expense-edit-btn"
                              onClick={() =>
                                editExpense(
                                  expense
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="expense-delete-btn"
                              onClick={() =>
                                deleteExpense(
                                  expense.id
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

      </div>

    </MainLayout>
  );
}