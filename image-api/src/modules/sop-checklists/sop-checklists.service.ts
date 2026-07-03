import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { getPrisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type { CreateChecklistInput, UpdateChecklistInput, ToggleStepInput } from './sop-checklists.schema.js';

export async function listChecklists() {
  const prisma = getPrisma();
  return prisma.sopChecklist.findMany({ where: { deletedAt: null }, orderBy: { reasonCode: 'asc' } });
}

export async function getChecklistByReasonCode(reasonCode: string) {
  const prisma = getPrisma();
  return prisma.sopChecklist.findFirst({ where: { reasonCode, deletedAt: null, isActive: true } });
}

async function getChecklistById(id: string) {
  const prisma = getPrisma();
  const checklist = await prisma.sopChecklist.findFirst({ where: { id, deletedAt: null } });
  if (!checklist) throw new NotFoundError('SOP checklist', id);
  return checklist;
}

export async function createChecklist(input: CreateChecklistInput & { createdBy?: string }) {
  const prisma = getPrisma();
  const existing = await prisma.sopChecklist.findFirst({ where: { reasonCode: input.reasonCode, deletedAt: null } });
  if (existing) throw new ConflictError(`A checklist already exists for reason "${input.reasonCode}"`);
  const steps = input.steps.map((s) => ({ id: randomUUID(), text: s.text }));
  return prisma.sopChecklist.create({
    data: {
      reasonCode: input.reasonCode,
      title: input.title,
      steps,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
    },
  });
}

export async function updateChecklist(id: string, input: UpdateChecklistInput & { updatedBy?: string }) {
  await getChecklistById(id);
  const prisma = getPrisma();
  return prisma.sopChecklist.update({
    where: { id },
    data: {
      title: input.title,
      steps: input.steps,
      isActive: input.isActive,
      updatedBy: input.updatedBy,
    },
  });
}

export async function deleteChecklist(id: string) {
  await getChecklistById(id);
  const prisma = getPrisma();
  await prisma.sopChecklist.update({ where: { id }, data: { deletedAt: new Date() } });
}

// Merges the reason's checklist definition with this incident's current progress + history log.
export async function getIncidentSopState(incidentId: string) {
  const prisma = getPrisma();
  const incident = await prisma.cameraIncident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new NotFoundError('Incident', incidentId);

  const checklist = await getChecklistByReasonCode(incident.reason);
  const progress = (incident.sopProgress ?? {}) as Record<string, { checked: boolean; actedBy?: string; actedAt?: string }>;
  const logs = await prisma.incidentSopLog.findMany({ where: { incidentId }, orderBy: { actedAt: 'desc' }, take: 50 });

  if (!checklist) return { checklist: null, steps: [], logs };

  const steps = ((checklist.steps as any[]) ?? []).map((s) => ({
    id: s.id,
    text: s.text,
    checked: progress[s.id]?.checked ?? false,
    actedBy: progress[s.id]?.actedBy ?? null,
    actedAt: progress[s.id]?.actedAt ?? null,
  }));

  return { checklist: { id: checklist.id, title: checklist.title, reasonCode: checklist.reasonCode }, steps, logs };
}

export async function toggleStep(incidentId: string, input: ToggleStepInput, actedBy?: string) {
  const prisma = getPrisma();
  const incident = await prisma.cameraIncident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new NotFoundError('Incident', incidentId);

  const progress = { ...((incident.sopProgress ?? {}) as Record<string, unknown>) };
  const actedAt = new Date().toISOString();
  progress[input.stepId] = { checked: input.checked, actedBy, actedAt };

  await prisma.$transaction([
    prisma.cameraIncident.update({ where: { id: incidentId }, data: { sopProgress: progress as Prisma.InputJsonValue } }),
    prisma.incidentSopLog.create({
      data: { incidentId, stepId: input.stepId, stepText: input.stepText, checked: input.checked, actedBy },
    }),
  ]);

  return getIncidentSopState(incidentId);
}
