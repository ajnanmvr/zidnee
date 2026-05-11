import type { LeadResponse } from "@repo/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiArrowLeft, HiArrowPath, HiCalendarDays } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import { DateCell } from "@/components/DateCell";
import { Modal } from "@/components/dashboard-ui";
import { useMeQuery } from "@/features/auth/auth.queries";
import { usePendingDemoRequestsQuery } from "@/features/leads/leads.queries";
import { useAssignDemoMentorMutation } from "@/features/leads/use-lead-mutations";
import { useTimeSlotsQuery } from "@/features/time-slots/time-slots.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useSession } from "@/lib/session";
import { RequirementsModal } from "./RequirementsModal";

export const UnassignedDemosPage = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const meQuery = useMeQuery(token);
	const demosQuery = usePendingDemoRequestsQuery(token);
	const usersQuery = useUsersQuery(token);
	const timeSlotsQuery = useTimeSlotsQuery(token);
	const assignDemoMutation = useAssignDemoMentorMutation();
	const currentUserId = meQuery.data?.id ?? "";

	const [selectedDemo, setSelectedDemo] = useState<LeadResponse | null>(null);
	const [assignOpen, setAssignOpen] = useState(false);
	const [requirementsOpen, setRequirementsOpen] = useState(false);
	const [selectedRequirements, setSelectedRequirements] =
		useState<LeadResponse | null>(null);
	const [viewScope, setViewScope] = useState<"mine" | "all">("mine");

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
		// Pre-populate with user's preferred demo availability time
		const scheduledDate = demo.demoAvailability
			? new Date(demo.demoAvailability)
			: new Date(Date.now() + 24 * 60 * 60 * 1000);
		resetAssign({
			mentorId: "",
			demoScheduledFor: scheduledDate,
		});
		setAssignOpen(true);
	};

	const handleOpenRequirements = (demo: LeadResponse) => {
		setSelectedRequirements(demo);
		setRequirementsOpen(true);
	};

	const mentors =
		usersQuery.data?.users.filter((user) =>
			user.roles?.some((role) => (role.type ?? "admin") === "mentor"),
		) ?? [];

	const unassignedDemos = demosQuery.data?.leads ?? [];
	const visibleDemos =
		viewScope === "mine"
			? unassignedDemos.filter(
					(demo) => demo.demoRequestAssignedTo === currentUserId,
				)
			: unassignedDemos;
	const userNameById = new Map(
		(usersQuery.data?.users ?? []).map((user) => [
			user.id,
			user.name || user.username,
		]),
	);

	const formatDemoAttemptLabel = (attemptNumber: number) => {
		const suffix =
			attemptNumber === 1
				? "st"
				: attemptNumber === 2
					? "nd"
					: attemptNumber === 3
						? "rd"
						: "th";
		return `${attemptNumber}${suffix} demo`;
	};

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
			header: "Attempt",
			cell: ({ row }) => (
				<span className="font-medium text-gray-900">
					{formatDemoAttemptLabel(Math.max(1, row.original.demos.length || 1))}
				</span>
			),
			accessorFn: (row) => row.demos.length,
		},
		{
			id: "requestedAt",
			header: "Requested",
			accessorFn: (row) => row.demos[row.demos.length - 1]?.requestedAt ?? "",
			cell: ({ row }) => (
				<DateCell
					date={
						row.original.demos[row.original.demos.length - 1]?.requestedAt ?? ""
					}
					className="font-medium text-gray-900"
				/>
			),
		},
		{
			header: "Assigned To",
			accessorFn: (row) =>
				userNameById.get(row.demoRequestAssignedTo ?? "") ?? "Unassigned",
			cell: ({ row }) => (
				<span className="font-medium text-gray-900">
					{row.original.demoRequestAssignedTo
						? (userNameById.get(row.original.demoRequestAssignedTo) ??
							row.original.demoRequestAssignedTo)
						: "Unassigned"}
				</span>
			),
		},
		{
			header: "Re-demo Reason",
			accessorFn: (row) => row.demos[row.demos.length - 1]?.note ?? "",
			cell: ({ row }) => (
				<span className="text-gray-700">
					{row.original.demos[row.original.demos.length - 1]?.note || "-"}
				</span>
			),
		},
		{
			header: "Actions",
			enableSorting: false,
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => handleOpenRequirements(row.original)}
						className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-slate-200 transition-colors"
						title="View requirements and copy for WhatsApp"
					>
						Requirements
					</button>
					<button
						type="button"
						onClick={() => handleOpenAssign(row.original)}
						className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
					>
						<HiCalendarDays className="h-4 w-4" />
						Assign Mentor
					</button>
				</div>
			),
		},
	];

	if (demosQuery.isLoading || meQuery.isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-gray-600">Loading unassigned demos...</p>
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
								Unassigned Demo Requests
							</h1>
							<p className="mt-1 text-sm text-gray-600">
								{visibleDemos.length} demo request(s) in the current view
							</p>
						</div>
					</div>
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
				</div>
			</div>

			{/* Content */}
			<div className="mx-auto max-w-7xl px-6 py-8">
				{visibleDemos.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-12 text-center">
						<HiArrowPath className="mx-auto h-12 w-12 text-gray-300 mb-3" />
						<p className="text-lg font-medium text-gray-700">
							No demo requests in this view
						</p>
						<p className="mt-1 text-sm text-gray-600">
							Switch to All assignments to see the full queue
						</p>
					</div>
				) : (
					<DataTable
						columns={columns}
						data={visibleDemos}
						exportFilename="unassigned-demo-requests"
						searchPlaceholder="Search unassigned demo requests..."
						initialSorting={[{ id: "requestedAt", desc: false }]}
					/>
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
				<form className="grid gap-4" onSubmit={onAssignMentor}>
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
				timeSlots={timeSlotsQuery.data?.timeSlots}
				onClose={() => {
					setRequirementsOpen(false);
					setSelectedRequirements(null);
				}}
			/>
		</div>
	);
};
