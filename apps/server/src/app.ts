import cors from "cors";
import express, { type Express } from "express";
import morgan from 'morgan';
import { errorMiddleware } from "./middlewares/error.middleware.js";
import routes from "./routes/index.js";
import { publicLeadRoutes } from "./modules/leads/lead.routes.js";
import timeSlotRoutes from "./modules/timeslots/timeslot.routes.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(
	morgan("dev", {
		skip: (_req, res) => res.statusCode === 304,
	}),
);

app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

// Public form routes (no authentication required)
app.use("/form", publicLeadRoutes);
app.use("/form/options", timeSlotRoutes);

app.use("/api", routes);

// Error middleware must be last
app.use(errorMiddleware);

export default app;
