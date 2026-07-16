import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";

function Dashboard(){


const username = localStorage.getItem("username");
const [totalExpense, setTotalExpense] = useState(0);
const [expenses, setExpenses] = useState([]);
const [totalIncome, setTotalIncome] = useState(0);
const [balance, setBalance] = useState(0);

useEffect(() => {

    fetchDashboard();

}, []);

const fetchDashboard = async () => {

    try {

        const summaryRes = await API.get(
            "/income/summary/"
        );

        setTotalIncome(
            summaryRes.data.total_income
        );

        setTotalExpense(
            summaryRes.data.total_expense
        );

        setBalance(
            summaryRes.data.current_balance
        );

        const expenseRes = await API.get(
            "/expenses/"
        );

        setExpenses(
            expenseRes.data
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

<h2>💰 Balance</h2>

<h1>₹{balance}</h1>

</div>


</div>

<div
className="table-card"
style={{marginTop:"35px"}}
>

<h2>

🕒 Recent Expenses

</h2>

<table>

<thead>

<tr>

<th>Date</th>

<th>Amount</th>

<th>Category</th>

<th>Description</th>

</tr>

</thead>

<tbody>

{
expenses
.slice(0,5)
.map((expense)=>(

<tr key={expense.id}>

<td>{expense.expense_date}</td>

<td>₹{expense.amount}</td>

<td>{expense.category}</td>

<td>{expense.description}</td>

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