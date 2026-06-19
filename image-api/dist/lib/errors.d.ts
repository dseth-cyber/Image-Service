export declare class AppError extends Error {
    readonly statusCode: number;
    readonly details?: Record<string, unknown>;
    constructor(statusCode: number, message: string, details?: Record<string, unknown>);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, id: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map