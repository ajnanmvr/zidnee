import cors from "cors";
import express, { type Express } from "express";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import routes from "./routes/index.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(errorMiddleware);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", routes);

export default app;
