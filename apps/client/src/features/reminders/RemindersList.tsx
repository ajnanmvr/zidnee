import type { Reminder } from "@repo/schema";
import type React from "react";
import toast from "react-hot-toast";
import { HiCheckCircle, HiOutlineCalendarDays, HiTrash } from "react-icons/hi2";
import {
	useDeleteReminderMutation,
	useUpdateReminderMutation,
} from "./reminders.mutations.js";

interface RemindersListProps {
	studentId: string;
	reminders: Reminder[];
	isLoading?: boolean;
	onAddNew?: () => void;
	users?: Array<{ id: string; name: string; username: string }>;
}

export const RemindersList: React.FC<RemindersListProps> = ({
	studentId,
	reminders,
	isLoading = false,
	onAddNew,
	users = [],
}) => {
	const updateMutation = useUpdateReminderMutation(studentId);
	const deleteMutation = useDeleteReminderMutation(studentId);

	const handleToggleDone = async (reminder: Reminder) => {
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

	const handleDelete = async (reminderId: string) => {
		try {
			await deleteMutation.mutateAsync(reminderId);
			toast.success("Reminder deleted");
		} catch {
			toast.error("Failed to delete reminder");
		}
	};

	if (isLoading) {
		return <div className="text-sm text-gray-500">Loading reminders...</div>;
	}

	if (reminders.length === 0) {
		return (
			<div className="text-center py-6">
				<p className="text-sm text-gray-500 mb-3">No reminders yet</p>
				{onAddNew && (
					<button
						onClick={onAddNew}
						className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Add Reminder
					</button>
				)}
			</div>
		);
	}

	// Sort by date, incomplete first
	const sorted = [...reminders].sort((a, b) => {
		if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
		return new Date(a.date).getTime() - new Date(b.date).getTime();
	});

	const getUserName = (userId: string) => {
		const user = users.find((u) => u.id === userId);
		return user?.name ?? user?.username ?? "Unknown";
	};

	return (
		<div className="space-y-3">
			{sorted.map((reminder) => (
				<div
					key={reminder.id}
					className={`border rounded-lg p-4 ${
						reminder.isDone
							? "bg-gray-50 border-gray-200"
							: "border-blue-200 bg-blue-50"
					}`}
				>
					<div className="flex items-start justify-between gap-3">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-2">
								<HiOutlineCalendarDays className="w-4 h-4 text-gray-500" />
								<span className="text-sm font-medium text-gray-700">
									{new Date(reminder.date).toLocaleDateString("en-US", {
										weekday: "short",
										year: "numeric",
										month: "short",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
								{reminder.isDone && (
									<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
										Done
									</span>
								)}
							</div>
							<p
								className={`text-sm ${
									reminder.isDone
										? "text-gray-600 line-through"
										: "text-gray-900"
								}`}
							>
								{reminder.note}
							</p>
							<div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
								<span>
									Created by {getUserName(reminder.createdBy)} •{" "}
									{new Date(reminder.createdAt).toLocaleDateString()}
								</span>
								{reminder.assignedTo !== reminder.createdBy && (
									<span>Assigned to {getUserName(reminder.assignedTo)}</span>
								)}
							</div>
						</div>

						<div className="flex items-center gap-2">
							<button
								onClick={() => handleToggleDone(reminder)}
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
								onClick={() => handleDelete(reminder.id)}
								disabled={deleteMutation.isPending}
								className="p-2 rounded-md text-red-500 hover:bg-red-50 transition"
								title="Delete reminder"
							>
								<HiTrash className="w-5 h-5" />
							</button>
						</div>
					</div>
				</div>
			))}
		</div>
	);
};
