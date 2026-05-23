import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Modal } from "@/components/dashboard-ui";
import { useCreateMentorMutation } from "@/features/users/use-create-mentor-mutation";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSearchParams, Link } from "react-router-dom";
import { HiUserPlus } from "react-icons/hi2";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { useGetAllSubstitutions } from "@/features/mentors/mentor-substitution.queries";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";
import { DataTable } from "@/components/DataTable";
import { getStudentFollowUpState } from "@/features/students/student-table";

const formatUserName = (name?: string | null, username?: string | null) =>
	name?.trim() || username?.trim() || "-";

const getMentorDisplayId = (mentor: { mentorId?: string | null; zids?: Record<string, string> }) =>
	mentor.mentorId ?? mentor.zids?.mentor ?? "-";

const getMentorSubstitutionSummary = (
	mentorId: string,
	allSubstitutions: Array<{ originalMentorId: string; substituteMentorId: string; startDate: string | Date; endDate: string | Date }>,
	allUsers: Array<{ id: string; name?: string | null; username?: string | null }>,
) => {
	const related = allSubstitutions
		.filter((s) => s.originalMentorId === mentorId || s.substituteMentorId === mentorId)
		.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

		if (related.length === 0) return { label: "None", detail: "No substitution assigned", tone: "bg-gray-100 text-gray-700" };
	const current = related[0]!;
	const isOriginal = current.originalMentorId === mentorId;
	const counterpartId = isOriginal ? current.substituteMentorId : current.originalMentorId;
	const counterpart = allUsers.find((u) => u.id === counterpartId);
	return {
		label: isOriginal ? "Original" : "Substitute",
		detail: `${counterpart ? formatUserName(counterpart.name, counterpart.username) : "Unknown mentor"} · ${new Date(current.startDate).toLocaleDateString()} to ${new Date(current.endDate).toLocaleDateString()}`,
		tone: isOriginal ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800",
	};
};

