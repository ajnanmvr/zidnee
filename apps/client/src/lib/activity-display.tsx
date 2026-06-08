import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatActivityDateTime } from "@/lib/utils/date";

export type ActivityEntityLookup = {
	id: string;
	label: string;
	href: string;
};

export type ActivityValueContext = {
	mentors?: Map<string, ActivityEntityLookup>;
};

const IMAGE_URL_RE = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i;

const isImageUrl = (value: unknown): value is string =>
	typeof value === "string" &&
	/^https?:\/\//i.test(value) &&
	(IMAGE_URL_RE.test(value) || /profile-image/i.test(value));

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

const renderActivityFieldValue = (key: string, value: unknown, context?: ActivityValueContext): ReactNode => {
	if (key === "mentorId" && typeof value === "string" && value.trim()) {
		const mentor = context?.mentors?.get(value);
		if (mentor) {
			return (
				<Link to={mentor.href} className="font-semibold text-indigo-600 hover:underline">
					{mentor.label}
				</Link>
			);
		}
		return <span className="text-gray-400">Unknown mentor</span>;
	}

	if (isImageUrl(value)) {
		return (
			<a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-indigo-600 hover:underline">
				<img src={value} alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-gray-200" />
				View image
			</a>
		);
	}

	return formatValue(value);
};

export const formatActivityChangeList = (
	oldValue?: Record<string, unknown>,
	newValue?: Record<string, unknown>,
	context?: ActivityValueContext,
): Array<{ label: string; before: ReactNode; after: ReactNode }> => {
	const keys = new Set<string>([
		...(oldValue ? Object.keys(oldValue) : []),
		...(newValue ? Object.keys(newValue) : []),
	]);

	const isUnchanged = (a: unknown, b: unknown): boolean => {
		if (a === b) return true;
		if (a && b && typeof a === "object" && typeof b === "object") {
			return JSON.stringify(a) === JSON.stringify(b);
		}
		return false;
	};

	return Array.from(keys)
		.filter((key) => !isUnchanged(oldValue?.[key], newValue?.[key]))
		.sort()
		.map((key) => ({
			label: formatActivityFieldTitle(key),
			before: renderActivityFieldValue(key, oldValue?.[key], context),
			after: renderActivityFieldValue(key, newValue?.[key], context),
		}));
};
