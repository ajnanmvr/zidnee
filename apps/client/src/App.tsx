import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "@/lib/query-client.js";
import { SessionProvider } from "@/lib/session.js";
import { router } from "@/router.js";

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
