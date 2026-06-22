import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { imageServiceApi } from '@/services/imageServiceApi';
import { History, Search, Filter, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button, SearchableSelect } from '@/components/ui';

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
  const { t } = useTranslation();
  const { themeConfig } = useTheme();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');

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
        <span className={`text-xs ${themeConfig.text.secondary} ml-auto`}>
          {pagination.total} records
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
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className={tableCellClass}>
                    <span className="text-xs font-medium">{log.username || log.userId?.slice(0, 8) || 'system'}</span>
                  </td>
                  <td className={tableCellClass}>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      log.action.includes('delete') ? 'bg-red-500/10 text-red-400' :
                      log.action.includes('create') ? 'bg-green-500/10 text-green-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className={`${tableCellClass} text-xs text-gray-400`}>{log.entity}</td>
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
              Page {pagination.page} of {pagination.totalPages}
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
    </div>
  );
}
