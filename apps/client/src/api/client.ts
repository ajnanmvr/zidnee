import axios from "axios";


export const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";

export const api = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});
