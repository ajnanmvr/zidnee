import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/lib/session";
import { useDemoRequestsQuery } from "@/features/leads/leads.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useMarkDemoCompletedMutation, useAssignDemoMentorMutation } from "@/features/leads/use-lead-mutations";
import { Modal } from "@/components/dashboard-ui";
import { HiArrowLeft, HiCheckCircle, HiCalendarDays, HiExclamationTriangle } from "react-icons/hi2";
import toast from "react-hot-toast";
import { Controller, useForm } from "react-hook-form";
import { format, isPast } from "date-fns";
import type { LeadResponse } from "@repo/schema";

export const ScheduledDemosPage = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const demosQuery = useDemoRequestsQuery(token);
	const usersQuery = useUsersQuery(token);
	const markDemoCompletedMutation = useMarkDemoCompletedMutation();
	const reassignDemoMutation = useAssignDemoMentorMutation();

	const [selectedDemo, setSelectedDemo] = useState<LeadResponse | null>(null);
	const [completeOpen, setCompleteOpen] = useState(false);
	const [rescheduleOpen, setRescheduleOpen] = useState(false);

	const {
		control: completeControl,
		handleSubmit: handleCompleteSubmit,
		reset: resetComplete,
	} = useForm<{
		note?: string;
	}>({
		defaultValues: {
			note: "",
		},
	});

	const {
		control: rescheduleControl,
		handleSubmit: handleRescheduleSubmit,
		reset: resetReschedule,
	} = useForm<{
		mentorId: string;
		demoScheduledFor: Date;
	}>({
		defaultValues: {
			mentorId: "",
			demoScheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
		},
	});

	const onMarkCompleted = handleCompleteSubmit(async (data) => {
		if (!selectedDemo) {
			toast.error("Demo not selected");
			return;
		}

		try {
			await markDemoCompletedMutation.mutateAsync({
				leadId: selectedDemo.id,
				payload: { note: data.note },
			});
			toast.success("Demo marked as completed");
			setCompleteOpen(false);
			setSelectedDemo(null);
			resetComplete();
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error("Failed to mark demo as completed");
			}
		}
	});

	const onReschedule = handleRescheduleSubmit(async (data) => {
		if (!selectedDemo) {
			toast.error("Demo not selected");
			return;
		}

		try {
			await reassignDemoMutation.mutateAsync({
				leadId: selectedDemo.id,
				payload: {
					mentorId: data.mentorId,
					demoScheduledFor: data.demoScheduledFor,
				},
			});
			toast.success("Demo rescheduled successfully");
			setRescheduleOpen(false);
			setSelectedDemo(null);
			resetReschedule();
		} catch (error) {
			if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error("Failed to reschedule demo");
			}
		}
	});

	const handleOpenComplete = (demo: LeadResponse) => {
		setSelectedDemo(demo);
		resetComplete();
		setCompleteOpen(true);
	};

	const handleOpenReschedule = (demo: LeadResponse) => {
		const latestDemo = demo.demos[demo.demos.length - 1];
		setSelectedDemo(demo);
		resetReschedule({
			mentorId: latestDemo?.mentorId || "",
			demoScheduledFor: latestDemo?.demoScheduledFor ? new Date(latestDemo.demoScheduledFor) : new Date(Date.now() + 24 * 60 * 60 * 1000),
		});
		setRescheduleOpen(true);
	};

	const mentors = usersQuery.data?.users.filter((user) => user.roles?.some((role) => (role.type ?? "general") === "mentor")) ?? [];

	if (demosQuery.isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-gray-600">Loading scheduled demos...</p>
			</div>
		);
	}

	const scheduledDemos = demosQuery.data?.leads ?? [];
	const overdueDemos = scheduledDemos.filter(
		(demo) => demo.demos[demo.demos.length - 1]?.demoScheduledFor && isPast(new Date(demo.demos[demo.demos.length - 1].demoScheduledFor))
	);
	const upcomingDemos = scheduledDemos.filter(
		(demo) => !demo.demos[demo.demos.length - 1]?.demoScheduledFor || !isPast(new Date(demo.demos[demo.demos.length - 1].demoScheduledFor))
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
							<h1 className="text-2xl font-bold text-gray-900">Scheduled Demos</h1>
							<p className="mt-1 text-sm text-gray-600">{scheduledDemos.length} demo(s) assigned</p>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="mx-auto max-w-7xl px-6 py-8">
				{scheduledDemos.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-12 text-center">
						<HiCalendarDays className="mx-auto h-12 w-12 text-gray-300 mb-3" />
						<p className="text-lg font-medium text-gray-700">No scheduled demos</p>
						<p className="mt-1 text-sm text-gray-600">There are no demos assigned yet</p>
					</div>
				) : (
					<div className="grid gap-8">
						{/* Overdue Section */}
						{overdueDemos.length > 0 && (
							<section>
								<div className="mb-4 flex items-center gap-2">
									<HiExclamationTriangle className="h-5 w-5 text-red-600" />
									<h2 className="text-lg font-semibold text-red-700">Overdue Demos ({overdueDemos.length})</h2>
								</div>
								<div className="grid gap-4">
									{overdueDemos.map((demo) => (
										<div
											key={demo.id}
											className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-5 hover:shadow-md transition-shadow"
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
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Mentor</p>
															<p className="text-sm font-medium text-gray-900">{demo.demos[demo.demos.length - 1]?.mentorId ? "Assigned" : "-"}</p>
														</div>
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">Scheduled For</p>
															<p className="text-sm font-bold text-red-700">
																{demo.demos[demo.demos.length - 1]?.demoScheduledFor
																	? format(new Date(demo.demos[demo.demos.length - 1].demoScheduledFor), "MMM dd, h:mm a")
																	: "-"}
															</p>
														</div>
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Assigned To</p>
															<p className="text-sm font-medium text-gray-900">{demo.assignedTo}</p>
														</div>
													</div>
												</div>

												{/* Action Buttons */}
												<div className="flex gap-2 whitespace-nowrap">
													<button
														type="button"
														onClick={() => handleOpenReschedule(demo)}
														className="inline-flex items-center gap-2 rounded-2xl border border-red-600 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
													>
														<HiCalendarDays className="h-4 w-4" />
														Reschedule
													</button>
													<button
														type="button"
														onClick={() => handleOpenComplete(demo)}
														className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
													>
														<HiCheckCircle className="h-4 w-4" />
														Complete
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							</section>
						)}

						{/* Upcoming Section */}
						{upcomingDemos.length > 0 && (
							<section>
								<div className="mb-4">
									<h2 className="text-lg font-semibold text-gray-900">Upcoming Demos ({upcomingDemos.length})</h2>
								</div>
								<div className="grid gap-4">
									{upcomingDemos.map((demo) => (
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
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Mentor</p>
															<p className="text-sm font-medium text-gray-900">{demo.demos[demo.demos.length - 1]?.mentorId ? "Assigned" : "-"}</p>
														</div>
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Scheduled For</p>
															<p className="text-sm font-medium text-emerald-700">
																{demo.demos[demo.demos.length - 1]?.demoScheduledFor
																	? format(new Date(demo.demos[demo.demos.length - 1].demoScheduledFor), "MMM dd, h:mm a")
																	: "-"}
															</p>
														</div>
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Assigned To</p>
															<p className="text-sm font-medium text-gray-900">{demo.assignedTo}</p>
														</div>
													</div>
												</div>

												{/* Action Buttons */}
												<div className="flex gap-2 whitespace-nowrap">
													<button
														type="button"
														onClick={() => handleOpenReschedule(demo)}
														className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
													>
														<HiCalendarDays className="h-4 w-4" />
														Reschedule
													</button>
													<button
														type="button"
														onClick={() => handleOpenComplete(demo)}
														className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
													>
														<HiCheckCircle className="h-4 w-4" />
														Complete
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							</section>
						)}
					</div>
				)}
			</div>

			{/* Mark Completed Modal */}
			<Modal
				open={completeOpen}
				title="Mark Demo as Completed"
				description={selectedDemo ? `Demo for ${selectedDemo.name}` : ""}
				onClose={() => {
					setCompleteOpen(false);
					setSelectedDemo(null);
					resetComplete();
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setCompleteOpen(false);
								setSelectedDemo(null);
								resetComplete();
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
							onClick={() => void onMarkCompleted()}
							disabled={markDemoCompletedMutation.isPending}
						>
							<HiCheckCircle className="h-4 w-4" />
							{markDemoCompletedMutation.isPending ? "Completing..." : "Mark Completed"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleCompleteSubmit(onMarkCompleted)}>
					<div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-3">
						<HiExclamationTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
						<p className="text-sm text-amber-800">
							<strong>Note:</strong> Marking a demo as completed is permanent and cannot be undone.
						</p>
					</div>

					<Controller
						name="note"
						control={completeControl}
						render={({ field }) => (
							<label className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Completion Note (optional)</span>
								<textarea
									{...field}
									placeholder="Add notes about demo completion..."
									rows={3}
									className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
								/>
							</label>
						)}
					/>
				</form>
			</Modal>

			{/* Reschedule Modal */}
			<Modal
				open={rescheduleOpen}
				title="Reschedule Demo"
				description={selectedDemo ? `Reschedule demo for ${selectedDemo.name}` : ""}
				onClose={() => {
					setRescheduleOpen(false);
					setSelectedDemo(null);
					resetReschedule();
				}}
				footer={
					<>
						<button
							type="button"
							className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
							onClick={() => {
								setRescheduleOpen(false);
								setSelectedDemo(null);
								resetReschedule();
							}}
						>
							Cancel
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
							onClick={() => void onReschedule()}
							disabled={reassignDemoMutation.isPending}
						>
							<HiCalendarDays className="h-4 w-4" />
							{reassignDemoMutation.isPending ? "Rescheduling..." : "Reschedule"}
						</button>
					</>
				}
			>
				<form className="grid gap-4" onSubmit={handleRescheduleSubmit(onReschedule)}>
					{/* Mentor Selection */}
					<Controller
						name="mentorId"
						control={rescheduleControl}
						rules={{ required: "Mentor is required" }}
						render={({ field, fieldState }) => (
							<label className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Mentor</span>
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
						control={rescheduleControl}
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
								<span>New Demo Time</span>
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
