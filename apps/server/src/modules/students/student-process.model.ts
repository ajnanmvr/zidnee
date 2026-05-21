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
	| "data-confirmed"
	| "mentor-assigned-informed"
	| "student-data-shared"
	| "group-created";

const STUDENT_PROCESS_TASK_LIBRARY: Record<
	StudentProcessTaskKey,
	StudentProcessTaskDefinition
> = {
	"send-welcome-message": {
		label: "Send welcome message",
		actionType: "WHATSAPP",
		dynamic: true,
	},
	"data-confirmed": { label: "Data confirmed" },
	"mentor-assigned-informed": { label: "Mentor assigned & informed" },
	"student-data-shared": { label: "Student data shared" },
	"group-created": { label: "Group created" },
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
			"data-confirmed",
			"mentor-assigned-informed",
			"student-data-shared",
			"group-created",
		],
	},
	BREAK: {
		label: "Break Process",
		taskKeys: [],
	},
	DROPPED: {
		label: "Drop Process",
		taskKeys: [],
	},
};

const buildTask = (key: StudentProcessTaskKey, studentId?: string): StudentProcessTaskDocument => {
	const definition = STUDENT_PROCESS_TASK_LIBRARY[key];
	let whatsappMessage = definition.whatsappMessage;

	if (definition.dynamic && studentId) {
		if (key === "send-welcome-message") {
			const formLink = `http://localhost:5173/form/student/${studentId}`;
			whatsappMessage = `Assalamu Alaikum,
We are contacting you from Zidnee Online Islamic School.
Alhamdulillah, the demo session has been completed and approved. In shaa Allah, we will
now proceed with the final admission process.
Please save this number as Zidnee's official contact number.

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
		"data-confirmed",
		"mentor-assigned-informed",
		"student-data-shared",
		"group-created",
	];

	return {
		label,
		tasks: taskKeys.map((key) => buildTask(key, studentId)),
	};
};
