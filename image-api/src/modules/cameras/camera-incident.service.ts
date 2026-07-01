import { getPrisma } from '../../lib/prisma.js';

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
  problemDesc?: string;
  estimatedFinish?: string;
  priority?: string;
  impact?: string;
  assignedTo?: string;
  attachments?: any[];
  openedBy: string;
  observers?: any[];
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
      problemDesc: data.problemDesc,
      estimatedFinish: data.estimatedFinish ? new Date(data.estimatedFinish) : null,
      priority: data.priority ?? 'medium',
      impact: data.impact ?? 'none',
      assignedTo: data.assignedTo,
      attachments: data.attachments ?? [],
      observers: data.observers ?? [],
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
  resolutionDesc?: string;
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
      resolutionDesc: data.resolutionDesc,
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

// Enhanced list with filters
export async function searchIncidents(params: {
  q?: string; cameraId?: string; reason?: string; rootCause?: string;
  status?: string; priority?: string; page?: number; limit?: number;
}) {
  const prisma = getPrisma();
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const where: any = {};
  if (params.cameraId) where.cameraId = params.cameraId;
  if (params.reason) where.reason = params.reason;
  if (params.rootCause) where.rootCause = params.rootCause;
  if (params.status) where.status = params.status;
  if (params.priority) where.priority = params.priority;
  if (params.q) {
    where.OR = [
      { incidentNumber: { contains: params.q, mode: 'insensitive' } },
      { problemDesc: { contains: params.q, mode: 'insensitive' } },
      { resolutionDesc: { contains: params.q, mode: 'insensitive' } },
      { description: { contains: params.q, mode: 'insensitive' } },
    ];
  }
  const [total, data] = await Promise.all([
    prisma.cameraIncident.count({ where }),
    prisma.cameraIncident.findMany({
      where, orderBy: { openedAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
      include: { camera: { select: { name: true } } },
    }),
  ]);
  // compute MTTR per incident (closedAt - openedAt)
  const mapped = data.map((i: any) => ({
    ...i,
    cameraName: i.camera?.name ?? '',
    mttrMinutes: i.closedAt ? Math.round((new Date(i.closedAt).getTime() - new Date(i.openedAt).getTime()) / 60000) : null,
  }));
  return { data: mapped, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// Knowledge Base aggregations
export async function getIncidentKnowledge(params: { cameraId?: string; days?: number }) {
  const prisma = getPrisma();
  const where: any = {};
  if (params.cameraId) where.cameraId = params.cameraId;
  if (params.days) where.openedAt = { gte: new Date(Date.now() - params.days * 86400000) };

  const incidents: any[] = await prisma.cameraIncident.findMany({ where, include: { camera: { select: { name: true } } } });

  // Top problems (by reason)
  const reasonCount: Record<string, number> = {};
  const rootCauseCount: Record<string, number> = {};
  const resolutionCount: Record<string, number> = {};
  const cameraCount: Record<string, { name: string; count: number }> = {};
  let totalMttr = 0, mttrCount = 0;

  for (const i of incidents) {
    if (i.reason) reasonCount[i.reason] = (reasonCount[i.reason] ?? 0) + 1;
    if (i.rootCause) rootCauseCount[i.rootCause] = (rootCauseCount[i.rootCause] ?? 0) + 1;
    if (i.resolution) resolutionCount[i.resolution] = (resolutionCount[i.resolution] ?? 0) + 1;
    cameraCount[i.cameraId] = { name: (i as any).camera?.name ?? '', count: (cameraCount[i.cameraId]?.count ?? 0) + 1 };
    if (i.closedAt) { totalMttr += (new Date(i.closedAt).getTime() - new Date(i.openedAt).getTime()) / 60000; mttrCount++; }
  }

  const toSorted = (obj: Record<string, number>) =>
    Object.entries(obj).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);

  return {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    avgMttrMinutes: mttrCount > 0 ? Math.round(totalMttr / mttrCount) : null,
    topProblems: toSorted(reasonCount).slice(0, 8),
    topRootCauses: toSorted(rootCauseCount).slice(0, 8),
    topResolutions: toSorted(resolutionCount).slice(0, 8),
    frequentCameras: Object.entries(cameraCount).map(([id, v]) => ({ cameraId: id, name: v.name, count: v.count })).sort((a, b) => b.count - a.count).slice(0, 8),
  };
}

// Related incidents (same reason or rootCause)
export async function getRelatedIncidents(incidentId: string) {
  const prisma = getPrisma();
  const inc = await prisma.cameraIncident.findUnique({ where: { id: incidentId } });
  if (!inc) return [];
  const related = await prisma.cameraIncident.findMany({
    where: {
      id: { not: incidentId },
      OR: [{ reason: inc.reason }, ...(inc.rootCause ? [{ rootCause: inc.rootCause }] : [])],
    },
    orderBy: { openedAt: 'desc' }, take: 10,
    include: { camera: { select: { name: true } } },
  });
  return related.map((i: any) => ({ ...i, cameraName: i.camera?.name ?? '' }));
}

// Resolution suggestions: given a reason/rootCause, what resolutions worked
export async function getResolutionStats(params: { reason?: string; rootCause?: string }) {
  const prisma = getPrisma();
  const where: any = { status: 'resolved' };
  if (params.reason) where.reason = params.reason;
  if (params.rootCause) where.rootCause = params.rootCause;
  const resolved = await prisma.cameraIncident.findMany({ where, select: { resolution: true } });
  const counts: Record<string, number> = {};
  for (const r of resolved) { if (r.resolution) counts[r.resolution] = (counts[r.resolution] ?? 0) + 1; }
  return {
    total: resolved.length,
    resolutions: Object.entries(counts).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
  };
}

// --- P21: Maintenance Work Order ---
export async function createWorkOrder(incidentId: string, _username: string) {
  const prisma = getPrisma();
  const inc = await prisma.cameraIncident.findUnique({ where: { id: incidentId } });
  if (!inc) throw new Error('Incident not found');
  const year = new Date().getFullYear();
  const count = await prisma.cameraIncident.count({ where: { workOrderNumber: { startsWith: `WO-${year}-` } } });
  const workOrderNumber = `WO-${year}-${String(count + 1).padStart(5, '0')}`;
  return prisma.cameraIncident.update({
    where: { id: incidentId },
    data: { workOrderNumber, workOrderStatus: 'open' },
  });
}

export async function updateWorkOrderStatus(incidentId: string, status: string) {
  const prisma = getPrisma();
  return prisma.cameraIncident.update({ where: { id: incidentId }, data: { workOrderStatus: status } });
}

export async function getIncidentOptions() {
  const prisma = getPrisma();
  const [reasons, rootCauses, resolutions] = await Promise.all([
    prisma.masterdata.findMany({ where: { type: 'incident_reason', isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.masterdata.findMany({ where: { type: 'incident_root_cause', isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.masterdata.findMany({ where: { type: 'incident_resolution', isActive: true }, orderBy: { sortOrder: 'asc' } }),
  ]);
  return { reasons, rootCauses, resolutions };
}
