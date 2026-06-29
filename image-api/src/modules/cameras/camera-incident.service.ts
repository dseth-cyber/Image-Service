import { getPrisma } from '../../lib/prisma.js';

const REASON_OPTIONS = [
  'scheduled_maintenance', 'power_failure', 'network_issue',
  'lens_cleaning', 'firmware_update', 'cable_replacement',
  'camera_malfunction', 'smb_unreachable', 'disk_full',
  'authentication_failed', 'worker_down', 'human_error', 'other'
];

const ROOT_CAUSE_OPTIONS = [
  'power', 'network', 'camera_hardware', 'storage', 'smb',
  'worker', 'human_error', 'environment', 'unknown', 'other'
];

const RESOLUTION_OPTIONS = [
  'completed', 'replaced_cable', 'restarted', 'power_reset',
  'firmware_update', 'cleaned_lens', 'reconfigured', 'replaced_hardware', 'other'
];

async function generateIncidentNumber(): Promise<string> {
  const prisma = getPrisma();
  const year = new Date().getFullYear();
  const count = await prisma.cameraIncident.count({
    where: { incidentNumber: { startsWith: `INC-${year}-` } }
  });
  return `INC-${year}-${String(count + 1).padStart(6, '0')}`;
}

export async function createIncident(data: {
  cameraId: string;
  eventId?: bigint;
  fromStatus: string;
  toStatus: string;
  reason: string;
  rootCause?: string;
  description?: string;
  estimatedFinish?: string;
  openedBy: string;
}) {
  const prisma = getPrisma();
  const incidentNumber = await generateIncidentNumber();

  return prisma.cameraIncident.create({
    data: {
      incidentNumber,
      cameraId: data.cameraId,
      eventId: data.eventId ?? null,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      reason: data.reason,
      rootCause: data.rootCause,
      description: data.description,
      estimatedFinish: data.estimatedFinish ? new Date(data.estimatedFinish) : null,
      openedBy: data.openedBy,
      status: 'open',
    },
  });
}

export async function resolveIncident(id: string, data: {
  resolution?: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  closedBy: string;
}) {
  const prisma = getPrisma();
  const incident = await prisma.cameraIncident.findUnique({ where: { id } });
  if (!incident) throw new Error('Incident not found');

  return prisma.cameraIncident.update({
    where: { id },
    data: {
      resolution: data.resolution,
      rootCause: data.rootCause || incident.rootCause,
      correctiveAction: data.correctiveAction,
      preventiveAction: data.preventiveAction,
      closedBy: data.closedBy,
      closedAt: new Date(),
      actualFinish: new Date(),
      status: 'resolved',
    },
  });
}

export async function getIncidents(params: {
  cameraId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const prisma = getPrisma();
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const where: any = {};
  if (params.cameraId) where.cameraId = params.cameraId;
  if (params.status) where.status = params.status;

  const [total, data] = await Promise.all([
    prisma.cameraIncident.count({ where }),
    prisma.cameraIncident.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { camera: { select: { name: true } } },
    }),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getIncident(id: string) {
  const prisma = getPrisma();
  return prisma.cameraIncident.findUnique({
    where: { id },
    include: { camera: { select: { name: true } }, event: true },
  });
}

export async function getOpenIncidentForCamera(cameraId: string) {
  const prisma = getPrisma();
  return prisma.cameraIncident.findFirst({
    where: { cameraId, status: 'open' },
    orderBy: { openedAt: 'desc' },
  });
}

export { REASON_OPTIONS, ROOT_CAUSE_OPTIONS, RESOLUTION_OPTIONS };
