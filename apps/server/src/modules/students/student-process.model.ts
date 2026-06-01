import type { StudentStatus } from "@repo/schema";
import mongoose, { type Model, Schema, type Types } from "mongoose";
import { env } from "../../config/env.js";

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
	archivedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

type StudentProcessTaskDefinition = {
	label: string;
	actionType?: "WHATSAPP" | "FORM_LINK";
	whatsappMessage?: string;
	dynamic?: boolean;
};

type StudentProcessTaskKey =
	| "send-welcome-message"
	| "data-confirmed-and-shared-class-group-awareness"
	| "level-drive-link-shared-to-parent"
	| "data-shared-to-mentor-for-confirmation-and-created-group"
	| "level-teaching-guide-shared-to-ongoing-mentor"
	| "confirmed-data-shared-to-new-mentor"
	| "added-in-parents-group"
	| "cancelled-drive-access"
	| "informed-mentor"
	| "payment-completed"
	| "removed-from-coffee-and-zidnee-app"
	| "remove-from-parents-group";

const STUDENT_PROCESS_TASK_LIBRARY: Record<
	StudentProcessTaskKey,
	StudentProcessTaskDefinition
> = {
	"send-welcome-message": {
		label: "Send welcome message",
		actionType: "WHATSAPP",
		dynamic: true,
	},
	"data-confirmed-and-shared-class-group-awareness": {
		label: "Data confirmed & Shared Class Group Awareness",
	},
	"level-drive-link-shared-to-parent": {
		label: "Level Drive Link Shared to Parent",
	},
	"data-shared-to-mentor-for-confirmation-and-created-group": {
		label: "Data Shared To Mentor for Confirmation & Created Group",
	},
	"level-teaching-guide-shared-to-ongoing-mentor": {
		label: "Level & Teaching Guide Link Shared To Ongoing Mentor",
	},
	"confirmed-data-shared-to-new-mentor": {
		label: "Confirmed data shared to new mentor",
	},
	"added-in-parents-group": {
		label: "Added in parent's Group",
	},
	"cancelled-drive-access": { label: "Cancelled Drive Access" },
	"informed-mentor": { label: "Informed Mentor" },
	"payment-completed": { label: "Payment Completed" },
	"removed-from-coffee-and-zidnee-app": {
		label: "Removed from Coffee and Zidnee App",
	},
	"remove-from-parents-group": {
		label: "Remove from Parents Group",
	},
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
			"send-welcome-message",
			"data-confirmed-and-shared-class-group-awareness",
			"level-drive-link-shared-to-parent",
			"data-shared-to-mentor-for-confirmation-and-created-group",
			"level-teaching-guide-shared-to-ongoing-mentor",
			"confirmed-data-shared-to-new-mentor",
			"added-in-parents-group",
		],
	},
	BREAK: {
		label: "Break Process",
		taskKeys: [],
	},
	DROPPED: {
		label: "Drop Process",
		taskKeys: [
			"cancelled-drive-access",
			"informed-mentor",
			"payment-completed",
			"removed-from-coffee-and-zidnee-app",
			"remove-from-parents-group",
		],
	},
};

const buildTask = (key: StudentProcessTaskKey, studentId?: string): StudentProcessTaskDocument => {
	const definition = STUDENT_PROCESS_TASK_LIBRARY[key];
	let whatsappMessage = definition.whatsappMessage;

	if (definition.dynamic && studentId) {
		if (key === "send-welcome-message") {
			const formLink = `${env.APP_URL}/form/student/${studentId}`;
			whatsappMessage = `*Assalamu Alaikum*, 🤝

We are contacting you from *Zidnee Online Islamic School*.

Alhamdulillah, the demo session has been completed and approved. In shaa Allah, we will now proceed with the final admission process.

📌 *Kindly save this number as Zidnee’s official contact number for all future communications and support*. 🤝

📝 Please fill the form using the link given below:

${formLink}`;
		}
	}

	return {
		key,
		label: definition.label,
		completed: false,
		...(definition.actionType ? { actionType: definition.actionType } : {}),
		...(whatsappMessage ? { whatsappMessage } : {}),
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
		actionType: {
			type: String,
			required: false,
			enum: ["WHATSAPP", "FORM_LINK"],
		},
		whatsappMessage: {
			type: String,
			required: false,
			trim: true,
			maxlength: 1000,
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
		archivedAt: {
			type: Date,
			required: false,
			default: null,
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

export const getStudentProcessTemplate = (status: StudentStatus, studentId?: string) => {
	const template = STUDENT_PROCESS_TEMPLATE_CONFIG[status];
	return {
		label: template.label,
		tasks: template.taskKeys.map((key) => buildTask(key, studentId)),
	};
};

export const getAdmissionProcessTemplate = (
	courseType?: "INDIVIDUAL" | "GROUP",
	studentId?: string,
) => {
	const label =
		courseType === "GROUP" ? "group admission process" : "one to one class admission";

	const taskKeys: StudentProcessTaskKey[] = [
		"send-welcome-message",
		"data-confirmed-and-shared-class-group-awareness",
		"level-drive-link-shared-to-parent",
		"data-shared-to-mentor-for-confirmation-and-created-group",
		"level-teaching-guide-shared-to-ongoing-mentor",
		"confirmed-data-shared-to-new-mentor",
		"added-in-parents-group",
	];

	return {
		label,
		tasks: taskKeys.map((key) => buildTask(key, studentId)),
	};
};
