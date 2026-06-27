import { getPrisma } from '../../lib/prisma.js';

const DEFAULT_CONFIGS: Record<string, { value: string; description: string; valueType: string; category: string }> = {
  retention_days_raw: { value: '30', description: 'Retention days for raw TIFF files', valueType: 'number', category: 'retention' },
  retention_days_processed: { value: '90', description: 'Retention days for processed PNG files', valueType: 'number', category: 'retention' },
  retention_days_thumbnail: { value: '365', description: 'Retention days for thumbnail files', valueType: 'number', category: 'retention' },
  compression_quality: { value: '85', description: 'JPEG/PNG compression quality (0-100)', valueType: 'number', category: 'compression' },
  thumbnail_width: { value: '256', description: 'Thumbnail max width in pixels', valueType: 'number', category: 'thumbnail' },
  thumbnail_height: { value: '256', description: 'Thumbnail max height in pixels', valueType: 'number', category: 'thumbnail' },
  poll_interval_default: { value: '30', description: 'Default poll interval in seconds', valueType: 'number', category: 'polling' },
  retry_max_count: { value: '3', description: 'Max retry count for failed processing jobs', valueType: 'number', category: 'alert' },
  alert_critical_threshold: { value: '90', description: 'Disk usage percentage for critical alert', valueType: 'number', category: 'alert' },
  alert_warning_threshold: { value: '75', description: 'Disk usage percentage for warning alert', valueType: 'number', category: 'alert' },
  max_storage_gb: { value: '1000', description: 'Global max storage capacity in GB for forecast', valueType: 'number', category: 'storage' },
  max_storage_per_camera_gb: { value: '100', description: 'Per-camera max storage capacity in GB for forecast', valueType: 'number', category: 'storage' },
  dlq_alert_threshold: { value: '10', description: 'Dead letter queue count threshold for alert', valueType: 'number', category: 'alert' },
  camera_offline_threshold_minutes: { value: '5', description: 'Minutes without poll before camera is considered offline', valueType: 'number', category: 'alert' },
  dashboard_layout_overview: { value: '', description: 'Default dashboard layout for new users (JSON)', valueType: 'json', category: 'dashboard' },
  dashboard_layout_processing: { value: '', description: 'Default processing monitor layout for new users (JSON)', valueType: 'json', category: 'dashboard' },
  dashboard_layout_storage: { value: '', description: 'Default storage layout for new users (JSON)', valueType: 'json', category: 'dashboard' },

  // General settings — managed via UI
  system_logo: { value: '', description: 'System logo (base64 data URL)', valueType: 'string', category: 'general' },
  system_name: { value: 'Image Service', description: 'Application name', valueType: 'string', category: 'general' },
  system_description: { value: 'Enterprise Image Management System', description: 'Application description', valueType: 'string', category: 'general' },
  system_version: { value: '1.0.0', description: 'System version label', valueType: 'string', category: 'general' },
  system_developer: { value: 'Chiotron', description: 'Developer / company name', valueType: 'string', category: 'general' },
  system_copyright: { value: '© 2026 Chiotron. All rights reserved.', description: 'Copyright notice text', valueType: 'string', category: 'general' },
};

export async function getAllConfigs(): Promise<Record<string, any>> {
  const prisma = getPrisma();
  const rows = await prisma.systemConfig.findMany();
  const map: Record<string, any> = {};

  for (const [key, def] of Object.entries(DEFAULT_CONFIGS)) {
    const row = rows.find(r => r.key === key);
    const raw = row?.value ?? def.value;
    map[key] = {
      value: parseValue(raw, row?.valueType ?? def.valueType),
      description: row?.description ?? def.description,
      valueType: row?.valueType ?? def.valueType,
      category: row?.category ?? def.category,
    };
  }

  return map;
}

export async function updateConfigs(inputs: Record<string, string>): Promise<void> {
  const prisma = getPrisma();
  for (const [key, value] of Object.entries(inputs)) {
    const def = DEFAULT_CONFIGS[key];
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: {
        key,
        value: String(value),
        description: def?.description ?? '',
        valueType: def?.valueType ?? 'string',
        category: def?.category ?? 'general',
      },
    });
  }
}

function parseValue(raw: string, valueType: string): any {
  switch (valueType) {
    case 'number': return Number(raw);
    case 'boolean': return raw === 'true';
    case 'json': try { return JSON.parse(raw); } catch { return raw; }
    default: return raw;
  }
}
