import type { CreateBatchPayload } from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { HiAcademicCap, HiPlus, HiUsers } from "react-icons/hi2";
import { Field, Modal, Panel, SelectField } from "@/components/dashboard-ui";
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
	const activeScope: "mine" | "all" = loadAllRequested ? "all" : "mine";
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

	const { control, handleSubmit, reset } = useForm<CreateBatchPayload>({
		defaultValues: {
			name: "",
			type: "GROUP",
			level: "",
			mentorId: "",
			description: undefined,
		},
	});

	const onSubmit = async (form: CreateBatchPayload) => {
		try {
			const response = await createBatch.mutateAsync(form);
			toast.success(
				response.batch.groupId
							? `Group ${response.batch.groupId.toUpperCase()} created`
					: "Group created",
			);
			reset();
			setOpen(false);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Unable to create group",
			);
		}
	};

	const updateBatchMutation = useUpdateBatchMutation();

	const openEdit = (group: (typeof groups)[number]) => {
		setEditingGroup(group);
		reset({ ...group });
		setEditOpen(true);
	};

	const closeEdit = () => {
		setEditingGroup(null);
		reset();
		setEditOpen(false);
	};

	const onEditSubmit = async (form: CreateBatchPayload) => {
		if (!editingGroup) return;
		try {
			await updateBatchMutation.mutateAsync({ batchId: editingGroup.id, payload: form });
			toast.success("Group updated");
			closeEdit();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to update group");
		}
	};

	return (
		<div className="grid gap-6">
			<div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-sm md:flex-row md:items-end md:justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
						Batch workspace
					</p>
					<h2 className="mt-2 text-2xl font-semibold text-gray-900">Groups</h2>
					<p className="mt-2 max-w-2xl text-sm text-gray-600">
						Each group keeps a mentor, a human-readable code like zg001, and the
						students assigned to it.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setLoadAllRequested(false)}
						className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeScope === "mine" ? "bg-emerald-600 text-white" : "border border-gray-300 bg-white text-gray-700 hover:border-emerald-500 hover:text-emerald-700"}`}
					>
						Assigned to me
					</button>
					<button
						type="button"
						onClick={() => setLoadAllRequested(true)}
						className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeScope === "all" ? "bg-emerald-600 text-white" : "border border-gray-300 bg-white text-gray-700 hover:border-emerald-500 hover:text-emerald-700"}`}
					>
						All groups
					</button>
				</div>
				{canCreateBatch ? (
					<button
						type="button"
						className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
						onClick={() => setOpen(true)}
					>
						<HiPlus className="h-4 w-4" /> Add group
					</button>
				) : null}
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Panel title="Total groups">
					<div className="flex items-center gap-3">
						<div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
							<HiUsers className="h-6 w-6" aria-hidden="true" />
						</div>
						<div>
							<p className="text-3xl font-semibold text-gray-900">{groups.length}</p>
							<p className="text-sm text-gray-600">Group records</p>
						</div>
					</div>
				</Panel>
				<Panel title="Students in groups">
					<div className="flex items-center gap-3">
						<div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
							<HiAcademicCap className="h-6 w-6" aria-hidden="true" />
						</div>
						<div>
							<p className="text-3xl font-semibold text-gray-900">
								{(studentsQuery.data?.students ?? []).filter((student) =>
									Boolean(student.batchId),
								).length}
							</p>
							<p className="text-sm text-gray-600">Students assigned to groups</p>
						</div>
					</div>
				</Panel>
			</div>

			<Panel title="Groups" description="Mentor-linked groups and their members">
				<div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-2">
						<input
							placeholder="Search groups by name or id"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="rounded-2xl border px-3 py-2 text-sm"
						/>
						<select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="rounded-2xl border px-3 py-2 text-sm">
							<option value="">All levels</option>
							{[...new Set(groups.map((g) => g.level).filter(Boolean))].map((lvl) => (
								<option key={lvl} value={lvl}>{lvl}</option>
							))}
						</select>
						<select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="rounded-2xl border px-3 py-2 text-sm">
							<option value="name_asc">Name ↑</option>
							<option value="name_desc">Name ↓</option>
							<option value="count_desc">Students ↓</option>
							<option value="count_asc">Students ↑</option>
						</select>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
							<tr>
								<th className="px-4 py-3 text-left">Group ID</th>
								<th className="px-4 py-3 text-left">Name</th>
								<th className="px-4 py-3 text-left">Mentor</th>
								<th className="px-4 py-3 text-left">Level</th>
								<th className="px-4 py-3 text-left">Students</th>
														<th className="px-4 py-3 text-left">Description</th>
														<th className="px-4 py-3 text-left">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 bg-white">
							{displayedGroups.length === 0 ? (
								<tr>
									<td className="px-4 py-8 text-sm text-gray-500" colSpan={7}>
										No groups have been created yet.
									</td>
								</tr>
							) : (
								displayedGroups.map((group) => {
									const mentorName =
										mentors.find((mentor) => mentor.id === group.mentorId)?.name ??
										group.mentorId;
									const groupStudentCount = studentsByBatchId[group.id] ?? 0;

									return (
										<tr key={group.id} className="align-top">
											<td className="px-4 py-4 text-sm font-semibold text-gray-900">
												{group.groupId?.toUpperCase() ?? "-"}
											</td>
											<td className="px-4 py-4 text-sm text-gray-700">
												<div className="font-medium text-gray-900">{group.name ?? "-"}</div>
												<div className="mt-1 text-xs text-gray-500">Mongo ID: {group.id}</div>
											</td>
											<td className="px-4 py-4 text-sm text-gray-700">
												{mentorName}
											</td>
											<td className="px-4 py-4 text-sm text-gray-700">
												{formatGroupLevel(group.level)}
											</td>
											<td className="px-4 py-4 text-sm text-gray-700">
												<div className="font-semibold text-gray-900">{groupStudentCount}</div>
												<p className="mt-1 text-xs text-gray-500">students</p>
											</td>
											<td className="px-4 py-4 text-sm text-gray-700">
												{group.description ?? "-"}
											</td>
											<td className="px-4 py-4 text-sm text-gray-700">
												<div className="flex items-center gap-2">
													<Link
														to={`/groups/${group.id}`}
														className="text-teal-600 hover:underline text-sm font-medium"
													>
														View
													</Link>
													{canUpdateBatch ? (
														<button
															type="button"
															onClick={() => openEdit(group)}
															className="text-sm text-gray-600 hover:text-gray-900"
														>
															Edit
														</button>
													) : null}
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</Panel>

			{canCreateBatch ? (
			<Modal open={open} title="Create group" onClose={() => setOpen(false)}>
				<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
					<Controller
						name="mentorId"
						control={control}
						render={({ field }) => (
							<label className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Mentor</span>
								<select
									value={field.value}
									onChange={(e) => field.onChange(e.target.value)}
									className="rounded-2xl border border-gray-300 px-4 py-3 text-gray-900"
								>
									<option value="">Select mentor</option>
									{mentors.map((m) => (
										<option key={m.id} value={m.id}>
											{m.name}
										</option>
									))}
								</select>
							</label>
						)}
					/>
					<div className="grid gap-4 md:grid-cols-2">
						<Controller
							name="level"
							control={control}
							render={({ field }) => (
								<SelectField
									label="Level"
									value={field.value}
									onChange={field.onChange}
									options={[
										{ value: "1", label: "Seed Level 1" },
										{ value: "2", label: "Sprout Level 2" },
										{ value: "3", label: "Root Level 3" },
										{ value: "4", label: "Leaf Level 4" },
										{ value: "5", label: "Bud Level 5" },
									]}
									placeholder="Select level..."
								/>
							)}
						/>
						<Controller
							name="name"
							control={control}
							render={({ field }) => (
								<Field
									label="Group label (optional)"
									value={field.value ?? ""}
									onChange={field.onChange}
								/>
							)}
						/>

					</div>
					<div className="mt-4 flex justify-end">
						<button
							type="submit"
							className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
						>
							Create
						</button>
					</div>
				</form>
			</Modal>
			) : null}

			{canUpdateBatch ? (
			<Modal open={editOpen} title="Edit group" onClose={closeEdit}>
				<form className="grid gap-4" onSubmit={handleSubmit(onEditSubmit)}>
					<Controller
						name="mentorId"
						control={control}
						render={({ field }) => (
							<label className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Mentor</span>
								<select
									value={field.value}
									onChange={(e) => field.onChange(e.target.value)}
									className="rounded-2xl border border-gray-300 px-4 py-3 text-gray-900"
								>
									<option value="">Select mentor</option>
									{mentors.map((m) => (
										<option key={m.id} value={m.id}>
											{m.name}
										</option>
									))}
								</select>
							</label>
						)}
					/>
					<div className="grid gap-4 md:grid-cols-2">
						<Controller
							name="level"
							control={control}
							render={({ field }) => (
								<SelectField
									label="Level"
									value={field.value}
									onChange={field.onChange}
									options={[
										{ value: "1", label: "Seed Level 1" },
										{ value: "2", label: "Sprout Level 2" },
										{ value: "3", label: "Root Level 3" },
										{ value: "4", label: "Leaf Level 4" },
										{ value: "5", label: "Bud Level 5" },
									]}
									placeholder="Select level..."
								/>
							)}
						/>
						<Controller
							name="name"
							control={control}
							render={({ field }) => (
								<Field label="Group label (optional)" value={field.value ?? ""} onChange={field.onChange} />
							)}
						/>
					</div>
					<div className="mt-4 flex justify-end">
						<button type="submit" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
					</div>
				</form>
			</Modal>
			) : null}
		</div>
	);
};

export default GroupsPage;
