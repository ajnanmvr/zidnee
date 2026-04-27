import { Panel } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/dashboard/dashboard.queries";
import { useSession } from "@/lib/session";

export const MePage = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const me = meQuery.data;

	const roleNames =
		me?.roles.map((role) => role.name).join(", ") ?? "Workspace member";

	return (
		<div className="grid gap-6">
			<Panel title="My profile" description="Me">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
							User ID
						</p>
						<p className="mt-1 text-sm font-semibold text-ink">
							{me?.id ?? "-"}
						</p>
					</div>
					<div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
							Username
						</p>
						<p className="mt-1 text-sm font-semibold text-ink">
							{me?.username ?? "-"}
						</p>
					</div>
					<div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
							Name
						</p>
						<p className="mt-1 text-sm font-semibold text-ink">
							{me?.name ?? "-"}
						</p>
					</div>
					<div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
							Role
						</p>
						<p className="mt-1 text-sm font-semibold text-ink">{roleNames}</p>
					</div>
					<div className="rounded-2xl border border-border bg-surface-muted px-4 py-3 sm:col-span-2">
						<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
							Email
						</p>
						<p className="mt-1 text-sm font-semibold text-ink">
							{me?.email ?? "-"}
						</p>
					</div>
				</div>
				{meQuery.error ? (
					<p className="mt-4 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-ink">
						Unable to load profile.
					</p>
				) : null}
			</Panel>
		</div>
	);
};
