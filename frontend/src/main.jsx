import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App.jsx";

import { DateProvider } from "./context/DateContext.jsx";

/*
 * ============================================================
 * GLOBAL THEME INITIALIZATION
 * ============================================================
 *
 * Apply the saved theme BEFORE React renders.
 *
 * This prevents the application from starting with one theme
 * and then switching when Settings.jsx loads.
 *
 * Default = dark because BudgetBuddy's main UI is dark.
 */
const savedTheme = localStorage.getItem("theme");

const initialTheme =
    savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : "dark";

document.documentElement.setAttribute(
    "data-theme",
    initialTheme
);

document.body.setAttribute(
    "data-theme",
    initialTheme
);

createRoot(document.getElementById("root")).render(
    <DateProvider>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </DateProvider>
);