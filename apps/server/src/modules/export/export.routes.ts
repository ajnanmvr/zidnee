import { Router } from "express";
import { swaggerSpec } from "../../config/swagger.js";

const router: ReturnType<typeof Router> = Router();

/**
 * @swagger
 * /api/export/swagger-json:
 *   get:
 *     tags:
 *       - Export
 *     summary: Download Swagger spec (JSON)
 *     description: Download OpenAPI specification as JSON file for importing into API testing tools
 *     responses:
 *       200:
 *         description: Swagger JSON file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get("/swagger-json", (_req, res) => {
	res.setHeader("Content-Type", "application/json");
	res.setHeader(
		"Content-Disposition",
		'attachment; filename="zidnee-swagger.json"',
	);
	res.json(swaggerSpec);
});

/**
 * @swagger
 * /api/export/swagger-yaml:
 *   get:
 *     tags:
 *       - Export
 *     summary: Download Swagger spec (YAML)
 *     description: Download OpenAPI specification as YAML file for importing into API testing tools
 *     responses:
 *       200:
 *         description: Swagger YAML file
 *         content:
 *           application/x-yaml:
 *             schema:
 *               type: object
 */
router.get("/swagger-yaml", (_req, res) => {
	const YAML = require("js-yaml");
	const yamlContent = YAML.dump(swaggerSpec);
	res.setHeader("Content-Type", "application/x-yaml");
	res.setHeader(
		"Content-Disposition",
		'attachment; filename="zidnee-swagger.yaml"',
	);
	res.send(yamlContent);
});

export default router;
