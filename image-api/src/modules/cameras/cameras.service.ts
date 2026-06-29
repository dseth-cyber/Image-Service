import { getPrisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import { encrypt, decrypt } from '../../lib/encryption.js';
import type { CreateCameraInput, UpdateCameraInput } from './cameras.schema.js';

export async function listCameras(filters?: { status?: string; enabled?: boolean }) {
  const prisma = getPrisma();

  const where: Record<string, unknown> = { deletedAt: null };
  if (filters?.status) where.status = filters.status;
  if (filters?.enabled !== undefined) where.enabled = filters.enabled;

  const cameras = await prisma.camera.findMany({
    where,
    include: { retentionPolicy: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

  // Decrypt SMB passwords for workers that need plaintext credentials
  return cameras.map((c) => ({
    ...c,
    smbPasswordEncrypted: c.smbPasswordEncrypted
      ? decrypt(c.smbPasswordEncrypted)
      : c.smbPasswordEncrypted,
  }));
}

export async function getCameraById(id: string) {
  const prisma = getPrisma();

  const camera = await prisma.camera.findUnique({
    where: { id },
    include: { retentionPolicy: true },
  });

  if (!camera) {
    throw new NotFoundError('Camera', id);
  }

  // Decrypt SMB password for workers that need plaintext credentials
  return {
    ...camera,
    smbPasswordEncrypted: camera.smbPasswordEncrypted
      ? decrypt(camera.smbPasswordEncrypted)
      : camera.smbPasswordEncrypted,
  };
}

export async function createCamera(input: CreateCameraInput) {
  const prisma = getPrisma();

  const policy = await prisma.retentionPolicy.findUnique({ where: { id: input.retentionPolicyId } });
  if (!policy) {
    throw new NotFoundError('RetentionPolicy', input.retentionPolicyId);
  }

  const existing = await prisma.camera.findFirst({ where: { name: input.name } });
  if (existing) {
    throw new ConflictError(`Camera with name '${input.name}' already exists`);
  }

  const encryptedPassword = input.smbPasswordEncrypted
    ? encrypt(input.smbPasswordEncrypted)
    : input.smbPasswordEncrypted;

  const camera = await prisma.camera.create({
    data: {
      name: input.name,
      description: input.description,
      ipAddress: input.ipAddress,
      smbSharePath: input.smbSharePath,
      smbDomain: input.smbDomain,
      smbUsername: input.smbUsername,
      smbPasswordEncrypted: encryptedPassword,
      smbSubdirectoryPattern: input.smbSubdirectoryPattern,
      pollIntervalSeconds: input.pollIntervalSeconds,
      timezone: input.timezone,
      captureMode: input.captureMode,
      cameraTypeCode: input.cameraTypeCode,
      retentionPolicyId: input.retentionPolicyId,
      metadata: input.metadata as object,
      status: 'inactive',
    },
    include: { retentionPolicy: true },
  });

  return camera;
}

export async function updateCamera(id: string, input: UpdateCameraInput) {
  const prisma = getPrisma();

  const existing = await prisma.camera.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Camera', id);
  }

  if (input.retentionPolicyId) {
    const policy = await prisma.retentionPolicy.findUnique({ where: { id: input.retentionPolicyId } });
    if (!policy) {
      throw new NotFoundError('RetentionPolicy', input.retentionPolicyId);
    }
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.ipAddress !== undefined) data.ipAddress = input.ipAddress;
  if (input.smbSharePath !== undefined) data.smbSharePath = input.smbSharePath;
  if (input.smbDomain !== undefined) data.smbDomain = input.smbDomain;
  if (input.smbUsername !== undefined) data.smbUsername = input.smbUsername;
  if (input.smbPasswordEncrypted !== undefined) data.smbPasswordEncrypted = encrypt(input.smbPasswordEncrypted);
  if (input.smbSubdirectoryPattern !== undefined) data.smbSubdirectoryPattern = input.smbSubdirectoryPattern;
  if (input.pollIntervalSeconds !== undefined) data.pollIntervalSeconds = input.pollIntervalSeconds;
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.captureMode !== undefined) data.captureMode = input.captureMode;
  if (input.cameraTypeCode !== undefined) data.cameraTypeCode = input.cameraTypeCode;
  if (input.retentionPolicyId !== undefined) data.retentionPolicyId = input.retentionPolicyId;
  if (input.enabled !== undefined) data.enabled = input.enabled;
  if (input.status !== undefined) data.status = input.status;
  if (input.lastPolledAt !== undefined) data.lastPolledAt = new Date(input.lastPolledAt);
  if (input.metadata !== undefined) data.metadata = input.metadata as object;

  const updated = await prisma.camera.update({
    where: { id },
    data,
    include: { retentionPolicy: true },
  });

  if (input.status !== undefined && input.status !== existing.status) {
    const eventType = input.status === 'active' ? 'online' as const
      : input.status === 'maintenance' ? 'maintenance_start' as const
      : 'offline' as const;

    await prisma.cameraEvent.create({
      data: {
        cameraId: id,
        eventType,
        message: `Camera "${existing.name}" status changed: ${existing.status} → ${input.status}`,
        metadata: { previousStatus: existing.status, newStatus: input.status, changedBy: (input as any)._changedBy ?? 'system' },
      },
    });
  }

  return updated;
}

export async function deactivateCamera(id: string) {
  const prisma = getPrisma();

  const existing = await prisma.camera.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Camera', id);
  }

  await prisma.camera.update({
    where: { id },
    data: { enabled: false, status: 'inactive' },
  });
}

export async function deleteCamera(id: string) {
  const prisma = getPrisma();
  const camera = await prisma.camera.findUnique({ where: { id } });
  if (!camera) throw new NotFoundError('Camera', id);

  // Soft delete — set enabled=false, status=inactive, mark deletedAt
  await prisma.camera.update({
    where: { id },
    data: { enabled: false, status: 'inactive', deletedAt: new Date() },
  });
  return camera;
}

export async function restoreCamera(id: string) {
  const prisma = getPrisma();
  const camera = await prisma.camera.findUnique({ where: { id } });
  if (!camera) throw new NotFoundError('Camera', id);

  await prisma.camera.update({
    where: { id },
    data: { enabled: true, status: 'inactive', deletedAt: null },
  });
  return { restored: true };
}

export async function listDeletedCameras() {
  const prisma = getPrisma();
  return prisma.camera.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    select: { id: true, name: true, ipAddress: true, status: true, deletedAt: true },
  });
}

export async function permanentlyDeleteCamera(id: string) {
  const prisma = getPrisma();
  const camera = await prisma.camera.findUnique({ where: { id } });
  if (!camera) throw new NotFoundError('Camera', id);

  // Delete related data first
  await prisma.cameraEvent.deleteMany({ where: { cameraId: id } });
  await prisma.storageSnapshot.deleteMany({ where: { cameraId: id } });
  // Don't delete images — they belong to the system
  await prisma.camera.delete({ where: { id } });
  return { deleted: true };
}

export async function emptyCameraTrash() {
  const prisma = getPrisma();
  const deleted = await prisma.camera.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true },
  });
  const ids = deleted.map(d => d.id);
  if (ids.length === 0) return { deleted: 0 };

  await prisma.cameraEvent.deleteMany({ where: { cameraId: { in: ids } } });
  await prisma.storageSnapshot.deleteMany({ where: { cameraId: { in: ids } } });
  const result = await prisma.camera.deleteMany({ where: { id: { in: ids } } });
  return { deleted: result.count };
}
