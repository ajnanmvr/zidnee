import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { HiCheckCircle, HiMagnifyingGlass, HiUserGroup, HiUserPlus } from "react-icons/hi2";
import { Link } from "react-router-dom";
import { Modal } from "@/components/dashboard-ui";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUpdateStudentMutation } from "@/features/students/use-update-student-mutation";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";

const LEVEL_LABELS: Record<string, string> = {
	"1": "Seed Level 1",
	"2": "Sprout Level 2",
	"3": "Root Level 3",
	"4": "Leaf Level 4",
	"5": "Bud Level 5",
};

const formatLevel = (level?: string | null) => (level ? LEVEL_LABELS[level] ?? level : "-");

/** Group-course students (ZIG) who aren't in any group yet. */
export const UngroupedStudentsPage = () => {
	const { token } = useSession();
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const canReadAll = useHasPermission("BATCH_READ_ALL") && useHasPermission("STUDENT_READ_ALL_GROUP");
	const scope: "mine" | "all" = loadAllRequested && canReadAll ? "all" : "mine";
	const canUpdateStudent = useHasPermission("STUDENT_UPDATE");

	const studentsQuery = useStudentsQuery(token, { scope, courseType: "GROUP", limit: 2000 });
	// Any group can be picked as a destination, not only "my" groups.
	const batchesQuery = useBatchesQuery(token, { scope: canReadAll ? "all" : "mine" });
	const usersQuery = useUsersQuery(token);
	const updateStudent = useUpdateStudentMutation();

	const [search, setSearch] = useState("");
	const [levelFilter, setLevelFilter] = useState("");
	// "Add to group" modal
	const [modalStudentId, setModalStudentId] = useState<string | null>(null);
	const [groupSearch, setGroupSearch] = useState("");
	const [selectedGroupId, setSelectedGroupId] = useState("");

	const groups = useMemo(
		() =>
			(batchesQuery.data?.batches ?? [])
				.filter((b) => b.type === "GROUP")
				.sort((a, b) => (a.groupId ?? "").localeCompare(b.groupId ?? "")),
		[batchesQuery.data?.batches],
	);
	const mentorNameById = useMemo(
		() => new Map((usersQuery.data?.users ?? []).map((u) => [u.id, u.name ?? u.username])),
		[usersQuery.data?.users],
	);

	const ungrouped = useMemo(
		() =>
			(studentsQuery.data?.students ?? []).filter(
				(s) => s.courseType === "GROUP" && !s.batchId && s.status !== "DROPPED",
			),
		[studentsQuery.data?.students],
	);

	const displayed = useMemo(() => {
		const q = search.trim().toLowerCase();
		return ungrouped
			.filter((s) => !levelFilter || s.level === levelFilter)
			.filter((s) => !q || `${s.zid} ${s.name ?? ""} ${s.phone}`.toLowerCase().includes(q))
			.sort((a, b) => a.zid.localeCompare(b.zid));
	}, [ungrouped, search, levelFilter]);

	const levels = useMemo(
		() => [...new Set(ungrouped.map((s) => s.level).filter((l): l is string => Boolean(l)))].sort(),
		[ungrouped],
	);

	const modalStudent = ungrouped.find((s) => s.id === modalStudentId) ?? null;

	const openModal = (studentId: string) => {
		setModalStudentId(studentId);
		setGroupSearch("");
		setSelectedGroupId("");
	};
	const closeModal = () => {
		if (updateStudent.isPending) return;
		setModalStudentId(null);
	};

	const addToGroup = async () => {
		if (!modalStudent || !selectedGroupId) return;
		try {
			await updateStudent.mutateAsync({ studentId: modalStudent.id, payload: { batchId: selectedGroupId } });
			const group = groups.find((g) => g.id === selectedGroupId);
			toast.success(`${modalStudent.name ?? modalStudent.zid.toUpperCase()} added to ${group?.groupId?.toUpperCase() ?? "group"}`);
			setModalStudentId(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to add student to group");
		}
	};

	// Groups for the modal: searched, the student's level first.
	const modalGroups = useMemo(() => {
		const q = groupSearch.trim().toLowerCase();
		const level = modalStudent?.level;
		return groups
			.filter((g) => {
				if (!q) return true;
				const mentor = g.mentorId ? (mentorNameById.get(g.mentorId) ?? "") : "";
				return `${g.groupId ?? ""} ${g.name ?? ""} ${mentor} ${formatLevel(g.level)}`.toLowerCase().includes(q);
			})
			.map((g) => ({ group: g, sameLevel: Boolean(level && g.level === level) }))
			.sort((a, b) => Number(b.sameLevel) - Number(a.sameLevel));
	}, [groups, groupSearch, modalStudent?.level, mentorNameById]);

	const groupLabel = (g: (typeof groups)[number]) =>
		`${g.groupId?.toUpperCase() ?? "—"}${g.name ? ` · ${g.name}` : ""}`;

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
						<HiUserGroup className="h-5 w-5 text-amber-600" aria-hidden="true" />
					</div>
					<div>
						<h1 className="text-lg font-bold text-gray-900">Ungrouped students</h1>
						<p className="mt-0.5 text-sm text-gray-500">
							{studentsQuery.isLoading ? "Loading…" : `${ungrouped.length} group-course student${ungrouped.length !== 1 ? "s" : ""} not in any group yet`}
						</p>
					</div>
				</div>
				<Link to="/groups" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-700">
					View groups
				</Link>
			</div>

			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2">
				<button type="button" onClick={() => setLoadAllRequested(false)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${scope === "mine" ? "bg-emerald-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700"}`}>
					Mine
				</button>
				<button type="button" onClick={() => setLoadAllRequested(true)} disabled={!canReadAll} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${scope === "all" ? "bg-emerald-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700"} disabled:opacity-40`}>
					All
				</button>
				<input
					placeholder="Search ZID, name or phone"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
				/>
				<select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none">
					<option value="">All levels</option>
					{levels.map((l) => <option key={l} value={l}>{formatLevel(l)}</option>)}
				</select>
				<span className="ml-auto text-xs text-gray-400">{displayed.length} shown</span>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
							<tr>
								<th className="px-4 py-2.5">ZID</th>
								<th className="px-4 py-2.5">Name</th>
								<th className="px-4 py-2.5">Level</th>
								<th className="px-4 py-2.5">Status</th>
								<th className="px-4 py-2.5 hidden md:table-cell">Mentor</th>
								<th className="px-4 py-2.5 text-right">{canUpdateStudent ? "Add to group" : ""}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{studentsQuery.isLoading ? (
								<tr>
									<td className="px-4 py-10 text-center text-sm text-gray-400" colSpan={6}>Loading…</td>
								</tr>
							) : displayed.length === 0 ? (
								<tr>
									<td className="px-4 py-10 text-center text-sm text-gray-400" colSpan={6}>
										{search || levelFilter ? "No ungrouped students match." : "Every group student is in a group."}
									</td>
								</tr>
							) : displayed.map((student) => {
								return (
									<tr key={student.id} className="hover:bg-gray-50">
										<td className="px-4 py-3 font-semibold text-amber-700">
											<Link to={`/students/${student.id}`} className="hover:underline">{student.zid.toUpperCase()}</Link>
										</td>
										<td className="px-4 py-3 text-gray-800">{student.name ?? "-"}</td>
										<td className="px-4 py-3 text-gray-600">{formatLevel(student.level)}</td>
										<td className="px-4 py-3">
											<span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${student.status === "BREAK" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
												{student.status === "BREAK" ? "On break" : "Active"}
											</span>
										</td>
										<td className="px-4 py-3 text-gray-600 hidden md:table-cell">
											{student.mentorId ? (mentorNameById.get(student.mentorId) ?? "-") : "-"}
										</td>
										<td className="px-4 py-3 text-right">
											{canUpdateStudent ? (
												<button
													type="button"
													onClick={() => openModal(student.id)}
													disabled={groups.length === 0}
													className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
												>
													<HiUserPlus className="h-3.5 w-3.5" aria-hidden="true" />
													Add to group
												</button>
											) : null}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			<Modal
				open={Boolean(modalStudent)}
				title="Add to group"
				description={modalStudent ? `${modalStudent.zid.toUpperCase()} · ${modalStudent.name ?? "Unnamed"} · ${formatLevel(modalStudent.level)}` : undefined}
				onClose={closeModal}
				footer={
					<>
						<button
							type="button"
							onClick={closeModal}
							disabled={updateStudent.isPending}
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void addToGroup()}
							disabled={!selectedGroupId || updateStudent.isPending}
							className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
						>
							<HiCheckCircle className="h-4 w-4" aria-hidden="true" />
							{updateStudent.isPending
								? "Adding…"
								: selectedGroupId
									? `Add to ${groups.find((g) => g.id === selectedGroupId)?.groupId?.toUpperCase() ?? "group"}`
									: "Add to group"}
						</button>
					</>
				}
			>
				<div className="relative">
					<HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
					<input
						autoFocus
						value={groupSearch}
						onChange={(e) => setGroupSearch(e.target.value)}
						placeholder="Search group ID, name, mentor or level"
						className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
					/>
				</div>
				<div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1" role="radiogroup" aria-label="Groups">
					{modalGroups.length === 0 ? (
						<p className="py-6 text-center text-sm text-gray-400">No groups match.</p>
					) : modalGroups.map(({ group, sameLevel }) => {
						const selected = group.id === selectedGroupId;
						return (
							<button
								key={group.id}
								type="button"
								role="radio"
								aria-checked={selected}
								onClick={() => setSelectedGroupId(group.id)}
								className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${selected ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50"}`}
							>
								<div className="min-w-0">
									<p className="text-sm font-semibold text-gray-900">
										{groupLabel(group)}
									</p>
									<p className="mt-0.5 truncate text-xs text-gray-500">
										{formatLevel(group.level)} · Mentor: {group.mentorId ? (mentorNameById.get(group.mentorId) ?? "-") : "-"}
									</p>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									{sameLevel ? (
										<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Same level</span>
									) : null}
									<span className={`h-4 w-4 rounded-full border-2 ${selected ? "border-emerald-600 bg-emerald-600 shadow-[inset_0_0_0_2px_white]" : "border-gray-300"}`} />
								</div>
							</button>
						);
					})}
				</div>
			</Modal>
		</div>
	);
};

export default UngroupedStudentsPage;
