import { exactZidPattern, ZidService, zidPattern } from "../zid/zid.service.js";
import { type StudentDocument, StudentModel } from "./student.model.js";

export const STUDENT_IDENTITY_PREFIX = "ZID";

const studentZidOptions = (prefix: string) => ({
	prefix,
	field: "zid",
	findLastId: async () => {
		const last = await StudentModel.findOne({ zid: zidPattern(prefix) })
			.sort({ createdAt: -1, _id: -1 })
			.select({ zid: 1 })
			.lean<Pick<StudentDocument, "zid"> | null>();
		return last?.zid;
	},
	exists: async (id: string) =>
		Boolean(await StudentModel.exists({ zid: exactZidPattern(id) })),
});

/** ZID/ZIG for a new student: `manual` if given, else next after the last created. */
export const resolveStudentZid = (prefix: string, manual?: string) =>
	ZidService.resolve({ ...studentZidOptions(prefix), manual });

/** Converts a duplicate-key race on create into a ZID conflict the user can resolve. */
export const studentZidConflict = (prefix: string, zid: string) =>
	ZidService.conflict(studentZidOptions(prefix), zid);
