import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { DashboardHeader, Modal, Sidebar } from "@/components/dashboard-ui";
import { HiArrowRightOnRectangle } from "react-icons/hi2";
import { useSession } from "@/lib/session";
import { useNavigationItems } from "./useNavigationItems";

const titles: Record<string, string> = {
	"/": "Overview",
	"/leads": "Leads",
	"/students": "Students",
	"/students/break": "On Break",
	"/students/posters": "Welcome Posters",
	"/students/dropped": "Dropped Students",
	"/processes": "Processes",
	"/process-history": "Process History",
	"/mentors": "Mentors",
	"/counsellors": "Counsellors",
	"/admins": "Admins",
	"/counsellor/mentors": "Counsellor Mentors",
	"/time-slots": "Time Slots",
	"/users/create": "Create User",
	"/roles": "Role Permissions",
	"/roles/create": "Create Role",
	"/me": "Me",
	"/demo-management/unassigned": "Unassigned Demos",
	"/demo-management/scheduled": "Scheduled Demos",
	"/demo-management/completed": "Completed Demos",
	"/reminders": "Reminders",
	"/reminders/closed": "Closed Tasks",
	"/leads/closed": "Deleted Leads",
};

const resolveTitle = (pathname: string, search: string): string => {
	if (pathname === "/students") {
		const params = new URLSearchParams(search);
		const studentType = params.get("type");
		if (studentType === "group") {
			return "Group Students";
		}
		if (studentType === "individual") {
			return "Individual Students";
		}
	}

	if (/^\/users\/[^/]+\/edit$/.test(pathname)) {
		return "Edit User";
	}

	if (/^\/time-slots$/.test(pathname)) {
		return "Time Slots";
	}

	if (/^\/counsellor\/mentors$/.test(pathname)) {
		return "Counsellor Mentors";
	}

	if (pathname === "/users/create" && search.includes("role=sales")) {
		return "Create Sales";
	}

	if (/^\/roles\/[^/]+\/edit$/.test(pathname)) {
		return "Edit Role";
	}

	if (pathname === "/sales-users") {
		return "Sales Users";
	}

	return titles[pathname] ?? "Overview";
};

export const DashboardLayout = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { clearToken } = useSession();
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
	const { error, navItems, meName, roleLabel } = useNavigationItems();

	const visitedKeysRef = useRef(new Set<string>());
	const [canGoBack, setCanGoBack] = useState(false);

	useEffect(() => {
		visitedKeysRef.current.add(location.key);
		if (visitedKeysRef.current.size > 1) {
			setCanGoBack(true);
		}
	}, [location.key]);

	useEffect(() => {
		if (error instanceof ApiError && error.status === 401) {
			clearToken();
			navigate("/login", { replace: true });
		}
	}, [clearToken, error, navigate]);

	const title = resolveTitle(location.pathname, location.search);
	const currentLocation = `${location.pathname}${location.search}`;

	return (
		<>
			<main className="h-screen overflow-hidden bg-gray-50 text-gray-900">
				<div className="grid h-full lg:grid-cols-[auto_minmax(0,1fr)]">
					<Sidebar
						items={navItems}
						open={sidebarOpen}
						onToggle={() => setSidebarOpen((current) => !current)}
						onLogout={() => setLogoutConfirmOpen(true)}
						currentLocation={currentLocation}
					/>

					<section className="min-w-0 bg-gray-50 h-screen overflow-hidden flex flex-col">
						<DashboardHeader
							title={title}
							breadcrumbs={["Dashboard", title]}
							userName={meName}
							userLabel={roleLabel}
							onToggleSidebar={() => setSidebarOpen((current) => !current)}
							onBack={canGoBack ? () => navigate(-1) : undefined}
						/>

						<div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
							{error ? (
								<div className="mb-5 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
									{error instanceof Error
										? error.message
										: "Unable to load session"}
								</div>
							) : null}
							<Outlet />
						</div>
					</section>
				</div>
			</main>

			<Modal
				open={logoutConfirmOpen}
				title="Log out"
				description="You'll need to sign in again to access your dashboard."
				onClose={() => setLogoutConfirmOpen(false)}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => setLogoutConfirmOpen(false)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
							onClick={() => {
								setLogoutConfirmOpen(false);
								clearToken();
							}}
						>
							<HiArrowRightOnRectangle className="h-4 w-4" aria-hidden="true" />
							Log out
						</button>
					</>
				}
			>
				<p className="text-sm text-gray-600">Are you sure you want to log out?</p>
			</Modal>
		</>
	);
};
