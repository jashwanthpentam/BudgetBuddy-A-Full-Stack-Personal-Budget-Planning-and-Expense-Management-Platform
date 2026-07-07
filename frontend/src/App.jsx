import {BrowserRouter,Routes,Route} from "react-router-dom";


import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Income from "./pages/Income";
import Savings from "./pages/Savings";
import Notifications from "./pages/Notifications";
import Budgets from "./pages/Budgets";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";


function App(){


return(

<BrowserRouter>

<Routes>

<Route path="/" element={<Login/>}/>

<Route path="/register" element={<Register/>}/>

<Route path="/home" element={<Home/>}/>

<Route path="/dashboard" element={<Dashboard/>}/>

<Route path="/expenses" element={<Expenses/>}/>

<Route path="/income" element={<Income/>}/>

<Route path="/savings" element={<Savings/>}/>

<Route path="/notifications" element={<Notifications/>}/>

<Route path="/budgets" element={<Budgets/>}/>

<Route path="/reports" element={<Reports/>}/>

<Route path="/settings" element={<Settings/>}/>


</Routes>


</BrowserRouter>

)

}


export default App;