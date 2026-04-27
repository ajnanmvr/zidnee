import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/session";

export const RequireAuth = () => {
	const { token } = useSession();

	if (!token) {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
};
