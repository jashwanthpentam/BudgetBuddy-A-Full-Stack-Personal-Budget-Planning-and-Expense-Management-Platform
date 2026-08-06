import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { getDashboardSummary } from "../services/dashboardService";
import DashboardCard from "../components/Dashboard/DashboardCard";
import ExpensePieChart from "../components/Dashboard/ExpensePieChart";
import IncomeExpenseBarChart from "../components/Dashboard/IncomeExpenseBarChart";
import "../Dashboard.css";
import { useDateContext } from "../context/DateContext";

function Dashboard(){

const [totalBudget, setTotalBudget] = useState(0);
const username = localStorage.getItem("username");
const [totalExpense, setTotalExpense] = useState(0);
const [transactions, setTransactions] = useState([]);
const [totalIncome, setTotalIncome] = useState(0);
const [balance, setBalance] = useState(0);
const [remainingBudget, setRemainingBudget] = useState(0);
const [overspentAmount, setOverspentAmount] = useState(0);
const {
    globalMonth,
    globalYear,
    setGlobalMonth,
    setGlobalYear,
} = useDateContext();
useEffect(() => {

    fetchDashboard();

}, [globalMonth, globalYear]);

const fetchDashboard = async () => {

    try {

        const dashboardRes = await getDashboardSummary(
            globalMonth,
            globalYear
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

        setRemainingBudget(
            dashboardRes.remaining_budget
        );

        setOverspentAmount(
            dashboardRes.overspent_amount
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

<MainLayout title="Dashboard">

<div className="dashboard-header">

    <h2>
        👋 Welcome back, {username}
    </h2>

    <p>
        Here's your financial overview.
    </p>

</div>

<div className="filter-card">

    <select
        value={globalMonth}
        onChange={(e) => setGlobalMonth(Number(e.target.value))}
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
        value={globalYear}
        onChange={(e) => setGlobalYear(Number(e.target.value))}
    />

</div>



<div className="cards">


<DashboardCard icon="💵" title="Income" value={`₹${totalIncome}`} />

<DashboardCard icon="💳" title="Expenses" value={`₹${totalExpense}`} />

<DashboardCard icon="📒" title="Budget" value={`₹${totalBudget}`} />

<DashboardCard icon="💰" title="Balance" value={`₹${balance}`} />


</div>

<div className="dashboard-charts">

<ExpensePieChart transactions={transactions} />

<IncomeExpenseBarChart
totalIncome={totalIncome}
totalExpense={totalExpense}
/>

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

</MainLayout>

)

}


export default Dashboard;
