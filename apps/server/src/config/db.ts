import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async (): Promise<void> => {
	try {
		await mongoose.connect(env.MONGO_URI);
		console.log("MongoDB connected");
	} catch (error) {
		console.error("DB connection error:", error);
		process.exit(1);
	}
};
