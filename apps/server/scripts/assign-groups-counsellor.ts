/**
 * Sets the counsellor of every group (batch type GROUP) to one counsellor.
 * Optionally also group students (courseType GROUP) and group mentors (ZMG).
 *
 *   pnpm --filter @repo/api exec tsx scripts/assign-groups-counsellor.ts                   # dry run
 *   pnpm --filter @repo/api exec tsx scripts/assign-groups-counsellor.ts --apply           # groups only
 *   ... --apply --with-students --with-mentors                                              # also those
 *
 * Options: --username=<counsellor username> (default "Muthu"),
 *          --zid=<expected counsellor ZID>  (default "ZIC006", safety check)
 */
import mongoose, { Types } from "mongoose";
import { env } from "../src/config/env.js";
import { RoleModel } from "../src/modules/roles/role.model.js";
import { BatchModel } from "../src/modules/students/batch.model.js";
import { StudentModel } from "../src/modules/students/student.model.js";
import { UserModel } from "../src/modules/users/user.model.js";

const arg = (name: string, fallback: string) =>
	process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;

const APPLY = process.argv.includes("--apply");
const WITH_STUDENTS = process.argv.includes("--with-students");
const WITH_MENTORS = process.argv.includes("--with-mentors");
const COUNSELLOR_USERNAME = arg("username", "Muthu");
const EXPECTED_ZID = arg("zid", "ZIC006");

type UserLean = {
	_id: Types.ObjectId;
	name?: string;
	username: string;
	roleIds: string[];
	mentorType?: string;
	counsellorId?: string;
	zids?: Record<string, string | undefined>;
};

const main = async () => {
	await mongoose.connect(env.MONGO_URI);

	const counsellor = await UserModel.findOne({ username: COUNSELLOR_USERNAME }).lean<UserLean | null>();
	if (!counsellor) throw new Error(`No user with username "${COUNSELLOR_USERNAME}"`);
	const counsellorZid = counsellor.zids?.counsellor ?? counsellor.counsellorId;
	if (counsellorZid?.toUpperCase() !== EXPECTED_ZID.toUpperCase()) {
		throw new Error(`"${COUNSELLOR_USERNAME}" has counsellor ZID ${counsellorZid ?? "(none)"}, expected ${EXPECTED_ZID}. Aborting.`);
	}
	const counsellorRoleIds = (await RoleModel.find({ type: "counsellor" }).distinct("_id")).map(String);
	if (!counsellor.roleIds.some((id) => counsellorRoleIds.includes(id))) {
		throw new Error(`"${COUNSELLOR_USERNAME}" does not have a counsellor role. Aborting.`);
	}
	const counsellorId = counsellor._id;
	const counsellorIdStr = counsellorId.toString();

	const users = await UserModel.find().select({ name: 1, username: 1 }).lean<UserLean[]>();
	const nameOf = (id?: unknown) => {
		if (!id) return "(none)";
		const u = users.find((x) => x._id.toString() === String(id));
		return u ? `${u.name ?? ""} (@${u.username})` : String(id);
	};
	const tally = (ids: unknown[]) => {
		const m = new Map<string, number>();
		for (const id of ids) m.set(nameOf(id), (m.get(nameOf(id)) ?? 0) + 1);
		return [...m].map(([k, v]) => `${k}: ${v}`).join(", ") || "—";
	};

	console.log(`Counsellor: ${counsellor.name ?? ""} (@${counsellor.username}, ${counsellorZid}, id ${counsellorIdStr})\n`);

	// Groups
	const groups = await BatchModel.find({ type: "GROUP" })
		.select({ groupId: 1, name: 1, isActive: 1, counsellorId: 1, mentorId: 1 })
		.sort({ groupId: 1 })
		.lean<Array<{ _id: Types.ObjectId; groupId?: string; name?: string; isActive?: boolean; counsellorId?: Types.ObjectId; mentorId?: Types.ObjectId }>>();
	const groupsToChange = groups.filter((g) => g.counsellorId?.toString() !== counsellorIdStr);
	console.log(`Groups: ${groups.length}, already set: ${groups.length - groupsToChange.length}, to change: ${groupsToChange.length}`);
	console.log(`  current saved counsellor: ${tally(groupsToChange.map((g) => g.counsellorId))}`);
	for (const g of groupsToChange) {
		console.log(`  ${(g.groupId ?? "-").padEnd(8)} ${(g.name ?? "").padEnd(28)} ${g.isActive === false ? "inactive" : "active  "} mentor: ${nameOf(g.mentorId)}`);
	}

	// Group students
	const groupStudents = await StudentModel.find({ courseType: "GROUP" })
		.select({ counsellorId: 1, status: 1 })
		.lean<Array<{ _id: Types.ObjectId; counsellorId?: Types.ObjectId; status?: string }>>();
	const studentsToChange = groupStudents.filter((s) => s.counsellorId?.toString() !== counsellorIdStr);
	console.log(`\nGroup students (ZIG): ${groupStudents.length}, not with ${counsellor.name}: ${studentsToChange.length} [${tally(studentsToChange.map((s) => s.counsellorId))}]${WITH_STUDENTS ? "  → will change" : "  (not changed without --with-students)"}`);

	// Group mentors
	const mentorRoleIds = (await RoleModel.find({ type: "mentor" }).distinct("_id")).map(String);
	const groupMentors = await UserModel.find({ roleIds: { $in: mentorRoleIds }, mentorType: "group" })
		.select({ counsellorId: 1 })
		.lean<UserLean[]>();
	const mentorsToChange = groupMentors.filter((m) => m.counsellorId !== counsellorIdStr);
	console.log(`Group mentors (ZMG): ${groupMentors.length}, not with ${counsellor.name}: ${mentorsToChange.length} [${tally(mentorsToChange.map((m) => m.counsellorId))}]${WITH_MENTORS ? "  → will change" : "  (not changed without --with-mentors)"}`);

	if (!APPLY) {
		console.log("\nDry run — nothing written. Re-run with --apply to update.");
		return;
	}

	const g = await BatchModel.updateMany(
		{ _id: { $in: groupsToChange.map((x) => x._id) } },
		{ $set: { counsellorId } },
	);
	console.log(`\nUpdated ${g.modifiedCount} group(s).`);
	if (WITH_STUDENTS) {
		const s = await StudentModel.updateMany(
			{ _id: { $in: studentsToChange.map((x) => x._id) } },
			{ $set: { counsellorId } },
		);
		console.log(`Updated ${s.modifiedCount} group student(s).`);
	}
	if (WITH_MENTORS) {
		const m = await UserModel.updateMany(
			{ _id: { $in: mentorsToChange.map((x) => x._id) } },
			{ $set: { counsellorId: counsellorIdStr } },
		);
		console.log(`Updated ${m.modifiedCount} group mentor(s).`);
	}
};

main()
	.catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => mongoose.disconnect());
