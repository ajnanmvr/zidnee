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

export const formatActivityDateTime = (date: Date | string): string => {
	const d = typeof date === "string" ? new Date(date) : date;
	const time = format(d, "hh:mm a");

	if (isToday(d)) {
		return `Today, ${time}`;
	}

	if (isYesterday(d)) {
		return `Yesterday, ${time}`;
	}

	if (isTomorrow(d)) {
		return `Tomorrow, ${time}`;
	}

	// For dates within a week, show "X days ago/later" with time
	const now = new Date();
	const diffTime = d.getTime() - now.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays >= -6 && diffDays <= 6) {
		if (diffDays < 0) {
			return `${Math.abs(diffDays)} days ago, ${time}`;
		}
		if (diffDays > 0) {
			return `${diffDays} days later, ${time}`;
		}
	}

	// For older/future dates, show full date with time
	return format(d, "dd MMM yyyy, hh:mm a");
};
