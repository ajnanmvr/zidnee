import { Router } from "express";
import { loginController } from "./auth.controller.js";

const router: ReturnType<typeof Router> = Router();

router.post("/login", loginController);

export default router;