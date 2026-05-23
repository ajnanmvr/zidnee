import { Link } from "react-router-dom";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useSession } from "@/lib/session";

export const MePermissionsPage = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const permissions = meQuery.data?.permissions ?? [];

	return (
		<div className="grid gap-6">
			<section className="rounded-4xl overflow-hidden bg-linear-to-br from-slate-950 via-emerald-950 to-slate-900 text-white shadow-[0_24px_80px_rgba(15,23,42,0.3)]">
				<div className="grid gap-4 p-6 lg:grid-cols-[1fr_auto] lg:items-end lg:p-8">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200/80">
							My permissions
						</p>
						<h1 className="mt-3 text-3xl font-semibold md:text-4xl">
							Permission center
						</h1>
						<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200/80 md:text-base">
							A complete list of the permissions currently attached to your account,
							including key, resource, action, and description.
						</p>
					</div>
					<Link
						to="/me"
						className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
					>
						Back to profile
					</Link>
				</div>
			</section>

			<section className="rounded-4xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
				<div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-4">
					<div>
						<h2 className="text-lg font-semibold text-gray-900">All permissions</h2>
						<p className="text-sm text-gray-600">
							{permissions.length} permission{permissions.length === 1 ? "" : "s"} found
						</p>
					</div>
				</div>

				{meQuery.isLoading ? (
					<div className="py-10 text-center text-sm text-gray-500">Loading permissions...</div>
				) : meQuery.isError ? (
					<div className="py-10 text-center text-sm text-rose-600">Unable to load permissions.</div>
				) : permissions.length === 0 ? (
					<div className="py-10 text-center text-sm text-gray-500">No permissions assigned.</div>
				) : (
					<div className="overflow-hidden rounded-3xl border border-gray-200">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Name</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Key</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Resource</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Action</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Description</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 bg-white">
								{permissions.map((permission) => (
									<tr key={permission.id} className="align-top">
										<td className="px-4 py-4 text-sm font-semibold text-gray-900">{permission.name}</td>
										<td className="px-4 py-4 text-sm text-gray-600">{permission.key}</td>
										<td className="px-4 py-4 text-sm text-gray-600">{permission.resource}</td>
										<td className="px-4 py-4 text-sm text-gray-600">{permission.action}</td>
										<td className="px-4 py-4 text-sm text-gray-600">{permission.description ?? "-"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	);
};

export default MePermissionsPage;