import {
	CounsellorReportQuerySchema,
	CounsellorReportResponseSchema,
} from "@repo/schema";
import type { Request, Response } from "express";
import { ValidationError } from "../../utils/errors.util.js";
import { CounsellorReportService } from "./counsellor-report.service.js";

export const getCounsellorReportController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const parsed = CounsellorReportQuerySchema.safeParse(req.query);
	if (!parsed.success) {
		throw new ValidationError(parsed.error.flatten().fieldErrors);
	}
	const { from, to } = parsed.data;
	if (from && to && from > to) {
		throw new ValidationError({ from: ["'from' must be before 'to'"] });
	}

	const report = await CounsellorReportService.build(parsed.data);
	res.json(CounsellorReportResponseSchema.parse({ ok: true, report }));
};
