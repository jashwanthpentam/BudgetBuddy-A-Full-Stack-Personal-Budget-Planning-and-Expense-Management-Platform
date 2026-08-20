import API from "./api";

export const getAnalytics = async (month, year) => {

    const response = await API.get(
        `/dashboard/analytics/?month=${month}&year=${year}`
    );

    return response.data;
};