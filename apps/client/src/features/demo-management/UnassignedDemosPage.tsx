import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/lib/session";
import { usePendingDemoRequestsQuery } from "@/features/leads/leads.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useAssignDemoMentorMutation } from "@/features/leads/use-lead-mutations";
import { Modal } from "@/components/dashboard-ui";
import { HiArrowLeft, HiArrowPath, HiCalendarDays } from "react-icons/hi2";
import toast from "react-hot-toast";
import { Controller, useForm } from "react-hook-form";
import { format } from "date-fns";
import type { LeadResponse } from "@repo/schema";

export const UnassignedDemosPage = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const demosQuery = usePendingDemoRequestsQuery(token);
	const usersQuery = useUsersQuery(token);
	const assignDemoMutation = useAssignDemoMentorMutation();

	const [selectedDemo, setSelectedDemo] = useState<LeadResponse | null>(null);
	const [assignOpen, setAssignOpen] = useState(false);

	const {
		control: assignControl,
		handleSubmit: handleAssignSubmit,
		reset: resetAssign,
		formState: { isSubmitting },
	} = useForm<{
		mentorId: string;
		demoScheduledFor: Date;
	}>({
		defaultValues: {
			mentorId: "",
			demoScheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
		},
	});

	const onAssignMentor = handleAssignSubmit(async (data) => {
		if (!selectedDemo) {
			toast.error("Demo not selected");
			return;
		}

		try {
			await assignDemoMutation.mutateAsync({
				leadId: selectedDemo.id,
				payload: {
					mentorId: data.mentorId,
					demoScheduledFor: data.demoScheduledFor,
				},
			});
			toast.success("Demo assigned successfully");
			setAssignOpen(false);
			setSelectedDemo(null);
			resetAssign();
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error("Failed to assign demo");
			}
		}
	});

	const handleOpenAssign = (demo: LeadResponse) => {
		setSelectedDemo(demo);
		resetAssign();
		setAssignOpen(true);
	};

	const mentors = usersQuery.data?.users.filter((user) => user.roles?.some((role) => (role.type ?? "general") === "mentor")) ?? [];

	if (demosQuery.isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-gray-600">Loading unassigned demos...</p>
			</div>
		);
	}

	const unassignedDemos = demosQuery.data?.leads ?? [];
	const userNameById = new Map(
		(usersQuery.data?.users ?? []).map((user) => [user.id, user.name || user.username]),
	);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
				<div className="flex items-center justify-between px-6 py-4">
					<div className="flex items-center gap-4">
						<button
							type="button"
							onClick={() => navigate("/dashboard")}
							className="rounded-lg hover:bg-gray-100 p-2"
						>
							<HiArrowLeft className="h-6 w-6 text-gray-900" />
						</button>
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Unassigned Demo Requests</h1>
							<p className="mt-1 text-sm text-gray-600">{unassignedDemos.length} demo request(s) waiting for mentor assignment</p>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="mx-auto max-w-7xl px-6 py-8">
				{unassignedDemos.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-12 text-center">
						<HiArrowPath className="mx-auto h-12 w-12 text-gray-300 mb-3" />
						<p className="text-lg font-medium text-gray-700">No unassigned demo requests</p>
						<p className="mt-1 text-sm text-gray-600">All demo requests have mentors assigned</p>
					</div>
				) : (
					<div className="grid gap-4">
						{unassignedDemos.map((demo) => (
							<div
								key={demo.id}
								className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										{/* Lead Info */}
										<div className="flex items-baseline gap-2 mb-3">
											<h3 className="text-lg font-semibold text-gray-900">{demo.name}</h3>
											<span className="text-sm text-gray-600 font-mono">{demo.phone}</span>
										</div>

										{/* Details Grid */}
										<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
											<div>
												<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Level</p>
												<p className="text-sm font-medium text-gray-900">{demo.level}</p>
											</div>
											<div>
												<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Requested</p>
												<p className="text-sm font-medium text-gray-900">
													{demo.demos[demo.demos.length - 1]?.requestedAt
														? format(new Date(demo.demos[demo.demos.length - 1].requestedAt), "MMM dd, h:mm a")
														: "-"}
												</p>
											</div>
											<div>
												<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Assigned To</p>
												<p className="text-sm font-medium text-gray-900">{demo.demoRequestAssignedTo ? (userNameById.get(demo.demoRequestAssignedTo) ?? demo.demoRequestAssignedTo) : "Unassigned"}</p>
											</div>
											<div>
												<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Preference</p>
												<p className="text-sm font-medium text-gray-900">{demo.preferredMentorGender || "-"}</p>
											</div>
											<div>
												<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Start Class</p>
												<p className="text-sm font-medium text-gray-900">{demo.startClassWhen || "-"}</p>
											</div>
											<div>
												<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Demo Availability</p>
												<p className="text-sm font-medium text-gray-900">{demo.demoAvailability || "-"}</p>
											</div>
											<div className="md:col-span-2">
												<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Preferred Time Slots</p>
												<p className="text-sm font-medium text-gray-900">
													{demo.preferredTimeslots?.length ? demo.preferredTimeslots.join(", ") : "-"}
												</p>
											</div>
										</div>

										{/* Notes */}
										{demo.demos[demo.demos.length - 1]?.note && (
											<div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-3">
												<p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Note</p>
												<p className="text-sm text-blue-900">{demo.demos[demo.demos.length - 1].note}</p>
											</div>
										)}
									</div>

									{/* Action Button */}
									<button
										type="button"
										onClick={() => handleOpenAssign(demo)}
										className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
									>
										<HiCalendarDays className="h-4 w-4" />
										Assign Mentor
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Assignment Modal */}
			<Modal
				open={assignOpen}
				title="Assign Mentor for Demo"
				description={selectedDemo ? `Demo for ${selectedDemo.name}` : ""}
				onClose={() => {
					setAssignOpen(false);
					setSelectedDemo(null);
					resetAssign();
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setAssignOpen(false);
								setSelectedDemo(null);
								resetAssign();
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
							onClick={() => void onAssignMentor()}
							disabled={isSubmitting || assignDemoMutation.isPending}
						>
							<HiCalendarDays className="h-4 w-4" />
							{assignDemoMutation.isPending ? "Assigning..." : "Assign Mentor"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleAssignSubmit(onAssignMentor)}>
					{/* Mentor Selection */}
					<Controller
						name="mentorId"
						control={assignControl}
						rules={{ required: "Mentor is required" }}
						render={({ field, fieldState }) => (
							<label className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Select Mentor</span>
								<select
									{...field}
									className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
								>
									<option value="">Choose a mentor...</option>
									{mentors.map((mentor) => (
										<option key={mentor.id} value={mentor.id}>
											{mentor.name || mentor.username}
										</option>
									))}
								</select>
								{fieldState.error?.message ? (
									<p className="text-xs text-red-600">{fieldState.error.message}</p>
								) : null}
							</label>
						)}
					/>

					{/* Date Time Selection */}
					<Controller
						name="demoScheduledFor"
						control={assignControl}
						rules={{
							required: "Demo time is required",
							validate: (value) => {
								if (value <= new Date()) {
									return "Demo time must be in the future";
								}
								return true;
							},
						}}
						render={({ field, fieldState }) => (
							<label className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Demo Scheduled For</span>
								<input
									type="datetime-local"
									value={
										field.value instanceof Date
											? format(field.value, "yyyy-MM-dd'T'HH:mm")
											: ""
									}
									onChange={(e) => {
										field.onChange(new Date(e.target.value));
									}}
									className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
								/>
								{fieldState.error?.message ? (
									<p className="text-xs text-red-600">{fieldState.error.message}</p>
								) : null}
							</label>
						)}
					/>
				</form>
			</Modal>
		</div>
	);
};
