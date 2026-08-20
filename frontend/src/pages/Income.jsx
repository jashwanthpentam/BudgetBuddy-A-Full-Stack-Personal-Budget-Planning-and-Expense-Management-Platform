import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import "./Income.css";
import API from "../services/api";
import useModuleDate from "../hooks/useModuleDate";
import { getDashboardSummary } from "../services/dashboardService";

import { toast, confirmAction } from "./toast";
const SOURCE_LABELS = {
  SALARY: "Salary",
  POCKET_MONEY: "Pocket Money",
  SCHOLARSHIP: "Scholarship",
  FREELANCING: "Freelancing",
  BUSINESS: "Business",
  OTHER: "Other",
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
};

const formatDate = (date) => {
  if (!date) return "-";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return date;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function Income() {
  const [incomes, setIncomes] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);

  const [form, setForm] = useState({
    amount: "",
    source: "",
    description: "",
    income_date: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [sourceFilter, setSourceFilter] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    month,
    year,
    setMonth,
    setYear,
  } = useModuleDate();

  /* -----------------------------
     FETCH DATA
  ----------------------------- */

  useEffect(() => {
    fetchIncome();
    fetchTotalIncome();
  }, [sourceFilter, sortBy, month, year]);

  const fetchIncome = async () => {
    try {
      setLoading(true);

      let url = "/income/?";

      if (sourceFilter) {
        url += `source=${sourceFilter}&`;
      }

      if (sortBy) {
        url += `sort=${sortBy}`;
      }

      const res = await API.get(url);

      setIncomes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log(err);
      setIncomes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalIncome = async () => {
    try {
      const summary = await getDashboardSummary(month, year);

      setTotalIncome(Number(summary.total_income) || 0);
    } catch (err) {
      console.log(err);
      setTotalIncome(0);
    }
  };

  /* -----------------------------
     MONTH/YEAR FILTER
  ----------------------------- */

  const filteredIncomes = useMemo(() => {
    let result = [...incomes];

    // Month/year filter
    result = result.filter((income) => {
      if (!income.income_date) return false;

      const date = new Date(income.income_date);

      return (
        date.getMonth() + 1 === Number(month) &&
        date.getFullYear() === Number(year)
      );
    });

    // Search
    if (search.trim()) {
      const query = search.toLowerCase();

      result = result.filter((income) => {
        const source =
          SOURCE_LABELS[income.source] || income.source || "";

        return (
          source.toLowerCase().includes(query) ||
          (income.description || "")
            .toLowerCase()
            .includes(query) ||
          String(income.amount).includes(query)
        );
      });
    }

    return result;
  }, [incomes, month, year, search]);

  /* -----------------------------
     STATISTICS
  ----------------------------- */

  const transactionCount = filteredIncomes.length;

  const averageIncome =
    transactionCount > 0
      ? filteredIncomes.reduce(
          (sum, income) => sum + Number(income.amount || 0),
          0
        ) / transactionCount
      : 0;

  const highestIncome =
    transactionCount > 0
      ? Math.max(
          ...filteredIncomes.map((income) =>
            Number(income.amount || 0)
          )
        )
      : 0;

  /* -----------------------------
     FORM HANDLING
  ----------------------------- */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      amount: "",
      source: "",
      description: "",
      income_date: "",
    });

    setEditingId(null);
  };

  const saveIncome = async () => {
    try {
      if (
        !form.amount ||
        !form.source ||
        !form.income_date
      ) {
        toast.warning("Please fill all required fields.");
        return;
      }

      if (Number(form.amount) <= 0) {
        toast.warning("Amount must be greater than 0.");
        return;
      }

      setSaving(true);

      if (editingId) {
        await API.put(
          `/income/${editingId}/`,
          form
        );

        toast.success("Income updated successfully.");
      } else {
        await API.post("/income/", form);

        toast.success("Income added successfully.");
      }

      resetForm();

      await fetchIncome();
      await fetchTotalIncome();
    } catch (err) {
      console.log(err);
      toast.error("Operation failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* -----------------------------
     DELETE
  ----------------------------- */

  const deleteIncome = async (id) => {
    const confirmed = await confirmAction(
      "Are you sure you want to delete this income?",
      "Delete income",
      "Delete"
    );

    if (!confirmed) {
      return;
    }

    try {
      await API.delete(`/income/${id}/`);

      await fetchIncome();
      await fetchTotalIncome();

      toast.success("Income deleted successfully.");
    } catch (err) {
      console.log(err);
      toast.error("Failed to delete income.");
    }
  };

  /* -----------------------------
     EDIT
  ----------------------------- */

  const editIncome = (income) => {
    setEditingId(income.id);

    setForm({
      amount: income.amount,
      source: income.source,
      description: income.description || "",
      income_date: income.income_date,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <MainLayout title="Income">

      <div className="income-page">

        {/* =========================
            HEADER
        ========================= */}

        <div className="income-header">

          <div>
            <div className="income-breadcrumb">
              Finance / Income
            </div>

            <h1 className="income-title">
              Income Management
            </h1>

            <p className="income-subtitle">
              Track, manage and analyze your income
              for the selected period.
            </p>
          </div>

          <div className="period-selector">

            <div className="period-label">
              Viewing
            </div>

            <div className="period-controls">

              <select
                value={month}
                onChange={(e) =>
                  setMonth(Number(e.target.value))
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
                ].map((name, index) => (
                  <option
                    key={index + 1}
                    value={index + 1}
                  >
                    {name}
                  </option>
                ))}
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

        {/* =========================
            STAT CARDS
        ========================= */}

        <div className="income-stats">

          <div className="income-stat-card primary">

            <div className="stat-icon">
              ₹
            </div>

            <div>
              <span>Total Income</span>

              <h2>
                ₹ {formatCurrency(totalIncome)}
              </h2>

              <small>
                {new Date(
                  Number(year),
                  Number(month) - 1
                ).toLocaleString("en-IN", {
                  month: "long",
                })}{" "}
                {year}
              </small>
            </div>

          </div>

          <div className="income-stat-card">

            <div className="stat-icon">
              ↗
            </div>

            <div>
              <span>Transactions</span>

              <h2>{transactionCount}</h2>

              <small>
                Income records
              </small>
            </div>

          </div>

          <div className="income-stat-card">

            <div className="stat-icon">
              ≈
            </div>

            <div>
              <span>Average Income</span>

              <h2>
                ₹ {formatCurrency(averageIncome)}
              </h2>

              <small>
                Per transaction
              </small>
            </div>

          </div>

          <div className="income-stat-card">

            <div className="stat-icon">
              ↑
            </div>

            <div>
              <span>Highest Income</span>

              <h2>
                ₹ {formatCurrency(highestIncome)}
              </h2>

              <small>
                Highest transaction
              </small>
            </div>

          </div>

        </div>

        {/* =========================
            ADD / EDIT FORM
        ========================= */}

        <div className="income-form-card">

          <div className="section-heading">

            <div>
              <h2>
                {editingId
                  ? "Update Income"
                  : "Add New Income"}
              </h2>

              <p>
                {editingId
                  ? "Modify the selected income record."
                  : "Record a new income transaction."}
              </p>
            </div>

            {editingId && (
              <button
                className="cancel-edit-btn"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}

          </div>

          <div className="income-form-grid">

            <div className="field-group">

              <label>
                Amount <span>*</span>
              </label>

              <div className="amount-input">

                <span>₹</span>

                <input
                  type="number"
                  name="amount"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                />

              </div>

            </div>

            <div className="field-group">

              <label>
                Income Source <span>*</span>
              </label>

              <select
                name="source"
                value={form.source}
                onChange={handleChange}
              >

                <option value="">
                  Select source
                </option>

                <option value="SALARY">
                  Salary
                </option>

                <option value="POCKET_MONEY">
                  Pocket Money
                </option>

                <option value="SCHOLARSHIP">
                  Scholarship
                </option>

                <option value="FREELANCING">
                  Freelancing
                </option>

                <option value="BUSINESS">
                  Business
                </option>

                <option value="OTHER">
                  Other
                </option>

              </select>

            </div>

            <div className="field-group">

              <label>
                Income Date <span>*</span>
              </label>

              <input
                type="date"
                name="income_date"
                value={form.income_date}
                onChange={handleChange}
              />

            </div>

            <div className="field-group">

              <label>
                Description
              </label>

              <input
                type="text"
                name="description"
                placeholder="e.g. Monthly salary"
                value={form.description}
                onChange={handleChange}
              />

            </div>

          </div>

          <div className="form-actions">

            <button
              className="income-submit-btn"
              onClick={saveIncome}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Income"
                : "Add Income"}
            </button>

            {editingId && (
              <button
                className="secondary-btn"
                onClick={resetForm}
              >
                Clear
              </button>
            )}

          </div>

        </div>

        {/* =========================
            FILTERS
        ========================= */}

        <div className="income-list-card">

          <div className="list-header">

            <div>
              <h2>
                Income Transactions
              </h2>

              <p>
                {transactionCount} transaction
                {transactionCount !== 1 ? "s" : ""}
                {" "}found
              </p>
            </div>

            <div className="list-filters">

              <div className="search-box">

                <span>⌕</span>

                <input
                  type="text"
                  placeholder="Search income..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />

              </div>

              <select
                value={sourceFilter}
                onChange={(e) =>
                  setSourceFilter(e.target.value)
                }
              >

                <option value="">
                  All Sources
                </option>

                <option value="SALARY">
                  Salary
                </option>

                <option value="POCKET_MONEY">
                  Pocket Money
                </option>

                <option value="SCHOLARSHIP">
                  Scholarship
                </option>

                <option value="FREELANCING">
                  Freelancing
                </option>

                <option value="BUSINESS">
                  Business
                </option>

                <option value="OTHER">
                  Other
                </option>

              </select>

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

          {/* =========================
              TABLE
          ========================= */}

          <div className="income-table-wrapper">

            <table className="income-table">

              <thead>

                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>
                    <td
                      colSpan="5"
                      className="table-message"
                    >
                      Loading income records...
                    </td>
                  </tr>

                ) : filteredIncomes.length === 0 ? (

                  <tr>
                    <td
                      colSpan="5"
                      className="table-message"
                    >

                      <div className="empty-state">

                        <div className="empty-icon">
                          ₹
                        </div>

                        <h3>
                          No income found
                        </h3>

                        <p>
                          Add an income transaction
                          or change your filters.
                        </p>

                      </div>

                    </td>
                  </tr>

                ) : (

                  filteredIncomes.map((income) => (

                    <tr key={income.id}>

                      <td>
                        <span className="date-text">
                          {formatDate(
                            income.income_date
                          )}
                        </span>
                      </td>

                      <td>

                        <span className="source-badge">
                          {SOURCE_LABELS[
                            income.source
                          ] || income.source}
                        </span>

                      </td>

                      <td>

                        <span className="description-text">
                          {income.description ||
                            "No description"}
                        </span>

                      </td>

                      <td>

                        <strong className="income-amount">
                          + ₹{" "}
                          {formatCurrency(
                            income.amount
                          )}
                        </strong>

                      </td>

                      <td>

                        <div className="action-buttons">

                          <button
                            className="edit-action"
                            onClick={() =>
                              editIncome(income)
                            }
                            title="Edit income"
                          >
                            Edit
                          </button>

                          <button
                            className="delete-action"
                            onClick={() =>
                              deleteIncome(
                                income.id
                              )
                            }
                            title="Delete income"
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </MainLayout>
  );
}