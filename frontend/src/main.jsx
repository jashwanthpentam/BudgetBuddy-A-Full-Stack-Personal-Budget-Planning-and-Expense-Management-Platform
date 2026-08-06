import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App.jsx";

import { DateProvider } from "./context/DateContext.jsx";

createRoot(document.getElementById("root")).render(
    <DateProvider>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </DateProvider>
);