import dotenv from "dotenv";
import mongoose from "mongoose";
import { PERMISSION_KEYS, PERMISSION_CATALOG } from "@repo/schema";

dotenv.config({ path: "apps/server/.env" });

const seedPermissions = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is not set");
  }

  await mongoose.connect(mongoUri);

  const coll = mongoose.connection.collection("permissions");
  const existingCursor = await coll.find({ key: { $in: PERMISSION_KEYS } }, { projection: { key: 1 } });
  const existing = await existingCursor.toArray();

  const existingSet = new Set(existing.map((e) => e.key));
  const missing = PERMISSION_KEYS.filter((k) => !existingSet.has(k));

  if (missing.length === 0) {
    console.log("No missing permissions to seed.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Seeding ${missing.length} missing permission(s)...`);

  for (const key of missing) {
    const seed = PERMISSION_CATALOG[key];
    await coll.updateOne(
      { key },
      {
        $set: {
          name: seed.name,
          description: seed.description,
          resource: seed.resource,
          action: seed.action,
          updatedAt: new Date(),
        },
        $setOnInsert: { key, createdAt: new Date() },
      },
      { upsert: true }
    );
    console.log(`Upserted permission: ${key}`);
  }

  console.log("Permission seeding complete.");
  await mongoose.disconnect();
};

seedPermissions().catch((err) => {
  console.error("Permission seed failed:", err);
  process.exitCode = 1;
});
