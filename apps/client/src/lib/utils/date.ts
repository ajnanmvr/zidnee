import { format, isTomorrow, isToday, isYesterday } from "date-fns";

const toDate = (date: Date | string): Date => (typeof date === "string" ? new Date(date) : date);

const isValidDate = (date: Date) => !Number.isNaN(date.getTime());

export const formatDetailedDateTime = (date: Date | string): string => {
	const parsed = toDate(date);
	if (!isValidDate(parsed)) {
		return "-";
	}

	return format(parsed, "dd MMM yyyy, hh:mm a");
};

export const formatRelativeDateTime = (date: Date | string): string => {
	const parsed = toDate(date);
	if (!isValidDate(parsed)) {
		return "-";
	}

	const time = format(parsed, "hh:mm a");

	if (isToday(parsed)) {
		return `Today, ${time}`;
	}

	if (isYesterday(parsed)) {
		return `Yesterday, ${time}`;
	}

	if (isTomorrow(parsed)) {
		return `Tomorrow, ${time}`;
	}

	const now = new Date();
	const diffTime = parsed.getTime() - now.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays >= -6 && diffDays <= 6) {
		if (diffDays < 0) {
			const days = Math.abs(diffDays);
			return `${days} day${days === 1 ? "" : "s"} ago, ${time}`;
		}

		if (diffDays > 0) {
			return `${diffDays} day${diffDays === 1 ? "" : "s"} later, ${time}`;
		}
	}

	return formatDetailedDateTime(parsed);
};

export const formatTableDate = (date: Date | string): string => {
	const relative = formatRelativeDateTime(date);
	if (relative === "-") {
		return relative;
	}

	return relative.replace(/,?\s*\d{2}:\d{2}\s[AP]M$/, "");
};

export const getDateLabel = (date: Date | string): string => {
	return formatDetailedDateTime(date);
};

export const formatActivityDateTime = (date: Date | string): string => {
	return formatRelativeDateTime(date);
};
