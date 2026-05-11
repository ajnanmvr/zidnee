import { create } from "zustand";
import { persist } from "zustand/middleware";

const storageKey = "zidnee.authToken";

/**
 * Session state managed by Zustand
 * Replaces previous React Context implementation for better performance and simplicity
 *
 * Persists auth token to localStorage automatically via middleware
 */
interface SessionState {
	/** JWT authentication token */
	token: string;
	/** Set the authentication token (persisted to localStorage) */
	setToken: (token: string) => void;
	/** Clear the authentication token (removed from localStorage) */
	clearToken: () => void;
}

/**
 * Zustand store for session/authentication state
 *
 * Usage:
 * ```tsx
 * const { token, setToken, clearToken } = useSessionStore();
 * ```
 *
 * Automatically persists to localStorage under key "zidnee.authToken"
 */
export const useSessionStore = create<SessionState>()(
	persist(
		(set) => ({
			token: "",
			setToken: (token: string) => set({ token }),
			clearToken: () => set({ token: "" }),
		}),
		{
			name: storageKey,
		},
	),
);
