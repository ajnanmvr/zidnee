import { describe, expect, it } from "vitest";
import { getStudentProcessTemplate } from "@/modules/students/student-process.model.js";

describe("student process templates", () => {
	it("builds an admission template from the shared task library", () => {
		const template = getStudentProcessTemplate("STUDENT");

		expect(template.label).toBe("Student Admission Process");
		expect(template.tasks.map((task) => task.label)).toEqual([
			"Send welcome message",
			"Data confirmed & shared Group awareness for both",
			"Level link shared to parent & mentor",
			"Level link shared & trained",
			"Group profile link shared",
			"Confirm starting date",
			"Collect admission fee before starting",
			"Add in parent's group",
		]);
		expect(
			template.tasks.find((task) => task.key === "send-welcome-message")
				?.whatsappMessage,
		).toContain("Zidnee Online Islamic School");
	});

	it("builds a break template with the configured task subset", () => {
		const template = getStudentProcessTemplate("BREAK");

		expect(template.label).toBe("Break Process");
		expect(template.tasks).toHaveLength(0);
		expect(template.tasks.map((task) => task.key)).toEqual([]);
	});

	it("builds a dropped template with the configured task subset", () => {
		const template = getStudentProcessTemplate("DROPPED");

		expect(template.label).toBe("Drop Process");
		expect(template.tasks).toHaveLength(4);
		expect(template.tasks.map((task) => task.key)).toEqual([
			"cancelled-drive-access",
			"informed-mentor",
			"payment-completed",
			"removed-from-coffee-and-zidnee-app",
		]);
	});
});
