import { Panel } from "@/components/dashboard-ui";
import { usePermissionsQuery } from "@/features/dashboard/dashboard.queries.js";
import { useSession } from "@/lib/session.js";

export const PermissionsPage = () => {
	const { token } = useSession();
	const permissionsQuery = usePermissionsQuery(token);

	return (
		<Panel title="Permissions" description="Policy">
			<div className="grid gap-3">
				{permissionsQuery.data?.permissions.map((permission, index) => (
					<div
						key={permission.id}
						className="rounded-3xl border border-border bg-surface p-4 shadow-sm"
					>
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div>
								<p className="font-semibold text-ink">{permission.key}</p>
								<p className="text-sm text-ink-soft">{permission.name}</p>
							</div>
							<div className="flex items-center gap-3">
								<span className="text-sm font-medium text-ink-soft">
									{permission.resource}:{permission.action}
								</span>
								<span
									className={
										index % 2 === 0
											? "rounded-full bg-brand px-3 py-1 text-xs font-semibold text-surface"
											: "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-surface"
									}
								>
									{permission.id.slice(0, 6)}
								</span>
							</div>
						</div>
						<div className="mt-4 h-1.5 w-full rounded-full bg-surface-muted">
							<div
								className={
									index % 2 === 0
										? "h-full rounded-full bg-brand"
										: "h-full rounded-full bg-accent"
								}
								style={{ width: index % 2 === 0 ? "68%" : "52%" }}
							/>
						</div>
					</div>
				))}
			</div>
		</Panel>
	);
};
