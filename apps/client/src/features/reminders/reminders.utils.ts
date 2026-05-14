import { isAfter, isBefore, isToday, isTomorrow, startOfDay } from "date-fns";

export type ReminderDueStatus = "pastDue" | "today" | "tomorrow" | "upcoming";

export const getReminderDueStatus = (dateValue: string | Date): ReminderDueStatus => {
	const dueDate = startOfDay(new Date(dateValue));
	const today = startOfDay(new Date());

	if (isBefore(dueDate, today)) {
		return "pastDue";
	}

	if (isToday(dueDate)) {
		return "today";
	}

	if (isTomorrow(dueDate)) {
		return "tomorrow";
	}

	return isAfter(dueDate, today) ? "upcoming" : "today";
};

export const getReminderDueToneClasses = (status: ReminderDueStatus) => {
	switch (status) {
		case "pastDue":
			return {
				badge: "bg-red-100 text-red-800",
				date: "text-red-700",
				border: "border-red-200",
				background: "bg-red-50",
			};
		case "today":
			return {
				badge: "bg-amber-100 text-amber-800",
				date: "text-amber-700",
				border: "border-amber-200",
				background: "bg-amber-50",
			};
		case "tomorrow":
			return {
				badge: "bg-blue-100 text-blue-800",
				date: "text-blue-700",
				border: "border-blue-200",
				background: "bg-blue-50",
			};
		case "upcoming":
		default:
			return {
				badge: "bg-emerald-100 text-emerald-800",
				date: "text-emerald-700",
				border: "border-emerald-200",
				background: "bg-white",
			};
	}
};

export const formatReminderDate = (dateValue: string | Date) => {
	return new Date(dateValue).toLocaleDateString("en-US", {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};
