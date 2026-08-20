import API from "./api";

export const getSavingsSummary = async () => {
    const response = await API.get("/savings/summary/");
    return response.data;
};

export const getSavingsGoals = async () => {
    const response = await API.get("/savings/");
    const data = response.data;
    return Array.isArray(data) ? data : (data?.results || []);
};

export const createSavingsGoal = async (goalData) => {
    const response = await API.post("/savings/", goalData);
    return response.data;
};

export const updateSavingsGoal = async (id, goalData) => {
    const response = await API.put(`/savings/${id}/`, goalData);
    return response.data;
};

export const deleteSavingsGoal = async (id) => {
    await API.delete(`/savings/${id}/`);
};
