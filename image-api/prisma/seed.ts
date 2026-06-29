import { PrismaClient, Role, CameraStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  console.log('Seeding custom roles...');
  const roles = [
    {
      code: 'admin',
      nameTh: 'ผู้ดูแลระบบ',
      nameEn: 'Administrator',
      nameCn: '管理员',
      nameMm: 'အက်ဒမင်',
      nameJp: '管理者',
      description: 'Full system access',
      permissions: ['*'],
      sortOrder: 1,
    },
    {
      code: 'operator',
      nameTh: 'ผู้ปฏิบัติการ',
      nameEn: 'Operator',
      nameCn: '操作员',
      nameMm: 'အော်ပရေတာ',
      nameJp: 'オペレーター',
      description: 'Standard operational read/write access',
      permissions: [
        'overview:read',
        'cameras:read', 'cameras:create', 'cameras:update',
        'search:read', 'search:update',
        'processing:read', 'processing:create',
        'storage:read',
        'logs:read',
        'dead-letter:read', 'dead-letter:create',
        'retention:read', 'retention:create', 'retention:update',
        'alerts:read', 'alerts:update'
      ],
      sortOrder: 2,
    },
    {
      code: 'viewer',
      nameTh: 'ผู้เข้าชม',
      nameEn: 'Viewer',
      nameCn: '观察员',
      nameMm: 'ကြည့်ရှုသူ',
      nameJp: 'ビューアー',
      description: 'Read-only access',
      permissions: [
        'overview:read',
        'cameras:read',
        'search:read',
        'processing:read',
        'storage:read',
        'logs:read',
        'alerts:read'
      ],
      sortOrder: 3,
    },
  ];

  for (const r of roles) {
    const createdRole = await prisma.customRole.upsert({
      where: { code: r.code },
      update: {
        nameTh: r.nameTh,
        nameEn: r.nameEn,
        nameCn: r.nameCn,
        nameMm: r.nameMm,
        nameJp: r.nameJp,
        description: r.description,
        permissions: r.permissions,
        sortOrder: r.sortOrder,
      },
      create: r,
    });
    console.log(`  Role: ${createdRole.code} (${createdRole.nameEn})`);
  }

  const adminPassword = await bcrypt.hash('admin123', 10);
  const operatorPassword = await bcrypt.hash('operator123', 10);
  const viewerPassword = await bcrypt.hash('viewer123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { role: 'admin' },
    create: {
      username: 'admin',
      email: 'admin@image-service.local',
      password: adminPassword,
      role: 'admin',
      enabled: true,
    },
  });
  console.log(`  Admin user: ${adminUser.username}`);

  const operatorUser = await prisma.user.upsert({
    where: { username: 'operator' },
    update: { role: 'operator' },
    create: {
      username: 'operator',
      email: 'operator@image-service.local',
      password: operatorPassword,
      role: 'operator',
      enabled: true,
    },
  });
  console.log(`  Operator user: ${operatorUser.username}`);

  const viewerUser = await prisma.user.upsert({
    where: { username: 'viewer' },
    update: { role: 'viewer' },
    create: {
      username: 'viewer',
      email: 'viewer@image-service.local',
      password: viewerPassword,
      role: 'viewer',
      enabled: true,
    },
  });
  console.log(`  Viewer user: ${viewerUser.username}`);

  const defaultPolicy = await prisma.retentionPolicy.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'การจัดเก็บเริ่มต้น (Default)',
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
      name: 'การจัดเก็บระยะยาว (Long-Term)',
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

  const storageProvider = await prisma.storageProvider.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      name: 'Primary Storage',
      type: 's3',
      config: {
        bucket: process.env.MINIO_BUCKET || 'image-service',
        endpoint: process.env.MINIO_ENDPOINT || 'minio',
        port: parseInt(process.env.MINIO_PORT || '9000', 10),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      },
      isDefault: true,
      isActive: true,
      priority: 1,
      description: 'Primary S3-compatible storage (MinIO)',
    },
  });
  console.log(`  Storage provider: ${storageProvider.name} (${storageProvider.type})`);

  const seaweedProvider = await prisma.storageProvider.upsert({
    where: { id: '00000000-0000-0000-0000-000000000021' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000021',
      name: 'SeaweedFS Storage',
      type: 'seaweedfs',
      config: {
        bucket: process.env.SEAWEEDFS_BUCKET || 'image-service',
        endpoint: 'seaweedfs-filer',
        port: 8333,
        useSSL: false,
        accessKey: process.env.SEAWEEDFS_ACCESS_KEY || 'seaweedadmin',
        secretKey: process.env.SEAWEEDFS_SECRET_KEY || 'seaweedadmin',
      },
      isDefault: false,
      isActive: true,
      priority: 2,
      description: 'SeaweedFS distributed storage (S3-compatible)',
    },
  });
  console.log(`  Storage provider: ${seaweedProvider.name} (${seaweedProvider.type})`);

  const camera = await prisma.camera.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {
      status: 'active',
      smbSubdirectoryPattern: null,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Test Camera (SMB)',
      description: 'Local SMB test camera for Phase 0 integration testing',
      ipAddress: 'image-smb-server',
      smbSharePath: '//image-smb-server/images',
      smbDomain: 'WORKGROUP',
      smbUsername: 'camera',
      smbPasswordEncrypted: 'smbpass',
      smbSubdirectoryPattern: null,
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
