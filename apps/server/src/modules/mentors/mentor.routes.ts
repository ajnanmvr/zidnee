import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
	getMentorFollowUpController,
	getMentorsDueForFollowUpController,
	recordMentorFollowUpController,
	setMentorCustomFollowUpController,
	clearMentorCustomFollowUpController,
} from "./mentor-followup.controller.js";
import { getMentorActivitiesController } from "./mentor-activity.controller.js";
import {
	createMentorReminderController,
	deleteMentorReminderController,
	getMentorRemindersController,
	updateMentorReminderController,
} from "./mentor-reminder.controller.js";
import {
	createMentorSubstitutionController,
	getMentorSubstitutionController,
	getMentorSubstitutionsController,
	getMentorSubstitutionsAsOriginalController,
	getMentorSubstitutionsAsSubstituteController,
	getAllSubstitutionsController,
	getSubstitutionsByStatusController,
	updateMentorSubstitutionController,
	deleteMentorSubstitutionController,
} from "./mentor-substitution.controller.js";

const router: ReturnType<typeof Router> = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Mentor followup routes
router.get("/followups/due", getMentorsDueForFollowUpController);
router.post("/:mentorId/followups", recordMentorFollowUpController);
router.patch(
	"/:mentorId/followups/custom",
	setMentorCustomFollowUpController,
);
router.delete(
	"/:mentorId/followups/custom",
	clearMentorCustomFollowUpController,
);
router.get("/:mentorId/followups", getMentorFollowUpController);

// Mentor activity routes
router.get("/:mentorId/activities", getMentorActivitiesController);

// Mentor reminder routes
router.post("/:mentorId/reminders", createMentorReminderController);
router.get("/:mentorId/reminders", getMentorRemindersController);
router.patch("/:reminderId/reminders", updateMentorReminderController);
router.delete("/:reminderId/reminders", deleteMentorReminderController);

// Mentor substitution routes
router.post("/substitutions/create", createMentorSubstitutionController);
router.get("/substitutions/all", getAllSubstitutionsController);
router.get("/substitutions/by-status", getSubstitutionsByStatusController);
router.get("/substitutions/:substitutionId", getMentorSubstitutionController);
router.get("/:mentorId/substitutions", getMentorSubstitutionsController);
router.get("/:mentorId/substitutions/as-original", getMentorSubstitutionsAsOriginalController);
router.get("/:mentorId/substitutions/as-substitute", getMentorSubstitutionsAsSubstituteController);
router.patch("/substitutions/:substitutionId", updateMentorSubstitutionController);
router.delete("/substitutions/:substitutionId", deleteMentorSubstitutionController);

export default router;
