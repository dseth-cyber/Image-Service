import { getPrisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
export async function listCameras(filters) {
    const prisma = getPrisma();
    const where = {};
    if (filters?.status)
        where.status = filters.status;
    if (filters?.enabled !== undefined)
        where.enabled = filters.enabled;
    const cameras = await prisma.camera.findMany({
        where,
        include: { retentionPolicy: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
    });
    return cameras;
}
export async function getCameraById(id) {
    const prisma = getPrisma();
    const camera = await prisma.camera.findUnique({
        where: { id },
        include: { retentionPolicy: true },
    });
    if (!camera) {
        throw new NotFoundError('Camera', id);
    }
    return camera;
}
export async function createCamera(input) {
    const prisma = getPrisma();
    const policy = await prisma.retentionPolicy.findUnique({ where: { id: input.retentionPolicyId } });
    if (!policy) {
        throw new NotFoundError('RetentionPolicy', input.retentionPolicyId);
    }
    const existing = await prisma.camera.findFirst({ where: { name: input.name } });
    if (existing) {
        throw new ConflictError(`Camera with name '${input.name}' already exists`);
    }
    const camera = await prisma.camera.create({
        data: {
            name: input.name,
            description: input.description,
            ipAddress: input.ipAddress,
            smbSharePath: input.smbSharePath,
            smbDomain: input.smbDomain,
            smbUsername: input.smbUsername,
            smbPasswordEncrypted: input.smbPasswordEncrypted,
            smbSubdirectoryPattern: input.smbSubdirectoryPattern,
            pollIntervalSeconds: input.pollIntervalSeconds,
            timezone: input.timezone,
            captureMode: input.captureMode,
            retentionPolicyId: input.retentionPolicyId,
            metadata: input.metadata,
            status: 'inactive',
        },
        include: { retentionPolicy: true },
    });
    return camera;
}
export async function updateCamera(id, input) {
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
    const data = {};
    if (input.name !== undefined)
        data.name = input.name;
    if (input.description !== undefined)
        data.description = input.description;
    if (input.ipAddress !== undefined)
        data.ipAddress = input.ipAddress;
    if (input.smbSharePath !== undefined)
        data.smbSharePath = input.smbSharePath;
    if (input.smbDomain !== undefined)
        data.smbDomain = input.smbDomain;
    if (input.smbUsername !== undefined)
        data.smbUsername = input.smbUsername;
    if (input.smbPasswordEncrypted !== undefined)
        data.smbPasswordEncrypted = input.smbPasswordEncrypted;
    if (input.smbSubdirectoryPattern !== undefined)
        data.smbSubdirectoryPattern = input.smbSubdirectoryPattern;
    if (input.pollIntervalSeconds !== undefined)
        data.pollIntervalSeconds = input.pollIntervalSeconds;
    if (input.timezone !== undefined)
        data.timezone = input.timezone;
    if (input.captureMode !== undefined)
        data.captureMode = input.captureMode;
    if (input.retentionPolicyId !== undefined)
        data.retentionPolicyId = input.retentionPolicyId;
    if (input.enabled !== undefined)
        data.enabled = input.enabled;
    if (input.lastPolledAt !== undefined)
        data.lastPolledAt = new Date(input.lastPolledAt);
    if (input.metadata !== undefined)
        data.metadata = input.metadata;
    const updated = await prisma.camera.update({
        where: { id },
        data,
        include: { retentionPolicy: true },
    });
    return updated;
}
export async function deactivateCamera(id) {
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
//# sourceMappingURL=cameras.service.js.map