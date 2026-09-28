import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { BatchIdentityService } from "@/modules/students/batch.identity.js";
import { BatchModel } from "@/modules/students/batch.model.js";
import { resolveStudentZid } from "@/modules/students/student.identity.js";
import { StudentModel } from "@/modules/students/student.model.js";
import { resolveUserZid } from "@/modules/users/user.identity.js";
import { UserModel } from "@/modules/users/user.model.js";
import { ZidService } from "@/modules/zid/zid.service.js";
import { ZidConflictError } from "@/utils/errors.util.js";

describe("ZidService.nextAfter", () => {
	it("increments the last ID and keeps its digit width", () => {
		expect(ZidService.nextAfter("ZID", "ZID045")).toBe("ZID046");
		expect(ZidService.nextAfter("ZID", "ZID099")).toBe("ZID100");
		expect(ZidService.nextAfter("ZM0", "ZM00045")).toBe("ZM00046");
		expect(ZidService.nextAfter("ZG", "zg7")).toBe("ZG8");
	});

	it("starts at the configured start number when nothing exists", () => {
		expect(ZidService.nextAfter("ZIG", null)).toBe("ZIG011");
	});
});

const studentDoc = (zid: string, createdAt: Date) => ({
	zid,
	leadId: new Types.ObjectId(),
	phone: `9${Math.floor(Math.random() * 1e9)}`.padEnd(10, "0"),
	email: `${zid.toLowerCase()}@test.local`,
	admittedBy: new Types.ObjectId(),
	createdAt,
});

describe("student ZIDs", () => {
	it("follows the last created student, not the highest number", async () => {
		await StudentModel.collection.insertMany([
			studentDoc("ZID090", new Date("2026-01-01")),
			studentDoc("ZID020", new Date("2026-02-01")),
			studentDoc("ZIG050", new Date("2026-03-01")),
		]);

		expect(await resolveStudentZid("ZID")).toBe("ZID021");
		expect(await resolveStudentZid("ZIG")).toBe("ZIG051");
	});

	it("reports a conflict with a free suggestion, and accepts a manual ID", async () => {
		// Last created is ZIDX101, but ZIDX102 already exists (created earlier).
		await StudentModel.collection.insertMany([
			studentDoc("ZIDX102", new Date("2025-01-01")),
			studentDoc("ZIDX100", new Date("2026-01-01")),
			studentDoc("ZIDX101", new Date("2026-01-02")),
		]);

		const error = await resolveStudentZid("ZIDX").catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ZidConflictError);
		expect((error as ZidConflictError).zid).toBe("ZIDX102");
		expect((error as ZidConflictError).suggestedZid).toBe("ZIDX103");
		expect((error as ZidConflictError).field).toBe("zid");

		expect(await resolveStudentZid("ZIDX", "zidx500")).toBe("ZIDX500");
		await expect(resolveStudentZid("ZIDX", "ZIDX100")).rejects.toBeInstanceOf(
			ZidConflictError,
		);
	});
});

describe("user ZIDs", () => {
	it("looks at zids, legacy fields and username; excludes the user being edited", async () => {
		const legacy = await UserModel.create({
			username: "ZIC031",
			email: "zic031@test.local",
			password: "x",
			name: "Legacy counsellor",
		});
		expect(
			await resolveUserZid({ prefix: "ZIC", field: "zids.counsellor" }),
		).toBe("ZIC032");

		await expect(
			resolveUserZid({ prefix: "ZIC", field: "zids.counsellor", manual: "ZIC031" }),
		).rejects.toBeInstanceOf(ZidConflictError);
		expect(
			await resolveUserZid({
				prefix: "ZIC",
				field: "zids.counsellor",
				manual: "ZIC031",
				excludeUserId: legacy._id.toString(),
			}),
		).toBe("ZIC031");
	});
});

describe("group IDs", () => {
	it("uses the last created group and honours a manual ID", async () => {
		await BatchModel.collection.insertMany([
			{ groupId: "ZG009", type: "GROUP", level: "1", mentorId: new Types.ObjectId(), createdAt: new Date("2026-01-01") },
			{ groupId: "ZG004", type: "GROUP", level: "1", mentorId: new Types.ObjectId(), createdAt: new Date("2026-02-01") },
		]);
		expect(await BatchIdentityService.resolveGroupId()).toBe("ZG005");
		expect(await BatchIdentityService.resolveGroupId("zg777")).toBe("ZG777");
	});
});
