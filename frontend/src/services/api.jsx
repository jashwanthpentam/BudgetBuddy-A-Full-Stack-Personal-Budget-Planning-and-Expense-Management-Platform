import axios from "axios";

const API = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

API.interceptors.request.use(
    (config) => {
        const publicRoutes = [
            "/users/register/",
            "/token/",
            "/token/refresh/",
        ];

        const isPublic = publicRoutes.some((route) =>
            config.url?.endsWith(route)
        );

        if (!isPublic) {
            // IMPORTANT:
            // Existing application stores JWT under "access"
            const token = localStorage.getItem("access");

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default API;