import { getPrisma } from '../../lib/prisma.js';
import type { AlertType, AlertSeverity, Prisma } from '@prisma/client';

export interface CreateAlertInput {
  alertType: AlertType;
  severity: AlertSeverity;
  source?: string;
  title: string;
  message: string;
  details?: Record<string, unknown>;
}

export async function createAlert(input: CreateAlertInput) {
  const prisma = getPrisma();
  return prisma.alert.create({
    data: {
      alertType: input.alertType,
      severity: input.severity ?? 'warning',
      source: input.source,
      title: input.title,
      message: input.message,
      details: (input.details ?? {}) as Prisma.InputJsonValue,
    },
  });
}
