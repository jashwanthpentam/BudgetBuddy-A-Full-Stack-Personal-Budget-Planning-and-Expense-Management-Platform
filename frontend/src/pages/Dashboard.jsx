import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";

function Dashboard(){


const username = localStorage.getItem("username");
const [totalExpense, setTotalExpense] = useState(0);
const [expenses, setExpenses] = useState([]);


useEffect(() => {

    fetchDashboard();

}, []);

const fetchDashboard = async () => {

    try {

        const totalRes = await API.get("/expenses/total/");

        setTotalExpense(
            totalRes.data.total_expense
        );

        const expenseRes = await API.get("/expenses/");

        setExpenses(expenseRes.data);

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
Welcome {username} 👋
</h1>


<p>
Manage your money smarter with BudgetBuddy
</p>



<div className="cards">


<div className="card">

<h2>💵 Income</h2>

<h1>₹0</h1>

</div>



<div className="card">

<h2>💳 Expenses</h2>

<h1>₹{totalExpense}</h1>

</div>



<div className="card">

<h2>🏦 Savings</h2>

<h1>₹0</h1>

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

<th>Title</th>

<th>Category</th>

<th>Amount</th>

<th>Date</th>

</tr>

</thead>

<tbody>

{
expenses
.slice(0,5)
.map((expense)=>(

<tr key={expense.id}>

<td>{expense.title}</td>

<td>{expense.category}</td>

<td>

₹{expense.amount}

</td>

<td>

{expense.expense_date}

</td>

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