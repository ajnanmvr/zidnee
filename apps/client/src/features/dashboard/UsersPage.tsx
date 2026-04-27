import { Panel } from "@/components/dashboard-ui";
import { useUsersQuery } from "@/features/dashboard/dashboard.queries";
import { useSession } from "@/lib/session";

export const UsersPage = () => {
	const { token } = useSession();
	const usersQuery = useUsersQuery(token);

	return (
		<Panel title="Users" description="Team">
			<div className="grid gap-3">
				{usersQuery.data?.users.map((user) => (
					<div
						key={user.id}
						className="rounded-3xl border border-border bg-surface p-4 shadow-sm"
					>
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div>
								<p className="font-semibold text-ink">{user.name}</p>
								<p className="text-sm text-ink-soft">{user.email}</p>
							</div>
							<div className="flex flex-wrap gap-2">
								{user.roles.map((role) => (
									<span
										key={role.id}
										className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"
									>
										{role.name}
									</span>
								))}
							</div>
						</div>
						<div className="mt-4 h-1.5 w-full rounded-full bg-surface-muted">
							<div
								className="h-full rounded-full bg-brand"
								style={{ width: "62%" }}
							/>
						</div>
					</div>
				))}
			</div>
		</Panel>
	);
};
