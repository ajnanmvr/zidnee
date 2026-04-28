import type { LeadResponse } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { HiAcademicCap } from "react-icons/hi2";
import { DataTable } from "@/components/DataTable";
import { Panel } from "@/components/dashboard-ui";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
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

	const columns: ColumnDef<LeadResponse>[] = useMemo(
		() => [
			{
				accessorKey: "name",
				header: "Lead",
				cell: (info) => (
					<div className="font-semibold text-ink">
						{(info.getValue() as string) ?? "Unnamed lead"}
					</div>
				),
			},
			{ accessorKey: "phone", header: "Phone" },
			{
				id: "mentor",
				header: "Demo mentor",
				cell: (info) => {
					const latestDemo = getLatestLeadDemo(info.row.original);
					return latestDemo?.mentorId ? userNameById.get(latestDemo.mentorId) ?? "-" : "-";
				},
			},
			{
				id: "counsellor",
				header: "Counsellor",
				cell: (info) => {
					const latestDemo = getLatestLeadDemo(info.row.original);
					return latestDemo?.admissionCounsellorId
						? userNameById.get(latestDemo.admissionCounsellorId) ?? "-"
						: "-";
				},
			},
			{
				id: "actions",
				header: "Actions",
				enableSorting: false,
				cell: (info) => (
					<button
						type="button"
						onClick={() => navigate(`/admissions/${info.row.original.id}`)}
						className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface"
					>
						<HiAcademicCap className="h-4 w-4" aria-hidden="true" />
						Confirm admission
					</button>
				),
			},
		],
		[navigate, userNameById],
	);

	return (
		<Panel
			title="For Admission"
			description="Leads waiting for final admission confirmation"
		>
			{admissionsQuery.isLoading ? (
				<div className="py-8 text-center text-sm text-ink-soft">Loading...</div>
			) : admissionsQuery.isError ? (
				<div className="py-8 text-center text-sm text-ink-soft">Unable to load admissions.</div>
			) : (
				<DataTable
					columns={columns}
					data={rows}
					exportFilename="for-admission"
					searchPlaceholder="Search admission leads..."
				/>
			)}
		</Panel>
	);
};
