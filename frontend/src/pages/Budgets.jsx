import { useEffect, useState } from "react";
import API from "../services/api";
import { getDashboardSummary } from "../services/dashboardService";
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
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());


  useEffect(() => {

    fetchBudgets();

    fetchOverallSummary();

  }, [month, year]);

  // -----------------------------
  // Fetch Budgets
  // -----------------------------
  const fetchBudgets = async () => {

    try {

        const res = await API.get("/budgets/");

        setBudgets(res.data);

        // Automatically show first budget summary

    } catch (err) {

        console.log(err);

    }

};

  // -----------------------------
  // Save Budget
  // -----------------------------
  const saveBudget = async () => {

    if (
      !form.category ||
      !form.budget_amount ||
      !form.month ||
      !form.year
    ) {
      alert("Please fill all required fields.");
      return;
    }

    if (Number(form.budget_amount) <= 0) {
      alert("Budget amount must be greater than 0.");
      return;
    }

    try {

      if (editingId) {

        await API.put(
          `/budgets/${editingId}/`,
          form
        );

        alert("Budget Updated Successfully");

        setEditingId(null);

      } else {

        await API.post(
          "/budgets/",
          form
        );

        alert("Budget Added Successfully");

      }

      setForm({
        category: "",
        budget_amount: "",
        month: "",
        year: new Date().getFullYear(),
      });

      fetchBudgets();
      fetchOverallSummary();

    } catch (err) {

      console.log(err);

      if (err.response?.data) {

        alert(
          JSON.stringify(err.response.data)
        );

      } else {

        alert("Operation Failed");

      }

    }

  };

  // -----------------------------
  // Delete Budget
  // -----------------------------
  const deleteBudget = async (id) => {

    if (!window.confirm("Delete this budget?"))
      return;

    try {

      await API.delete(`/budgets/${id}/`);

      fetchBudgets();
      fetchOverallSummary();

      alert("Budget Deleted Successfully");

    } catch (err) {

      console.log(err);

      alert("Delete Failed");

    }

  };

  // -----------------------------
  // Edit Budget
  // -----------------------------
  const editBudget = (budget) => {

    setEditingId(budget.id);

    setForm({

      category: budget.category,

      budget_amount: budget.budget_amount,

      month: budget.month,

      year: budget.year,

    });

  };

  // -----------------------------
  // Budget Summary
  // -----------------------------
  const fetchSummary = async (id) => {

    try {

      const res = await API.get(
        `/budgets/${id}/summary/`
      );

      setSummary(res.data);

    } catch (err) {

      console.log(err);

    }

};

  const fetchOverallSummary = async () => {

    try {

        const summary = await getDashboardSummary(
            month,
            year
        );

        setSummary({

            budget_amount: summary.total_budget,
            total_expense: summary.total_expense,
            remaining_budget: summary.remaining_budget,
            overspent_amount: summary.overspent_amount,

        });

    }

    catch (err) {

        console.log(err);

    }

};

return (

<div className="content">

<h1 className="page-title">
    Budget Planning
</h1>

{/* Summary Cards */}

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

<div className="stats">

    <div className="stat-card">
        <p>Budget Amount</p>
        <h2>₹ {summary.budget_amount}</h2>
    </div>

    <div className="stat-card">
        <p>Total Expense</p>
        <h2>₹ {summary.total_expense}</h2>
    </div>

    <div className="stat-card">
        <p>Remaining</p>
        <h2>₹ {summary.remaining_budget}</h2>
    </div>

    <div className="stat-card">
        <p>Overspent</p>
        <h2>₹ {summary.overspent_amount}</h2>
    </div>

</div>

{/* Budget Form */}

<div className="form-card">

<h2>
    {editingId ? "Update Budget" : "Add Budget"}
</h2>

<div className="form-grid">

<input
type="number"
placeholder="Budget Amount"
value={form.budget_amount}
onChange={(e)=>
setForm({
...form,
budget_amount:e.target.value
})
}
/>

<select
value={form.category}
onChange={(e)=>
setForm({
...form,
category:e.target.value
})
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

<option value="MISCELLANEOUS">
Miscellaneous
</option>

</select>

<select
value={form.month}
onChange={(e)=>
setForm({
...form,
month:e.target.value
})
}
>

<option value="">Month</option>

{Array.from({length:12},(_,i)=>(

<option
key={i+1}
value={i+1}
>

{i+1}

</option>

))}

</select>

<input
type="number"
placeholder="Year"
value={form.year}
onChange={(e)=>
setForm({
...form,
year:e.target.value
})
}
/>

</div>

<button
className="add-btn"
onClick={saveBudget}
>

{editingId ? "Update Budget" : "Add Budget"}

</button>

</div>

{/* Budget Table */}

<div className="table-card">

<h2>Budget List</h2>

<table>

<thead>

<tr>

<th>Category</th>

<th>Budget</th>

<th>Month</th>

<th>Year</th>

<th>Summary</th>

<th>Edit</th>

<th>Delete</th>

</tr>

</thead>

<tbody>

{budgets.length===0 ? (

<tr>

<td colSpan="7">

No Budgets Found

</td>

</tr>

):(budgets.map((budget)=>(

<tr key={budget.id}>

<td>{budget.category}</td>

<td>
₹ {budget.budget_amount}
</td>

<td>{budget.month}</td>

<td>{budget.year}</td>

<td>

<button
className="edit-btn"
onClick={()=>
fetchSummary(budget.id)
}
>

View

</button>

</td>

<td>

<button
className="edit-btn"
onClick={()=>
editBudget(budget)
}
>

Edit

</button>

</td>

<td>

<button
className="delete-btn"
onClick={()=>
deleteBudget(budget.id)
}
>

Delete

</button>

</td>

</tr>

)))}

</tbody>

</table>

</div>

</div>

);

}