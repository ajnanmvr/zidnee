/**
 * Saves a counsellor on every student that doesn't have one, using the
 * student's current mentor's counsellor (for group students without a mentor:
 * the group's counsellor, else the group mentor's counsellor).
 * Students that already have a counsellor are never touched.
 *
 *   pnpm --filter @repo/api exec tsx scripts/backfill-student-counsellors.ts           # dry run
 *   pnpm --filter @repo/api exec tsx scripts/backfill-student-counsellors.ts --apply   # write
 */
import mongoose, { Types } from "mongoose";
import { env } from "../src/config/env.js";
import { BatchModel } from "../src/modules/students/batch.model.js";
import { StudentModel } from "../src/modules/students/student.model.js";
import { UserModel } from "../src/modules/users/user.model.js";

const APPLY = process.argv.includes("--apply");

const isId = (id: Types.ObjectId | undefined): id is Types.ObjectId => Boolean(id);

type StudentLean = {
	_id: Types.ObjectId;
	zid: string;
	name?: string;
	status?: string;
	mentorId?: Types.ObjectId;
	batchId?: Types.ObjectId;
};

const main = async () => {
	await mongoose.connect(env.MONGO_URI);

	const students = await StudentModel.find({
		$or: [{ counsellorId: { $exists: false } }, { counsellorId: null }],
	})
		.select({ zid: 1, name: 1, status: 1, mentorId: 1, batchId: 1 })
		.sort({ zid: 1 })
		.lean<StudentLean[]>();
	const total = await StudentModel.countDocuments();

	const batches = await BatchModel.find({
		_id: { $in: students.map((s) => s.batchId).filter(isId) },
	})
		.select({ counsellorId: 1, mentorId: 1 })
		.lean<Array<{ _id: Types.ObjectId; counsellorId?: Types.ObjectId; mentorId?: Types.ObjectId }>>();
	const batchById = new Map(batches.map((b) => [b._id.toString(), b]));

	const mentorIds = [
		...students.map((s) => s.mentorId),
		...batches.map((b) => b.mentorId),
	].filter(isId);
	const mentors = await UserModel.find({ _id: { $in: mentorIds } })
		.select({ counsellorId: 1 })
		.lean<Array<{ _id: Types.ObjectId; counsellorId?: string }>>();
	const counsellorOfMentor = new Map(
		mentors
			.filter((m) => m.counsellorId && Types.ObjectId.isValid(m.counsellorId))
			.map((m) => [m._id.toString(), m.counsellorId as string]),
	);

	const resolve = (s: StudentLean): { id?: string; source: string } => {
		const viaMentor = s.mentorId && counsellorOfMentor.get(s.mentorId.toString());
		if (viaMentor) return { id: viaMentor, source: "mentor" };
		const batch = s.batchId && batchById.get(s.batchId.toString());
		if (batch?.counsellorId) return { id: batch.counsellorId.toString(), source: "group" };
		const viaGroupMentor = batch?.mentorId && counsellorOfMentor.get(batch.mentorId.toString());
		if (viaGroupMentor) return { id: viaGroupMentor, source: "group mentor" };
		return { source: s.mentorId ? "mentor has no counsellor" : "no mentor/group" };
	};

	const plan = students.map((s) => ({ student: s, ...resolve(s) }));
	const assignable = plan.filter((p) => p.id);
	const unresolved = plan.filter((p) => !p.id);

	const counsellorIds = [...new Set(assignable.map((p) => p.id as string))];
	const counsellors = await UserModel.find({ _id: { $in: counsellorIds } })
		.select({ name: 1, username: 1 })
		.lean<Array<{ _id: Types.ObjectId; name?: string; username: string }>>();
	const nameOf = (id: string) => {
		const c = counsellors.find((u) => u._id.toString() === id);
		return c ? `${c.name ?? ""} (@${c.username})` : id;
	};

	console.log(`Students: ${total}, already have a counsellor: ${total - students.length}, missing: ${students.length}`);
	console.log(`  can fill: ${assignable.length}, cannot fill: ${unresolved.length}\n`);

	const byCounsellor = new Map<string, number>();
	for (const p of assignable) byCounsellor.set(nameOf(p.id as string), (byCounsellor.get(nameOf(p.id as string)) ?? 0) + 1);
	console.log("Will be set to:");
	for (const [name, count] of [...byCounsellor].sort((a, b) => b[1] - a[1])) console.log(`  ${name}: ${count}`);

	const bySource = new Map<string, number>();
	for (const p of assignable) bySource.set(p.source, (bySource.get(p.source) ?? 0) + 1);
	console.log(`\nSource: ${[...bySource].map(([k, v]) => `${k} ${v}`).join(", ")}`);

	if (unresolved.length) {
		console.log("\nCannot fill (no counsellor found):");
		for (const p of unresolved) {
			console.log(`  ${p.student.zid.padEnd(10)} ${(p.student.name ?? "").padEnd(30)} ${(p.student.status ?? "").padEnd(9)} ${p.source}`);
		}
	}

	if (!APPLY) {
		console.log("\nDry run — nothing written. Re-run with --apply to update.");
		return;
	}

	const result = await StudentModel.bulkWrite(
		assignable.map((p) => ({
			updateOne: {
				// Re-check "missing" so a counsellor set meanwhile is never overwritten.
				filter: {
					_id: p.student._id,
					$or: [{ counsellorId: { $exists: false } }, { counsellorId: null }],
				},
				update: { $set: { counsellorId: new Types.ObjectId(p.id) } },
			},
		})),
	);
	console.log(`\nUpdated ${result.modifiedCount} student(s).`);
};

main()
	.catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => mongoose.disconnect());
