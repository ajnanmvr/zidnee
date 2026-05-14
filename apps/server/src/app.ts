import cors from "cors";
import express, { type Express } from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { publicLeadRoutes } from "./modules/leads/lead.routes.js";
import timeSlotRoutes from "./modules/timeslots/timeslot.routes.js";
import routes from "./routes/index.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev", {}));

app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

// Swagger UI
app.use("/api/docs", swaggerUi.serve);
app.get(
	"/api/docs",
	swaggerUi.setup(swaggerSpec, {
		swaggerOptions: {
			persistAuthorization: true,
		},
		customCss: ".swagger-ui .topbar { display: none }",
	}),
);
app.get("/api/docs.json", (_req, res) => {
	res.json(swaggerSpec);
});

// Public form routes (no authentication required)
app.use("/form", publicLeadRoutes);

// API routes (including public options)
app.use("/api/form/options", timeSlotRoutes);
app.use("/api", routes);

// Error middleware must be last
app.use(errorMiddleware);

export default app;
