import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { LeadModel } from "@/modules/leads/lead.model.js";
import { LeadService } from "@/modules/leads/lead.service.js";

describe("LeadService.listDemoReport", () => {
	it("returns one row per attempt and scopes 'mine' to coordinator or mentor", async () => {
		const me = new Types.ObjectId();
		const other = new Types.ObjectId();
		const now = new Date();

		await LeadModel.create([
			{
				phone: "9000000001",
				createdBy: other,
				demoRequestAssignedTo: me,
				studentId: new Types.ObjectId(),
				demos: [
					{ requestedAt: now },
					{ requestedAt: now, assignedAt: now, mentorId: other, completedAt: now },
				],
			},
			{
				phone: "9000000002",
				createdBy: other,
				demoRequestAssignedTo: other,
				demos: [{ requestedAt: now, assignedAt: now, mentorId: me }],
			},
			{
				phone: "9000000003",
				createdBy: other,
				demoRequestAssignedTo: other,
				demos: [{ requestedAt: now }],
			},
			{ phone: "9000000004", createdBy: other },
		]);

		const all = await LeadService.listDemoReport({ userId: me.toString(), scope: "all" });
		expect(all).toHaveLength(4);

		const mine = await LeadService.listDemoReport({ userId: me.toString(), scope: "mine" });
		expect(mine).toHaveLength(3);

		const converted = mine.filter((r) => r.converted);
		expect(converted.map((r) => r.attempt).sort()).toEqual([1, 2]);
		expect(converted.every((r) => r.leadStatus === "CONVERTED")).toBe(true);
		expect(converted.find((r) => r.attempt === 2)?.isLatest).toBe(true);
	});
});
