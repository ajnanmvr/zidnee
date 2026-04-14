import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const port = Number(process.env.PORT ?? 3001);

connectDB();

app.listen(port, () => {
	console.log(`API listening on http://localhost:${port}`);
});