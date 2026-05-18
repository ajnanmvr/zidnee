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

export default router;
