import type { Request } from "express";
import type { ZodSchema } from "zod";

export const validate = <T>(schema: ZodSchema<T>, req: Request): T => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
};
