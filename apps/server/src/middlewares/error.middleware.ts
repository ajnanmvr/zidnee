import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors.util.js";

export const errorMiddleware = (
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	console.error(err);

	if (err instanceof AppError) {
		res.status(err.statusCode).json({
			ok: false,
			message: err.message,
			...(err.errors && { errors: err.errors }),
		});
		return;
	}

	if (err instanceof Error) {
		res.status(500).json({
			ok: false,
			message: err.message || "Internal Server Error",
		});
		return;
	}

	res.status(500).json({
		ok: false,
		message: "Internal Server Error",
	});
};

/**
 * Wrapper for async route handlers to catch errors
 */
export const asyncHandler =
	(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
	(req: Request, res: Response, next: NextFunction): void => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
