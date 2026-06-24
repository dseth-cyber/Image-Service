import { getPrisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { getMinio } from '../../lib/minio.js';
import { config } from '../../config/index.js';
export async function setRetentionUntil(imageId, cameraId) {
    const prisma = getPrisma();
    const camera = await prisma.camera.findUnique({
        where: { id: cameraId },
        include: { retentionPolicy: true },
    });
    if (!camera?.retentionPolicy)
        return;
    const policy = camera.retentionPolicy;
    const days = policy.rawRetentionDays ?? 90;
    const retentionUntil = new Date();
    retentionUntil.setDate(retentionUntil.getDate() + days);
    await prisma.image.update({
        where: { id: imageId },
        data: { retentionUntil },
    });
}
export async function sweepExpiredImages() {
    const prisma = getPrisma();
    let deleted = 0;
    let errors = 0;
    try {
        const expired = await prisma.image.findMany({
            where: {
                retentionUntil: { lte: new Date() },
                deletedAt: null,
                status: { not: 'deleted' },
            },
            include: { imageFiles: true },
            take: 100,
        });
        for (const image of expired) {
            try {
                for (const file of image.imageFiles) {
                    try {
                        const bucketName = file.bucket === 'images' ? config.minio.bucket : file.bucket;
                        await getMinio().removeObject(bucketName, file.objectKey);
                    }
                    catch (err) {
                        if (!err.message?.includes('Not Found')) {
                            logger.error({ err, imageId: image.id, fileId: file.id }, 'Failed to delete file from MinIO');
                        }
                    }
                }
                await prisma.image.update({
                    where: { id: image.id },
                    data: {
                        deletedAt: new Date(),
                        status: 'deleted',
                    },
                });
                await prisma.cameraEvent.create({
                    data: {
                        cameraId: image.cameraId,
                        eventType: 'image_deleted',
                        message: `Auto-deleted expired image ${image.originalFilename}`,
                        metadata: { imageId: image.id, reason: 'retention_expired', originalFilename: image.originalFilename },
                    },
                });
                deleted++;
            }
            catch (err) {
                logger.error({ err, imageId: image.id }, 'Retention sweep failed for image');
                errors++;
            }
        }
        if (expired.length > 0) {
            logger.info({ deleted, errors, total: expired.length }, 'Retention sweep batch complete');
        }
    }
    catch (err) {
        logger.error({ err }, 'Retention sweep query failed');
    }
    return { deleted, errors };
}
//# sourceMappingURL=retention-sweeper.service.js.map