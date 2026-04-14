import type { NextFunction, Request, Response } from "express";
import { ApiError } from "@/utils/apiError.js";

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      ok: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    ok: false,
    message: "Server Error",
  });
};
