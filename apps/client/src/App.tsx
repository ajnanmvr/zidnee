import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "@/lib/query-client";
import { SessionProvider } from "@/lib/session";
import { router } from "@/router";

const App = () => {
	return (
		<SessionProvider>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
				<Toaster position="top-right" />
			</QueryClientProvider>
		</SessionProvider>
	);
};

export default App;
