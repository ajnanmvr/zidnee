import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll } from "vitest";

let mongoServer: MongoMemoryServer | null = null;

beforeAll(async () => {
	process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
	mongoServer = await MongoMemoryServer.create();
	await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
	await mongoose.disconnect();
	if (mongoServer) {
		await mongoServer.stop();
	}
});
