import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { HiAcademicCap } from "react-icons/hi2";
import { Panel } from "@/components/dashboard-ui";
import { useAdmissionLeadsQuery } from "@/features/leads/leads.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

const formatUserName = (userName?: string | null) => userName?.trim() || "-";

export const AdmissionsPage = () => {
	const { token } = useSession();
	const navigate = useNavigate();
	const admissionsQuery = useAdmissionLeadsQuery(token);
	const usersQuery = useUsersQuery(token);
	const rows = admissionsQuery.data?.leads ?? [];
	const allUsers = usersQuery.data?.users ?? [];

	const userNameById = useMemo(
		() =>
			new Map(
				allUsers.map((user) => [user.id, formatUserName(user.name ?? user.username)]),
			),
		[allUsers],
	);

	return (
		<Panel
			title="For Admission"
			description="Leads waiting for final admission confirmation"
		>
			{rows.length === 0 ? (
				<div className="py-8 text-center text-sm text-ink-soft">
					No leads are waiting for admission yet.
				</div>
			) : (
				<div className="overflow-x-auto rounded-3xl border border-border">
					<table className="min-w-full border-collapse bg-surface text-left text-sm">
						<thead className="bg-surface-muted text-xs uppercase tracking-[0.14em] text-ink-soft">
							<tr>
								<th className="px-4 py-3 font-semibold">Lead</th>
								<th className="px-4 py-3 font-semibold">Phone</th>
								<th className="px-4 py-3 font-semibold">Demo mentor</th>
								<th className="px-4 py-3 font-semibold">Counsellor</th>
								<th className="px-4 py-3 font-semibold">Action</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((lead) => (
								<tr key={lead.id} className="border-t border-border align-top">
									<td className="px-4 py-3 font-semibold text-ink">
										{lead.name ?? "Unnamed lead"}
									</td>
									<td className="px-4 py-3 text-ink-soft">{lead.phone}</td>
									<td className="px-4 py-3 text-ink-soft">
										{lead.demoMentorId ? userNameById.get(lead.demoMentorId) ?? "-" : "-"}
									</td>
									<td className="px-4 py-3 text-ink-soft">
										{lead.admissionCounsellorId
											? userNameById.get(lead.admissionCounsellorId) ?? "-"
											: "-"}
									</td>
									<td className="px-4 py-3">
										<button
											type="button"
											onClick={() => navigate(`/admissions/${lead.id}`)}
											className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface"
										>
											<HiAcademicCap className="h-4 w-4" aria-hidden="true" />
											Confirm admission
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Panel>
	);
};
