import { getPrisma } from '../../lib/prisma.js';

export async function getSetting(key: string): Promise<string | null> {
  const prisma = getPrisma();
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  const prisma = getPrisma();
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: keys } },
  });
  const map: Record<string, string | null> = {};
  for (const k of keys) map[k] = null;
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const prisma = getPrisma();
  const rows = await prisma.systemSetting.findMany();
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}
