import { EnvSchema } from "@repo/schema";
import dotenv from "dotenv";

dotenv.config();

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("❌ Invalid env:", parsed.error);
	process.exit(1);
}

export const env = parsed.data;
