import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { PERMISSION_KEYS, PERMISSION_CATALOG } from "@repo/schema";
import { PermissionModel } from "../src/modules/permissions/permission.model.js";

const seedPermissions = async (): Promise<void> => {
    await connectDB();

    const existing = await PermissionModel.find({ key: { $in: PERMISSION_KEYS } })
        .select("key")
        .lean<{ key: string }[]>();

    const existingSet = new Set(existing.map((e) => e.key));
    const missing = PERMISSION_KEYS.filter((k) => !existingSet.has(k));

    if (missing.length === 0) {
        console.log("No missing permissions to seed.");
        return;
    }

    console.log(`Seeding ${missing.length} missing permission(s)...`);

    for (const key of missing) {
        const seed = PERMISSION_CATALOG[key as keyof typeof PERMISSION_CATALOG];
        await PermissionModel.updateOne(
            { key },
            {
                $set: {
                    name: seed.name,
                    description: seed.description,
                    resource: seed.resource,
                    action: seed.action,
                },
                $setOnInsert: { key },
            },
            { upsert: true },
        );
        console.log(`Upserted permission: ${key}`);
    }

    console.log("Permission seeding complete.");
};

seedPermissions()
    .catch((err: unknown) => {
        console.error("Permission seed failed:", err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
