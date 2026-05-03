import { CreateTimeSlotPayloadSchema } from "@repo/schema";
import { Controller, useForm } from "react-hook-form";
import { HiPlus } from "react-icons/hi2";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, Panel } from "@/components/dashboard-ui";
import { useTimeSlotsQuery } from "@/features/time-slots/time-slots.queries";
import { useCreateTimeSlotMutation } from "@/features/time-slots/use-create-time-slot-mutation";
import { useSession } from "@/lib/session";

type TimeSlotForm = { label: string };

export const CreateTimeSlotsPage = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const createTimeSlotMutation = useCreateTimeSlotMutation();
	const timeSlotsQuery = useTimeSlotsQuery(token ?? "");
	const { control, handleSubmit, setError, reset } = useForm<TimeSlotForm>({
		defaultValues: { label: "" },
	});

	const onSubmit = async (form: TimeSlotForm) => {
		const validation = CreateTimeSlotPayloadSchema.safeParse(form);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.label?.[0]) {
				setError("label", { type: "manual", message: errors.label[0] });
			}
			return;
		}

		try {
			await createTimeSlotMutation.mutateAsync(validation.data);
			toast.success("Time slot created successfully.");
			reset({ label: "" });
			navigate("/time-slots");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to create time slot");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to create time slot");
		}
	};

	return (
		<Panel title="Time Slots" description="Manage class timing options for the public form">
			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
				<form className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-5" onSubmit={handleSubmit(onSubmit)}>
					<Controller
						name="label"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Time slot label"
								value={field.value}
								onChange={field.onChange}
								placeholder="9:00 AM - 10:00 AM"
								error={fieldState.error?.message}
							/>
						)}
					/>

					<div className="flex flex-wrap gap-2">
						<button
							type="submit"
							className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
							disabled={createTimeSlotMutation.isPending}
						>
							<HiPlus className="h-4 w-4" aria-hidden="true" />
							{createTimeSlotMutation.isPending ? "Creating..." : "Create time slot"}
						</button>
						<Link
							to="/"
							className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
						>
							Cancel
						</Link>
					</div>
				</form>

				<div className="rounded-3xl border border-gray-200 bg-white p-5">
					<h3 className="mb-4 text-sm font-semibold text-gray-900">Current time slots</h3>
					{timeSlotsQuery.isLoading ? (
						<div className="py-8 text-center text-sm text-gray-600">Loading...</div>
					) : timeSlotsQuery.isError ? (
						<div className="py-8 text-center text-sm text-gray-600">Unable to load time slots.</div>
					) : (
						<div className="grid gap-2">
							{(timeSlotsQuery.data?.timeSlots ?? []).map((timeSlot) => (
								<div key={timeSlot.id} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900">
									{timeSlot.label}
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
			</div>
		</Panel>
	);
};