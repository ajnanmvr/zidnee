import type { ReactNode } from "react";

// Zustand-based session store (replaces React Context)
export { useSessionStore as useSession } from "./stores/session.store.js";

// SessionProvider is now a no-op wrapper for backward compatibility
// Zustand doesn't require a context provider for state management
export const SessionProvider = ({ children }: { children: ReactNode }) => {
	return children;
};
