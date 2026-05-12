import { env } from "@/config/env.js";
import type { JWTPayload } from "@repo/schema";
import jwt from "jsonwebtoken";

const JWT_SECRET = env.JWT_SECRET

export const createToken = (
	payload: Omit<JWTPayload, "iat" | "exp">,
): string => {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string): JWTPayload | null => {
	try {
		return jwt.verify(token, JWT_SECRET) as JWTPayload;
	} catch {
		return null;
	}
};
