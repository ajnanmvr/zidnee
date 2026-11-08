import { Types } from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "@/app.js";
import { seedInitialSuperAdmin } from "@/modules/rbac/rbac.seed.js";
import { resetRbacStore } from "@/modules/rbac/rbac.service.js";
import { StudentModel } from "@/modules/students/student.model.js";
import { StudentActivityModel } from "@/modules/students/student-activity.model.js";

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

let n = 0;
const makeStudent = (
	counsellorId: Types.ObjectId,
	overrides: Record<string, unknown> = {},
) => {
	n += 1;
	return StudentModel.create({
		zid: `H${n}-${Date.now()}`,
		leadId: new Types.ObjectId(),
		phone: "9999999999",
		email: `h${n}@example.com`,
		admittedBy: new Types.ObjectId(),
		admittedAt: daysAgo(200),
		counsellorId,
		status: "STUDENT",
		...overrides,
	});
};

describe("GET /api/reports/counsellor (HTTP)", () => {
	let token = "";

	beforeEach(async () => {
		await resetRbacStore();
		await seedInitialSuperAdmin();
		const login = await request(app)
			.post("/api/auth/login")
			.send({ username: "admin", password: "123456" });
		token = login.body.token;
	});

	const get = (query: Record<string, string>) =>
		request(app)
			.get("/api/reports/counsellor")
			.query(query)
			.set("Authorization", `Bearer ${token}`);

	it("returns different data for a different counsellor and a different timeframe", async () => {
		const a = new Types.ObjectId();
		const b = new Types.ObjectId();

		const a1 = await makeStudent(a);
		await makeStudent(a);
		await makeStudent(a);
		await makeStudent(b);
		const b2 = await makeStudent(b, {
			status: "DROPPED",
			dropReason: "Payment",
		});

		await StudentActivityModel.create({
			studentId: a1._id,
			type: "STATUS_CHANGED",
			performedBy: new Types.ObjectId(),
			description: "Student put on break",
			createdAt: daysAgo(3),
			newValue: { status: "BREAK" },
		});
		await StudentActivityModel.create({
			studentId: b2._id,
			type: "STATUS_CHANGED",
			performedBy: new Types.ObjectId(),
			description: "Student dropped",
			createdAt: daysAgo(50),
			newValue: { status: "DROPPED" },
		});

		const range = (fromDays: number, toDays: number) => ({
			from: daysAgo(fromDays).toISOString(),
			to: daysAgo(toDays).toISOString(),
		});

		// Counsellor selection
		const resA = await get({ counsellorId: a.toString(), ...range(30, 0) });
		const resB = await get({ counsellorId: b.toString(), ...range(30, 0) });
		expect(resA.status).toBe(200);
		expect(resB.status).toBe(200);
		expect(resA.body.report.statusSummary.totalAssigned).toBe(3);
		expect(resB.body.report.statusSummary.totalAssigned).toBe(2);
		expect(resA.body.report.statusSummary.breaksStarted).toBe(1);
		expect(resB.body.report.statusSummary.breaksStarted).toBe(0);
		expect(resA.body.report.counsellor.id).toBe(a.toString());

		// All counsellors
		const all = await get(range(30, 0));
		expect(all.body.report.statusSummary.totalAssigned).toBe(5);
		expect(all.body.report.counsellors.length).toBe(2);

		// Timeframe selection (counsellor A): before the break nothing happened
		const recent = await get({ counsellorId: a.toString(), ...range(7, 0) });
		const older = await get({ counsellorId: a.toString(), ...range(30, 10) });
		expect(recent.body.report.statusSummary.onBreak).toBe(1);
		expect(recent.body.report.statusSummary.breaksStarted).toBe(1);
		expect(older.body.report.statusSummary.onBreak).toBe(0);
		expect(older.body.report.statusSummary.breaksStarted).toBe(0);

		// Counsellor B: drop was 50 days ago, so only a wide window sees it as an event
		const bWide = await get({ counsellorId: b.toString(), ...range(60, 0) });
		expect(bWide.body.report.statusSummary.dropsInPeriod).toBe(1);
		expect(resB.body.report.statusSummary.dropsInPeriod).toBe(0);
	});

	it("rejects a request without the reports permission or a token", async () => {
		const res = await request(app).get("/api/reports/counsellor");
		expect(res.status).toBe(401);
	});
});
