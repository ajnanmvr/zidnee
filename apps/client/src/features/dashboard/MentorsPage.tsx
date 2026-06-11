import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Modal } from "@/components/dashboard-ui";
import {
	HiAcademicCap,
	HiChevronLeft,
	HiChevronRight,
	HiEye,
	HiMagnifyingGlass,
	HiPencilSquare,
	HiUserPlus,
} from "react-icons/hi2";
import { useCreateMentorMutation } from "@/features/users/use-create-mentor-mutation";
import { useHasAnyPermission } from "@/lib/hooks/use-has-permission";
import { useSearchParams, Link } from "react-router-dom";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { useGetAllSubstitutions } from "@/features/mentors/mentor-substitution.queries";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useMentorsQuery, useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";
import { DataTable } from "@/components/DataTable";
import { getStudentFollowUpState } from "@/features/students/student-table";

const formatUserName = (name?: string | null, username?: string | null) =>
	name?.trim() || username?.trim() || "-";

const AVATAR_COLORS = [
	"bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-rose-500",
	"bg-amber-500", "bg-emerald-500", "bg-cyan-500", "bg-indigo-500",
];
const avatarColor = (id: string) => {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
	return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? "bg-teal-500";
};

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
	const canReadAllMentors = useHasAnyPermission([
		"MENTOR_READ_ALL",
		"MENTOR_READ",
		"USER_READ",
		"LEAD_ASSIGN",
		"LEAD_DEMO_ASSIGN",
	]);
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const activeScope: "mine" | "all" = loadAllRequested && canReadAllMentors ? "all" : "mine";

	const usersQuery = useUsersQuery(token);
	const mentorsQuery = useMentorsQuery(token, activeScope);
	const studentsQuery = useStudentsQuery(token);
	const batchesQuery = useBatchesQuery(token);
	const { data: substitutions = [] } = useGetAllSubstitutions(token);

	const mentors = useMemo(() => {
		const mentorUsers = mentorsQuery.data?.users ?? [];
		const allUsers = usersQuery.data?.users ?? [];
		const allStudents = studentsQuery.data?.students ?? [];
		const allBatches = batchesQuery.data?.batches ?? [];
		return mentorUsers.map((mentor) => {
			const counsellor =
				allUsers.find((u) => u.id === mentor.counsellorId) ??
				(mentor.counsellorId === currentUserId ? meQuery.data : undefined);
			const mentorStudents = allStudents.filter((s) => s.mentorId === mentor.id);
			const individualStudents = mentorStudents.filter((s) => s.batchId == null).length;
			const groupStudents = mentorStudents.filter((s) => s.batchId != null).length;
			const groupCount = allBatches.filter((b) => b.type === "GROUP" && b.mentorId === mentor.id).length;
			const substitutionSummary = getMentorSubstitutionSummary(mentor.id, substitutions, allUsers);
			return { mentor, counsellor, individualStudents, groupStudents, groupCount, substitutionSummary };
		});
	}, [mentorsQuery.data?.users, usersQuery.data?.users, batchesQuery.data?.batches, currentUserId, meQuery.data, studentsQuery.data?.students, substitutions]);

	// quick create modal state
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const canCreateUser = useHasAnyPermission(["USER_CREATE", "MENTOR_CREATE"]);
	const createMentor = useCreateMentorMutation();

	const isCurrentUserCounsellor = meQuery.data?.roles?.some((r) => r.type === "counsellor") ?? false;
	const defaultCounsellorId = isCurrentUserCounsellor ? currentUserId : undefined;

	const counsellors = useMemo(() => {
		const all = usersQuery.data?.users ?? [];
		const fromUsers = all.filter((u: any) => u.roles.some((r: any) => r.type === "counsellor"));
		if (isCurrentUserCounsellor && meQuery.data && !fromUsers.some((u) => u.id === currentUserId)) {
			return [...fromUsers, meQuery.data];
		}
		return fromUsers;
	}, [usersQuery.data, isCurrentUserCounsellor, meQuery.data, currentUserId]);

	type FormValues = { name: string; gender: "male" | "female"; counsellorId?: string };
	const getDefaultFormValues = (): FormValues => ({ gender: "male", name: "", counsellorId: defaultCounsellorId });
	const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: getDefaultFormValues() });

	const onCreateSubmit = async (data: FormValues) => {
		try {
			await createMentor.mutateAsync({ name: data.name, gender: data.gender, counsellorId: data.counsellorId });
			toast.success("Mentor created");
			setCreateModalOpen(false);
			reset(getDefaultFormValues());
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
			totalStudents: m.individualStudents + m.groupStudents,
			groupCount: m.groupCount,
			substitutionSummary: m.substitutionSummary,
			nextFollowUpAt: m.mentor.nextFollowUpAt ? new Date(m.mentor.nextFollowUpAt) : undefined,
			customNextFollowUpAt: m.mentor.customNextFollowUpAt ? new Date(m.mentor.customNextFollowUpAt) : undefined,
			lastContactedAt: m.mentor.lastContactedAt ? new Date(m.mentor.lastContactedAt) : undefined,
			createdAt: m.mentor.createdAt ? new Date(m.mentor.createdAt) : undefined,
		})),
		[mentors],
	);

	const sortBy = searchParams.get("sortBy") ?? "followUp";

	const filteredRows = useMemo(() => {
		const q = searchTerm.trim().toLowerCase();
		let out = rows;
		if (q) out = rows.filter((r) => [r.name ?? "", r.username ?? "", r.displayId ?? "", r.counsellorName ?? ""].join(" ").toLowerCase().includes(q));
		out = out.slice().sort((a, b) => {
			switch (sortBy) {
				case "nameAsc":
					return a.name.localeCompare(b.name);
				case "nameDesc":
					return b.name.localeCompare(a.name);
				case "studentsDesc":
					return b.totalStudents - a.totalStudents;
				case "studentsAsc":
					return a.totalStudents - b.totalStudents;
				case "createdNewest":
					return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
				case "createdOldest":
					return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
				case "followUp":
				default: {
					const da = (a.customNextFollowUpAt ?? a.nextFollowUpAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
					const db = (b.customNextFollowUpAt ?? b.nextFollowUpAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
					return da - db;
				}
			}
		});
		const start = (page - 1) * limit;
		return out.slice(start, start + limit);
	}, [rows, searchTerm, sortBy, page, limit]);

	const totalCount = rows.length;

	const columns = useMemo(() => [
		{
			accessorKey: "name",
			header: "Mentor",
			cell: ({ row }: any) => (
				<Link to={`/mentors/${row.original.id}`} className="flex min-w-0 items-center gap-3">
					<span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${avatarColor(row.original.id)} text-xs font-bold text-white`}>
						{(row.original.name ?? row.original.username ?? "?")[0]?.toUpperCase()}
					</span>
					<span className="min-w-0">
						<span className="block truncate text-sm font-semibold text-gray-900">{row.original.name}</span>
						<span className="mt-0.5 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
							{row.original.displayId.toUpperCase()}
						</span>
					</span>
				</Link>
			),
		},
		{
			accessorKey: "counsellorName",
			header: "Counsellor",
			cell: ({ row }: any) =>
				row.original.counsellorName ? (
					<span className="text-sm font-medium text-gray-700">{row.original.counsellorName}</span>
				) : (
					<span className="text-sm text-gray-400">Unassigned</span>
				),
		},
		{
			accessorKey: "students",
			header: "Students",
			cell: ({ row }: any) => (
				<div className="flex items-center gap-1.5">
					<span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
						{row.original.individualStudents} individual
					</span>
					<span className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
						{row.original.groupStudents} group
					</span>
				</div>
			),
		},
		{
			accessorKey: "groupCount",
			header: "Batches",
			cell: ({ row }: any) => (
				<span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
					{row.original.groupCount}
				</span>
			),
		},
		{
			accessorKey: "lastContactedAt",
			header: "Last Follow-up",
			cell: ({ row }: any) => (
				<div>
					<p className="text-sm text-gray-700">
						{row.original.lastContactedAt
							? row.original.lastContactedAt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
							: "—"}
					</p>
					{row.original.lastContactedAt ? (
						<p className="text-[11px] text-gray-400">
							{new Date(row.original.lastContactedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
						</p>
					) : null}
				</div>
			),
		},
		{
			accessorKey: "nextFollowUpAt",
			header: "Next Follow-up",
			cell: ({ row }: any) => {
				const followUpDate = row.original.customNextFollowUpAt ?? row.original.nextFollowUpAt;
				const state = getStudentFollowUpState(row.original.customNextFollowUpAt, row.original.nextFollowUpAt);
				return (
					<div className="space-y-1">
						<p className="text-sm text-gray-700">
							{followUpDate ? followUpDate.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"}
						</p>
						<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${state.className}`}>{state.label}</span>
					</div>
				);
			},
		},
		{
			accessorKey: "actions",
			header: "Actions",
			cell: ({ row }: any) => (
				<div className="flex items-center justify-end gap-1.5">
					<Link
						to={`/mentors/${row.original.id}`}
						title="View details"
						aria-label="View mentor details"
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
					>
						<HiEye className="h-4 w-4" aria-hidden="true" />
					</Link>
					<Link
						to={`/users/${row.original.id}/edit`}
						title="Edit"
						aria-label="Edit mentor"
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
					>
						<HiPencilSquare className="h-4 w-4" aria-hidden="true" />
					</Link>
				</div>
			),
		},
	], []);

	return (
		<>
		<div className="space-y-3">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
						<HiAcademicCap className="h-5 w-5 text-emerald-600" />
					</div>
					<div>
						<h1 className="text-lg font-bold text-gray-900">Mentors</h1>
						<p className="mt-0.5 text-sm text-gray-500">
							{mentors.length} mentor{mentors.length !== 1 ? "s" : ""} · Mentor directory and follow-up tracking
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={() => { reset(getDefaultFormValues()); setCreateModalOpen(true); }}
					className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
				>
					<HiUserPlus className="h-4 w-4" aria-hidden="true" />
					Quick Create
				</button>
			</div>

			{/* Toolbar: scope toggle + search + page size */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
				<div className="flex items-center gap-2">
					{canReadAllMentors ? (
						<div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
							<button
								type="button"
								onClick={() => setLoadAllRequested(false)}
								className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${activeScope === "mine" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
							>
								My mentors
							</button>
							<button
								type="button"
								onClick={() => setLoadAllRequested(true)}
								className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${activeScope === "all" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
							>
								All mentors
							</button>
						</div>
					) : null}
					<div className="relative min-w-50 max-w-sm">
						<HiMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
						<input
							value={searchTerm}
							onChange={(e) => setQueryParam("search", e.target.value)}
							placeholder="Search mentors…"
							className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
						/>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<label className="text-xs font-medium text-gray-500">Sort by</label>
					<select
						value={sortBy}
						onChange={(e) => setQueryParam("sortBy", e.target.value === "followUp" ? undefined : e.target.value)}
						className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
					>
						<option value="followUp">Next follow-up</option>
						<option value="nameAsc">Name (A-Z)</option>
						<option value="nameDesc">Name (Z-A)</option>
						<option value="studentsDesc">Most students</option>
						<option value="studentsAsc">Fewest students</option>
						<option value="createdNewest">Newest first</option>
						<option value="createdOldest">Oldest first</option>
					</select>
				</div>
				<div className="flex items-center gap-2">
					<label className="text-xs font-medium text-gray-500">Rows per page</label>
					<select
						value={String(limit)}
						onChange={(e) => setQueryParam("limit", e.target.value)}
						className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
					>
						<option value="10">10</option>
						<option value="25">25</option>
						<option value="50">50</option>
					</select>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<DataTable columns={columns} data={filteredRows} />
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
				<p className="text-xs text-gray-500">
					Showing <span className="font-semibold text-gray-700">{Math.min(totalCount, page * limit)}</span> of{" "}
					<span className="font-semibold text-gray-700">{totalCount}</span>
				</p>
				<div className="flex items-center gap-1.5">
					<button
						disabled={page <= 1}
						onClick={() => setQueryParam("page", String(page - 1))}
						aria-label="Previous page"
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
					>
						<HiChevronLeft className="h-4 w-4" aria-hidden="true" />
					</button>
					<span className="min-w-8 text-center text-sm font-semibold text-gray-700">{page}</span>
					<button
						disabled={page * limit >= totalCount}
						onClick={() => setQueryParam("page", String(page + 1))}
						aria-label="Next page"
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
					>
						<HiChevronRight className="h-4 w-4" aria-hidden="true" />
					</button>
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
						<button type="button" onClick={() => { setCreateModalOpen(false); reset(getDefaultFormValues()); }} className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900">Cancel</button>
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
							<label className="block text-sm font-medium text-gray-700">Assign counsellor</label>
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
