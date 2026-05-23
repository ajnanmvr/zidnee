import { Link } from "react-router-dom";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useSession } from "@/lib/session";

export const OverviewPage = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const activeName = meQuery.data?.name ?? "User";
	const activeRole = meQuery.data?.roles[0]?.name ?? "Workspace member";
	const permissions = meQuery.data?.permissions ?? [];

	const hasPermission = (key: string): boolean =>
		permissions.some((permission) => permission.key === key);

	const availablePages = [
		{ to: "/leads", label: "Leads", description: "Follow-up pipeline" },
		{
			to: "/students",
			label: "Students",
			description: "Enrolled learners",
		},
		{
			to: "/processes",
			label: "Processes",
			description: "Student workflows",
		},
		{
			to: "/time-slots",
			label: "Time Slots",
			description: "Class timing",
		},
		{ to: "/users", label: "Users", description: "User accounts" },
		{ to: "/roles", label: "Roles", description: "Permissions and roles" },
		{
			to: "/demo-management/unassigned",
			label: "Unassigned Demos",
			description: "Pending demo work",
		},
		{
			to: "/demo-management/scheduled",
			label: "Scheduled Demos",
			description: "Assigned demo work",
		},
		{ to: "/me", label: "My Profile", description: "Account details" },
	].filter((page) => {
		if (page.to === "/leads") {
			return hasPermission("LEAD_READ_MY") || hasPermission("LEAD_READ_ALL");
		}

		if (page.to === "/students") {
			return hasPermission("STUDENT_READ");
		}

		if (page.to === "/processes") {
			return hasPermission("STUDENT_READ");
		}

		if (page.to === "/time-slots") {
			return hasPermission("TIMESLOT_CREATE");
		}

		if (page.to === "/users") {
			return hasPermission("USER_READ");
		}

		if (page.to === "/roles") {
			return hasPermission("ROLE_READ");
		}

		if (page.to === "/demo-management/unassigned") {
			return (
				hasPermission("DEMO_UNASSIGNED_READ_MY") ||
				hasPermission("DEMO_UNASSIGNED_READ_ALL")
			);
		}

		if (page.to === "/demo-management/scheduled") {
			return (
				hasPermission("DEMO_SCHEDULED_READ_MY") ||
				hasPermission("DEMO_SCHEDULED_READ_ALL")
			);
		}

		return true;
	});

	return (
		<div className="grid gap-6">
			<section className="rounded-4xl border border-gray-300 bg-white p-6 shadow-sm">
				<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-600">
					Available pages
				</p>
				<h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
					{activeName}
				</h1>
				<p className="mt-2 text-sm leading-6 text-gray-600">{activeRole}</p>
			</section>

			<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{availablePages.map((page) => (
					<Link
						key={page.to}
						to={page.to}
						className="rounded-3xl border border-gray-300 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
					>
						<p className="text-base font-semibold text-gray-900">
							{page.label}
						</p>
						<p className="mt-1 text-sm leading-6 text-gray-600">
							{page.description}
						</p>
					</Link>
				))}
			</section>
		</div>
	);
};
