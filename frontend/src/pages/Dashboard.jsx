import { Link } from "react-router-dom";


function Dashboard(){


const username = localStorage.getItem("username");


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

<h1>₹0</h1>

</div>



<div className="card">

<h2>🏦 Savings</h2>

<h1>₹0</h1>

</div>


</div>



</div>



</div>

)

}


export default Dashboard;