import { useEffect, useState } from "react";
import API from "../services/api";
import { getDashboardSummary } from "../services/dashboardService";
export default function Income() {

  const [incomes, setIncomes] = useState([]);
  const [form, setForm] = useState({
    amount: "",
    source: "",
    description: "",
    income_date: "",
  });

  const [totalIncome, setTotalIncome] = useState(0);

  const [editingId, setEditingId] = useState(null);

  const [sourceFilter, setSourceFilter] = useState("");

  const [sortBy, setSortBy] = useState("latest");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {

    fetchIncome();

    fetchTotalIncome();

  }, [sourceFilter, sortBy, month, year]);

  const fetchIncome = async () => {

    try {

      let url = "/income/?";

      if (sourceFilter) {
        url += `source=${sourceFilter}&`;
      }

      if (sortBy) {
        url += `sort=${sortBy}`;
      }

      const res = await API.get(url);

      setIncomes(res.data);

    }

    catch (err) {

      console.log(err);

    }

  };

  const fetchTotalIncome = async () => {

    try {

        const summary = await getDashboardSummary(
            month,
            year
        );

        setTotalIncome(
            summary.total_income
        );

    }

    catch (err) {

        console.log(err);

    }

  };

  const saveIncome = async () => {
    try
    {
        if(
            !form.amount ||
            !form.source ||
            !form.income_date
        ) {
            alert("Fill all required fields");
        
        return;

        }

        if (Number(form.amount) <= 0) {
          alert("Amount must be greater than 0.");
          return;
        }


        if(editingId) {
            await API.put(
                `/income/${editingId}/`,
                form
            );
            alert("Income Updated Successfully");
            setEditingId(null);
        }

        else{
            await API.post(
                "/income/",
                form
            );

        alert("Income Added Successfully");

        }

        setForm({
            amount: "",
            source: "",
            description: "",
            income_date: "",
        });

        fetchIncome();
        fetchTotalIncome();

    }

    catch(err) {
        console.log(err);
        alert("Operation Failed");
    }
  
};


const deleteIncome = async (id) => {

    if(!window.confirm("Delete this income"))
        return;

    try {
        await API.delete(`/income/${id}/`);

        fetchIncome();

        fetchTotalIncome();

        alert("Income Deleted Successfully");
    }

    catch (err) {

    console.log(err);

  }
};


const editIncome = (income) => {

  setEditingId(income.id);

  setForm({

    amount: income.amount,

    source: income.source,

    description: income.description,

    income_date: income.income_date,

  });

};

return (

  <div className="content">

    <h1 className="page-title">
      Income Management
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
        <p>Total Income</p>
        <h2>₹ {totalIncome}</h2>
      </div>

      <div className="stat-card">
        <p>Total Transactions</p>
        <h2>{incomes.length}</h2>
      </div>

    </div>

    {/* Add Income Form */}

    <div className="form-card">

      <h2>
        {editingId ? "Update Income" : "Add New Income"}
      </h2>

      <div className="form-grid">

        <input
          type="number"
          placeholder="Amount"
          min="1"
          step="0.01"
          value={form.amount}
          onChange={(e)=>
            setForm({
              ...form,
              amount:e.target.value
            })
          }
        />

        <select
          value={form.source}
          onChange={(e)=>
            setForm({
              ...form,
              source:e.target.value
            })
          }
        >

          <option value="">Select Source</option>
          <option value="SALARY">Salary</option>
          <option value="POCKET_MONEY">Pocket Money</option>
          <option value="SCHOLARSHIP">Scholarship</option>
          <option value="FREELANCING">Freelancing</option>
          <option value="BUSINESS">Business</option>
          <option value="OTHER">Other</option>

        </select>

        <input
          placeholder="Description"
          value={form.description}
          onChange={(e)=>
            setForm({
              ...form,
              description:e.target.value
            })
          }
        />

        <input
          type="date"
          value={form.income_date}
          onChange={(e)=>
            setForm({
              ...form,
              income_date:e.target.value
            })
          }
        />

      </div>

      <button
        className="add-btn"
        onClick={saveIncome}
      >
        {editingId ? "Update Income" : "Add Income"}
      </button>

    </div>

    {/* Filter & Sort */}

    <div
      style={{
        display:"flex",
        gap:"20px",
        marginBottom:"20px"
      }}
    >

      <select
        value={sourceFilter}
        onChange={(e)=>
          setSourceFilter(e.target.value)
        }
      >

        <option value="">
          All Sources
        </option>

        <option value="SALARY">Salary</option>

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
        onChange={(e)=>
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

    {/* Income Table */}

    <div className="table-card">

      <h2>Income List</h2>

      <table>

        <thead>

          <tr>

            <th>Date</th>

            <th>Amount</th>

            <th>Source</th>

            <th>Description</th>

            <th>Edit</th>

            <th>Delete</th>

          </tr>

        </thead>

        <tbody>

          {incomes.length===0 ? (

            <tr>

              <td colSpan="6">
                No Income Found
              </td>

            </tr>

          ) : (

            incomes.map((income)=>(

              <tr key={income.id}>

                <td>{income.income_date}</td>

                <td>₹ {income.amount}</td>

                <td>{income.source}</td>

                <td>{income.description}</td>

                <td>

                  <button
                    className="edit-btn"
                    onClick={()=>
                      editIncome(income)
                    }
                  >

                    Edit

                  </button>

                </td>

                <td>

                  <button
                    className="delete-btn"
                    onClick={()=>
                      deleteIncome(income.id)
                    }
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

  </div>

);

}