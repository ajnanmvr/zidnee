import type { Request, Response } from "express";
import { requireStringValue } from "../rbac/rbac.http.js";
import { uploadBuffer } from "../../lib/s3.js";
import { StudentModel } from "./student.model.js";

export const getStudentPublicProfileStatusController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const studentId = requireStringValue(req.params.studentId, "studentId");

  const student = await StudentModel.findById(studentId)
    .select("_id zid name profilePic admittedAt classStartConfirmedAt")
    .lean();

  if (!student) {
    res.status(404).json({ ok: false, error: "Student not found" });
    return;
  }

  res.json({
    ok: true,
    student: {
      id: String(student._id),
      zid: student.zid,
      name: student.name ?? null,
      profilePic: student.profilePic ?? null,
      submitted: Boolean(student.profilePic),
      admittedAt: student.admittedAt ? student.admittedAt.toISOString() : null,
      classStartConfirmedAt: student.classStartConfirmedAt
        ? student.classStartConfirmedAt.toISOString()
        : null,
      classStartConfirmed: Boolean(student.classStartConfirmedAt),
    },
  });
};

export const getStudentPublicProfileImageController = async (
	req: Request,
	res: Response,
): Promise<void> => {
	const studentId = requireStringValue(req.params.studentId, "studentId");

	const student = await StudentModel.findById(studentId).select("profilePic").lean();

	if (!student) {
		res.status(404).json({ ok: false, error: "Student not found" });
		return;
	}

	if (!student.profilePic) {
		res.status(404).json({ ok: false, error: "Profile image not found" });
		return;
	}

	const response = await fetch(student.profilePic);
	if (!response.ok) {
		res.status(502).json({ ok: false, error: "Failed to load profile image" });
		return;
	}

	const contentType = response.headers.get("content-type") ?? "image/jpeg";
	const buffer = Buffer.from(await response.arrayBuffer());

	res.setHeader("Content-Type", contentType);
	res.setHeader("Cache-Control", "public, max-age=3600");
	res.send(buffer);
};

export const uploadStudentProfilePicController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const studentId = requireStringValue(req.params.studentId, "studentId");

  // Check if student exists
  const student = await StudentModel.findById(studentId).lean();
  if (!student) {
    res.status(404).json({ ok: false, error: "Student not found" });
    return;
  }

  // Check if profile image already exists
  if (student.profilePic) {
    res.status(400).json({ ok: false, error: "Profile image already uploaded" });
    return;
  }

  // Check if file is provided
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file || !file.buffer) {
    res.status(400).json({ ok: false, error: "No file provided" });
    return;
  }

  // Upload file to S3
  const timestamp = Date.now();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const key = `profile-images/students/${studentId}/${timestamp}_${safeName}`;

  const url = await uploadBuffer(file.buffer, key, file.mimetype);

  // Update student with profile image
  const updatedStudent = await StudentModel.findByIdAndUpdate(
    studentId,
    { $set: { profilePic: url } },
    { returnDocument: "after" },
  ).lean();

  if (!updatedStudent) {
    res.status(404).json({ ok: false, error: "Student not found" });
    return;
  }

  res.json({ ok: true, profilePic: url });
};

export const confirmStudentClassStartController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const studentId = requireStringValue(req.params.studentId, "studentId");
  // Accept a date in the request body (YYYY-MM-DD) and validate it's today or in the future
  const payloadDate = (req.body && req.body.date) || req.query.date;

  const student = await StudentModel.findById(studentId).lean();
  if (!student) {
    res.status(404).json({ ok: false, error: "Student not found" });
    return;
  }

  if (student.classStartConfirmedAt) {
    res.json({ ok: true, classStartConfirmedAt: student.classStartConfirmedAt.toISOString() });
    return;
  }

  if (!payloadDate || typeof payloadDate !== "string") {
    res.status(400).json({ ok: false, error: "Missing or invalid date" });
    return;
  }

  // Parse YYYY-MM-DD without time and treat as local date
  const parts = payloadDate.split("-");
  if (parts.length !== 3) {
    res.status(400).json({ ok: false, error: "Invalid date format" });
    return;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    res.status(400).json({ ok: false, error: "Invalid date components" });
    return;
  }

  const chosen = new Date(year, month, day);
  // normalize chosen to midnight local
  chosen.setHours(0, 0, 0, 0);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (chosen.getTime() < today.getTime()) {
    res.status(400).json({ ok: false, error: "Date must be today or in the future" });
    return;
  }

  const updated = await StudentModel.findByIdAndUpdate(
    studentId,
    { $set: { classStartConfirmedAt: chosen } },
    { returnDocument: "after" },
  ).lean();

  if (!updated) {
    res.status(404).json({ ok: false, error: "Student not found" });
    return;
  }

  res.json({ ok: true, classStartConfirmedAt: updated.classStartConfirmedAt?.toISOString() ?? null });
};
