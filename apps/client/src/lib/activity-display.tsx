import type { ReactNode } from "react";
import { formatActivityDateTime } from "@/lib/utils/date";

const formatPrimitive = (value: unknown): string => {
	if (value === null || value === undefined || value === "") {
		return "Not set";
	}

	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}

	if (typeof value === "number") {
		return Number.isFinite(value) ? String(value) : "Not set";
	}

	if (typeof value === "string") {
		const parsedDate = new Date(value);
		if (!Number.isNaN(parsedDate.getTime()) && /\d{4}-\d{2}-\d{2}T/.test(value)) {
			return formatActivityDateTime(parsedDate);
		}

		return value.trim() || "Not set";
	}

	if (value instanceof Date) {
		return formatActivityDateTime(value);
	}

	return String(value);
};

const humanizeKey = (key: string): string => {
	return key
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.replace(/\b(id|zid)\b/gi, (match) => match.toUpperCase())
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^./, (char) => char.toUpperCase());
};

const formatValue = (value: unknown): ReactNode => {
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return "Not set";
		}

		return value.map((item) => formatPrimitive(item)).join(", ");
	}

	if (value && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) {
			return "Not set";
		}

		return entries
			.map(([key, item]) => `${humanizeKey(key)}: ${formatPrimitive(item)}`)
			.join(" · ");
	}

	return formatPrimitive(value);
};

export const formatActivityFieldTitle = (key: string): string => {
	const known: Record<string, string> = {
		status: "Status",
		name: "Name",
		phone: "Phone",
		email: "Email",
		level: "Level",
		courseType: "Course Type",
		mentorId: "Mentor",
		batchId: "Batch",
		processId: "Process",
		processLabel: "Process",
		nextFollowUpAt: "Next follow-up",
		customNextFollowUpAt: "Custom next follow-up",
		inactiveFrom: "Break from",
		inactiveUntil: "Break until",
		dropReason: "Drop reason",
		dropTemporary: "Temporary drop",
		oralAssessmentDone: "Oral assessment",
		writtenAssessmentDone: "Written assessment",
		levelAssessmentDone: "Level assessment",
		admittedBy: "Admitted by",
		demoScheduledFor: "Demo scheduled for",
		demoReason: "Demo reason",
		note: "Note",
	};

	return known[key] ?? humanizeKey(key);
};

export const formatActivityValue = (value: unknown): ReactNode => {
	return formatValue(value);
};

export const formatActivityChangeList = (
	oldValue?: Record<string, unknown>,
	newValue?: Record<string, unknown>,
): Array<{ label: string; before: ReactNode; after: ReactNode }> => {
	const keys = new Set<string>([
		...(oldValue ? Object.keys(oldValue) : []),
		...(newValue ? Object.keys(newValue) : []),
	]);

	return Array.from(keys).sort().map((key) => ({
		label: formatActivityFieldTitle(key),
		before: formatActivityValue(oldValue?.[key]),
		after: formatActivityValue(newValue?.[key]),
	}));
};
