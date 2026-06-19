import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
export async function errorHandler(error, _request, reply) {
    if (error instanceof AppError) {
        logger.warn({ statusCode: error.statusCode, message: error.message }, 'Application error');
        await reply.status(error.statusCode).send({
            statusCode: error.statusCode,
            error: error.name,
            message: error.message,
            details: error.details,
        });
        return;
    }
    if (error.name === 'FastifyError' || error.name === 'FST_ERR_VALIDATION') {
        const statusCode = error.statusCode ?? 400;
        logger.warn({ statusCode, message: error.message }, 'Fastify error');
        await reply.status(statusCode).send({
            statusCode,
            error: 'ValidationError',
            message: error.message,
        });
        return;
    }
    logger.error({ err: error }, 'Unhandled error');
    await reply.status(500).send({
        statusCode: 500,
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
    });
}
//# sourceMappingURL=error-handler.js.map