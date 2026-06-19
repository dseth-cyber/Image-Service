export class AppError extends Error {
    statusCode;
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
    }
}
export class NotFoundError extends AppError {
    constructor(resource, id) {
        super(404, `${resource} not found: ${id}`);
        this.name = 'NotFoundError';
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(401, message);
        this.name = 'UnauthorizedError';
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(403, message);
        this.name = 'ForbiddenError';
    }
}
export class ValidationError extends AppError {
    constructor(message, details) {
        super(400, message, details);
        this.name = 'ValidationError';
    }
}
export class ConflictError extends AppError {
    constructor(message) {
        super(409, message);
        this.name = 'ConflictError';
    }
}
//# sourceMappingURL=errors.js.map