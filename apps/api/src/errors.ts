import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let error: ApiError;
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues)
      (fields[String(issue.path[0] ?? "form")] ??= []).push(issue.message);
    error = new ApiError(
      400,
      "VALIDATION_ERROR",
      "Please correct the highlighted fields.",
      fields,
    );
  } else if (err instanceof ApiError) error = err;
  else if (err?.type === "entity.parse.failed")
    error = new ApiError(400, "INVALID_JSON", "Invalid JSON body.");
  else if (err?.type === "entity.too.large")
    error = new ApiError(413, "BODY_TOO_LARGE", "Request body is too large.");
  else
    error = new ApiError(
      500,
      "INTERNAL_ERROR",
      "The request could not be completed. Please try again.",
    );
  res
    .status(error.status)
    .json({
      error: {
        code: error.code,
        message: error.message,
        fields: error.fields,
        correlationId: res.locals.correlationId,
      },
    });
};
