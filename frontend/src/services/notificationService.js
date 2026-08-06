import API from "./api";

export const getNotifications = async () => {

    const response = await API.get(
        "/notifications/"
    );

    return response.data;

};

export const markAsRead = async (id) => {

    const response = await API.put(
        `/notifications/${id}/read/`
    );

    return response.data;

};

export const deleteNotification = async (id) => {

    const response = await API.delete(
        `/notifications/${id}/`
    );

    return response.data;

};