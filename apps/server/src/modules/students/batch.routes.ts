import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";
import {
	createBatchController,
	listBatchesController,
} from "./batch.controller.js";

const router: ReturnType<typeof Router> = Router();

/**
 * @swagger
 * /api/batches:
 *   get:
 *     tags:
 *       - Batches
 *     summary: List batches
 *     description: Retrieve all batches, including group-style batches
 *     security:
 *       - bearerAuth: []
 *   post:
 *     tags:
 *       - Batches
 *     summary: Create batch
 *     description: Create a new batch/group with an auto-generated group ID
 *     security:
 *       - bearerAuth: []
 */
router.use(authMiddleware);

router.get("/", asyncHandler(listBatchesController));

router.post("/", asyncHandler(createBatchController));

export default router;