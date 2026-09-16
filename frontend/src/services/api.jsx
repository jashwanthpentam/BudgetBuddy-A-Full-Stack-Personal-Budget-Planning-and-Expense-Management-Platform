import axios from "axios";

const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

const API = axios.create({
    baseURL: API_BASE,
});

let refreshPromise = null;

const PUBLIC_ROUTES = [
    "/users/register/",
    "/token/",
    "/token/refresh/",
    "/users/password-reset/request/",
    "/users/password-reset/confirm/",
    "/users/password-reset/request-otp/",
    "/users/password-reset/verify-otp/",
    "/users/password-reset/confirm-otp/",
];

const isPublicRequest = (url = "") => {
    const path = String(url).split("?")[0];
    return PUBLIC_ROUTES.some((route) => path.endsWith(route));
};

const expireSession = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");

    if (window.location.pathname !== "/") {
        window.location.assign("/?session=expired");
    }
};

API.interceptors.request.use(
    (config) => {
        if (!isPublicRequest(config.url)) {
            const access = localStorage.getItem("access");
            if (access) {
                config.headers.Authorization = `Bearer ${access}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error),
);

API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error?.config;

        if (
            error?.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            isPublicRequest(originalRequest.url)
        ) {
            return Promise.reject(error);
        }

        const refresh = localStorage.getItem("refresh");

        if (!refresh) {
            expireSession();
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            if (!refreshPromise) {
                refreshPromise = axios
                    .post(`${API_BASE}/token/refresh/`, { refresh })
                    .then((response) => {
                        localStorage.setItem("access", response.data.access);
                        return response.data.access;
                    })
                    .finally(() => {
                        refreshPromise = null;
                    });
            }

            const access = await refreshPromise;
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${access}`;

            return API(originalRequest);
        } catch (refreshError) {
            expireSession();
            return Promise.reject(refreshError);
        }
    },
);

export default API;