export const MentorsPage = () => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const currentUserId = meQuery.data?.id ?? "";
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const activeScope: "mine" | "all" = loadAllRequested ? "all" : "mine";

	const usersQuery = useUsersQuery(token);
	const studentsQuery = useStudentsQuery(token);
	const batchesQuery = useBatchesQuery(token);
	const { data: substitutions = [] } = useGetAllSubstitutions(token);

	const mentors = useMemo(() => {
		const allUsers = usersQuery.data?.users ?? [];
		const allStudents = studentsQuery.data?.students ?? [];
		const allBatches = batchesQuery.data?.batches ?? [];
		const mentorUsers = allUsers.filter((u) => u.roles.some((r) => r.type === "mentor"));
		const scoped = activeScope === "mine" ? mentorUsers.filter((m) => m.counsellorId === currentUserId) : mentorUsers;
		return scoped.map((mentor) => {
			const counsellor = allUsers.find((u) => u.id === mentor.counsellorId) ?? undefined;
			const mentorStudents = allStudents.filter((s) => s.mentorId === mentor.id);
			const individualStudents = mentorStudents.filter((s) => s.batchId == null).length;
			const groupStudents = mentorStudents.filter((s) => s.batchId != null).length;
			const groupCount = allBatches.filter((b) => b.type === "GROUP" && b.mentorId === mentor.id).length;
			const substitutionSummary = getMentorSubstitutionSummary(mentor.id, substitutions, allUsers);
			return { mentor, counsellor, individualStudents, groupStudents, groupCount, substitutionSummary };
		});
	}, [activeScope, batchesQuery.data?.batches, currentUserId, studentsQuery.data?.students, substitutions, usersQuery.data?.users]);

	// quick create modal state
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const canCreateUser = useHasPermission("USER_CREATE");
	const createMentor = useCreateMentorMutation();

	const counsellors = useMemo(() => {
		const all = usersQuery.data?.users ?? [];
		return all.filter((u: any) => u.roles.some((r: any) => r.type === "counsellor"));
	}, [usersQuery.data]);

	type FormValues = { name: string; gender: "male" | "female"; counsellorId?: string };
	const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: { gender: "male", name: "" } });

	const onCreateSubmit = async (data: FormValues) => {
		try {
			await createMentor.mutateAsync({ name: data.name, gender: data.gender, counsellorId: data.counsellorId });
			toast.success("Mentor created");
			setCreateModalOpen(false);
			reset();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create mentor");
		}
	};

	// URL params
	const [searchParams, setSearchParams] = useSearchParams();
	const searchTerm = searchParams.get("search") ?? "";
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Number(searchParams.get("limit") ?? "25");
	const setQueryParam = (k: string, v?: string) => {
		const next = new URLSearchParams(searchParams);
		if (v) next.set(k, v);
		else next.delete(k);
		setSearchParams(next);
	};

	const rows = useMemo(() =>
		mentors.map((m) => ({
			id: m.mentor.id,
			displayId: getMentorDisplayId(m.mentor),
			name: m.mentor.name ?? m.mentor.username ?? "-",
			username: m.mentor.username,
			counsellorName: m.counsellor ? formatUserName(m.counsellor.name, m.counsellor.username) : null,
			individualStudents: m.individualStudents,
			groupStudents: m.groupStudents,
			groupCount: m.groupCount,
			substitutionSummary: m.substitutionSummary,
			nextFollowUpAt: m.mentor.nextFollowUpAt ? new Date(m.mentor.nextFollowUpAt) : undefined,
			customNextFollowUpAt: m.mentor.customNextFollowUpAt ? new Date(m.mentor.customNextFollowUpAt) : undefined,
			lastContactedAt: m.mentor.lastContactedAt ? new Date(m.mentor.lastContactedAt) : undefined,
		})),
		[mentors],
	);

	const filteredRows = useMemo(() => {
		const q = searchTerm.trim().toLowerCase();
		let out = rows;
		if (q) out = rows.filter((r) => [r.name ?? "", r.username ?? "", r.displayId ?? "", r.counsellorName ?? ""].join(" ").toLowerCase().includes(q));
		// default sort by follow-up
		out = out.slice().sort((a, b) => {
			const da = (a.customNextFollowUpAt ?? a.nextFollowUpAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
			const db = (b.customNextFollowUpAt ?? b.nextFollowUpAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
			return da - db;
		});
		const start = (page - 1) * limit;
		return out.slice(start, start + limit);
	}, [rows, searchTerm, page, limit]);

	const totalCount = rows.length;

	const columns = useMemo(() => [
		{ accessorKey: "displayId", header: "Mentor ID", cell: ({ row }: any) => <Link to={`/mentors/${row.original.id}`} className="font-mono font-semibold text-teal-600">{row.original.displayId}</Link> },
		{ accessorKey: "name", header: "Name" },
		{ accessorKey: "counsellorName", header: "Counsellor" },
		{ accessorKey: "individualStudents", header: "Individual", cell: ({ row }: any) => <div className="text-right">{row.original.individualStudents}</div> },
		{ accessorKey: "groupStudents", header: "Group", cell: ({ row }: any) => <div className="text-right">{row.original.groupStudents}</div> },
		{ accessorKey: "groupCount", header: "Groups", cell: ({ row }: any) => <div className="text-right font-semibold text-emerald-800">{row.original.groupCount}</div> },
		{ accessorKey: "lastContactedAt", header: "Last Follow-up", cell: ({ row }: any) => (
			<div className="space-y-1">
				<p>{row.original.lastContactedAt ? row.original.lastContactedAt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"}</p>
				<span className="text-xs text-gray-600">{row.original.lastContactedAt ? new Date(row.original.lastContactedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
			</div>
		) },
		{ accessorKey: "nextFollowUpAt",
			header: "Next Follow-up",
			cell: ({ row }: any) => {
				const followUpDate = row.original.customNextFollowUpAt ?? row.original.nextFollowUpAt;
				const state = getStudentFollowUpState(row.original.customNextFollowUpAt, row.original.nextFollowUpAt);
				return (
					<div className="space-y-1">
						<p>{followUpDate ? followUpDate.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"}</p>
						<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${state.className}`}>{state.label}</span>
					</div>
				);
			},
		},
		{ accessorKey: "actions", header: "Actions", cell: ({ row }: any) => (<div><Link to={`/mentors/${row.original.id}`} className="text-emerald-700 mr-3">Details</Link><Link to={`/users/${row.original.id}/edit`} className="text-emerald-700">Edit</Link></div>) },
	], []);

	return (
		<>
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Mentors</h2>
					<p className="text-sm text-gray-600">Simple directory of mentor accounts.</p>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setLoadAllRequested(false)}
							className={`rounded-2xl px-3 py-1 text-sm font-semibold transition ${activeScope === "mine" ? "bg-emerald-600 text-white" : "border border-gray-300 bg-white text-gray-700"}`}
						>
							My mentors
						</button>
						<button
							type="button"
							onClick={() => setLoadAllRequested(true)}
							className={`rounded-2xl px-3 py-1 text-sm font-semibold transition ${activeScope === "all" ? "bg-emerald-600 text-white" : "border border-gray-300 bg-white text-gray-700"}`}
						>
							All mentors
						</button>
					</div>
					<div className="text-sm text-gray-700">{mentors.length} mentors</div>
					<button onClick={() => setCreateModalOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1 text-sm font-semibold text-white"><HiUserPlus className="h-4 w-4" /> Add</button>
				</div>
			</div>

			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<input value={searchTerm} onChange={(e) => setQueryParam("search", e.target.value)} placeholder="Search mentors" className="rounded-md border border-gray-200 px-3 py-2 text-sm" />
				</div>
				<div className="flex items-center gap-2">
					<label className="text-sm text-gray-600">Rows:</label>
					<select value={String(limit)} onChange={(e) => setQueryParam("limit", e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm">
						<option value="10">10</option>
						<option value="25">25</option>
						<option value="50">50</option>
					</select>
				</div>
			</div>

			<div>
				<DataTable columns={columns} data={filteredRows} />
			</div>

			<div className="flex items-center justify-between">
				<div className="text-sm text-gray-600">Showing {Math.min(totalCount, page * limit)} of {totalCount}</div>
				<div className="flex items-center gap-2">
					<button disabled={page <= 1} onClick={() => setQueryParam("page", String(page - 1))} className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm disabled:opacity-50">Prev</button>
					<span className="text-sm">{page}</span>
					<button disabled={page * limit >= totalCount} onClick={() => setQueryParam("page", String(page + 1))} className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm disabled:opacity-50">Next</button>
				</div>
			</div>
		</div>

			{/* Quick-create mentor modal */}
			<Modal
				open={createModalOpen}
				title="Quick create mentor"
				description="Create a mentor quickly (username and password are auto-generated)"
				onClose={() => setCreateModalOpen(false)}
				footer={
					<>
						<button type="button" onClick={() => { setCreateModalOpen(false); reset(); }} className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">Cancel</button>
						<button type="button" onClick={handleSubmit(onCreateSubmit)} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create mentor</button>
					</>
				}
			>
				{!canCreateUser ? (
					<div className="text-sm text-gray-600">You do not have permission to create mentors.</div>
				) : (
					<form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
						<div>
							<label className="block text-sm font-medium text-gray-700">Full name</label>
							<input {...register("name", { required: true })} className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-2" />
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700">Gender</label>
							<div className="mt-2 flex gap-4">
								<label className="inline-flex items-center gap-2">
									<input type="radio" value="male" {...register("gender") } defaultChecked />
									<span>Male</span>
								</label>
								<label className="inline-flex items-center gap-2">
									<input type="radio" value="female" {...register("gender") } />
									<span>Female</span>
								</label>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700">Assign counsellor (optional)</label>
							<select {...register("counsellorId")} className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-2">
								<option value="">— none —</option>
								{counsellors.map((c: any) => (
									<option key={c.id} value={c.id}>
										{c.name ?? c.username} {c.zids?.counsellor ? `· ${c.zids.counsellor}` : ""}
									</option>
								))}
							</select>
						</div>
					</form>
				)}
			</Modal>
			</>
			);
		};

	export default MentorsPage;
