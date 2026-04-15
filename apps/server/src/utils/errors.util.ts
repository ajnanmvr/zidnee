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
