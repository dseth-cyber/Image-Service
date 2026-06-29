import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/App';
import { imageServiceApi } from '@/services/imageServiceApi';
import { formatDateTime } from '@/utils/dateUtils';
import { History, Search, Filter, ChevronLeft, ChevronRight, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { Modal, Button, SearchableSelect } from '@/components/ui';

const ACTION_LABEL_KEY: Record<string, string> = {
  image_delete: 'imageService.auditLog.actionImageDelete',
  metadata_update: 'imageService.auditLog.actionMetadataUpdate',
  tags_update: 'imageService.auditLog.actionTagsUpdate',
  tag_delete: 'imageService.auditLog.actionTagDelete',
  file_download: 'imageService.auditLog.actionFileDownload',
  policy_create: 'imageService.auditLog.actionPolicyCreate',
  policy_update: 'imageService.auditLog.actionPolicyUpdate',
  policy_delete: 'imageService.auditLog.actionPolicyDelete',
};

const ENTITY_LABEL_KEY: Record<string, string> = {
  image: 'imageService.auditLog.entityImage',
  image_file: 'imageService.auditLog.entityImageFile',
  retention_policy: 'imageService.auditLog.entityRetentionPolicy',
};

export default function AuditLogViewer() {
  const { t, i18n } = useTranslation();
  const { themeConfig } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteDays, setBulkDeleteDays] = useState(30);
  const [bulkDeletePreview, setBulkDeletePreview] = useState<{ count: number; cutoffDate: string } | null>(null);
  const [bulkDeletePassword, setBulkDeletePassword] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteLoadingPreview, setBulkDeleteLoadingPreview] = useState(false);

  const BULK_DELETE_DAY_OPTIONS = [7, 14, 30, 60, 90, 120, 240, 365];

  const fetchBulkDeletePreview = useCallback(async (days: number) => {
    setBulkDeleteLoadingPreview(true);
    setBulkDeletePreview(null);
    try {
      const result = await imageServiceApi.bulkDeleteAuditPreview(days);
      setBulkDeletePreview(result);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBulkDeleteLoadingPreview(false);
    }
  }, [t, toast]);

  const handleOpenBulkDelete = useCallback(() => {
    setBulkDeleteOpen(true);
    setBulkDeletePassword('');
    setBulkDeletePreview(null);
    setBulkDeleteDays(30);
    fetchBulkDeletePreview(30);
  }, [fetchBulkDeletePreview]);

  const handleBulkDeleteDaysChange = useCallback((days: number) => {
    setBulkDeleteDays(days);
    fetchBulkDeletePreview(days);
  }, [fetchBulkDeletePreview]);

  const handleBulkDelete = useCallback(async () => {
    if (!bulkDeletePassword || !bulkDeletePreview) return;
    setBulkDeleting(true);
    try {
      const result = await imageServiceApi.bulkDeleteAuditByAge(bulkDeleteDays, bulkDeletePassword);
      toast.success(t('imageService.auditLog.bulkDeleteSuccess', { count: result.deleted }));
      setBulkDeleteOpen(false);
      setBulkDeletePassword('');
      setBulkDeletePreview(null);
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    } catch (e: any) {
      if (e?.response?.status === 401) {
        toast.error(t('imageService.auditLog.bulkDeleteWrongPassword'));
      } else if (!e?._handled) {
        toast.error(t('common.error'));
      }
    } finally {
      setBulkDeleting(false);
    }
  }, [bulkDeleteDays, bulkDeletePassword, bulkDeletePreview, t, toast, queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, action, entity],
    queryFn: () => imageServiceApi.getAuditLogs({ page, limit: 50, action: action || undefined, entity: entity || undefined }),
    staleTime: 1000 * 30,
  });

  const logs = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 0 };

  const tableHeaderClass = `text-xs font-medium uppercase tracking-wider ${themeConfig.text.secondary} px-4 py-3 text-left`;
  const tableCellClass = `text-sm px-4 py-2.5 ${themeConfig.text.primary}`;

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.auditLog.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.auditLog.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.auditLog.subtitle')}</p>
      </div>

      <div className={`${themeConfig.card} rounded-lg p-4 mb-5 flex items-center gap-3`}>
        <Filter size={15} className={themeConfig.text.secondary} />
        <div className="w-44">
          <SearchableSelect value={action} onChange={v => { setAction(v); setPage(1) }}
            options={[
              { value: '', label: t('imageService.auditLog.allActions') },
              ...Object.keys(ACTION_LABEL_KEY).map(a => ({ value: a, label: t(ACTION_LABEL_KEY[a]) })),
            ]} />
        </div>
        <div className="w-40">
          <SearchableSelect value={entity} onChange={v => { setEntity(v); setPage(1) }}
            options={[
              { value: '', label: t('imageService.auditLog.allEntities') },
              ...Object.keys(ENTITY_LABEL_KEY).map(e => ({ value: e, label: t(ENTITY_LABEL_KEY[e]) })),
            ]} />
        </div>
        {hasPermission(user, 'audit-log:read') && (
          <button onClick={handleOpenBulkDelete}
            className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 size={13} /> {t('imageService.auditLog.bulkDelete')}
          </button>
        )}
        <span className={`text-xs ${themeConfig.text.secondary} ml-auto`}>
          {pagination.total} {t('common.records')}
        </span>
      </div>

      <div className={`${themeConfig.card} rounded-lg overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${themeConfig.cardBorder}`}>
                <th className={tableHeaderClass}>{t('imageService.auditLog.time')}</th>
                <th className={tableHeaderClass}>{t('imageService.auditLog.user')}</th>
                <th className={tableHeaderClass}>{t('imageService.auditLog.action')}</th>
                <th className={tableHeaderClass}>{t('imageService.auditLog.entity')}</th>
                <th className={tableHeaderClass}>{t('imageService.auditLog.entityId')}</th>
                <th className={tableHeaderClass}>{t('imageService.auditLog.description')}</th>
                <th className={tableHeaderClass}>{t('imageService.auditLog.ip')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={7} className={`text-center py-8 text-sm ${themeConfig.text.secondary}`}>{t('common.loading')}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className={`text-center py-8 text-sm ${themeConfig.text.secondary}`}>
                  {t('imageService.auditLog.noLogs')}
                </td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className={`${tableCellClass} text-xs whitespace-nowrap`}>
                    {formatDateTime(log.createdAt, i18n.language)}
                  </td>
                  <td className={tableCellClass}>
                    <span className="text-xs font-medium">{log.username || log.userId?.slice(0, 8) || t('common.system')}</span>
                  </td>
                  <td className={tableCellClass}>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      log.action.includes('delete') ? 'bg-red-500/10 text-red-400' :
                      log.action.includes('create') ? 'bg-green-500/10 text-green-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>
                      {t(ACTION_LABEL_KEY[log.action] ?? log.action.replace(/_/g, ' '))}
                    </span>
                  </td>
                  <td className={`${tableCellClass} text-xs text-gray-400`}>{t(ENTITY_LABEL_KEY[log.entity] ?? log.entity)}</td>
                  <td className={`${tableCellClass} text-xs text-gray-400 font-mono max-w-[120px] truncate`}>
                    {log.entityId || '—'}
                  </td>
                  <td className={`${tableCellClass} text-xs text-gray-400 max-w-[200px] truncate`}>
                    {log.description || '—'}
                  </td>
                  <td className={`${tableCellClass} text-xs text-gray-500 font-mono`}>{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className={`text-xs ${themeConfig.text.secondary}`}>
              {t('common.page')} {pagination.page} {t('common.of')} {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft size={14} />
              </Button>
              <Button size="sm" variant="ghost" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Delete Modal */}
      <Modal isOpen={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} title={t('imageService.auditLog.bulkDeleteTitle')}>
        <div className="space-y-5 p-1 max-w-md">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className={`text-xs ${themeConfig.text.secondary}`}>
              {t('imageService.auditLog.bulkDeleteWarning')}
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${themeConfig.text.primary}`}>
              {t('imageService.auditLog.bulkDeleteDays')}
            </label>
            <SearchableSelect
              value={String(bulkDeleteDays)}
              onChange={v => handleBulkDeleteDaysChange(Number(v))}
              placeholder={t('imageService.auditLog.bulkDeleteDays')}
              options={BULK_DELETE_DAY_OPTIONS.map(d => ({ value: String(d), label: `${d} ${t('imageService.auditLog.days')}` }))}
            />
          </div>

          <div className={`p-3 rounded-lg ${themeConfig.card} border ${themeConfig.inputBorder}`}>
            {bulkDeleteLoadingPreview ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full" />
                <span className={`text-sm ${themeConfig.text.secondary}`}>...</span>
              </div>
            ) : bulkDeletePreview ? (
              <p className={`text-sm font-medium ${bulkDeletePreview.count > 0 ? 'text-red-400' : themeConfig.text.primary}`}>
                {t('imageService.auditLog.bulkDeletePreview', {
                  count: bulkDeletePreview.count.toLocaleString(),
                  date: bulkDeletePreview.cutoffDate.split('T')[0],
                })}
              </p>
            ) : null}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>
              {t('imageService.auditLog.bulkDeleteConfirm')}
            </label>
            <input
              type="password" autoComplete="new-password"
              value={bulkDeletePassword}
              onChange={e => setBulkDeletePassword(e.target.value)}
              placeholder={t('imageService.auditLog.bulkDeletePassword')}
              className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-red-500/50`}
              onKeyDown={e => { if (e.key === 'Enter' && bulkDeletePassword && bulkDeletePreview && bulkDeletePreview.count > 0) handleBulkDelete(); }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <Button variant="secondary" onClick={() => setBulkDeleteOpen(false)}>
              {t('common.close')}
            </Button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting || !bulkDeletePassword || !bulkDeletePreview || bulkDeletePreview.count === 0}
              className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
            >
              {bulkDeleting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Trash2 size={14} />
              )}
              {t('imageService.auditLog.bulkDelete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
