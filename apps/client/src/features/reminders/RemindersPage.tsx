import type React from "react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
	HiArrowLeft,
	HiCheckCircle,
	HiOutlineCalendarDays,
	HiTrash,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import {
	useDeleteReminderMutation,
	useGetAllReminders,
	useUpdateReminderMutation,
} from "./reminders.mutations.js";
import { useUsersQuery } from "@/features/users/users.queries.js";
import { useSession } from "@/lib/session.js";

export const RemindersPage = () => {
	const navigate = useNavigate();
	const { token } = useSession();
	const usersQuery = useUsersQuery(token);
	const [sortBy, setSortBy] = useState<"date" | "createdAt">("date");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [filterDone, setFilterDone] = useState<"all" | "pending" | "done">(
		"all",
	);

	const remindersQuery = useGetAllReminders({
		isDone: filterDone === "all" ? undefined : filterDone === "done",
		sortBy,
		sortOrder,
	});

	const pendingCount = useMemo(() => {
		return (remindersQuery.data ?? []).filter((r) => !r.isDone).length;
	}, [remindersQuery.data]);

	const doneCount = useMemo(() => {
		return (remindersQuery.data ?? []).filter((r) => r.isDone).length;
	}, [remindersQuery.data]);

	const reminders = remindersQuery.data ?? [];

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
				<div className="flex items-center gap-3 mb-4">
					<button
						onClick={() => navigate(-1)}
						className="text-gray-600 hover:text-gray-900"
					>
						<HiArrowLeft className="w-5 h-5" />
					</button>
					<h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
				</div>

				<div className="grid grid-cols-3 gap-4">
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
						<p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
							Pending
						</p>
						<p className="text-2xl font-bold text-gray-900 mt-1">
							{pendingCount}
						</p>
					</div>
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
						<p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
							Done
						</p>
						<p className="text-2xl font-bold text-gray-900 mt-1">{doneCount}</p>
					</div>
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
						<p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
							Total
						</p>
						<p className="text-2xl font-bold text-gray-900 mt-1">
							{pendingCount + doneCount}
						</p>
					</div>
				</div>
			</div>

			{/* Controls */}
			<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{/* Filter */}
					<div>
						<label className="text-sm font-medium text-gray-700 block mb-2">
							Status
						</label>
						<select
							value={filterDone}
							onChange={(e) =>
								setFilterDone(e.target.value as "all" | "pending" | "done")
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="all">All</option>
							<option value="pending">Pending</option>
							<option value="done">Done</option>
						</select>
					</div>

					{/* Sort By */}
					<div>
						<label className="text-sm font-medium text-gray-700 block mb-2">
							Sort By
						</label>
						<select
							value={sortBy}
							onChange={(e) =>
								setSortBy(e.target.value as "date" | "createdAt")
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="date">Due Date</option>
							<option value="createdAt">Created Date</option>
						</select>
					</div>

					{/* Sort Order */}
					<div>
						<label className="text-sm font-medium text-gray-700 block mb-2">
							Order
						</label>
						<select
							value={sortOrder}
							onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="asc">Ascending</option>
							<option value="desc">Descending</option>
						</select>
					</div>
				</div>
			</div>

			{/* Reminders List */}
			<div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
				{remindersQuery.isLoading ? (
					<div className="p-8 text-center text-gray-500">
						Loading reminders...
					</div>
				) : reminders.length === 0 ? (
					<div className="p-8 text-center text-gray-500">
						{filterDone === "all"
							? "No reminders yet"
							: `No ${filterDone} reminders`}
					</div>
				) : (
					<div className="divide-y">
						{reminders.map((reminder) => (
							<ReminderRow
								key={reminder.id}
								reminder={reminder}
								users={usersQuery.data?.users ?? []}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

interface ReminderRowProps {
	reminder: NonNullable<
		Awaited<ReturnType<typeof useGetAllReminders>["data"]>
	>[number];
	users: Array<{ id: string; name: string; username: string }>;
}

const ReminderRow: React.FC<ReminderRowProps> = ({ reminder, users }) => {
	const updateMutation = useUpdateReminderMutation(""); // Pass empty, used only for mutation pattern
	const deleteMutation = useDeleteReminderMutation("");

	const createdByUser = useMemo(() => {
		return users.find((u: { id: string; name: string; username: string }) => u.id === reminder.createdBy);
	}, [users, reminder.createdBy]);

	const assignedToUser = useMemo(() => {
		return users.find((u: { id: string; name: string; username: string }) => u.id === reminder.assignedTo);
	}, [users, reminder.assignedTo]);

	const handleToggleDone = async () => {
		try {
			await updateMutation.mutateAsync({
				reminderId: reminder.id,
				payload: { isDone: !reminder.isDone },
			});
			toast.success(
				reminder.isDone
					? "Reminder marked as pending"
					: "Reminder marked as done",
			);
		} catch {
			toast.error("Failed to update reminder");
		}
	};

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync(reminder.id);
			toast.success("Reminder deleted");
		} catch {
			toast.error("Failed to delete reminder");
		}
	};

	const dueDate = new Date(reminder.date);
	dueDate.setHours(0, 0, 0, 0);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const isOverdue = dueDate < today && !reminder.isDone;
	const isToday = dueDate.getTime() === today.getTime() && !reminder.isDone;

	return (
		<div
			className={`p-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition ${
				reminder.isDone ? "bg-gray-50" : ""
			}`}
		>
			<div className="flex-1">
				<div className="flex items-center gap-2 mb-2">
					<HiOutlineCalendarDays className="w-4 h-4 text-gray-500" />
					<span
						className={`text-sm font-medium ${
							isOverdue
								? "text-red-600"
								: isToday
									? "text-amber-600"
									: "text-gray-700"
						}`}
					>
						{dueDate.toLocaleDateString("en-US", {
							weekday: "short",
							year: "numeric",
							month: "short",
							day: "numeric",
						})}
					</span>

					{isOverdue && (
						<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
							Overdue
						</span>
					)}
					{isToday && (
						<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
							Today
						</span>
					)}
					{reminder.isDone && (
						<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
							Done
						</span>
					)}
				</div>
				<p
					className={`text-sm ${
						reminder.isDone ? "text-gray-600 line-through" : "text-gray-900"
					}`}
				>
					{reminder.note}
				</p>
				<div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
					<span>
						Created by {createdByUser?.name ?? createdByUser?.username ?? "Unknown"} •{" "}
						{new Date(reminder.createdAt).toLocaleDateString()}
					</span>
					{reminder.assignedTo !== reminder.createdBy && (
						<span>
							Assigned to{" "}
							{assignedToUser?.name ?? assignedToUser?.username ?? "Unknown"}
						</span>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					onClick={handleToggleDone}
					disabled={updateMutation.isPending}
					className={`p-2 rounded-md transition ${
						reminder.isDone
							? "text-green-600 bg-green-50 hover:bg-green-100"
							: "text-gray-400 hover:bg-gray-100"
					}`}
					title={reminder.isDone ? "Mark as pending" : "Mark as done"}
				>
					<HiCheckCircle className="w-5 h-5" />
				</button>
				<button
					onClick={handleDelete}
					disabled={deleteMutation.isPending}
					className="p-2 rounded-md text-red-500 hover:bg-red-50 transition"
					title="Delete reminder"
				>
					<HiTrash className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
};
