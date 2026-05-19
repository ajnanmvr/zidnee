import type { Request, Response } from "express";
import { requireStringValue } from "../rbac/rbac.http.js";
import { LeadService } from "./lead.service.js";
import { uploadBuffer } from "../../lib/s3.js";
import { LeadModel } from "./lead.model.js";

export const submitLeadProfilePicController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const leadId = requireStringValue(req.params.leadId, "leadId");
  const token = (req.query.token as string) ?? (req.body && (req.body.token as string));
  if (!token) {
    res.status(400).json({ ok: false, error: "Token is required" });
    return;
  }

  const validation = await LeadService.validateFormLink(leadId, token);
  if (!validation.isValid) {
    res.status(400).json({ ok: false, error: "Invalid or expired token" });
    return;
  }

  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file || !file.buffer) {
    res.status(400).json({ ok: false, error: "No file provided" });
    return;
  }

  const timestamp = Date.now();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const key = `profile-images/leads/${leadId}/${timestamp}_${safeName}`;

  const url = await uploadBuffer(file.buffer, key, file.mimetype);

  const updatedLead = await LeadModel.findByIdAndUpdate(
    leadId,
    { $set: { profilePic: url } },
    { returnDocument: "after" },
  ).lean();

  if (!updatedLead) {
    res.status(404).json({ ok: false, error: "Lead not found" });
    return;
  }

  res.json({ ok: true, profilePic: url });
};
