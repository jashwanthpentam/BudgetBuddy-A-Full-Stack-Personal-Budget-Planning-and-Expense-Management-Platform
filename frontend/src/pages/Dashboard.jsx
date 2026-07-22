import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDashboardSummary } from "../services/dashboardService";
function Dashboard(){

const [totalBudget, setTotalBudget] = useState(0);
const username = localStorage.getItem("username");
const [totalExpense, setTotalExpense] = useState(0);
const [transactions, setTransactions] = useState([]);
const [totalIncome, setTotalIncome] = useState(0);
const [balance, setBalance] = useState(0);
const [month, setMonth] = useState(new Date().getMonth() + 1);
const [year, setYear] = useState(new Date().getFullYear());
useEffect(() => {

    fetchDashboard();

}, [month, year]);

const fetchDashboard = async () => {

    try {

        const dashboardRes = await getDashboardSummary(
            month,
            year
        );

        setTotalIncome(
            dashboardRes.total_income
        );

        setTotalExpense(
            dashboardRes.total_expense
        );

        setTotalBudget(
            dashboardRes.total_budget
        );

        setBalance(
            dashboardRes.current_balance
        );

        setTransactions(
            dashboardRes.recent_transactions
        );

    }

    catch(error){

        console.log(error);

    }

};


return(

<div className="dashboard">


<div className="sidebar">

<h2>💰 BudgetBuddy</h2>


<Link to="/dashboard">📊 Dashboard</Link>

<Link to="/income">💵 Income</Link>

<Link to="/expenses">💳 Expenses</Link>

<Link to="/budgets">📒 Budgets</Link>

<Link to="/savings">🏦 Savings</Link>

<Link to="/reports">📈 Reports</Link>

<Link to="/notifications">🔔 Notifications</Link>

<Link to="/settings">⚙️ Settings</Link>

<button

onClick={()=>{

localStorage.clear();

window.location.href="/";

}}

>

Logout

</button>


</div>

<div className="content">


<h1>
Welcome Back {username} 👋
</h1>


<p>
Manage your money smarter with BudgetBuddy
</p>

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



<div className="cards">


<div className="card">

<h2>💵 Income</h2>

<h1>₹{totalIncome}</h1>

</div>



<div className="card">

<h2>💳 Expenses</h2>

<h1>₹{totalExpense}</h1>

</div>


<div className="card">

    <h2>📒 Budget</h2>

    <h1>₹{totalBudget}</h1>

</div>


<div className="card">

<h2>💰 Balance</h2>

<h1>₹{balance}</h1>

</div>


</div>

<div
className="table-card"
style={{marginTop:"35px"}}
>

<h2>

🕒 Recent Transactions

</h2>

<table>

<thead>

<tr>

<th>Date</th>

<th>Type</th>

<th>Category</th>

<th>Amount</th>

</tr>

</thead>

<tbody>

{
transactions
.slice(0,5)
.map((transaction, index)=>(

<tr key={index}>

    <td>{transaction.date}</td>

    <td>{transaction.type}</td>

    <td>{transaction.category}</td>

    <td>₹{transaction.amount}</td>

</tr>

))
}

</tbody>

</table>

</div>

</div>



</div>

)

}


export default Dashboard;