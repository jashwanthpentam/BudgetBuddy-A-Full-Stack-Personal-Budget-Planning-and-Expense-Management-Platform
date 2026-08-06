import "./App.css";
import ProtectedRoute from "./components/ProtectedRoute";
import { Routes, Route } from "react-router-dom";

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


<Routes>

<Route path="/" element={<Login/>}/>

<Route path="/register" element={<Register/>}/>

<Route path="/home" element={<Home/>}/>

<Route
    path="/dashboard"
    element={
        <ProtectedRoute>
            <Dashboard />
        </ProtectedRoute>
    }
/>
<Route
    path="/income"
    element={
        <ProtectedRoute>
            <Income />
        </ProtectedRoute>
    }
/>

<Route
    path="/expenses"
    element={
        <ProtectedRoute>
            <Expenses />
        </ProtectedRoute>
    }
/>

<Route
    path="/savings"
    element={
        <ProtectedRoute>
            <Savings />
        </ProtectedRoute>
    }
/>

<Route
    path="/notifications"
    element={
        <ProtectedRoute>
            <Notifications />
        </ProtectedRoute>
    }
/>

<Route
    path="/budgets"
    element={
        <ProtectedRoute>
            <Budgets />
        </ProtectedRoute>
    }
/>

<Route
    path="/reports"
    element={
        <ProtectedRoute>
            <Reports />
        </ProtectedRoute>
    }
/>

<Route
    path="/settings"
    element={
        <ProtectedRoute>
            <Settings />
        </ProtectedRoute>
    }
/>


</Routes>



)

}


export default App;