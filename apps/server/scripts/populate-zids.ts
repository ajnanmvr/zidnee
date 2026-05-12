import "../src/config/env.js";
import { connectDB } from "../src/config/db.js";
import { RoleModel } from "../src/modules/roles/role.model.js";
import { UserModel } from "../src/modules/users/user.model.js";
import {
	buildSequentialIdentity,
	USER_IDENTITY_PREFIXES,
} from "../src/modules/users/user.identity.js";

async function main() {
  await connectDB();

  const users = await UserModel.find().lean();
  const roles = await RoleModel.find().lean();
  const roleMap = new Map(
	roles.map((role) => [String(role._id), role.type as keyof typeof USER_IDENTITY_PREFIXES | undefined]),
  );

	const roleTypes = Object.keys(USER_IDENTITY_PREFIXES) as Array<keyof typeof USER_IDENTITY_PREFIXES>;

  for (const user of users) {
    const userRoles: string[] = (user.roleIds ?? []) as string[];
    const zids = user.zids ?? {};
    let changed = false;

    for (const roleId of userRoles) {
      const type = roleMap.get(roleId);
      if (!type || !roleTypes.includes(type)) continue;

      if (!zids[type]) {
        // gather existing ids for this type
        const existing = users.map((candidate) => candidate.zids?.[type]);
        const prefix = USER_IDENTITY_PREFIXES[type];
        const next = buildSequentialIdentity(prefix, existing);
        zids[type] = next;
        if (type === "mentor" && !user.mentorId) {
          user.mentorId = next;
        }
        if (type === "counsellor" && !user.counsellorId) {
          user.counsellorId = next;
        }
        changed = true;
        console.log(`Assigning ${type} ZID ${next} to user ${user._id}`);
      }
    }

    if (changed) {
      await UserModel.updateOne({ _id: user._id }, { $set: { zids, mentorId: user.mentorId, counsellorId: user.counsellorId } });
    }
  }

  console.log("ZID population completed");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
