export class AppError extends Error {
	constructor(
		public statusCode: number,
		message: string,
		public errors?: Record<string, string[]>,
	) {
		super(message);
		this.name = "AppError";
	}
}

export class ValidationError extends AppError {
	constructor(errors: Record<string, string[]>) {
		super(400, "Validation failed", errors);
		this.name = "ValidationError";
	}
}

export class AuthenticationError extends AppError {
	constructor(message = "Authentication failed") {
		super(401, message);
		this.name = "AuthenticationError";
	}
}

export class AuthorizationError extends AppError {
	constructor(message = "Insufficient permissions") {
		super(403, message);
		this.name = "AuthorizationError";
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string) {
		super(404, `${resource} not found`);
		this.name = "NotFoundError";
	}
}

export class ConflictError extends AppError {
	constructor(message: string) {
		super(409, message);
		this.name = "ConflictError";
	}
}

/**
 * A generated or manually typed ZID is already taken. The client shows the
 * user an input (prefilled with `suggestedZid`) and resends the request with
 * the chosen value at the body path named by `field`.
 */
export class ZidConflictError extends ConflictError {
	constructor(
		public zid: string,
		public suggestedZid: string,
		public prefix: string,
		public field: string,
	) {
		super(`${zid} is already in use`);
		this.name = "ZidConflictError";
	}
}
