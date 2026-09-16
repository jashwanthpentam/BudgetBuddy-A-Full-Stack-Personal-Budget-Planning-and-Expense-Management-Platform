import API from "./api";

export const getAnalytics = async (
    month,
    year,
    options = {},
) => {
    const period = options.period || "month";
    const params = { period };

    if (period === "month") {
        params.month = Number(month);
        params.year = Number(year);
    } else if (period === "custom") {
        if (!options.startDate || !options.endDate) {
            throw new Error("Custom period requires both start and end dates.");
        }
        params.start_date = options.startDate;
        params.end_date = options.endDate;
    } else if (period !== "lifetime") {
        throw new Error("Invalid analytics period.");
    }

    const response = await API.get("/dashboard/analytics/", { params });
    return response.data;
};
