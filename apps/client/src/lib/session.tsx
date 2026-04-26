import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";

const storageKey = "zidnee.authToken";

type SessionContextValue = {
	token: string;
	setToken: (token: string) => void;
	clearToken: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const readStoredToken = (): string => {
	if (typeof window === "undefined") {
		return "";
	}

	return window.localStorage.getItem(storageKey) ?? "";
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
	const [token, setTokenState] = useState(readStoredToken);

	const value = useMemo<SessionContextValue>(
		() => ({
			token,
			setToken: (nextToken: string) => {
				window.localStorage.setItem(storageKey, nextToken);
				setTokenState(nextToken);
			},
			clearToken: () => {
				window.localStorage.removeItem(storageKey);
				setTokenState("");
			},
		}),
		[token],
	);

	return (
		<SessionContext.Provider value={value}>{children}</SessionContext.Provider>
	);
};

export const useSession = (): SessionContextValue => {
	const context = useContext(SessionContext);
	if (!context) {
		throw new Error("useSession must be used inside SessionProvider");
	}

	return context;
};
