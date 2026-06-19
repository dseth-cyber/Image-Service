import { PrismaClient, Role, CameraStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const operatorPassword = await bcrypt.hash('operator123', 10);
  const viewerPassword = await bcrypt.hash('viewer123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@image-service.local',
      password: adminPassword,
      role: 'admin' as Role,
      enabled: true,
    },
  });
  console.log(`  Admin user: ${adminUser.username}`);

  const operatorUser = await prisma.user.upsert({
    where: { username: 'operator' },
    update: {},
    create: {
      username: 'operator',
      email: 'operator@image-service.local',
      password: operatorPassword,
      role: 'operator' as Role,
      enabled: true,
    },
  });
  console.log(`  Operator user: ${operatorUser.username}`);

  const viewerUser = await prisma.user.upsert({
    where: { username: 'viewer' },
    update: {},
    create: {
      username: 'viewer',
      email: 'viewer@image-service.local',
      password: viewerPassword,
      role: 'viewer' as Role,
      enabled: true,
    },
  });
  console.log(`  Viewer user: ${viewerUser.username}`);

  const defaultPolicy = await prisma.retentionPolicy.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Default Retention',
      description: 'Standard retention policy for production cameras',
      rawRetentionDays: 7,
      processedRetentionDays: 90,
      thumbnailRetentionDays: 365,
      archiveEnabled: false,
      coldStorageClass: 'cold',
    },
  });
  console.log(`  Default retention policy: ${defaultPolicy.name}`);

  const longTermPolicy = await prisma.retentionPolicy.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Long-Term Retention',
      description: 'Extended retention for quality inspection cameras',
      rawRetentionDays: 30,
      processedRetentionDays: 365,
      thumbnailRetentionDays: 730,
      archiveEnabled: true,
      archiveRawDays: 25,
      coldStorageClass: 'cold',
    },
  });
  console.log(`  Long-term retention policy: ${longTermPolicy.name}`);

  const alertRule = await prisma.alertRule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Camera Offline Alert',
      alertType: 'camera_offline',
      description: 'Triggered when a camera has not polled for 5 minutes',
      enabled: true,
      condition: {
        metric: 'seconds_since_last_poll',
        operator: '>',
        value: 300,
        duration_minutes: 5,
      },
      cooldownMinutes: 60,
      notificationChannels: [{ type: 'log' }],
    },
  });
  console.log(`  Alert rule: ${alertRule.name}`);

  const camera = await prisma.camera.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Test Camera (SMB)',
      description: 'Local SMB test camera for Phase 0 integration testing',
      ipAddress: 'image-smb-server',
      smbSharePath: '//image-smb-server/images',
      smbDomain: 'WORKGROUP',
      smbUsername: 'camera',
      smbPasswordEncrypted: 'smbpass',
      status: 'active' as CameraStatus,
      pollIntervalSeconds: 15,
      captureMode: 'periodic',
      retentionPolicyId: '00000000-0000-0000-0000-000000000001',
      enabled: true,
      metadata: { location: 'test-lab', cameraType: 'simulated' },
    },
  });
  console.log(`  Test camera: ${camera.name}`);

  console.log('\nDefault credentials:');
  console.log('  admin    / admin123   (full access)');
  console.log('  operator / operator123 (read + write)');
  console.log('  viewer   / viewer123   (read-only)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
