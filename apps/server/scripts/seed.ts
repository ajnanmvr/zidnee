import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import {
	seedCoreRolesAndUsers,
	seedInitialSuperAdmin,
} from "../src/modules/rbac/rbac.seed.js";

const seedAdmin = async (): Promise<void> => {
	await connectDB();
	await seedInitialSuperAdmin();
	await seedCoreRolesAndUsers();

	console.log("Seeded roles: admin, mentor, counsellor, sales");
	console.log("Seeded users: admin, mentor, counsellor, sales");
	console.log("Default password for seeded users: 123456");
	console.log("Admin user now has all four role assignments");
};

seedAdmin()
	.catch((error: unknown) => {
		console.error("Seed failed:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await mongoose.disconnect();
	});
