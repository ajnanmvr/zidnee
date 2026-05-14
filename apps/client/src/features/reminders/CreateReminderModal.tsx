import type React from "react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { HiOutlineCalendarDays, HiOutlineXMark } from "react-icons/hi2";
import { useCreateReminderMutation } from "./reminders.mutations.js";

interface CreateReminderModalProps {
	studentId: string;
	isOpen: boolean;
	onClose: () => void;
}

export const CreateReminderModal: React.FC<CreateReminderModalProps> = ({
	studentId,
	isOpen,
	onClose,
}) => {
	const [note, setNote] = useState("");
	const [date, setDate] = useState("");
	const [dateTime, setDateTime] = useState("");
	const mutation = useCreateReminderMutation(studentId);

	useEffect(() => {
		if (!isOpen) {
			setNote("");
			setDate("");
			setDateTime("");
		}
	}, [isOpen]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!note.trim()) {
			toast.error("Reminder note is required");
			return;
		}

		if (!date || !dateTime) {
			toast.error("Date and time are required");
			return;
		}

		try {
			const reminderDateTime = new Date(`${date}T${dateTime}`);
			if (reminderDateTime <= new Date()) {
				toast.error("Reminder date/time must be in the future");
				return;
			}

			mutation.mutate({
				note: note.trim(),
				date: reminderDateTime,
			});

			toast.success("Reminder created");
			onClose();
		} catch (error) {
			if (error instanceof Error) {
				toast.error(`Failed to create reminder: ${error.message}`);
			} else {
				toast.error("Failed to create reminder");
			}
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
				<div className="flex items-center justify-between p-6 border-b">
					<h2 className="text-lg font-semibold">Add Reminder</h2>
					<button
						onClick={onClose}
						disabled={mutation.isPending}
						className="p-1 hover:bg-gray-100 rounded-md"
					>
						<HiOutlineXMark className="w-5 h-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					{/* Note Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Reminder Note <span className="text-red-500">*</span>
						</label>
						<textarea
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="What should you remember?"
							maxLength={500}
							rows={4}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<p className="text-xs text-gray-500 mt-1">
							{note.length}/500 characters
						</p>
					</div>

					{/* Date Field */}
					<div>
						<label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
							<HiOutlineCalendarDays className="w-4 h-4" />
							Date <span className="text-red-500">*</span>
						</label>
						<input
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					{/* Time Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Time <span className="text-red-500">*</span>
						</label>
						<input
							type="time"
							value={dateTime}
							onChange={(e) => setDateTime(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					{/* Buttons */}
					<div className="flex gap-3 pt-4">
						<button
							type="button"
							onClick={onClose}
							disabled={mutation.isPending}
							className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={mutation.isPending}
							className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed font-medium"
						>
							{mutation.isPending ? "Creating..." : "Create Reminder"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
