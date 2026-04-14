import cors from "cors";
import express, { type Express } from "express";
import routes from "./routes/index.js";

const app: Express = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

app.use("/api", routes);

export default app;