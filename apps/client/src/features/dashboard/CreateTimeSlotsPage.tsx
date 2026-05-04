import { CreateTimeSlotPayloadSchema } from "@repo/schema";
import { Controller, useForm, useWatch } from "react-hook-form";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi2";
import toast from "react-hot-toast";
import { useState } from "react";
import { ApiError } from "@/api/request";
import { Field, Modal, Panel } from "@/components/dashboard-ui";
import { useTimeSlotsQuery } from "@/features/time-slots/time-slots.queries";
import { useCreateTimeSlotMutation } from "@/features/time-slots/use-create-time-slot-mutation";
import { useUpdateTimeSlotMutation } from "@/features/time-slots/use-update-time-slot-mutation";
import { useDeleteTimeSlotMutation } from "@/features/time-slots/use-delete-time-slot-mutation";
import { useSession } from "@/lib/session";

type TimeSlotForm = {
	durationMinutes: number;
	timesPerWeek: number;
};

export const CreateTimeSlotsPage = () => {
	const { token } = useSession();
	const createTimeSlotMutation = useCreateTimeSlotMutation();
	const timeSlotsQuery = useTimeSlotsQuery(token ?? "");
	const [addOpen, setAddOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [editingSlot, setEditingSlot] = useState<null | { id: string; durationMinutes: number; timesPerWeek: number }>(null);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
	const { control, handleSubmit, setError, reset } = useForm<TimeSlotForm>({
		defaultValues: { durationMinutes: 45, timesPerWeek: 3 },
	});
	const durationMinutes = useWatch({ control, name: "durationMinutes" });
	const timesPerWeek = useWatch({ control, name: "timesPerWeek" });

	const onSubmit = async (form: TimeSlotForm) => {
		const validation = CreateTimeSlotPayloadSchema.safeParse(form);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.durationMinutes?.[0]) {
				setError("durationMinutes", { type: "manual", message: errors.durationMinutes[0] });
			}
			if (errors.timesPerWeek?.[0]) {
				setError("timesPerWeek", { type: "manual", message: errors.timesPerWeek[0] });
			}
			return;
		}

		try {
			await createTimeSlotMutation.mutateAsync(validation.data);
			toast.success("Time slot created successfully.");
			reset({ durationMinutes: 45, timesPerWeek: 3 });
			setAddOpen(false);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to create time slot");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to create time slot");
		}
	};

	const updateMutation = useUpdateTimeSlotMutation();

	const onEditSubmit = async (form: TimeSlotForm) => {
		if (!editingSlot) return;
		const validation = CreateTimeSlotPayloadSchema.safeParse(form);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.durationMinutes?.[0]) {
				setError("durationMinutes", { type: "manual", message: errors.durationMinutes[0] });
			}
			if (errors.timesPerWeek?.[0]) {
				setError("timesPerWeek", { type: "manual", message: errors.timesPerWeek[0] });
			}
			return;
		}

		try {
			await updateMutation.mutateAsync({ id: editingSlot.id, payload: validation.data });
			toast.success("Time slot updated successfully.");
			setEditOpen(false);
			setEditingSlot(null);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to update time slot");
				return;
			}
			toast.error(error instanceof Error ? error.message : "Unable to update time slot");
		}
	};

	const deleteMutation = useDeleteTimeSlotMutation();

	const confirmDelete = async () => {
		if (!deletingSlotId) return;
		try {
			await deleteMutation.mutateAsync(deletingSlotId);
			toast.success("Time slot deleted.");
			setConfirmDeleteOpen(false);
			setDeletingSlotId(null);
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to delete time slot");
				return;
			}
			toast.error(error instanceof Error ? error.message : "Unable to delete time slot");
		}
	};

	return (
		<Panel
			title="Time Slots"
			description="Manage class timing options for the public form"
			action={
				<button
					type="button"
					onClick={() => setAddOpen(true)}
					className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a5d4a]"
				>
					<HiPlus className="h-4 w-4" aria-hidden="true" />
					Add slots
				</button>
			}
		>
			<div className="rounded-3xl border border-gray-200 bg-white p-5">
				<h3 className="mb-4 text-sm font-semibold text-gray-900">Current time slots</h3>
				{timeSlotsQuery.isLoading ? (
					<div className="py-8 text-center text-sm text-gray-600">Loading...</div>
				) : timeSlotsQuery.isError ? (
					<div className="py-8 text-center text-sm text-gray-600">Unable to load time slots.</div>
				) : (
					<div className="grid gap-2">
						{(timeSlotsQuery.data?.timeSlots ?? []).map((timeSlot) => (
							<div key={timeSlot.id} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 flex items-start justify-between">
								<div>
									<p className="font-semibold">{timeSlot.label}</p>
									<p className="text-xs text-gray-600">
										{timeSlot.durationMinutes} minutes · {timeSlot.timesPerWeek} times/week
									</p>
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										className="rounded-full p-2 hover:bg-gray-100"
										onClick={() => {
										setEditingSlot({ id: timeSlot.id, durationMinutes: timeSlot.durationMinutes, timesPerWeek: timeSlot.timesPerWeek });
										reset({ durationMinutes: timeSlot.durationMinutes, timesPerWeek: timeSlot.timesPerWeek });
										setEditOpen(true);
										}}
										aria-label="Edit"
									>
										<HiPencil className="h-4 w-4 text-gray-700" />
									</button>
									<button
										type="button"
										className="rounded-full p-2 hover:bg-gray-100"
										onClick={() => {
											setDeletingSlotId(timeSlot.id);
											setConfirmDeleteOpen(true);
										}}
										aria-label="Delete"
									>
										<HiTrash className="h-4 w-4 text-red-600" />
									</button>
								</div>
							</div>
						))}
						{(timeSlotsQuery.data?.timeSlots ?? []).length === 0 ? (
							<div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-600">
								No time slots created yet.
							</div>
						) : null}
					</div>
				)}
			</div>

			<Modal
				open={addOpen}
				title="Add time slots"
				description="Create a structured class slot for the public form"
				onClose={() => {
					setAddOpen(false);
					reset({ durationMinutes: 45, timesPerWeek: 3 });
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setAddOpen(false);
								reset({ durationMinutes: 45, timesPerWeek: 3 });
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
							onClick={() => void handleSubmit(onSubmit)()}
							disabled={createTimeSlotMutation.isPending}
						>
							<HiPlus className="h-4 w-4" aria-hidden="true" />
							{createTimeSlotMutation.isPending ? "Creating..." : "Create time slot"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
					<div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm text-gray-700">
						Create structured slots like 45 minutes, 3 times a week.
					</div>
					<Controller
						name="durationMinutes"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Class duration (minutes)"
								type="number"
								value={String(field.value)}
								onChange={(value) => field.onChange(Number(value))}
								placeholder="45"
								error={fieldState.error?.message}
							/>
						)}
					/>
					<Controller
						name="timesPerWeek"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Times per week"
								type="number"
								value={String(field.value)}
								onChange={(value) => field.onChange(Number(value))}
								placeholder="3"
								error={fieldState.error?.message}
							/>
						)}
					/>
					<div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
						Preview: {`${durationMinutes ?? 0} minutes class, ${timesPerWeek ?? 0} times a week`}
					</div>
				</form>
			</Modal>

			<Modal
				open={editOpen}
				title="Edit time slot"
				description="Update an existing time slot"
				onClose={() => {
					setEditOpen(false);
					setEditingSlot(null);
					reset({ durationMinutes: 45, timesPerWeek: 3 });
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
							setEditOpen(false);
							setEditingSlot(null);
							reset({ durationMinutes: 45, timesPerWeek: 3 });
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
							onClick={() => void handleSubmit(onEditSubmit)()}
							disabled={updateMutation.isPending}
						>
							{updateMutation.isPending ? "Saving..." : "Save changes"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleSubmit(onEditSubmit)}>
					<Controller
						name="durationMinutes"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Class duration (minutes)"
								type="number"
								value={String(field.value)}
								onChange={(value) => field.onChange(Number(value))}
								placeholder="45"
								error={fieldState.error?.message}
							/>
						)}
					/>
					<Controller
						name="timesPerWeek"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Times per week"
								type="number"
								value={String(field.value)}
								onChange={(value) => field.onChange(Number(value))}
								placeholder="3"
								error={fieldState.error?.message}
							/>
						)}
					/>
					<div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
						Preview: {`${durationMinutes ?? 0} minutes class, ${timesPerWeek ?? 0} times a week`}
					</div>
				</form>
			</Modal>

			<Modal
				open={confirmDeleteOpen}
				title="Delete time slot"
				description="This will remove the time slot from public selection. This action can be undone by re-creating the slot."
				onClose={() => {
					setConfirmDeleteOpen(false);
					setDeletingSlotId(null);
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
							setConfirmDeleteOpen(false);
							setDeletingSlotId(null);
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
							onClick={() => void confirmDelete()}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</button>
					</>
				}
			>
				<div className="py-4 text-sm text-gray-700">Are you sure you want to delete this time slot?</div>
			</Modal>
		</Panel>
	);
};