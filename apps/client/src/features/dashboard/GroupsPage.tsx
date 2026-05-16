import type { CreateBatchPayload } from "@repo/schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiAcademicCap, HiPlus, HiUsers } from "react-icons/hi2";
import { Field, Modal, Panel } from "@/components/dashboard-ui";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { useCreateBatchMutation } from "@/features/batches/use-create-batch-mutation";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";

export const GroupsPage = () => {
	const { token } = useSession();
	const batchesQuery = useBatchesQuery(token);
	const studentsQuery = useStudentsQuery(token);
	const usersQuery = useUsersQuery(token);
	const createBatch = useCreateBatchMutation();
	const groups = useMemo(
		() => (batchesQuery.data?.batches ?? []).filter((b) => b.type === "GROUP"),
		[batchesQuery.data?.batches],
	);
	const mentors = (usersQuery.data?.users ?? []).filter((u) =>
		u.roles.some((r) => r.type === "mentor"),
	);
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
	const [open, setOpen] = useState(false);

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
					? `Group ${response.batch.groupId} created`
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
				<button
					type="button"
					className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
					onClick={() => setOpen(true)}
				>
					<HiPlus className="h-4 w-4" /> Add group
				</button>
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
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 bg-white">
							{groups.length === 0 ? (
								<tr>
									<td className="px-4 py-8 text-sm text-gray-500" colSpan={6}>
										No groups have been created yet.
									</td>
								</tr>
							) : (
								groups.map((group) => {
									const mentorName =
										mentors.find((mentor) => mentor.id === group.mentorId)?.name ??
										group.mentorId;
									const groupStudentCount = studentsByBatchId[group.id] ?? 0;

									return (
										<tr key={group.id} className="align-top">
											<td className="px-4 py-4 text-sm font-semibold text-gray-900">
												{group.groupId ?? "-"}
											</td>
											<td className="px-4 py-4 text-sm text-gray-700">
												<div className="font-medium text-gray-900">{group.name}</div>
												<div className="mt-1 text-xs text-gray-500">Mongo ID: {group.id}</div>
											</td>
											<td className="px-4 py-4 text-sm text-gray-700">
												{mentorName}
											</td>
											<td className="px-4 py-4 text-sm text-gray-700">
												{group.level}
											</td>
											<td className="px-4 py-4 text-sm text-gray-700">
												<div className="font-semibold text-gray-900">{groupStudentCount}</div>
												{groupStudentCount > 0 ? (
													<div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
														{(studentsQuery.data?.students ?? [])
															.filter((student) => student.batchId === group.id)
															.slice(0, 4)
															.map((student) => (
																<span
																	key={student.id}
																	className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700"
																>
																	{student.name ?? student.zid}
																</span>
																))}
														{groupStudentCount > 4 ? (
															<span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
																+{groupStudentCount - 4} more
															</span>
														) : null}
													</div>
												) : (
													<p className="mt-2 text-xs text-gray-500">No students assigned yet.</p>
												)}
											</td>
											<td className="px-4 py-4 text-sm text-gray-700">
												{group.description ?? "-"}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</Panel>

			<Modal open={open} title="Create group" onClose={() => setOpen(false)}>
				<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
					<Controller
						name="name"
						control={control}
						render={({ field }) => (
							<Field
								label="Group name"
								value={field.value}
								onChange={field.onChange}
							/>
						)}
					/>
					<div className="grid gap-4 md:grid-cols-2">
						<Controller
							name="level"
							control={control}
							render={({ field }) => (
								<Field
									label="Level"
									value={field.value}
									onChange={field.onChange}
								/>
							)}
						/>
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
		</div>
	);
};

export default GroupsPage;
