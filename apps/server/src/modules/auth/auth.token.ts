import jwt from "jsonwebtoken";
import type { JWTPayload } from "@repo/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const createToken = (payload: Omit<JWTPayload, "iat" | "exp">): string => {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string): JWTPayload | null => {
	try {
		return jwt.verify(token, JWT_SECRET) as JWTPayload;
	} catch {
		return null;
	}
};