import { getPrisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
function mapBigInt(obj) {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj === 'bigint')
        return Number(obj);
    if (Array.isArray(obj))
        return obj.map(mapBigInt);
    if (typeof obj === 'object') {
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, mapBigInt(v)]));
    }
    return obj;
}
export async function searchImages(params) {
    const prisma = getPrisma();
    const { page, limit, sort, order, ...filters } = params;
    const where = {
        status: filters.status ?? { not: 'deleted' },
    };
    if (filters.cameraId)
        where.cameraId = filters.cameraId;
    if (filters.from || filters.to) {
        where.capturedAt = {};
        if (filters.from)
            where.capturedAt.gte = new Date(filters.from);
        if (filters.to)
            where.capturedAt.lte = new Date(filters.to);
    }
    if (filters.q) {
        where.OR = [
            { originalFilename: { contains: filters.q, mode: 'insensitive' } },
            { checksumSha256: { contains: filters.q } },
        ];
    }
    if (filters.tagKey) {
        where.imageTags = {
            some: {
                key: filters.tagKey,
                ...(filters.tagValue ? { value: filters.tagValue } : {}),
            },
        };
    }
    const orderBy = {};
    if (sort === 'capturedAt')
        orderBy.capturedAt = order;
    else if (sort === 'fileSizeBytes')
        orderBy.fileSizeBytes = order;
    else if (sort === 'status')
        orderBy.status = order;
    else
        orderBy.capturedAt = 'desc';
    const [total, rows] = await Promise.all([
        prisma.image.count({ where }),
        prisma.image.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                camera: { select: { name: true } },
                imageFiles: {
                    where: { fileType: 'thumbnail' },
                    select: { id: true, fileType: true, fileSizeBytes: true, mimeType: true, storageClass: true },
                    take: 1,
                },
            },
        }),
    ]);
    const data = rows.map((row) => {
        const r = mapBigInt(row);
        return {
            id: r.id,
            cameraId: r.cameraId,
            cameraName: r.camera?.name ?? '',
            originalFilename: r.originalFilename,
            fileSizeBytes: r.fileSizeBytes,
            status: r.status,
            widthPx: r.widthPx,
            heightPx: r.heightPx,
            capturedAt: r.capturedAt.toISOString(),
            thumbnailUrl: Array.isArray(r.imageFiles) && r.imageFiles.length > 0
                ? `/api/v1/images/${r.id}/files/thumbnail`
                : null,
        };
    });
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
export async function getImageById(id) {
    const prisma = getPrisma();
    const image = await prisma.image.findUnique({
        where: { id },
        include: {
            camera: { select: { id: true, name: true } },
            imageFiles: {
                select: { id: true, fileType: true, fileSizeBytes: true, mimeType: true, storageClass: true },
            },
            imageTags: {
                select: { key: true, value: true },
            },
        },
    });
    if (!image || image.status === 'deleted') {
        throw new NotFoundError('Image', id);
    }
    return mapBigInt(image);
}
export async function updateImageMetadata(id, input) {
    const prisma = getPrisma();
    const existing = await prisma.image.findUnique({ where: { id } });
    if (!existing || existing.status === 'deleted') {
        throw new NotFoundError('Image', id);
    }
    const data = {};
    if (input.tiffMetadata !== undefined)
        data.tiffMetadata = input.tiffMetadata;
    if (input.widthPx !== undefined)
        data.widthPx = input.widthPx;
    if (input.heightPx !== undefined)
        data.heightPx = input.heightPx;
    if (input.bitDepth !== undefined)
        data.bitDepth = input.bitDepth;
    if (input.colorSpace !== undefined)
        data.colorSpace = input.colorSpace;
    if (input.compressionType !== undefined)
        data.compressionType = input.compressionType;
    if (input.compressionRatio !== undefined)
        data.compressionRatio = input.compressionRatio;
    const updated = await prisma.image.update({
        where: { id },
        data,
        include: {
            imageFiles: {
                select: { id: true, fileType: true, fileSizeBytes: true, mimeType: true, storageClass: true },
            },
            imageTags: { select: { key: true, value: true } },
        },
    });
    return mapBigInt(updated);
}
export async function upsertImageTags(id, tags) {
    const prisma = getPrisma();
    const existing = await prisma.image.findUnique({ where: { id } });
    if (!existing || existing.status === 'deleted') {
        throw new NotFoundError('Image', id);
    }
    const operations = Object.entries(tags).map(([key, value]) => prisma.imageTag.upsert({
        where: { imageId_key: { imageId: id, key } },
        create: { imageId: id, key, value },
        update: { value },
    }));
    await prisma.$transaction(operations);
    const updatedTags = await prisma.imageTag.findMany({
        where: { imageId: id },
        select: { key: true, value: true },
    });
    return updatedTags;
}
export async function deleteImageTag(id, key) {
    const prisma = getPrisma();
    const existing = await prisma.image.findUnique({ where: { id } });
    if (!existing || existing.status === 'deleted') {
        throw new NotFoundError('Image', id);
    }
    await prisma.imageTag.deleteMany({
        where: { imageId: id, key },
    });
}
export async function softDeleteImage(id) {
    const prisma = getPrisma();
    const existing = await prisma.image.findUnique({ where: { id } });
    if (!existing || existing.status === 'deleted') {
        throw new NotFoundError('Image', id);
    }
    await prisma.image.update({
        where: { id },
        data: { status: 'deleted', deletedAt: new Date() },
    });
}
//# sourceMappingURL=images.service.js.map