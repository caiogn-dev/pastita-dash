import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const getToken = () => (typeof window !== "undefined" ? sessionStorage.getItem("pastita_dash_token") : null);

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default api;
