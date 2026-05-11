import "../../src/config/env.js";
import { connectDB } from "../../src/config/db.js";
import { UserModel } from "../../src/modules/users/user.model.js";
import { RoleModel } from "../../src/modules/roles/role.model.js";
import { buildSequentialIdentity, USER_IDENTITY_PREFIXES } from "../../src/modules/users/user.identity.js";

async function main() {
  await connectDB();

  const users = await UserModel.find().lean();
  const roles = await RoleModel.find().lean();
  const roleMap = new Map(roles.map((r: any) => [String(r._id), r.type]));

  for (const user of users) {
    const userRoles: string[] = (user.roleIds ?? []) as string[];
    const zids = user.zids ?? {};
    let changed = false;

    for (const roleId of userRoles) {
      const type = roleMap.get(roleId);
      if (!type) continue;
      if (!(type in USER_IDENTITY_PREFIXES)) continue;

      if (!zids[type]) {
        // gather existing ids for this type
        const existing = users.map((u: any) => u.zids && u.zids[type]);
        const prefix = (USER_IDENTITY_PREFIXES as any)[type];
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
