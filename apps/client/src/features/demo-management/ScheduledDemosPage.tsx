import type { LeadResponse } from "@repo/schema";
import { FOLLOW_UP_PERIOD_MS } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { format, isPast, isToday } from "date-fns";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
	HiArrowLeft,
	HiCalendarDays,
	HiCheckCircle,
	HiExclamationTriangle,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import { DateCell } from "@/components/DateCell";
import { Modal } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import { useDemoRequestsQuery } from "@/features/leads/leads.queries";
import {
	useAssignDemoMentorMutation,
	useMarkDemoCompletedMutation,
} from "@/features/leads/use-lead-mutations";
import { useUsersQuery } from "@/features/users/users.queries";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";
import { DemoOutcomeModal } from "./DemoOutcomeModal";
import { RequirementsModal } from "./RequirementsModal";

export const ScheduledDemosPage = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const canAssignDemo = useHasPermission("LEAD_DEMO_ASSIGN");
	const canCompleteDemo = useHasPermission("LEAD_DEMO_COMPLETE");
	const canViewMyScheduledDemos = useHasPermission("DEMO_SCHEDULED_READ_MY");
	const canViewAllScheduledDemos = useHasPermission("DEMO_SCHEDULED_READ_ALL");
	const demosQuery = useDemoRequestsQuery(token);
	const usersQuery = useUsersQuery(token);
	const markDemoCompletedMutation = useMarkDemoCompletedMutation();
	const reassignDemoMutation = useAssignDemoMentorMutation();
	const currentUserId = meQuery.data?.id ?? "";

	const [selectedDemo, setSelectedDemo] = useState<LeadResponse | null>(null);
	const [completeOpen, setCompleteOpen] = useState(false);
	const [rescheduleOpen, setRescheduleOpen] = useState(false);
	const [requirementsOpen, setRequirementsOpen] = useState(false);
	const [selectedRequirements, setSelectedRequirements] =
		useState<LeadResponse | null>(null);
	const [outcomeOpen, setOutcomeOpen] = useState(false);
	const [outcomeDemoForAction, setOutcomeDemoForAction] =
		useState<LeadResponse | null>(null);
	const [viewScope, setViewScope] = useState<"mine" | "all">(
		canViewMyScheduledDemos ? "mine" : "all",
	);

	const canToggleScope = canViewMyScheduledDemos && canViewAllScheduledDemos;

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
			demoScheduledFor: new Date(Date.now() + FOLLOW_UP_PERIOD_MS.lead),
		},
	});

	const handleOutcomeProceed = async () => {
		if (!outcomeDemoForAction) {
			toast.error("Demo not selected");
			return;
		}

		try {
			await markDemoCompletedMutation.mutateAsync({
				leadId: outcomeDemoForAction.id,
				note: "",
			});
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error("Failed to mark demo as completed");
		}
	};

	useEffect(() => {
		if (canViewMyScheduledDemos) {
			setViewScope((current) => (current === "all" ? "all" : "mine"));
			return;
		}

		if (canViewAllScheduledDemos) {
			setViewScope("all");
		}
	}, [canViewAllScheduledDemos, canViewMyScheduledDemos]);

	const onMarkCompleted = handleCompleteSubmit(async (data) => {
		if (!selectedDemo) {
			toast.error("Demo not selected");
			return;
		}

		try {
			await markDemoCompletedMutation.mutateAsync({
				leadId: selectedDemo.id,
				note: data.note,
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
		setOutcomeDemoForAction(demo);
		setOutcomeOpen(true);
	};

	const handleOpenReschedule = (demo: LeadResponse) => {
		const latestDemo = demo.demos[demo.demos.length - 1];
		setSelectedDemo(demo);
		resetReschedule({
			mentorId: latestDemo?.mentorId || "",
			demoScheduledFor: latestDemo?.demoScheduledFor
				? new Date(latestDemo.demoScheduledFor)
				: new Date(Date.now() + 24 * 60 * 60 * 1000),
		});
		setRescheduleOpen(true);
	};

	const handleOpenRequirements = (demo: LeadResponse) => {
		setSelectedRequirements(demo);
		setRequirementsOpen(true);
	};

	const getLatestDemo = (demo: LeadResponse) =>
		demo.demos[demo.demos.length - 1] ?? null;

	const getDemoScheduleStatus = (demo: LeadResponse) => {
		const scheduledFor = getLatestDemo(demo)?.demoScheduledFor;
		if (!scheduledFor) {
			return "unscheduled" as const;
		}

		const scheduledDate = new Date(scheduledFor);
		if (Number.isNaN(scheduledDate.getTime())) {
			return "unscheduled" as const;
		}

		if (isToday(scheduledDate)) {
			return "today" as const;
		}

		return isPast(scheduledDate) ? ("overdue" as const) : ("upcoming" as const);
	};

	const mentors =
		usersQuery.data?.users.filter((user) =>
			user.roles?.some((role) => (role.type ?? "admin") === "mentor"),
		) ?? [];

	const scheduledDemos = demosQuery.data?.leads ?? [];
	const visibleDemos =
		viewScope === "mine"
			? scheduledDemos.filter(
					(demo) => demo.demoRequestAssignedTo === currentUserId,
				)
			: scheduledDemos;
	const userNameById = new Map(
		(usersQuery.data?.users ?? []).map((user) => [
			user.id,
			user.name || user.username,
		]),
	);
	const overdueDemos = visibleDemos.filter(
		(demo) => getDemoScheduleStatus(demo) === "overdue",
	);
	const todayDemos = visibleDemos.filter(
		(demo) => getDemoScheduleStatus(demo) === "today",
	);
	const upcomingDemos = visibleDemos.filter(
		(demo) => getDemoScheduleStatus(demo) === "upcoming",
	);
	const activeScopeLabel = viewScope === "mine" ? "Assigned to me" : "Assigned to all";

	const columns: ColumnDef<LeadResponse>[] = [
		{
			accessorKey: "name",
			header: "Name",
			cell: ({ row }) => (
				<div>
					<p className="font-semibold text-gray-900">{row.original.name}</p>
					<p className="text-xs text-gray-500 font-mono">
						{row.original.phone}
					</p>
				</div>
			),
		},
		{
			accessorKey: "level",
			header: "Level",
			cell: ({ row }) => (
				<span className="font-medium text-gray-900">
					{row.original.level || "-"}
				</span>
			),
		},
		{
			id: "attempt",
			header: "Attempt",
			accessorFn: (row) => row.demos.length,
			cell: ({ row }) => (
				<span className="font-medium text-gray-900">
					{Math.max(1, row.original.demos.length || 1)}
					{Math.max(1, row.original.demos.length || 1) === 1
						? "st"
						: Math.max(1, row.original.demos.length || 1) === 2
							? "nd"
							: Math.max(1, row.original.demos.length || 1) === 3
								? "rd"
								: "th"}{" "}
					demo
				</span>
			),
		},
		{
			id: "scheduledFor",
			header: "Scheduled For",
			accessorFn: (row) => getLatestDemo(row)?.demoScheduledFor ?? "",
			cell: ({ row }) => {
				const scheduledFor = getLatestDemo(row.original)?.demoScheduledFor;
				const scheduleStatus = getDemoScheduleStatus(row.original);
				const scheduleTone =
					scheduleStatus === "overdue"
						? "text-red-700"
						: scheduleStatus === "today"
							? "text-amber-700"
							: "text-emerald-700";
				return (
					<DateCell
						date={scheduledFor ?? ""}
						className={`font-semibold ${scheduleTone}`}
					/>
				);
			},
		},
		{
			id: "mentor",
			header: "Mentor",
			accessorFn: (row) => {
				const latestDemo = getLatestDemo(row);
				return latestDemo?.mentorId
					? (userNameById.get(latestDemo.mentorId) ?? latestDemo.mentorId)
					: "-";
			},
			cell: ({ row }) => {
				const latestDemo = getLatestDemo(row.original);
				return (
					<span className="font-medium text-gray-900">
						{latestDemo?.mentorId
							? (userNameById.get(latestDemo.mentorId) ?? latestDemo.mentorId)
							: "-"}
					</span>
				);
			},
		},
		{
			id: "status",
			header: "Status",
			accessorFn: (row) => {
				const scheduleStatus = getDemoScheduleStatus(row);
				if (scheduleStatus === "unscheduled") {
					return "Unscheduled";
				}
				if (scheduleStatus === "today") {
					return "Today";
				}
				return scheduleStatus === "overdue" ? "Overdue" : "Upcoming";
			},
			cell: ({ row }) => {
				const scheduleStatus = getDemoScheduleStatus(row.original);
				const badgeClass =
					scheduleStatus === "overdue"
						? "bg-red-100 text-red-700"
						: scheduleStatus === "today"
							? "bg-amber-100 text-amber-700"
							: "bg-emerald-100 text-emerald-700";
				const label =
					scheduleStatus === "unscheduled"
						? "Unscheduled"
						: scheduleStatus === "today"
							? "Today"
							: scheduleStatus === "overdue"
								? "Overdue"
								: "Upcoming";
				return (
					<span
						className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
					>
						{label}
					</span>
				);
			},
		},
		{
			header: "Actions",
			enableSorting: false,
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => handleOpenRequirements(row.original)}
						className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-slate-200 transition-colors"
					>
						Requirements
					</button>
					{canAssignDemo ? (
						<button
							type="button"
							onClick={() => handleOpenReschedule(row.original)}
							className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
						>
							<HiCalendarDays className="h-4 w-4" />
							Reschedule
						</button>
					) : null}
					{canCompleteDemo ? (
						<button
							type="button"
							onClick={() => handleOpenComplete(row.original)}
							className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
						>
							<HiCheckCircle className="h-4 w-4" />
							Complete
						</button>
					) : null}
				</div>
			),
		},
	];

	if (demosQuery.isLoading || meQuery.isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-gray-600">Loading scheduled demos...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
				<div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-4">
						<button
							type="button"
							onClick={() => navigate("/dashboard")}
							className="rounded-lg hover:bg-gray-100 p-2"
						>
							<HiArrowLeft className="h-6 w-6 text-gray-900" />
						</button>
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Scheduled Demos
							</h1>
							<p className="mt-1 text-sm text-gray-600">
								{visibleDemos.length} demo(s) in the current view
							</p>
						</div>
					</div>
					{canToggleScope ? (
						<div className="inline-flex rounded-2xl border border-gray-200 bg-gray-50 p-1">
							<button
								type="button"
								onClick={() => setViewScope("mine")}
								className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${viewScope === "mine" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
							>
								Assigned to me
							</button>
							<button
								type="button"
								onClick={() => setViewScope("all")}
								className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${viewScope === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
							>
								All assignments
							</button>
						</div>
					) : (
						<div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
							{activeScopeLabel}
						</div>
					)}
				</div>
			</div>

			{/* Content */}
			<div className="mx-auto max-w-7xl px-6 py-8">
				{visibleDemos.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-12 text-center">
						<HiCalendarDays className="mx-auto h-12 w-12 text-gray-300 mb-3" />
						<p className="text-lg font-medium text-gray-700">
							No scheduled demos in this view
						</p>
						<p className="mt-1 text-sm text-gray-600">
							{canToggleScope ? "Switch to All assignments to see every scheduled demo" : "This queue scope is currently empty."}
						</p>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex flex-wrap gap-2 text-sm">
							<span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-700">
								Overdue: {overdueDemos.length}
							</span>
							<span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
								Today: {todayDemos.length}
							</span>
							<span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
								Upcoming: {upcomingDemos.length}
							</span>
						</div>
						<DataTable
							columns={columns}
							data={visibleDemos}
							exportFilename="scheduled-demos"
							searchPlaceholder="Search scheduled demos..."
							initialSorting={[{ id: "scheduledFor", desc: false }]}
						/>

						{/* Overdue Section */}
						{false && (
							<section>
								<div className="mb-4 flex items-center gap-2">
									<HiExclamationTriangle className="h-5 w-5 text-red-600" />
									<h2 className="text-lg font-semibold text-red-700">
										Overdue Demos ({overdueDemos.length})
									</h2>
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
														<h3 className="text-lg font-semibold text-gray-900">
															{demo.name}
														</h3>
														<span className="text-sm text-gray-600 font-mono">
															{demo.phone}
														</span>
													</div>

													{/* Details Grid */}
													<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
																Level
															</p>
															<p className="text-sm font-medium text-gray-900">
																{demo.level}
															</p>
														</div>
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
																Mentor
															</p>
															<p className="text-sm font-medium text-gray-900">
																{demo.demos[demo.demos.length - 1]?.mentorId
																	? "Assigned"
																	: "-"}
															</p>
														</div>
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">
																Scheduled For
															</p>
															<p className="text-sm font-bold text-red-700">
																{demo.demos.at(-1)?.demoScheduledFor ? (
																	<DateCell
																		date={
																			demo.demos.at(-1)?.demoScheduledFor ?? ""
																		}
																		className="font-bold text-red-700"
																	/>
																) : (
																	"-"
																)}
															</p>
														</div>
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
																Assigned To
															</p>
															<p className="text-sm font-medium text-gray-900">
																{demo.demoRequestAssignedTo
																	? (userNameById.get(
																			demo.demoRequestAssignedTo,
																		) ?? demo.demoRequestAssignedTo)
																	: "-"}
															</p>
														</div>
													</div>
												</div>

												{/* Action Buttons */}
												<div className="flex gap-2 whitespace-nowrap">
													<button
														type="button"
														onClick={() => handleOpenRequirements(demo)}
														className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-slate-200 transition-colors"
													>
														📋 Requirements
													</button>
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
						{false && (
							<section>
								<div className="mb-4">
									<h2 className="text-lg font-semibold text-gray-900">
										Upcoming Demos ({upcomingDemos.length})
									</h2>
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
														<h3 className="text-lg font-semibold text-gray-900">
															{demo.name}
														</h3>
														<span className="text-sm text-gray-600 font-mono">
															{demo.phone}
														</span>
													</div>

													{/* Details Grid */}
													<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
																Level
															</p>
															<p className="text-sm font-medium text-gray-900">
																{demo.level}
															</p>
														</div>
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
																Mentor
															</p>
															<p className="text-sm font-medium text-gray-900">
																{demo.demos[demo.demos.length - 1]?.mentorId
																	? "Assigned"
																	: "-"}
															</p>
														</div>
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
																Scheduled For
															</p>
															<p className="text-sm font-medium text-emerald-700">
																{demo.demos.at(-1)?.demoScheduledFor ? (
																	<DateCell
																		date={
																			demo.demos.at(-1)?.demoScheduledFor ?? ""
																		}
																		className="font-medium text-emerald-700"
																	/>
																) : (
																	"-"
																)}
															</p>
														</div>
														<div>
															<p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
																Assigned To
															</p>
															<p className="text-sm font-medium text-gray-900">
																{demo.demoRequestAssignedTo
																	? (userNameById.get(
																			demo.demoRequestAssignedTo,
																		) ?? demo.demoRequestAssignedTo)
																	: "-"}
															</p>
														</div>
													</div>
												</div>

												{/* Action Buttons */}
												<div className="flex gap-2 whitespace-nowrap">
													<button
														type="button"
														onClick={() => handleOpenRequirements(demo)}
														className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-slate-200 transition-colors"
													>
														📋 Requirements
													</button>
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
						{canCompleteDemo ? (
							<button
								type="button"
								className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
								onClick={() => void onMarkCompleted()}
								disabled={markDemoCompletedMutation.isPending}
							>
								<HiCheckCircle className="h-4 w-4" />
								{markDemoCompletedMutation.isPending
									? "Completing..."
									: "Mark Completed"}
							</button>
						) : null}
					</>
				}
			>
				<form className="grid gap-4" onSubmit={onMarkCompleted}>
					<div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex gap-3">
						<HiExclamationTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
						<p className="text-sm text-amber-800">
							<strong>Note:</strong> Marking a demo as completed is permanent
							and cannot be undone.
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
				description={
					selectedDemo ? `Reschedule demo for ${selectedDemo.name}` : ""
				}
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
						{canAssignDemo ? (
							<button
								type="button"
								className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
								onClick={() => void onReschedule()}
								disabled={reassignDemoMutation.isPending}
							>
								<HiCalendarDays className="h-4 w-4" />
								{reassignDemoMutation.isPending
									? "Rescheduling..."
									: "Reschedule"}
							</button>
						) : null}
					</>
				}
			>
				<form className="grid gap-4" onSubmit={onReschedule}>
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
									<p className="text-xs text-red-600">
										{fieldState.error.message}
									</p>
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
									<p className="text-xs text-red-600">
										{fieldState.error.message}
									</p>
								) : null}
							</label>
						)}
					/>
				</form>
			</Modal>

			<RequirementsModal
				open={requirementsOpen}
				lead={selectedRequirements}
				onClose={() => {
					setRequirementsOpen(false);
					setSelectedRequirements(null);
				}}
			/>

			<DemoOutcomeModal
				open={outcomeOpen}
				demo={outcomeDemoForAction}
				onClose={() => {
					setOutcomeOpen(false);
					setOutcomeDemoForAction(null);
				}}
				onProceed={handleOutcomeProceed}
			/>
		</div>
	);
};
