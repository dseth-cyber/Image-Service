import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { imageServiceApi } from '@/services/imageServiceApi';
import { Database, HardDrive, RefreshCw, CheckCircle, XCircle, Clock, Play, Shield, FileText } from 'lucide-react';
import { Button } from '@/components/ui';

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function statusBadge(status: string, themeConfig: any) {
  const colors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    running: 'bg-blue-500/20 text-blue-400',
    pending: 'bg-gray-500/20 text-gray-400',
  };
  const icons: Record<string, any> = {
    completed: CheckCircle,
    failed: XCircle,
    running: Clock,
    pending: Clock,
  };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.pending}`}>
      <Icon size={12} />
      {status}
    </span>
  );
}

export default function BackupDashboard() {
  const { t, i18n } = useTranslation();
  const { themeConfig } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['backup-status'],
    queryFn: () => imageServiceApi.getBackupStatus(),
    refetchInterval: 1000 * 60,
  });

  const dbMutation = useMutation({
    mutationFn: () => imageServiceApi.runDatabaseBackup(),
    onSuccess: (res: any) => {
      toast.success(res.status === 'completed' ? 'Database backup completed' : 'Database backup failed');
      queryClient.invalidateQueries({ queryKey: ['backup-status'] });
    },
    onError: () => toast.error('Failed to run database backup'),
  });

  const minioMutation = useMutation({
    mutationFn: () => imageServiceApi.runMinioBackup(),
    onSuccess: (res: any) => {
      toast.success(res.status === 'completed' ? 'MinIO backup completed' : 'MinIO backup failed');
      queryClient.invalidateQueries({ queryKey: ['backup-status'] });
    },
    onError: () => toast.error('Failed to run MinIO backup'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => imageServiceApi.runRestoreTest(id),
    onSuccess: (res: any) => {
      toast.success(res.success ? `Restore test: ${res.message}` : `Restore test failed: ${res.message}`);
    },
    onError: () => toast.error('Restore test error'),
  });

  const cardClass = `${themeConfig.card} rounded-lg p-5`;
  const labelClass = `text-xs ${themeConfig.text.secondary} mb-1`;
  const valueClass = `text-sm font-semibold ${themeConfig.text.primary}`;

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.backup.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.backup.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.backup.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-blue-400" />
              <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.backup.databaseBackup')}</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => dbMutation.mutate()} disabled={dbMutation.isPending}>
              <Play size={14} className="mr-1" />
              {t('imageService.backup.runNow')}
            </Button>
          </div>

          {status?.database ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={labelClass}>{t('imageService.backup.status')}</span>
                {statusBadge(status.database.status, themeConfig)}
              </div>
              <div className="flex justify-between">
                <span className={labelClass}>{t('imageService.backup.fileSize')}</span>
                <span className={valueClass}>{formatBytes(status.database.fileSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className={labelClass}>{t('imageService.backup.lastBackup')}</span>
                <span className={`text-xs ${themeConfig.text.secondary}`}>
                  {status.database.completedAt ? new Date(status.database.completedAt).toLocaleString() : '—'}
                </span>
              </div>
              {status.database.errorMessage && (
                <div className="text-xs text-red-400 mt-2">{status.database.errorMessage}</div>
              )}
            </div>
          ) : (
            <div className={`text-center py-6 text-sm ${themeConfig.text.secondary}`}>{t('imageService.backup.noBackups')}</div>
          )}
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive size={18} className="text-purple-400" />
              <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.backup.minioBackup')}</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => minioMutation.mutate()} disabled={minioMutation.isPending}>
              <Play size={14} className="mr-1" />
              {t('imageService.backup.runNow')}
            </Button>
          </div>

          {status?.minio ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={labelClass}>{t('imageService.backup.status')}</span>
                {statusBadge(status.minio.status, themeConfig)}
              </div>
              <div className="flex justify-between">
                <span className={labelClass}>{t('imageService.backup.fileSize')}</span>
                <span className={valueClass}>{formatBytes(status.minio.fileSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className={labelClass}>{t('imageService.backup.lastBackup')}</span>
                <span className={`text-xs ${themeConfig.text.secondary}`}>
                  {status.minio.completedAt ? new Date(status.minio.completedAt).toLocaleString() : '—'}
                </span>
              </div>
              {status.minio.errorMessage && (
                <div className="text-xs text-red-400 mt-2">{status.minio.errorMessage}</div>
              )}
            </div>
          ) : (
            <div className={`text-center py-6 text-sm ${themeConfig.text.secondary}`}>{t('imageService.backup.noBackups')}</div>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-amber-400" />
          <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.backup.recentBackups')}</h3>
        </div>
        <BackupHistoryTable themeConfig={themeConfig} onRestoreTest={(id) => restoreMutation.mutate(id)} />
      </div>
    </div>
  );
}

function BackupHistoryTable({ themeConfig, onRestoreTest }: { themeConfig: any; onRestoreTest: (id: string) => void }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['backup-records'],
    queryFn: () => imageServiceApi.getBackupRecords({ limit: 20 }),
    refetchInterval: 1000 * 60,
  });

  const records = data?.data ?? [];
  const tableHeaderClass = `text-xs font-medium uppercase tracking-wider ${themeConfig.text.secondary} px-4 py-3 text-left`;
  const tableCellClass = `text-sm px-4 py-2.5 ${themeConfig.text.primary}`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className={`border-b ${themeConfig.cardBorder}`}>
            <th className={tableHeaderClass}>Type</th>
            <th className={tableHeaderClass}>Status</th>
            <th className={tableHeaderClass}>Started</th>
            <th className={tableHeaderClass}>Size</th>
            <th className={tableHeaderClass}>Path</th>
            <th className={`${tableHeaderClass} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {isLoading ? (
            <tr><td colSpan={6} className={`text-center py-6 text-sm ${themeConfig.text.secondary}`}>Loading...</td></tr>
          ) : records.length === 0 ? (
            <tr><td colSpan={6} className={`text-center py-6 text-sm ${themeConfig.text.secondary}`}>No backup records</td></tr>
          ) : records.map((r: any) => (
            <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
              <td className={tableCellClass}>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.type === 'database' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                  {r.type}
                </span>
              </td>
              <td className={tableCellClass}>{statusBadge(r.status, themeConfig)}</td>
              <td className={`${tableCellClass} text-xs text-gray-400`}>{new Date(r.startedAt).toLocaleString()}</td>
              <td className={`${tableCellClass} text-xs text-gray-400`}>{formatBytes(r.fileSize)}</td>
              <td className={`${tableCellClass} text-xs text-gray-400 max-w-[200px] truncate`}>{r.filePath || '—'}</td>
              <td className={`${tableCellClass} text-right`}>
                {r.status === 'completed' && (
                  <Button size="sm" variant="ghost" onClick={() => onRestoreTest(r.id)} title="Test restore">
                    <Shield size={14} />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
