import { z } from "zod";

export const EnvSchema = z.object({
	PORT: z.string().default("3001"),
	MONGO_URI: z.string().min(1),
	JWT_SECRET: z.string().min(1),
	APP_URL: z.url().min(1),
	AWS_REGION: z.string().optional(),
	AWS_S3_BUCKET: z.string().optional(),
	AWS_ACCESS_KEY_ID: z.string().optional(),
	AWS_SECRET_ACCESS_KEY: z.string().optional(),
});
