import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "@/lib/query-client";
import { SessionProvider } from "@/lib/session";
import { router } from "@/router";

const App = () => {
	return (
		<SessionProvider>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</SessionProvider>
	);
};

export default App;
