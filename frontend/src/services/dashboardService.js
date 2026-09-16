import API from "./api";

export const getDashboardSummary = async (
    month,
    year,
    options = {},
) => {
    const params = {
        period: options.period || "month",
    };

    if (params.period === "month") {
        params.month = month;
        params.year = year;
    }

    if (params.period === "custom") {
        params.start_date = options.startDate;
        params.end_date = options.endDate;
    }

    const response = await API.get("/dashboard/summary/", { params });
    return response.data;
};
