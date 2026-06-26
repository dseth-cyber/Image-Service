import { Prisma } from '@prisma/client';
import { getPrisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { NotFoundError } from '../../lib/errors.js';
import { setRetentionUntil } from '../retention-sweeper/retention-sweeper.service.js';
import { getRedisClient } from '../../lib/redis.js';
import { storageRouter } from '../../lib/storage/storage-router.js';
import type { ImageSearchInput, UpdateMetadataInput, RegisterImageInput, ProcessingResultInput } from './images.schema.js';
import type { WorkerUploadInput } from './worker-upload.schema.js';
import type { PaginatedResult } from '../../types/index.js';

function mapBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(mapBigInt);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, mapBigInt(v)]),
    );
  }
  return obj;
}

export async function registerImage(input: RegisterImageInput) {
  const prisma = getPrisma();

  const image = await prisma.image.create({
    data: {
      cameraId: input.cameraId,
      originalFilename: input.originalFilename,
      fileSizeBytes: BigInt(input.fileSizeBytes),
      checksumMd5: input.checksumMd5 ?? null,
      checksumSha256: input.checksumSha256 ?? null,
      status: input.status,
      capturedAt: new Date(input.capturedAt),
    },
  });

  setRetentionUntil(image.id, input.cameraId).catch((err) =>
    logger.error({ err, imageId: image.id }, 'Failed to set retentionUntil'),
  );

  return { id: image.id };
}

