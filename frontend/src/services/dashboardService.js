import API from "./api";

export const getDashboardSummary = async (month, year) => {

    const res = await API.get(
        `/dashboard/summary/?month=${month}&year=${year}`
    );

    return res.data;

};