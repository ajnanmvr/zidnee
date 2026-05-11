import swaggerJsdoc from "swagger-jsdoc";

const options: Parameters<typeof swaggerJsdoc>[0] = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "Zidnee API Documentation",
			version: "1.0.0",
			description:
				"CRM + Student Lifecycle + Follow-up Automation platform API",
			contact: {
				name: "Zidnee Team",
			},
		},
		servers: [
			{
				url: "http://localhost:3000",
				description: "Development server",
			},
			{
				url: "https://api.zidnee.com",
				description: "Production server",
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
			schemas: {
				ApiError: {
					type: "object",
					properties: {
						message: { type: "string" },
						code: { type: "string" },
					},
					required: ["message"],
				},
				User: {
					type: "object",
					properties: {
						_id: { type: "string" },
						name: { type: "string" },
						email: { type: "string", format: "email" },
						role: { type: "string" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				Lead: {
					type: "object",
					properties: {
						_id: { type: "string" },
						name: { type: "string" },
						phone: { type: "string" },
						level: { type: "string" },
						status: {
							type: "string",
							enum: [
								"NEW",
								"CONTACTED",
								"DEMO_REQUESTED",
								"FORM_SENT",
								"FORM_COMPLETED",
								"CONVERTED",
								"REJECTED",
							],
						},
						assignedTo: { type: "string" },
						demoRequired: { type: "boolean" },
						formSent: { type: "boolean" },
						formCompleted: { type: "boolean" },
						lastContactedAt: { type: "string", format: "date-time" },
						nextFollowUpAt: { type: "string", format: "date-time" },
						customNextFollowUpAt: {
							type: "string",
							format: "date-time",
						},
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				Student: {
					type: "object",
					properties: {
						_id: { type: "string" },
						zid: { type: "string" },
						name: { type: "string" },
						phone: { type: "string" },
						age: { type: "number" },
						level: { type: "string" },
						isActive: { type: "boolean" },
						inactiveFrom: { type: "string", format: "date-time" },
						inactiveUntil: { type: "string", format: "date-time" },
						counsellorId: { type: "string" },
						batchId: { type: "string" },
						status: {
							type: "string",
							enum: ["ACTIVE", "COMPLETED", "DROPPED"],
						},
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},
				LoginRequest: {
					type: "object",
					properties: {
						email: { type: "string", format: "email" },
						password: { type: "string" },
					},
					required: ["email", "password"],
				},
				LoginResponse: {
					type: "object",
					properties: {
						token: { type: "string" },
						user: { $ref: "#/components/schemas/User" },
					},
				},
			},
		},
		security: [{ bearerAuth: [] }],
	},
	apis: [
		"./src/modules/**/*.routes.ts",
		"./src/routes/index.ts",
	],
};

export const swaggerSpec = swaggerJsdoc(options);
