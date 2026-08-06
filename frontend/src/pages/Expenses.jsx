import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import API from "../services/api";
import { getDashboardSummary } from "../services/dashboardService";
import useModuleDate from "../hooks/useModuleDate";

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
  
  const [sortBy, setSortBy] = useState("");
  const {
    month,
    year,
    setMonth,
    setYear,
  } = useModuleDate();

  useEffect(() => {

    fetchExpenses();

    fetchTotalExpense();

  }, [categoryFilter, sortBy, month, year]);

  // Fetch All Expenses
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

  // Fetch Total Expense
  const fetchTotalExpense = async () => {

    try {

        const summary = await getDashboardSummary(
            month,
            year
        );

        setTotalExpense(
            summary.total_expense
        );

    }

    catch (err) {

        console.log(err);

    }

  };

  // Add Expense
  const addExpense = async () => {

  try {

    if (
        !form.category || 
        !form.amount || 
        !form.expense_date
    ) {
      alert("Please fill all required fields.");
      return;
    }

    if (Number(form.amount) <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }
    
    if (editingId) {

      await API.put(
        `/expenses/${editingId}/`,
        form
      );

      alert("Expense Updated Successfully");

      setEditingId(null);

    }

    else {

      await API.post(
        "/expenses/",
        form
      );

      alert("Expense Added Successfully");

    }

    setForm({
      amount: "",
      category: "",
      description: "",
      expense_date: "",
    });

    fetchExpenses();
    fetchTotalExpense();

  }

  catch(err){

    console.log(err);

    if (err.response?.data?.error) {
      alert(err.response.data.error);
    } else {
      alert("Operation Failed");
    }

  }

};

  // Delete Expense
  const deleteExpense = async (id) => {

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmDelete) return;

    try {

      await API.delete(`/expenses/${id}/`);

      fetchExpenses();
      fetchTotalExpense();

      alert("Expense Deleted Successfully");

    } catch (err) {

      console.log(err);
      alert("Delete Failed");

    }

  };

  const editExpense = (expense) => {

  setEditingId(expense.id);

  setForm({

    amount:expense.amount,

    category:expense.category,

    description:expense.description,

    expense_date:expense.expense_date,

  });

};

  return (

    <MainLayout title="Expenses">

      <h1 className="page-title">
        Expense Management
      </h1>

      <div
    style={{
        display: "flex",
        gap: "15px",
        marginBottom: "20px",
    }}
>

    <select
        value={month}
        onChange={(e) => setMonth(Number(e.target.value))}
    >

        {
            Array.from({ length: 12 }, (_, i) => (

                <option
                    key={i + 1}
                    value={i + 1}
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
                    ][i]}
                </option>

            ))
        }

    </select>

    <input
        type="number"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
    />

</div>

      {/* Summary Cards */}

      <div className="stats">

        <div className="stat-card">
          <p>Total Expense</p>
          <h2>₹ {totalExpense}</h2>
        </div>

        <div className="stat-card">
          <p>Total Transactions</p>
          <h2>{expenses.length}</h2>
        </div>

      </div>

      {/* Add Expense Form */}

      <div className="form-card">

        <h2>Add New Expense</h2>

        <div className="form-grid">

          <input
            type="number"
            placeholder="Amount"
            min="1"
            step="0.01"
            value={form.amount}
            onChange={(e) =>
              setForm({ ...form, amount: e.target.value })
            }
          />

          <select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value })
            }
          >
            <option value="">Select Category</option>
            <option value="FOOD">Food</option>
            <option value="TRAVEL">Travel</option>
            <option value="SHOPPING">Shopping</option>
            <option value="EDUCATION">Education</option>
            <option value="ENTERTAINMENT">Entertainment</option>
            <option value="HEALTHCARE">Healthcare</option>
            <option value="BILLS">Bills</option>
            <option value="MISCELLANEOUS">Miscellaneous</option>
          </select>

          <input
            type="date"
            value={form.expense_date}
            onChange={(e) =>
              setForm({
                ...form,
                expense_date: e.target.value,
              })
            }
          />

          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value,
              })
            }
          />

        </div>

        <button
          className="add-btn"
          onClick={addExpense}
        >
          {editingId ? "Update Expense" : "Add Expense"}
        </button>

      </div>

      {/* Expense Table */}

      <div className="table-card">

        <h2>Expense List</h2>

        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "20px",
          }}
        >

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="FOOD">Food</option>
            <option value="TRAVEL">Travel</option>
            <option value="SHOPPING">Shopping</option>
            <option value="EDUCATION">Education</option>
            <option value="ENTERTAINMENT">Entertainment</option>
            <option value="HEALTHCARE">Healthcare</option>
            <option value="BILLS">Bills</option>
            <option value="MISCELLANEOUS">Miscellaneous</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="">Default</option>
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>

        </div>

        <table>

          <thead>

            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Description</th>
              <th>Edit</th>
              <th>Delete</th>
            </tr>

          </thead>

          <tbody>

            {expenses.length === 0 ? (

              <tr>

                <td colSpan="6">
                  No Expenses Found
                </td>

              </tr>

            ) : (

              expenses.map((expense) => (

                <tr key={expense.id}>

                  <td>{expense.expense_date}</td>

                  <td>₹ {expense.amount}</td>

                  <td>{expense.category}</td>

                  <td>{expense.description}</td>

                  <td>

                    <button
                      className="edit-btn"
                      onClick={() => editExpense(expense)}
                    >
                      Edit
                    </button>

                  </td>

                  <td>

                    <button
                      className="delete-btn"
                      onClick={() => deleteExpense(expense.id)}
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </MainLayout>

  );

}