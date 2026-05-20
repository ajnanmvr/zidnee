import type { PermissionKey } from "@repo/schema";
import { Router } from "express";
import {
	authMiddleware,
	requirePermissionKey,
} from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import { getLeadActivitiesController } from "./activity.controller.js";
import {
	assignDemoCounsellorController,
	assignDemoMentorController,
	cancelLeadDemoController,
	confirmAdmissionController,
	createLeadController,
	deleteLeadController,
	generateFormLinkController,
	getLeadByIdController,
	listAdmissionLeadsController,
	listDemoRequestsController,
	listLeadsController,
	listPendingDemoRequestsController,
	markDemoCompletedController,
	postponeLeadFollowUpController,
	redemoLeadController,
	requestAdmissionController,
	requestLeadDemoController,
	revokeFormLinkController,
	submitLeadFormController,
	updateLeadController,
	validateFormLinkController,
} from "./lead.controller.js";

const router: ReturnType<typeof Router> = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/leads:
 *   post:
 *     tags:
 *       - Leads
 *     summary: Create a new lead
 *     description: Create a new lead (requires LEAD_CREATE permission)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               level:
 *                 type: string
 *               demoRequired:
 *                 type: boolean
 *             required: [name, phone, level]
 *     responses:
 *       201:
 *         description: Lead created successfully
 *   get:
 *     tags:
 *       - Leads
 *     summary: List all leads
 *     description: Retrieve a paginated list of leads (requires LEAD_READ permission)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of leads
 */
router.post(
	"/",
	requirePermissionKey("LEAD_CREATE" satisfies PermissionKey),
	asyncHandler(createLeadController),
);

router.get(
	"/",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(listLeadsController),
);

/**
 * @swagger
 * /api/leads/for-demo:
 *   get:
 *     tags:
 *       - Leads
 *     summary: List pending demo leads
 *     description: Get leads pending demo assignment
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of leads pending demo
 */
router.get(
	"/for-demo",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(listPendingDemoRequestsController),
);

/**
 * @swagger
 * /api/leads/demo-requests:
 *   get:
 *     tags:
 *       - Leads
 *     summary: List demo requests
 *     description: Get all demo requests
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of demo requests
 */
router.get(
	"/demo-requests",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(listDemoRequestsController),
);

/**
 * @swagger
 * /api/leads/admissions:
 *   get:
 *     tags:
 *       - Leads
 *     summary: List admission leads
 *     description: Get leads in admission stage
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admission leads
 */
router.get(
	"/admissions",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(listAdmissionLeadsController),
);

/**
 * @swagger
 * /api/leads/{leadId}:
 *   get:
 *     tags:
 *       - Leads
 *     summary: Get lead by ID
 *     description: Retrieve a specific lead by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Lead details
 *   patch:
 *     tags:
 *       - Leads
 *     summary: Update lead
 *     description: Update lead information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *   delete:
 *     tags:
 *       - Leads
 *     summary: Delete lead
 *     description: Delete a lead (requires LEAD_DELETE permission)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       204:
 *         description: Lead deleted successfully
 */
router.get(
	"/:leadId",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(getLeadByIdController),
);

router.patch(
	"/:leadId",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(updateLeadController),
);

/**
 * @swagger
 * /api/leads/{leadId}/follow-up/postpone:
 *   patch:
 *     tags:
 *       - Leads
 *     summary: Postpone follow-up
 *     description: Postpone the next follow-up date for a lead
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nextFollowUpAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Follow-up postponed successfully
 */
router.patch(
	"/:leadId/follow-up/postpone",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(postponeLeadFollowUpController),
);

/**
 * @swagger
 * /api/leads/{leadId}/demo/request:
 *   patch:
 *     tags:
 *       - Leads
 *     summary: Request demo for lead
 *     description: Request a demo session for a lead
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Demo requested successfully
 */
router.patch(
	"/:leadId/demo/request",
	requirePermissionKey("LEAD_DEMO_REQUEST" satisfies PermissionKey),
	asyncHandler(requestLeadDemoController),
);

router.patch(
	"/:leadId/demo/cancel",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(cancelLeadDemoController),
);

router.patch(
	"/:leadId/demo/complete",
	requirePermissionKey("LEAD_DEMO_COMPLETE" satisfies PermissionKey),
	asyncHandler(markDemoCompletedController),
);

router.patch(
	"/:leadId/demo/redemo",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(redemoLeadController),
);

router.patch(
	"/:leadId/admission/request",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(requestAdmissionController),
);

router.patch(
	"/:leadId/admission/confirm",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(confirmAdmissionController),
);

router.patch(
	"/:leadId/demo/assign",
	requirePermissionKey("LEAD_DEMO_ASSIGN" satisfies PermissionKey),
	asyncHandler(assignDemoMentorController),
);

router.patch(
	"/:leadId/demo/counsellor",
	requirePermissionKey("LEAD_UPDATE" satisfies PermissionKey),
	asyncHandler(assignDemoCounsellorController),
);

/**
 * @swagger
 * /api/leads/{leadId}/form-link:
 *   post:
 *     tags:
 *       - Leads
 *     summary: Generate form link
 *     description: Generate a form submission link for a lead
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Form link generated
 */
router.post(
	"/:leadId/form-link",
	requirePermissionKey("LEAD_FORM_MANAGE" satisfies PermissionKey),
	asyncHandler(generateFormLinkController),
);

router.patch(
	"/:leadId/form/revoke",
	requirePermissionKey("LEAD_FORM_MANAGE" satisfies PermissionKey),
	asyncHandler(revokeFormLinkController),
);

router.delete(
	"/:leadId",
	requirePermissionKey("LEAD_DELETE" satisfies PermissionKey),
	asyncHandler(deleteLeadController),
);

/**
 * @swagger
 * /api/leads/{leadId}/activities:
 *   get:
 *     tags:
 *       - Leads
 *     summary: Get lead activities
 *     description: Get activity log for a lead
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Lead activities
 */
router.get(
	"/:leadId/activities",
	requirePermissionKey("LEAD_READ" satisfies PermissionKey),
	asyncHandler(getLeadActivitiesController),
);

export default router;

// Public routes (no authentication required)
export const publicLeadRoutes: ReturnType<typeof Router> = Router();

/**
 * @swagger
 * /form/{leadId}/submit:
 *   post:
 *     tags:
 *       - Lead Forms
 *     summary: Submit lead form
 *     description: Submit lead form (public endpoint)
 *     parameters:
 *       - in: path
 *         name: leadId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Form submitted successfully
 */
publicLeadRoutes.post(
	"/:leadId/submit",
	asyncHandler(submitLeadFormController),
);

/**
 * @swagger
 * /form/{leadId}/validate:
 *   get:
 *     tags:
 *       - Lead Forms
 *     summary: Validate form link
 *     description: Validate if a form link is valid (public endpoint)
 *     parameters:
 *       - in: path
 *         name: leadId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Form link is valid
 */
publicLeadRoutes.get(
	"/:leadId/validate",
	asyncHandler(validateFormLinkController),
);

