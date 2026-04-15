import { LoginSchema } from "@repo/schema";
import type { Request, Response } from "express";

export const loginController = (req: Request, res: Response) => {
	const result = LoginSchema.safeParse(req.body);

	if (!result.success) {
		return res.status(400).json({
			ok: false,
			errors: result.error.flatten().fieldErrors,
		});
	}

	return res.json({
		ok: true,
		message: `Welcome ${result.data.email}`,
	});
};