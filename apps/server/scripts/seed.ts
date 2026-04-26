import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { seedInitialSuperAdmin } from "../src/modules/rbac/rbac.seed.js";

const seedAdmin = async (): Promise<void> => {
	await connectDB();
	await seedInitialSuperAdmin();

	console.log("Seeded initial superadmin credentials: admin / 123456");
};

seedAdmin()
	.catch((error: unknown) => {
		console.error("Seed failed:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await mongoose.disconnect();
	});
