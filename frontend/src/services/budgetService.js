import API from "./api";

export const getBudgets = () => API.get("/budgets/");

export const createBudget = (data) =>
    API.post("/budgets/", data);

export const updateBudget = (id, data) =>
    API.put(`/budgets/${id}/`, data);

export const deleteBudget = (id) =>
    API.delete(`/budgets/${id}/`);

export const getBudgetSummary = (id) =>
    API.get(`/budgets/${id}/summary/`);