import axios from "axios";

const apiBaseURL = (import.meta.env.VITE_API_BASE_URL || "").trim();

export const http = axios.create({
  baseURL: apiBaseURL || undefined,
});
