import type { CreateBatchPayload } from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { HiMagnifyingGlass, HiPlus, HiXMark } from "react-icons/hi2";
import { Field, Modal, SelectField } from "@/components/dashboard-ui";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { useCreateBatchMutation } from "@/features/batches/use-create-batch-mutation";
import { useUpdateBatchMutation } from "@/features/batches/use-update-batch-mutation";
import { useStudentsQuery } from "@/features/students/students.queries";
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

const formatGroupLevel = (level?: string | null) =>
	(level ? LEVEL_LABELS[level] ?? level : "-");

export const GroupsPage = () => {
	const { token } = useSession();
	const [loadAllRequested, setLoadAllRequested] = useState(false);
	const canReadAllGroups = useHasPermission("BATCH_READ_ALL") && useHasPermission("STUDENT_READ_ALL");
	const activeScope: "mine" | "all" = loadAllRequested && canReadAllGroups ? "all" : "mine";
	const batchesQuery = useBatchesQuery(token, { scope: activeScope });
	const studentsQuery = useStudentsQuery(token, { scope: activeScope });
	const usersQuery = useUsersQuery(token);
	const canCreateBatch = useHasPermission("BATCH_CREATE");
	const canUpdateBatch = useHasPermission("BATCH_UPDATE");
	const createBatch = useCreateBatchMutation();
	const groups = useMemo(
		() => (batchesQuery.data?.batches ?? []).filter((b) => b.type === "GROUP"),
		[batchesQuery.data?.batches],
	);
	const [search, setSearch] = useState("");
	const [levelFilter, setLevelFilter] = useState("");
	const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "count_asc" | "count_desc">("name_asc");

	const studentsByBatchId = useMemo(() => {
		return (studentsQuery.data?.students ?? []).reduce<Record<string, number>>(
			(accumulator, student) => {
				if (!student.batchId) return accumulator;
				accumulator[student.batchId] = (accumulator[student.batchId] ?? 0) + 1;
				return accumulator;
			},
			{},
		);
	}, [studentsQuery.data?.students]);

	const displayedGroups = useMemo(() => {
		const byLevel = levelFilter ? groups.filter((g) => g.level === levelFilter) : groups.slice();
		const bySearch = search
			? byLevel.filter((g) => {
				  const q = search.toLowerCase();
				  return (g.name ?? "").toLowerCase().includes(q) || (g.groupId ?? "").toLowerCase().includes(q);
			  })
			: byLevel;

		const withCounts = bySearch.map((g) => ({ group: g, count: studentsByBatchId[g.id] ?? 0 }));

		withCounts.sort((a, b) => {
			switch (sortBy) {
				case "name_desc":
					return (b.group.name ?? "").localeCompare(a.group.name ?? "");
				case "count_asc":
					return a.count - b.count;
				case "count_desc":
					return b.count - a.count;
				default:
					return (a.group.name ?? "").localeCompare(b.group.name ?? "");
			}
		});

		return withCounts.map((w) => w.group);
	}, [groups, levelFilter, search, sortBy, studentsByBatchId]);

	const mentors = (usersQuery.data?.users ?? []).filter((u) =>
		u.roles.some((r) => r.type === "mentor"),
	);
	const [open, setOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [editingGroup, setEditingGroup] = useState<null | (typeof groups)[number]>(null);
	const [editGroupId, setEditGroupId] = useState("");
	const [createMentorSearch, setCreateMentorSearch] = useState("");
	const [editMentorSearch, setEditMentorSearch] = useState("");

	const { control, handleSubmit, reset } = useForm<CreateBatchPayload>({
		defaultValues: { name: "", type: "GROUP", level: "", mentorId: "", description: undefined },
	});

	const onSubmit = async (form: CreateBatchPayload) => {
		try {
			const response = await createBatch.mutateAsync(form);
			toast.success(response.batch.groupId ? `Group ${response.batch.groupId.toUpperCase()} created` : "Group created");
			reset();
			setOpen(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to create group");
		}
	};

	const updateBatchMutation = useUpdateBatchMutation();

	const openEdit = (group: (typeof groups)[number]) => {
		setEditingGroup(group);
		setEditGroupId(group.groupId ?? "");
		reset({ ...group });
		setEditMentorSearch("");
		setEditOpen(true);
	};

	const closeEdit = () => {
		setEditingGroup(null);
		setEditGroupId("");
		reset();
		setEditMentorSearch("");
		setEditOpen(false);
	};

	const onEditSubmit = async (form: CreateBatchPayload) => {
		if (!editingGroup) return;
		try {
			const trimmedGroupId = editGroupId.trim();
			await updateBatchMutation.mutateAsync({
				batchId: editingGroup.id,
				payload: {
					...form,
					...(trimmedGroupId ? { groupId: trimmedGroupId } : {}),
				},
			});
			toast.success("Group updated");
			closeEdit();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to update group");
		}
	};

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2">
				<button type="button" onClick={() => setLoadAllRequested(false)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "mine" ? "bg-emerald-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700"}`}>
					Mine
				</button>
				<button type="button" onClick={() => setLoadAllRequested(true)} disabled={!canReadAllGroups} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeScope === "all" ? "bg-emerald-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700"} disabled:opacity-40`}>
					All groups
				</button>
				<input placeholder="Search by name or ID" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500" />
				<select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none">
					<option value="">All levels</option>
					{[...new Set(groups.map((g) => g.level).filter(Boolean))].map((lvl) => (
						<option key={lvl} value={lvl}>{lvl}</option>
					))}
				</select>
				<select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none">
					<option value="name_asc">Name ↑</option>
					<option value="name_desc">Name ↓</option>
					<option value="count_desc">Students ↓</option>
					<option value="count_asc">Students ↑</option>
				</select>
				<div className="ml-auto flex items-center gap-2">
					<span className="text-xs text-gray-400">{displayedGroups.length} group{displayedGroups.length !== 1 ? "s" : ""}</span>
					{canCreateBatch ? (
						<button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
							<HiPlus className="h-4 w-4" /> Add group
						</button>
					) : null}
				</div>
			</div>

			{/* Table */}
			<div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
				<table className="min-w-full text-sm">
					<thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
						<tr>
							<th className="px-4 py-2.5">Group ID</th>
							<th className="px-4 py-2.5">Name</th>
							<th className="px-4 py-2.5">Mentor</th>
							<th className="px-4 py-2.5">Level</th>
							<th className="px-4 py-2.5">Students</th>
							<th className="px-4 py-2.5 hidden md:table-cell">Description</th>
							<th className="px-4 py-2.5" />
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{displayedGroups.length === 0 ? (
							<tr>
								<td className="px-4 py-8 text-center text-sm text-gray-400" colSpan={7}>No groups yet.</td>
							</tr>
						) : displayedGroups.map((group) => {
							const mentorName = mentors.find((m) => m.id === group.mentorId)?.name ?? "-";
							const groupStudentCount = studentsByBatchId[group.id] ?? 0;
							return (
								<tr key={group.id} className="hover:bg-gray-50">
									<td className="px-4 py-3 font-semibold text-emerald-700">{group.groupId?.toUpperCase() ?? "-"}</td>
									<td className="px-4 py-3 text-gray-800">{group.name ?? "-"}</td>
									<td className="px-4 py-3 text-gray-600">{mentorName}</td>
									<td className="px-4 py-3 text-gray-600">{formatGroupLevel(group.level)}</td>
									<td className="px-4 py-3 font-medium text-gray-800">{groupStudentCount}</td>
									<td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{group.description ?? "-"}</td>
									<td className="px-4 py-3 text-right">
										<div className="flex items-center justify-end gap-2">
											<Link to={`/groups/${group.id}`} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-700">View</Link>
											{canUpdateBatch ? (
												<button type="button" onClick={() => openEdit(group)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300">Edit</button>
											) : null}
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Create modal */}
			{canCreateBatch ? (
				<Modal open={open} title="Create group" onClose={() => setOpen(false)}>
					<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
						<Controller name="mentorId" control={control} render={({ field }) => {
							const selected = mentors.find((m) => m.id === field.value);
							const filtered = mentors.filter((m) => {
								const q = createMentorSearch.toLowerCase();
								return !q || (m.name ?? "").toLowerCase().includes(q) || (m.zids?.mentor ?? "").toLowerCase().includes(q);
							});
							return (
								<label className="grid gap-1.5 text-sm font-medium text-gray-600">
									<span>Mentor</span>
									{selected ? (
										<div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
											<span>{selected.zids?.mentor ? `${selected.zids.mentor} - ${selected.name}` : selected.name}</span>
											<button type="button" onClick={() => { field.onChange(""); setCreateMentorSearch(""); }} className="ml-2 text-emerald-500 hover:text-red-500">
												<HiXMark className="h-4 w-4" />
											</button>
										</div>
									) : (
										<div className="relative">
											<HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
											<input
												type="text"
												value={createMentorSearch}
												onChange={(e) => setCreateMentorSearch(e.target.value)}
												placeholder="Search mentor…"
												className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
											/>
											{createMentorSearch ? (
												<div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
													{filtered.length === 0 ? (
														<p className="px-3 py-2 text-xs text-gray-400">No mentors found</p>
													) : filtered.map((m) => (
														<button
															key={m.id}
															type="button"
															onClick={() => { field.onChange(m.id); setCreateMentorSearch(""); }}
															className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-emerald-50"
														>
															{m.zids?.mentor ? `${m.zids.mentor} - ${m.name}` : m.name}
														</button>
													))}
												</div>
											) : null}
										</div>
									)}
								</label>
							);
						}} />
						<div className="grid gap-4 sm:grid-cols-2">
							<Controller name="level" control={control} render={({ field }) => (
								<SelectField label="Level" value={field.value} onChange={field.onChange} options={[
									{ value: "1", label: "Seed Level 1" },
									{ value: "2", label: "Sprout Level 2" },
									{ value: "3", label: "Root Level 3" },
									{ value: "4", label: "Leaf Level 4" },
									{ value: "5", label: "Bud Level 5" },
								]} placeholder="Select level..." />
							)} />
							<Controller name="name" control={control} render={({ field }) => (
								<Field label="Group label (optional)" value={field.value ?? ""} onChange={field.onChange} />
							)} />
						</div>
						<div className="flex justify-end">
							<button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Create</button>
						</div>
					</form>
				</Modal>
			) : null}

			{/* Edit modal */}
			{canUpdateBatch ? (
				<Modal open={editOpen} title="Edit group" onClose={closeEdit}>
					<form className="grid gap-4" onSubmit={handleSubmit(onEditSubmit)}>
						<Controller name="mentorId" control={control} render={({ field }) => {
							const selected = mentors.find((m) => m.id === field.value);
							const filtered = mentors.filter((m) => {
								const q = editMentorSearch.toLowerCase();
								return !q || (m.name ?? "").toLowerCase().includes(q) || (m.zids?.mentor ?? "").toLowerCase().includes(q);
							});
							return (
								<label className="grid gap-1.5 text-sm font-medium text-gray-600">
									<span>Mentor</span>
									{selected ? (
										<div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
											<span>{selected.zids?.mentor ? `${selected.zids.mentor} - ${selected.name}` : selected.name}</span>
											<button type="button" onClick={() => { field.onChange(""); setEditMentorSearch(""); }} className="ml-2 text-emerald-500 hover:text-red-500">
												<HiXMark className="h-4 w-4" />
											</button>
										</div>
									) : (
										<div className="relative">
											<HiMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
											<input
												type="text"
												value={editMentorSearch}
												onChange={(e) => setEditMentorSearch(e.target.value)}
												placeholder="Search mentor…"
												className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
											/>
											{editMentorSearch ? (
												<div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
													{filtered.length === 0 ? (
														<p className="px-3 py-2 text-xs text-gray-400">No mentors found</p>
													) : filtered.map((m) => (
														<button
															key={m.id}
															type="button"
															onClick={() => { field.onChange(m.id); setEditMentorSearch(""); }}
															className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-emerald-50"
														>
															{m.zids?.mentor ? `${m.zids.mentor} - ${m.name}` : m.name}
														</button>
													))}
												</div>
											) : null}
										</div>
									)}
								</label>
							);
						}} />
						<div className="grid gap-4 sm:grid-cols-2">
							<Controller name="level" control={control} render={({ field }) => (
								<SelectField label="Level" value={field.value} onChange={field.onChange} options={[
									{ value: "1", label: "Seed Level 1" },
									{ value: "2", label: "Sprout Level 2" },
									{ value: "3", label: "Root Level 3" },
									{ value: "4", label: "Leaf Level 4" },
									{ value: "5", label: "Bud Level 5" },
								]} placeholder="Select level..." />
							)} />
							<Controller name="name" control={control} render={({ field }) => (
								<Field label="Group label (optional)" value={field.value ?? ""} onChange={field.onChange} />
							)} />
						</div>
						<label className="grid gap-1.5 text-sm font-medium text-gray-600">
							<span>Group ID (ZIG)</span>
							<input
								type="text"
								value={editGroupId}
								onChange={(e) => setEditGroupId(e.target.value.toUpperCase())}
								placeholder="e.g. ZIG001"
								className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
							/>
						</label>
						<div className="flex justify-end">
							<button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Save</button>
						</div>
					</form>
				</Modal>
			) : null}
		</div>
	);
};

export default GroupsPage;
