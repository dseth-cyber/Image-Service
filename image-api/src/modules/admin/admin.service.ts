import bcrypt from 'bcryptjs';
import { ForbiddenError } from '../../lib/errors.js';
import { getPrisma } from '../../lib/prisma.js';
import { getMinio } from '../../lib/minio.js';
import { getRedisClient } from '../../lib/redis.js';
import { config } from '../../config/index.js';
import { createAuditLog } from '../audit/audit.service.js';

export async function clearAllData(userId: string, input: { password: string }) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(input.password, user.password))) {
    throw new ForbiddenError('Invalid password');
  }

  // 1. Clear MinIO objects (fire-and-forget to avoid timeout)
  (async () => {
    try {
      const m = getMinio();
      const b = config.minio.bucket;
      const objects = await new Promise<string[]>((resolve, reject) => {
        const list: string[] = [];
        const stream = m.listObjects(b, '', true);
        stream.on('data', (obj) => { if (obj.name) list.push(obj.name); });
        stream.on('error', reject);
        stream.on('end', () => resolve(list));
      });
      for (let i = 0; i < objects.length; i += 1000) {
        await m.removeObjects(b, objects.slice(i, i + 1000));
      }
    } catch {
      // ignore MinIO errors in background
    }
  })();

  // 2. Clear Redis keys (queues, scan triggers, watermarks, tracker state)
  try {
    const redis = getRedisClient();
    const queueKeys = await redis.keys('bull:*');
    if (queueKeys.length > 0) await redis.del(...queueKeys);
    await redis.del('sync:scan-now');
    await redis.del('sync:scan-now:ids');
    const syncKeys = await redis.keys('sync:camera:*');
    if (syncKeys.length > 0) await redis.del(...syncKeys);
    const processedKeys = await redis.keys('sync:processed:*');
    if (processedKeys.length > 0) await redis.del(...processedKeys);
  } catch {
    // Redis may not be available
  }

  // 3. Clear DB tables in order (respect FK constraints)
  await prisma.$transaction([
    prisma.processingJob.deleteMany(),
    prisma.imageFile.deleteMany(),
    prisma.image.deleteMany(),
    prisma.auditLog.deleteMany(),
  ]);

  // 4. Audit log
  await createAuditLog({
    userId,
    action: 'clear_all_data',
    entity: 'system',
    description: 'All processing data cleared (images, image_files, processing_jobs, audit_logs, MinIO objects, Redis queues)',
  });
}
