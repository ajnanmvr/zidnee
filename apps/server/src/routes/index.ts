import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import exportRoutes from "../modules/export/export.routes.js";
import leadRoutes from "../modules/leads/lead.routes.js";
import permissionRoutes from "../modules/permissions/permission.routes.js";
import roleRoutes from "../modules/roles/role.routes.js";
import studentRoutes from "../modules/students/student.routes.js";
import timeSlotRoutes from "../modules/timeslots/timeslot.routes.js";
import userRoutes from "../modules/users/user.routes.js";

const router: ReturnType<typeof Router> = Router();

router.use("/auth", authRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/users", userRoutes);
router.use("/leads", leadRoutes);
router.use("/students", studentRoutes);
router.use("/time-slots", timeSlotRoutes);
router.use("/export", exportRoutes);

export default router;
