import { isToday, isYesterday, isTomorrow, format } from "date-fns";

export const formatTableDate = (date: Date | string): string => {
	const d = typeof date === "string" ? new Date(date) : date;

	if (isToday(d)) {
		return "Today";
	}

	if (isYesterday(d)) {
		return "Yesterday";
	}

	if (isTomorrow(d)) {
		return "Tomorrow";
	}

	// For dates within a week, show "X days ago/later"
	const now = new Date();
	const diffTime = d.getTime() - now.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays >= -6 && diffDays <= 6) {
		if (diffDays < 0) {
			return `${Math.abs(diffDays)} days ago`;
		}
		if (diffDays > 0) {
			return `${diffDays} days later`;
		}
	}

	// For older/future dates, show full date
	return format(d, "dd MMM yyyy, HH:mm");
};

export const getDateLabel = (date: Date | string): string => {
	const d = typeof date === "string" ? new Date(date) : date;
	return format(d, "dd MMM yyyy, HH:mm");
};
