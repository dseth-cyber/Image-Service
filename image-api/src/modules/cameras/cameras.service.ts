import { getPrisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import { encrypt, decrypt } from '../../lib/encryption.js';
import type { CreateCameraInput, UpdateCameraInput } from './cameras.schema.js';

// System-wide defaults used when neither the camera nor its template specify a value.
export const PROCESSING_DEFAULTS = {
  acceptedExtensions: ['tif', 'tiff', 'ptif', 'ptiff'] as string[],
  convertToPng: true,
  keepSmaller: true,
  generateThumbnail: true,
  thumbnailSize: 512,
  compressionQuality: 85,
};

type EffectiveConfig = {
  acceptedExtensions: string[];
  convertToPng: boolean;
  keepSmaller: boolean;
  generateThumbnail: boolean;
  thumbnailSize: number;
  compressionQuality: number;
};

interface ResolvableCamera {
  acceptedExtensions?: string[] | null;
  convertToPng?: boolean | null;
  keepSmaller?: boolean | null;
  generateThumbnail?: boolean | null;
  thumbnailSize?: number | null;
  compressionQuality?: number | null;
  template?: {
    acceptedExtensions?: string[] | null;
    convertToPng?: boolean | null;
    keepSmaller?: boolean | null;
    generateThumbnail?: boolean | null;
    thumbnailSize?: number | null;
    compressionQuality?: number | null;
  } | null;
}

// Resolve each processing field: camera override (non-null / non-empty) -> template -> system default.
export function resolveEffectiveConfig(camera: ResolvableCamera): EffectiveConfig {
  const t = camera.template ?? null;

  const pickArray = (cam?: string[] | null, tpl?: string[] | null, def?: string[]): string[] => {
    if (cam && cam.length > 0) return cam;
    if (tpl && tpl.length > 0) return tpl;
    return def ?? [];
  };
  const pick = <T>(cam: T | null | undefined, tpl: T | null | undefined, def: T): T => {
    if (cam !== null && cam !== undefined) return cam;
    if (tpl !== null && tpl !== undefined) return tpl;
    return def;
  };

  return {
    acceptedExtensions: pickArray(camera.acceptedExtensions, t?.acceptedExtensions, PROCESSING_DEFAULTS.acceptedExtensions),
    convertToPng: pick(camera.convertToPng, t?.convertToPng, PROCESSING_DEFAULTS.convertToPng),
    keepSmaller: pick(camera.keepSmaller, t?.keepSmaller, PROCESSING_DEFAULTS.keepSmaller),
    generateThumbnail: pick(camera.generateThumbnail, t?.generateThumbnail, PROCESSING_DEFAULTS.generateThumbnail),
    thumbnailSize: pick(camera.thumbnailSize, t?.thumbnailSize, PROCESSING_DEFAULTS.thumbnailSize),
    compressionQuality: pick(camera.compressionQuality, t?.compressionQuality, PROCESSING_DEFAULTS.compressionQuality),
  };
}

// Resolve the effective config for a camera by id (camera override -> template -> default).
export async function getCameraEffectiveConfig(cameraId: string): Promise<EffectiveConfig> {
  const prisma = getPrisma();
  const camera = await prisma.camera.findUnique({
    where: { id: cameraId },
    include: { template: true },
  });
  if (!camera) throw new NotFoundError('Camera', cameraId);
  return resolveEffectiveConfig(camera as ResolvableCamera);
}

export async function listCameras(filters?: { status?: string; enabled?: boolean }) {
  const prisma = getPrisma();

  const where: Record<string, unknown> = { deletedAt: null };
  if (filters?.status) where.status = filters.status;
  if (filters?.enabled !== undefined) where.enabled = filters.enabled;

  const cameras = await prisma.camera.findMany({
    where,
    include: { retentionPolicy: { select: { id: true, name: true } }, template: true },
    orderBy: { name: 'asc' },
  });

  const counts = await prisma.image.groupBy({
    by: ['cameraId'],
    where: { deletedAt: null },
    _count: { id: true }
  });
  const countMap = new Map(counts.map(x => [x.cameraId, x._count.id]));

  const allIncidents = await (prisma as any).cameraIncident.findMany({
    select: {
      cameraId: true,
      assignedTo: true,
      reason: true,
      openedAt: true
    }
  });

  const statsMap = new Map<string, {
    incidentCount: number;
    technicians: Map<string, number>;
    reasons: Map<string, number>;
    hours: Map<number, number>;
  }>();

  for (const inc of allIncidents) {
    const cid = inc.cameraId;
    let s = statsMap.get(cid);
    if (!s) {
      s = {
        incidentCount: 0,
        technicians: new Map<string, number>(),
        reasons: new Map<string, number>(),
        hours: new Map<number, number>(),
      };
      statsMap.set(cid, s);
    }
    s.incidentCount += 1;
    if (inc.assignedTo) {
      s.technicians.set(inc.assignedTo, (s.technicians.get(inc.assignedTo) ?? 0) + 1);
    }
    if (inc.reason) {
      s.reasons.set(inc.reason, (s.reasons.get(inc.reason) ?? 0) + 1);
    }
    if (inc.openedAt) {
      const hr = new Date(inc.openedAt).getHours();
      s.hours.set(hr, (s.hours.get(hr) ?? 0) + 1);
    }
  }

  const getMaxKey = (m: Map<string, number>): string => {
    let maxK = '—';
    let maxV = -1;
    for (const [k, v] of m.entries()) {
      if (v > maxV) {
        maxV = v;
        maxK = k;
      }
    }
    return maxK;
  };

  const getPeakHourStr = (m: Map<number, number>): string => {
    let maxH = -1;
    let maxV = -1;
    for (const [k, v] of m.entries()) {
      if (v > maxV) {
        maxV = v;
        maxH = k;
      }
    }
    if (maxH === -1) return '—';
    const start = String(maxH).padStart(2, '0') + ':00';
    const end = String((maxH + 1) % 24).padStart(2, '0') + ':00';
    return `${start} - ${end}`;
  };

  // Decrypt SMB passwords for workers that need plaintext credentials, and
  // expose resolved processing config so sync/processing workers can read it.
  return cameras.map((c) => {
    const totalImagesCount = countMap.get(c.id) ?? 0;
    const cameraAgeDays = Math.max(1, Math.ceil((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    const averageImagesPerDay = Math.round((Number(totalImagesCount) / cameraAgeDays) * 100) / 100;
    const stats = statsMap.get(c.id);

    return {
      ...c,
      totalImagesCount,
      cameraAgeDays,
      averageImagesPerDay,
      incidentCount: stats?.incidentCount ?? 0,
      topTechnician: stats ? getMaxKey(stats.technicians) : '—',
      topReason: stats ? getMaxKey(stats.reasons) : '—',
      peakHour: stats ? getPeakHourStr(stats.hours) : '—',
      overrides: {
        acceptedExtensions: c.acceptedExtensions,
        convertToPng: c.convertToPng,
        keepSmaller: c.keepSmaller,
        generateThumbnail: c.generateThumbnail,
        thumbnailSize: c.thumbnailSize,
        compressionQuality: c.compressionQuality,
      },
      smbPasswordEncrypted: c.smbPasswordEncrypted
        ? decrypt(c.smbPasswordEncrypted)
        : c.smbPasswordEncrypted,
      ...resolveEffectiveConfig(c as ResolvableCamera),
    };
  });
}

export async function getCameraById(id: string) {
  const prisma = getPrisma();

  const camera = await prisma.camera.findUnique({
    where: { id },
    include: { retentionPolicy: true, template: true },
  });

  if (!camera) {
    throw new (await import('../../lib/errors.js')).NotFoundError('Camera', id);
  }

  const totalImagesCount = await prisma.image.count({
    where: { cameraId: id, deletedAt: null }
  });

  const incidents = await (prisma as any).cameraIncident.findMany({
    where: { cameraId: id },
    select: { assignedTo: true, reason: true, openedAt: true }
  });

  const technicians = new Map<string, number>();
  const reasons = new Map<string, number>();
  const hours = new Map<number, number>();

  for (const inc of incidents) {
    if (inc.assignedTo) {
      technicians.set(inc.assignedTo, (technicians.get(inc.assignedTo) ?? 0) + 1);
    }
    if (inc.reason) {
      reasons.set(inc.reason, (reasons.get(inc.reason) ?? 0) + 1);
    }
    if (inc.openedAt) {
      const hr = new Date(inc.openedAt).getHours();
      hours.set(hr, (hours.get(hr) ?? 0) + 1);
    }
  }

  const getMaxKey = (m: Map<string, number>): string => {
    let maxK = '—';
    let maxV = -1;
    for (const [k, v] of m.entries()) {
      if (v > maxV) {
        maxV = v;
        maxK = k;
      }
    }
    return maxK;
  };

  const getPeakHourStr = (m: Map<number, number>): string => {
    let maxH = -1;
    let maxV = -1;
    for (const [k, v] of m.entries()) {
      if (v > maxV) {
        maxV = v;
        maxH = k;
      }
    }
    if (maxH === -1) return '—';
    const start = String(maxH).padStart(2, '0') + ':00';
    const end = String((maxH + 1) % 24).padStart(2, '0') + ':00';
    return `${start} - ${end}`;
  };

  const cameraAgeDays = Math.max(1, Math.ceil((Date.now() - new Date(camera.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  const averageImagesPerDay = Math.round((Number(totalImagesCount) / cameraAgeDays) * 100) / 100;

  // Decrypt SMB password for workers that need plaintext credentials, and
  // expose resolved processing config so sync/processing workers can read it.
  // Raw (possibly null) camera-level overrides are preserved under `overrides`
  // so the UI can distinguish "explicitly set" from "inherit from template".
  return {
    ...camera,
    totalImagesCount,
    cameraAgeDays,
    averageImagesPerDay,
    incidentCount: incidents.length,
    topTechnician: getMaxKey(technicians),
    topReason: getMaxKey(reasons),
    peakHour: getPeakHourStr(hours),
    overrides: {
      acceptedExtensions: camera.acceptedExtensions,
      convertToPng: camera.convertToPng,
      keepSmaller: camera.keepSmaller,
      generateThumbnail: camera.generateThumbnail,
      thumbnailSize: camera.thumbnailSize,
      compressionQuality: camera.compressionQuality,
    },
    smbPasswordEncrypted: camera.smbPasswordEncrypted
      ? decrypt(camera.smbPasswordEncrypted)
      : camera.smbPasswordEncrypted,
    ...resolveEffectiveConfig(camera as ResolvableCamera),
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
      templateId: input.templateId ?? null,
      acceptedExtensions: input.acceptedExtensions ?? [],
      convertToPng: input.convertToPng ?? null,
      keepSmaller: input.keepSmaller ?? null,
      generateThumbnail: input.generateThumbnail ?? null,
      thumbnailSize: input.thumbnailSize ?? null,
      compressionQuality: input.compressionQuality ?? null,
      metadata: input.metadata as object,
      status: 'inactive',
    },
    include: { retentionPolicy: true, template: true },
  });

  return camera;
}

export async function updateCamera(id: string, input: UpdateCameraInput) {
  const prisma = getPrisma();

  const existing = await prisma.camera.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Camera', id);
  }

  if (input.name !== undefined && input.name !== existing.name) {
    const nameConflict = await prisma.camera.findFirst({ where: { name: input.name } });
    if (nameConflict) {
      throw new ConflictError(`Camera with name '${input.name}' already exists`);
    }
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
  if (input.templateId !== undefined) data.templateId = input.templateId;
  if (input.acceptedExtensions !== undefined) data.acceptedExtensions = input.acceptedExtensions ?? [];
  if (input.convertToPng !== undefined) data.convertToPng = input.convertToPng;
  if (input.keepSmaller !== undefined) data.keepSmaller = input.keepSmaller;
  if (input.generateThumbnail !== undefined) data.generateThumbnail = input.generateThumbnail;
  if (input.thumbnailSize !== undefined) data.thumbnailSize = input.thumbnailSize;
  if (input.compressionQuality !== undefined) data.compressionQuality = input.compressionQuality;

  const updated = await prisma.camera.update({
    where: { id },
    data,
    include: { retentionPolicy: true, template: true },
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
