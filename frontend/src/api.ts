import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://backend.riturajdey01.workers.dev";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error response is 401, not already retried, and not the signin/signup/refresh endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url &&
      !originalRequest.url.includes("/api/v1/signin") &&
      !originalRequest.url.includes("/api/v1/signup") &&
      !originalRequest.url.includes("/api/v1/refresh") &&
      !originalRequest.url.includes("/api/v1/verify-otp")
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${API_BASE}/api/v1/refresh`,
          {},
          { withCredentials: true },
        );
        const newToken = res.data.token;
        localStorage.setItem("token", newToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("token");
        // Redirect to signin
        window.location.href = "/signin";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (
      error.response?.status === 403 &&
      (error.response?.data?.message?.toLowerCase().includes("suspended") ||
        error.response?.data?.message?.toLowerCase().includes("ban"))
    ) {
      localStorage.removeItem("token");
      if (window.location.pathname === "/signin") {
        return Promise.reject(error);
      } else {
        window.location.href = "/signin?error=suspended";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
