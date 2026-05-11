import type {
	Course,
	CreateCoursePayload,
	UpdateCoursePayload,
} from "@repo/schema";
import { type CourseDocument, CourseModel } from "./course.model.js";

const toCourse = (doc: CourseDocument): Course => {
	return {
		id: doc._id.toString(),
		name: doc.name,
		level: doc.level,
		description: doc.description,
		prefix: doc.prefix,
		isActive: doc.isActive,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
};

export const CourseService = {
	create: async (payload: CreateCoursePayload): Promise<Course> => {
		const course = await CourseModel.create({
			name: payload.name,
			level: payload.level,
			description: payload.description,
			prefix: payload.prefix,
		});

		return toCourse(course.toObject() as CourseDocument);
	},

	findById: async (id: string): Promise<Course | null> => {
		const course = await CourseModel.findById(id).lean<CourseDocument | null>();
		return course ? toCourse(course) : null;
	},

	findAll: async (): Promise<Course[]> => {
		const courses = await CourseModel.find({ isActive: true }).lean<
			CourseDocument[]
		>();
		return courses.map(toCourse);
	},

	update: async (
		id: string,
		payload: UpdateCoursePayload,
	): Promise<Course | null> => {
		const course = await CourseModel.findByIdAndUpdate(
			id,
			{
				$set: {
					name: payload.name,
					level: payload.level,
					description: payload.description,
					prefix: payload.prefix,
					isActive: payload.isActive,
				},
			},
			{ returnDocument: "after" },
		).lean<CourseDocument | null>();

		return course ? toCourse(course) : null;
	},

	delete: async (id: string): Promise<boolean> => {
		const result = await CourseModel.findByIdAndDelete(id);
		return result !== null;
	},
};
