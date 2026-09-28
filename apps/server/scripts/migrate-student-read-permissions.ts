/**
 * Replaces the removed STUDENT_READ / STUDENT_READ_MY / STUDENT_READ_ALL
 * permissions with the per-course-type ones on every role:
 *   STUDENT_READ_MY  → STUDENT_READ_MY_GROUP  + STUDENT_READ_MY_INDIVIDUAL
 *   STUDENT_READ_ALL → STUDENT_READ_ALL_GROUP + STUDENT_READ_ALL_INDIVIDUAL
 *   STUDENT_READ     → (nothing; it only duplicated the above)
 *
 *   tsx scripts/migrate-student-read-permissions.ts                 # dry run
 *   tsx scripts/migrate-student-read-permissions.ts --apply         # add the new permissions (safe before deploy)
 *   tsx scripts/migrate-student-read-permissions.ts --remove-old    # after deploy: drop the old ones from roles and the catalog
 */
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { PermissionModel } from "../src/modules/permissions/permission.model.js";
import { RoleModel } from "../src/modules/roles/role.model.js";

const APPLY = process.argv.includes("--apply");
const REMOVE_OLD = process.argv.includes("--remove-old");

const REPLACEMENTS: Record<string, string[]> = {
	STUDENT_READ_MY: ["STUDENT_READ_MY_GROUP", "STUDENT_READ_MY_INDIVIDUAL"],
	STUDENT_READ_ALL: ["STUDENT_READ_ALL_GROUP", "STUDENT_READ_ALL_INDIVIDUAL"],
	STUDENT_READ: [],
};
const OLD_KEYS = Object.keys(REPLACEMENTS);
const NEW_KEYS = [...new Set(Object.values(REPLACEMENTS).flat())];

const main = async () => {
	await mongoose.connect(env.MONGO_URI);

	const perms = await PermissionModel.find({ key: { $in: [...OLD_KEYS, ...NEW_KEYS] } })
		.select({ key: 1 })
		.lean<Array<{ _id: mongoose.Types.ObjectId; key: string }>>();
	const idByKey = new Map(perms.map((p) => [p.key, p._id.toString()]));
	const keyById = new Map(perms.map((p) => [p._id.toString(), p.key]));

	const missingNew = NEW_KEYS.filter((k) => !idByKey.has(k));
	if (missingNew.length) {
		throw new Error(`New permissions not in the database yet: ${missingNew.join(", ")}. Start the API once so it syncs the catalog.`);
	}

	const roles = await RoleModel.find()
		.select({ name: 1, permissionIds: 1 })
		.sort({ name: 1 })
		.lean<Array<{ _id: mongoose.Types.ObjectId; name: string; permissionIds: string[] }>>();

	const plan = roles
		.map((role) => {
			const heldKeys = new Set(role.permissionIds.map((id) => keyById.get(String(id))).filter(Boolean) as string[]);
			const oldHeld = OLD_KEYS.filter((k) => heldKeys.has(k));
			const toAdd = [...new Set(oldHeld.flatMap((k) => REPLACEMENTS[k] ?? []))].filter((k) => !heldKeys.has(k));
			const readAfter = NEW_KEYS.filter((k) => heldKeys.has(k) || toAdd.includes(k));
			return { role, oldHeld, toAdd, readAfter };
		})
		.filter((p) => p.oldHeld.length > 0);

	console.log(`Roles holding old student-read permissions: ${plan.length} of ${roles.length}\n`);
	for (const p of plan) {
		console.log(`  ${p.role.name}`);
		console.log(`    has old:  ${p.oldHeld.join(", ")}`);
		console.log(`    will add: ${p.toAdd.join(", ") || "(nothing — already has the new ones)"}`);
		console.log(`    student read after: ${p.readAfter.join(", ") || "NONE — this role will lose student access"}`);
	}

	if (!APPLY && !REMOVE_OLD) {
		console.log("\nDry run — nothing written. --apply adds the new permissions; --remove-old removes the old ones.");
		return;
	}

	if (APPLY) {
		let updated = 0;
		for (const p of plan) {
			if (!p.toAdd.length) continue;
			await RoleModel.updateOne(
				{ _id: p.role._id },
				{ $addToSet: { permissionIds: { $each: p.toAdd.map((k) => idByKey.get(k) as string) } } },
			);
			updated++;
		}
		console.log(`\nAdded new permissions to ${updated} role(s).`);
	}

	if (REMOVE_OLD) {
		const oldIds = OLD_KEYS.map((k) => idByKey.get(k)).filter((id): id is string => Boolean(id));
		const r = await RoleModel.updateMany({}, { $pull: { permissionIds: { $in: oldIds } } });
		const d = await PermissionModel.deleteMany({ key: { $in: OLD_KEYS } });
		console.log(`\nRemoved old permissions from ${r.modifiedCount} role(s); deleted ${d.deletedCount} permission record(s).`);
	}
};

main()
	.catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => mongoose.disconnect());