export async function searchImages(params: ImageSearchInput): Promise<PaginatedResult<unknown>> {
  const prisma = getPrisma();
  const { page, limit, sort, order, ...filters } = params;

  const where: Prisma.ImageWhereInput = {
    status: filters.status ?? { not: 'deleted' },
  };

  if (filters.cameraId) where.cameraId = filters.cameraId;
  if (filters.checksumMd5) where.checksumMd5 = filters.checksumMd5;
  if (filters.from || filters.to) {
    where.capturedAt = {};
    if (filters.from) where.capturedAt.gte = new Date(filters.from);
    if (filters.to) where.capturedAt.lte = new Date(filters.to);
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

  const orderBy: Prisma.ImageOrderByWithRelationInput = {};
  if (sort === 'capturedAt') orderBy.capturedAt = order;
  else if (sort === 'fileSizeBytes') orderBy.fileSizeBytes = order;
  else if (sort === 'status') orderBy.status = order;
  else orderBy.capturedAt = 'desc';

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
          where: { fileType: { in: ['thumbnail', 'processed'] } },
          select: { id: true, fileType: true, fileSizeBytes: true, mimeType: true, storageClass: true },
        },
      },
    }),
  ]);

  const data = rows.map((row) => {
    const r = mapBigInt(row) as Record<string, unknown>;
    const files = (r.imageFiles as Array<Record<string, unknown>>) ?? [];
    const thumbFile = files.find((f) => f.fileType === 'thumbnail');
    const procFile = files.find((f) => f.fileType === 'processed');
    return {
      id: r.id,
      cameraId: r.cameraId,
      cameraName: (r.camera as { name: string })?.name ?? '',
      originalFilename: r.originalFilename,
      fileSizeBytes: r.fileSizeBytes,
      status: r.status,
      widthPx: r.widthPx,
      heightPx: r.heightPx,
      capturedAt: (r.capturedAt as Date).toISOString(),
      thumbnailUrl: thumbFile ? `/api/v1/images/${r.id}/files/thumbnail` : null,
      processedFileSizeBytes: procFile?.fileSizeBytes ?? null,
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

export async function getImageById(id: string) {
  const prisma = getPrisma();

  const image = await prisma.image.findUnique({
    where: { id },
    include: {
      camera: { select: { id: true, name: true } },
      imageFiles: {
        select: { id: true, fileType: true, fileSizeBytes: true, mimeType: true, storageClass: true, objectKey: true, storageProviderId: true },
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

export async function updateImageMetadata(id: string, input: UpdateMetadataInput) {
  const prisma = getPrisma();

  const existing = await prisma.image.findUnique({ where: { id } });
  if (!existing || existing.status === 'deleted') {
    throw new NotFoundError('Image', id);
  }

  const data: Prisma.ImageUpdateInput = {};
  if (input.tiffMetadata !== undefined) data.tiffMetadata = input.tiffMetadata as never;
  if (input.widthPx !== undefined) data.widthPx = input.widthPx;
  if (input.heightPx !== undefined) data.heightPx = input.heightPx;
  if (input.bitDepth !== undefined) data.bitDepth = input.bitDepth;
  if (input.colorSpace !== undefined) data.colorSpace = input.colorSpace;
  if (input.compressionType !== undefined) data.compressionType = input.compressionType;
  if (input.compressionRatio !== undefined) data.compressionRatio = input.compressionRatio;

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

export async function upsertImageTags(id: string, tags: Record<string, string>) {
  const prisma = getPrisma();

  const existing = await prisma.image.findUnique({ where: { id } });
  if (!existing || existing.status === 'deleted') {
    throw new NotFoundError('Image', id);
  }

  const operations = Object.entries(tags).map(([key, value]) =>
    prisma.imageTag.upsert({
      where: { imageId_key: { imageId: id, key } },
      create: { imageId: id, key, value },
      update: { value },
    }),
  );

  await prisma.$transaction(operations);

  const updatedTags = await prisma.imageTag.findMany({
    where: { imageId: id },
    select: { key: true, value: true },
  });

  return updatedTags;
}

export async function deleteImageTag(id: string, key: string) {
  const prisma = getPrisma();

  const existing = await prisma.image.findUnique({ where: { id } });
  if (!existing || existing.status === 'deleted') {
    throw new NotFoundError('Image', id);
  }

  await prisma.imageTag.deleteMany({
    where: { imageId: id, key },
  });
}

export async function submitProcessingResult(id: string, input: ProcessingResultInput) {
  const prisma = getPrisma();

  const existing = await prisma.image.findUnique({ where: { id } });
  if (!existing || existing.status === 'deleted') {
    throw new NotFoundError('Image', id);
  }

  const imageData: Prisma.ImageUpdateInput = {};
  if (input.status) imageData.status = input.status;
  if (input.checksumSha256) imageData.checksumSha256 = input.checksumSha256;
  if (input.processedAt) imageData.processedAt = new Date(input.processedAt);
  else if (input.status === 'completed') imageData.processedAt = new Date();
  if (input.widthPx !== undefined) imageData.widthPx = input.widthPx;
  if (input.heightPx !== undefined) imageData.heightPx = input.heightPx;
  if (input.bitDepth !== undefined) imageData.bitDepth = input.bitDepth;
  if (input.colorSpace !== undefined) imageData.colorSpace = input.colorSpace;
  if (input.compressionType !== undefined) imageData.compressionType = input.compressionType;
  if (input.compressionRatio !== undefined) imageData.compressionRatio = input.compressionRatio;
  if (input.tiffMetadata !== undefined) imageData.tiffMetadata = input.tiffMetadata as never;

  if (input.files && input.files.length > 0) {
    let fallbackProviderId: string | null = null;
    if (!input.files[0].storageProviderId) {
      const s3Provider = await prisma.storageProvider.findFirst({
        where: { type: 's3', isActive: true, deletedAt: null },
        orderBy: { priority: 'asc' },
        select: { id: true },
      });
      fallbackProviderId = s3Provider?.id ?? null;
    }

    await Promise.all(input.files.map(file =>
      prisma.imageFile.upsert({
        where: { imageId_fileType: { imageId: id, fileType: file.fileType as any } },
        update: {
          bucket: file.bucket ?? 'images',
          objectKey: file.objectKey,
          storageClass: file.storageClass ?? 'hot',
          fileSizeBytes: BigInt(file.fileSizeBytes),
          mimeType: file.mimeType ?? null,
          storageProviderId: file.storageProviderId ?? fallbackProviderId,
        },
        create: {
          imageId: id,
          fileType: file.fileType,
          bucket: file.bucket ?? 'images',
          objectKey: file.objectKey,
          storageClass: file.storageClass ?? 'hot',
          fileSizeBytes: BigInt(file.fileSizeBytes),
          mimeType: file.mimeType ?? null,
          storageProviderId: file.storageProviderId ?? fallbackProviderId,
        },
      }),
    ));
  }

  // Create processing job record for traceability
  await prisma.processingJob.create({
    data: {
      imageId: id,
      jobType: 'convert',
      workerId: 'processing-worker',
      status: input.status === 'failed' ? 'failed' : 'completed',
      queuedAt: existing.createdAt,
      startedAt: existing.createdAt,
      completedAt: input.processedAt ? new Date(input.processedAt) : new Date(),
      priority: 0,
      retryCount: 0,
      maxRetries: 3,
      queueName: 'bull:image-processing',
      errorMessage: null,
    },
  });

  const updated = await prisma.image.update({
    where: { id },
    data: imageData,
    include: {
      imageFiles: true,
      imageTags: { select: { key: true, value: true } },
    },
  });

  return mapBigInt(updated);
}

export async function recordWorkerUpload(input: WorkerUploadInput) {
  const prisma = getPrisma();

  const imageFile = await prisma.imageFile.create({
    data: {
      imageId: input.imageId,
      fileType: input.fileType as any,
      bucket: 'images',
      objectKey: input.objectKey,
      fileSizeBytes: BigInt(input.fileSizeBytes),
      checksumSha256: input.checksumSha256 ?? null,
      mimeType: input.mimeType ?? null,
      storageProviderId: input.storageProviderId,
    },
  });

  return { id: imageFile.id };
}

export async function softDeleteImage(id: string) {
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

export async function reprocessImage(id: string) {
  const prisma = getPrisma();

  const image = await prisma.image.findUnique({
    where: { id },
    include: {
      camera: true,
      imageFiles: true,
    },
  });

  if (!image || image.status === 'deleted') {
    throw new NotFoundError('Image', id);
  }

  for (const file of image.imageFiles) {
    try {
      const provider = file.storageProviderId
        ? storageRouter.get(file.storageProviderId)
        : storageRouter.getDefault();
      await provider.delete(file.objectKey);
    } catch (err) {
      logger.warn({ imageId: id, objectKey: file.objectKey, err }, 'Failed to remove old storage object');
    }
  }

  await prisma.imageFile.deleteMany({ where: { imageId: id } });

  await prisma.image.update({
    where: { id },
    data: {
      status: 'pending',
      processedAt: null,
    },
  });

  const smbSharePath = image.camera.smbSharePath.replace(/\/+$/, '');
  const cleanFilename = image.originalFilename.replace(/^[\\/]+/, '').replace(/\\/g, '/');
  const smbPath = `${smbSharePath}/${cleanFilename}`;

  const redis = getRedisClient();
  const jobId = `reprocess-${id}-${Date.now()}`;
  const jobData = JSON.stringify({
    imageId: id,
    cameraId: image.cameraId,
    smbPath,
    originalFilename: image.originalFilename,
    fileSizeBytes: Number(image.fileSizeBytes),
    checksumMd5: image.checksumMd5 ?? '',
    checksumSha256: image.checksumSha256 ?? undefined,
    capturedAt: image.capturedAt.toISOString(),
  });

  await redis.hset(`bull:image-processing:${jobId}`, 'data', jobData);
  await redis.lpush('bull:image-processing:wait', jobId);

  logger.info({ imageId: id, jobId }, 'Image queued for reprocessing');

  return { id, status: 'pending', jobId };
}

export async function bulkReprocessAll() {
  const prisma = getPrisma();

  const images = await prisma.image.findMany({
    where: { status: { not: 'deleted' } },
    include: { camera: true, imageFiles: true },
  });

  const redis = getRedisClient();
  let queued = 0;

  for (const image of images) {
    for (const file of image.imageFiles) {
      try {
        const provider = file.storageProviderId
          ? storageRouter.get(file.storageProviderId)
          : storageRouter.getDefault();
        await provider.delete(file.objectKey);
      } catch { /* skip */ }
    }

    await prisma.imageFile.deleteMany({ where: { imageId: image.id } });

    await prisma.image.update({
      where: { id: image.id },
      data: { status: 'pending', processedAt: null },
    });

    const smbSharePath = image.camera.smbSharePath.replace(/\/+$/, '');
    const cleanFilename = image.originalFilename.replace(/^[\\/]+/, '').replace(/\\/g, '/');
    const smbPath = `${smbSharePath}/${cleanFilename}`;

    const jobId = `bulk-reprocess-${image.id}-${Date.now()}`;
    const jobData = JSON.stringify({
      imageId: image.id,
      cameraId: image.cameraId,
      smbPath,
      originalFilename: image.originalFilename,
      fileSizeBytes: Number(image.fileSizeBytes),
      checksumMd5: image.checksumMd5 ?? '',
      checksumSha256: image.checksumSha256 ?? undefined,
      capturedAt: image.capturedAt.toISOString(),
    });

    await redis.hset(`bull:image-processing:${jobId}`, 'data', jobData);
    await redis.lpush('bull:image-processing:wait', jobId);
    queued++;
  }

  logger.info({ queued, total: images.length }, 'Bulk reprocess queued');
  return { queued, total: images.length };
}
