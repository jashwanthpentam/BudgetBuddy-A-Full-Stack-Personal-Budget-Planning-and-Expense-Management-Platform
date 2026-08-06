import API from "./api";

// Summary Cards
export const getSavingsSummary = async () => {

    const response = await API.get("/savings/summary/");

    return response.data;
};

// Goal List
export const getSavingsGoals = async () => {

    const response = await API.get("/savings/");

    return response.data;
};

// Create Goal
export const createSavingsGoal = async (goalData) => {

    const response = await API.post(
        "/savings/",
        goalData
    );

    return response.data;
};

// Update Goal
export const updateSavingsGoal = async (
    id,
    goalData
) => {

    const response = await API.put(
        `/savings/${id}/`,
        goalData
    );

    return response.data;
};

// Delete Goal
export const deleteSavingsGoal = async (id) => {

    await API.delete(
        `/savings/${id}/`
    );
};