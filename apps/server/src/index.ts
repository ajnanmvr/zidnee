import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";


const port = Number(env.PORT ?? 3001);

connectDB();

app.listen(port, () => {
	console.log(`API listening on http://localhost:${port}`);
});
