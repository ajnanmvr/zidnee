import { describe, expect, it, vi } from "vitest";
import {
	asyncHandler,
	errorMiddleware,
} from "../../src/middlewares/error.middleware.js";
import { AppError } from "../../src/utils/errors.util.js";

const createRes = () => {
	const res: any = {};
	res.status = vi.fn(() => res);
	res.json = vi.fn(() => res);
	return res;
};

describe("error middleware", () => {
	it("formats AppError responses", () => {
		const res = createRes();
		const err = new AppError(400, "Bad request");

		errorMiddleware(err, {} as any, res, {} as any);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			ok: false,
			message: "Bad request",
		});
	});

	it("formats unknown errors as 500", () => {
		const res = createRes();

		errorMiddleware(new Error("Unexpected"), {} as any, res, {} as any);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({
			ok: false,
			message: "Unexpected",
		});
	});

	it("asyncHandler forwards async errors", async () => {
		const next = vi.fn();
		const handler = asyncHandler(async () => {
			throw new Error("Async failure");
		});

		handler({} as any, {} as any, next);
		await Promise.resolve();

		expect(next).toHaveBeenCalledTimes(1);
		expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
	});
});