import cors from "cors";
import express, { type Express } from "express";
import morgan from 'morgan';
import { errorMiddleware } from "./middlewares/error.middleware.js";
import routes from "./routes/index.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

app.use("/api", routes);

// Error middleware must be last
app.use(errorMiddleware);

export default app;
