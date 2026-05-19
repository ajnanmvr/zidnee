import { describe, expect, it } from "vitest";
import { getStudentProcessTemplate } from "@/modules/students/student-process.model.js";

describe("student process templates", () => {
	it("builds an admission template from the shared task library", () => {
		const template = getStudentProcessTemplate("STUDENT");

		expect(template.label).toBe("Student Admission Process");
		expect(template.tasks).toHaveLength(9);
		expect(template.tasks.map((task) => task.key)).toEqual([
			"verify-contact-details",
			"collect-basic-profile",
			"send-form-link",
			"send-profile-form-link",
			"send-welcome-message",
			"confirm-form-submission",
			"assign-mentor",
			"allocate-batch",
			"schedule-first-class",
		]);
		expect(
			template.tasks.find((task) => task.key === "send-profile-form-link")
				?.actionType,
		).toBe("FORM_LINK");
		expect(
			template.tasks.find((task) => task.key === "send-welcome-message")
				?.whatsappMessage,
		).toContain("Zidnee Online Islamic School");
	});

	it("builds a break template with the configured task subset", () => {
		const template = getStudentProcessTemplate("BREAK");

		expect(template.label).toBe("Break Process");
		expect(template.tasks).toHaveLength(5);
		expect(template.tasks.map((task) => task.key)).toEqual([
			"capture-break-reason",
			"set-break-window",
			"pause-follow-ups",
			"plan-rejoin-check",
			"notify-ownership-team",
		]);
	});

	it("builds a dropped template with the configured task subset", () => {
		const template = getStudentProcessTemplate("DROPPED");

		expect(template.label).toBe("Drop Process");
		expect(template.tasks).toHaveLength(4);
		expect(template.tasks.map((task) => task.key)).toEqual([
			"capture-dropout-reason",
			"close-open-follow-ups",
			"archive-student",
			"notify-ownership-team",
		]);
	});
});
