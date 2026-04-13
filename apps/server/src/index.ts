import { LoginSchema } from "@repo/schema";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

app.post("/login", (req, res) => {
	const result = LoginSchema.safeParse(req.body);

	if (!result.success) {
		return res.status(400).json({
			ok: false,
			errors: result.error.flatten().fieldErrors,
		});
	}

	return res.json({
		ok: true,
		message: `Welcome ${result.data.email}`,
	});
});

app.listen(port, () => {
	console.log(`API listening on http://localhost:${port}`);
});
