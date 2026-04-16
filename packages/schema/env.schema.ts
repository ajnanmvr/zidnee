import { z } from "zod";

export const EnvSchema = z.object({
	PORT: z.string().default("3001"),
	MONGO_URI: z.string().min(1),
	JWT_SECRET: z.string().min(1),
});
