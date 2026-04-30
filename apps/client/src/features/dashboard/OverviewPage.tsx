import { MetricCard, Panel } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useDueLeadFollowUpsQuery } from "@/features/leads/leads.queries";
import { usePermissionsQuery } from "@/features/permissions/permissions.queries";
import { useRolesQuery } from "@/features/roles/roles.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

export const OverviewPage = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const dueLeadsQuery = useDueLeadFollowUpsQuery(token);
	const usersQuery = useUsersQuery(token);
	const rolesQuery = useRolesQuery(token);
	const permissionsQuery = usePermissionsQuery(token);

	const leadCount = dueLeadsQuery.data?.leads.length ?? 0;
	const userCount = usersQuery.data?.users.length ?? 0;
	const roleCount = rolesQuery.data?.roles.length ?? 0;
	const permissionCount = permissionsQuery.data?.permissions.length ?? 0;
	const activeName = meQuery.data?.name ?? "User";
	const activeRole = meQuery.data?.roles[0]?.name ?? "Workspace member";

	return (
		<div className="grid gap-6">
			<section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
				<div className="rounded-4xl border border-gray-300 bg-white p-6 shadow-sm">
					<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-600">
						Welcome back
					</p>
					<h3 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
						{activeName}
					</h3>
					<p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
						Your RBAC workspace is active. Switch routes from the sidebar, track
						permissions, and manage roles with the seeded SuperAdmin account.
					</p>
					<div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
						<span className="rounded-full bg-blue-100 px-4 py-2 text-blue-600">
							{leadCount} due leads
						</span>
						<span className="rounded-full bg-blue-100 px-4 py-2 text-blue-600">
							{userCount} users
						</span>
						<span className="rounded-full bg-purple-600-soft px-4 py-2 text-gray-900">
							{roleCount} roles
						</span>
						<span className="rounded-full bg-gray-50 px-4 py-2 text-gray-900">
							{permissionCount} permissions
						</span>
					</div>
					<div className="mt-6 grid grid-cols-2 gap-3">
						<div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3">
							<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600">
								Role
							</p>
							<p className="mt-1 text-sm font-semibold text-gray-900">
								{activeRole}
							</p>
						</div>
						<div className="rounded-2xl border border-gray-300 bg-purple-600-soft px-4 py-3 text-gray-900">
							<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-600">
								Status
							</p>
							<p className="mt-1 text-sm font-semibold text-gray-900">Live</p>
						</div>
					</div>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<MetricCard
						label="Active user"
						value={activeName}
						tone="brand"
						progress={58}
					/>
					<MetricCard
						label="Role"
						value={activeRole}
						tone="accent"
						progress={72}
					/>
					<MetricCard
						label="Tokens"
						value={String(permissionCount)}
						tone="ink"
						progress={66}
					/>
					<MetricCard
						label="Visibility"
						value="Live"
						tone="sky"
						progress={84}
					/>
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-3">
				{[
					{
						title: "Users",
						body: "Identity and access roster",
						accent: "brand",
					},
					{
						title: "Roles",
						body: "Permission sets and system roles",
						accent: "accent",
					},
					{
						title: "Permissions",
						body: "Fine-grained policy matrix",
						accent: "ink",
					},
				].map((item) => (
					<div
						key={item.title}
						className="rounded-4xl border border-gray-300 bg-white p-5 shadow-sm"
					>
						<div className="flex items-center gap-3">
							<span
								className={`h-3 w-3 rounded-full ${item.accent === "brand" ? "bg-blue-600" : item.accent === "accent" ? "bg-purple-600" : "bg-gray-900"}`}
							/>
							<p className="text-sm font-semibold text-gray-900">{item.title}</p>
						</div>
						<p className="mt-3 text-sm leading-6 text-gray-600">{item.body}</p>
					</div>
				))}
			</section>

			<Panel title="Quick context" description="Summary">
				<p className="text-sm leading-7 text-gray-600">
					This dashboard is now route-based and query-driven. Each section loads
					its own data from React Query, and each response is validated with
					shared Zod schemas from the monorepo.
				</p>
			</Panel>
		</div>
	);
};




