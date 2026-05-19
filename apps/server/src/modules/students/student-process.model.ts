import type { StudentStatus } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";

export type StudentProcessTaskDocument = {
	key: string;
	label: string;
	completed: boolean;
	completedAt?: Date | null;
	actionType?: "WHATSAPP" | "FORM_LINK";
	whatsappMessage?: string;
};

export type StudentProcessDocument = {
	_id: Types.ObjectId;
	studentId: Types.ObjectId;
	status: StudentStatus;
	label: string;
	tasks: StudentProcessTaskDocument[];
	createdAt: Date;
	updatedAt: Date;
};

type StudentProcessTaskDefinition = {
	label: string;
	actionType?: "WHATSAPP" | "FORM_LINK";
	whatsappMessage?: string;
};

type StudentProcessTaskKey =
	| "verify-contact-details"
	| "collect-basic-profile"
	| "send-form-link"
	| "send-profile-form-link"
	| "send-welcome-message"
	| "confirm-form-submission"
	| "assign-mentor"
	| "allocate-batch"
	| "schedule-first-class"
	| "capture-break-reason"
	| "set-break-window"
	| "pause-follow-ups"
	| "plan-rejoin-check"
	| "capture-dropout-reason"
	| "close-open-follow-ups"
	| "archive-student"
	| "notify-ownership-team";

const STUDENT_PROCESS_TASK_LIBRARY: Record<
	StudentProcessTaskKey,
	StudentProcessTaskDefinition
> = {
	"verify-contact-details": { label: "Verify contact details" },
	"collect-basic-profile": { label: "Collect basic profile" },
	"send-form-link": { label: "Send form link" },
	"send-profile-form-link": {
		label: "Send profile form link",
		actionType: "FORM_LINK",
		whatsappMessage:
			"Please complete the form below and upload your profile image.",
	},
	"send-welcome-message": {
		label: "Send welcome message",
		actionType: "WHATSAPP",
		whatsappMessage: `Assalamu Alaikum,
We are contacting you from Zidnee Online Islamic School.
Alhamdulillah, the demo session has been completed and approved. In shaa Allah, we will now proceed with the final admission process.
Please save this number as Zidnee's official contact number.`,
	},
	"confirm-form-submission": { label: "Confirm form submission" },
	"assign-mentor": { label: "Assign mentor" },
	"allocate-batch": { label: "Allocate batch" },
	"schedule-first-class": { label: "Schedule first class" },
	"capture-break-reason": { label: "Capture break reason" },
	"set-break-window": { label: "Set break window" },
	"pause-follow-ups": { label: "Pause follow-ups" },
	"plan-rejoin-check": { label: "Plan rejoin check" },
	"capture-dropout-reason": { label: "Capture dropout reason" },
	"close-open-follow-ups": { label: "Close open follow-ups" },
	"archive-student": { label: "Archive student" },
	"notify-ownership-team": { label: "Notify ownership team" },
} as const;

type StudentProcessTemplateConfig = {
	label: string;
	taskKeys: StudentProcessTaskKey[];
};

const STUDENT_PROCESS_TEMPLATE_CONFIG: Record<
	StudentStatus,
	StudentProcessTemplateConfig
> = {
	STUDENT: {
		label: "Student Admission Process",
		taskKeys: [
			"verify-contact-details",
			"collect-basic-profile",
			"send-form-link",
				"send-profile-form-link",
			"send-welcome-message",
			"confirm-form-submission",
			"assign-mentor",
			"allocate-batch",
			"schedule-first-class",
		],
	},
	BREAK: {
		label: "Break Process",
		taskKeys: [
			"capture-break-reason",
			"set-break-window",
			"pause-follow-ups",
			"plan-rejoin-check",
			"notify-ownership-team",
		],
	},
	DROPPED: {
		label: "Drop Process",
		taskKeys: [
			"capture-dropout-reason",
			"close-open-follow-ups",
			"archive-student",
			"notify-ownership-team",
		],
	},
};

const buildTask = (key: StudentProcessTaskKey): StudentProcessTaskDocument => {
	return {
		key,
		label: STUDENT_PROCESS_TASK_LIBRARY[key].label,
		completed: false,
		...(STUDENT_PROCESS_TASK_LIBRARY[key].actionType
			? { actionType: STUDENT_PROCESS_TASK_LIBRARY[key].actionType }
			: {}),
		...(STUDENT_PROCESS_TASK_LIBRARY[key].whatsappMessage
			? { whatsappMessage: STUDENT_PROCESS_TASK_LIBRARY[key].whatsappMessage }
			: {}),
	};
};

const studentProcessTaskSchema = new Schema<StudentProcessTaskDocument>(
	{
		key: {
			type: String,
			required: true,
			trim: true,
			maxlength: 80,
		},
		label: {
			type: String,
			required: true,
			trim: true,
			maxlength: 150,
		},
		completed: {
			type: Boolean,
			required: true,
			default: false,
		},
		completedAt: {
			type: Date,
			required: false,
			default: null,
		},
	},
	{ _id: false },
);

const studentProcessSchema = new Schema<StudentProcessDocument>(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: "Student",
			required: true,
			unique: true,
			index: true,
		},
		status: {
			type: String,
			required: true,
			enum: ["STUDENT", "BREAK", "DROPPED"],
		},
		label: {
			type: String,
			required: true,
			trim: true,
			maxlength: 150,
		},
		tasks: {
			type: [studentProcessTaskSchema],
			required: true,
			default: [],
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

export const StudentProcessModel =
	(mongoose.models.StudentProcess as
		| Model<StudentProcessDocument>
		| undefined) ??
	mongoose.model<StudentProcessDocument>(
		"StudentProcess",
		studentProcessSchema,
	);

export const getStudentProcessTemplate = (status: StudentStatus) => {
	const template = STUDENT_PROCESS_TEMPLATE_CONFIG[status];
	return {
		label: template.label,
		tasks: template.taskKeys.map(buildTask),
	};
};

export const getAdmissionProcessTemplate = (
	courseType?: "INDIVIDUAL" | "GROUP",
) => {
	const label =
		courseType === "GROUP" ? "group admission process" : "one to one class admission";

	// Use the welcome message and the profile form link task
	const taskKeys: StudentProcessTaskKey[] = [
		"send-welcome-message",
		"send-profile-form-link",
	];

	return {
		label,
		tasks: taskKeys.map(buildTask),
	};
};
