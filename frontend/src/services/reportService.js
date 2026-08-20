import API from "./api";

export const generateReport = async ({ startDate, endDate }) => {

    const response = await API.get(
        `/reports/generate/?start_date=${startDate}&end_date=${endDate}`
    );

    return response.data;
};

export const downloadJSONReport = async ({ startDate, endDate }) => {

    return await API.get(
        `/reports/export/json/?start_date=${startDate}&end_date=${endDate}`,
        {
            responseType: "blob",
        }
    );
};

export const downloadPDFReport = async ({ startDate, endDate }) => {

    return await API.get(
        `/reports/export/pdf/?start_date=${startDate}&end_date=${endDate}`,
        {
            responseType: "blob",
        }
    );
};
export const downloadExcelReport = async ({ startDate, endDate }) => {

    return await API.get(
        `/reports/export/excel/?start_date=${startDate}&end_date=${endDate}`,
        {
            responseType: "blob",
        }
    );
};
