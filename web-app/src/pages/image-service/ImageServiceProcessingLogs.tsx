import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { imageServiceApi } from '@/services/imageServiceApi';
import { formatDateTime } from '@/utils/dateUtils';
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown, RotateCcw,
  AlertCircle, CheckCircle, Clock, XCircle, Loader, Activity,
} from 'lucide-react';
import { Button, SearchableSelect, TableSkeleton } from '@/components/ui';

const JOB_STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-500/20 text-green-400',
  running: 'bg-blue-500/20 text-blue-400',
  queued: 'bg-cyan-500/20 text-cyan-400',
  failed: 'bg-red-500/20 text-red-400',
  retrying: 'bg-yellow-500/20 text-yellow-400',
  dead_letter: 'bg-gray-500/20 text-gray-400',
};

const JOB_TYPE_ICONS: Record<string, any> = {
  sync: 'Activity',
  convert: 'Activity',
  thumbnail: 'Activity',
  checksum: 'Activity',
  archive: 'Activity',
  delete: 'Activity',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg border border-white/20 bg-slate-900/90 backdrop-blur-md text-xs shadow-xl">
      <p className="text-gray-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

export default function ImageServiceProcessingLogs() {
  const { t, i18n } = useTranslation();
  const { themeConfig } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortCol, setSortCol] = useState('queuedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['processing-logs', page, search, statusFilter, typeFilter, sortCol, sortDir],
    queryFn: async () => {
      const res = await imageServiceApi.getProcessingLogs({
        page, limit: 20, status: statusFilter || undefined,
        jobType: typeFilter || undefined, q: search || undefined,
      });
      return {
        items: res.data ?? [],
        total: res.pagination?.total ?? 0,
        totalPages: res.pagination?.totalPages ?? 0,
      };
    },
    staleTime: 1000 * 15,
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  const handleSort = (col: string) => {
    if (col === 'actions') return;
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleRetry = async (jobId: string) => {
    try {
      await imageServiceApi.retryJob(jobId);
      toast.success(t('imageService.processingLogs.retrySuccess'));
      queryClient.invalidateQueries({ queryKey: ['processing-logs'] });
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
  };

  const thCls = (col: string) =>
    `px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none hover:text-cyan-300 ${themeConfig.text.primary}`;

  const STATUS_LABEL_KEY: Record<string, string> = {
    queued: 'imageService.processingLogs.statusQueued',
    running: 'imageService.processingLogs.statusRunning',
    completed: 'imageService.processingLogs.statusCompleted',
    failed: 'imageService.processingLogs.statusFailed',
    retrying: 'imageService.processingLogs.statusRetrying',
    dead_letter: 'imageService.processingLogs.statusDeadLetter',
  };
  const TYPE_LABEL_KEY: Record<string, string> = {
    sync: 'imageService.processingLogs.typeSync',
    convert: 'imageService.processingLogs.typeConvert',
    thumbnail: 'imageService.processingLogs.typeThumbnail',
    checksum: 'imageService.processingLogs.typeChecksum',
    archive: 'imageService.processingLogs.typeArchive',
    delete: 'imageService.processingLogs.typeDelete',
  };
  const statusOptions = Object.keys(STATUS_LABEL_KEY).map(s => ({ value: s, label: t(STATUS_LABEL_KEY[s]) }));
  const typeOptions = Object.keys(TYPE_LABEL_KEY).map(s => ({ value: s, label: t(TYPE_LABEL_KEY[s]) }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.processingLogs.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.processingLogs.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.processingLogs.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${themeConfig.text.secondary}`} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('imageService.search.searchPlaceholder')}
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary}`} />
        </div>
        <div className="w-36">
          <SearchableSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1); }}
            placeholder={t('imageService.processingLogs.allStatuses')} options={statusOptions} />
        </div>
        <div className="w-36">
          <SearchableSelect value={typeFilter} onChange={v => { setTypeFilter(v); setPage(1); }}
            placeholder={t('imageService.processingLogs.allTypes')} options={typeOptions} />
        </div>
      </div>

      {isLoading ? <TableSkeleton rows={8} /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={themeConfig.tableHeader}>
                <tr>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>#</th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>
                    {t('imageService.processingLogs.imageId')}
                  </th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>
                    {t('imageService.processingLogs.jobType')}
                  </th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>
                    {t('imageService.processingLogs.status')}
                  </th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>
                    {t('imageService.processingLogs.workerId')}
                  </th>
                  <th onClick={() => handleSort('queuedAt')} className={thCls('queuedAt')}>
                    <div className="flex items-center gap-1">{t('imageService.processingLogs.queuedAt')}
                      {sortCol === 'queuedAt' ? sortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" /> : <ChevronsUpDown size={11} className="opacity-25" />}</div>
                  </th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>
                    {t('imageService.processingLogs.duration')}
                  </th>
                  <th className={`px-4 py-3 text-center text-sm font-semibold ${themeConfig.text.primary}`}>
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${themeConfig.tableDivide}`}>
                {items.map((job: any, idx: number) => (
                  <tr key={job.id} className={`border-b ${themeConfig.tableBorder} ${themeConfig.tableRow}`}>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>{(page - 1) * 20 + idx + 1}</td>
                    <td className={`px-4 py-3 text-sm font-mono ${themeConfig.text.secondary}`}>
                      {job.imageId ? job.imageId.slice(0, 8) + '...' : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-xs bg-cyan-500/10 text-cyan-400">
                        {t(TYPE_LABEL_KEY[job.jobType] ?? job.jobType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${JOB_STATUS_STYLES[job.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                        {t(STATUS_LABEL_KEY[job.status] ?? job.status)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${themeConfig.text.secondary}`}>
                      {job.workerId ?? '—'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>
                      {job.queuedAt ? formatDateTime(job.queuedAt, i18n.language) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>
                      {job.durationMs ? `${(job.durationMs / 1000).toFixed(1)}${t('imageService.processingLogs.seconds')}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        {['failed', 'dead_letter'].includes(job.status) && (
                          <button onClick={() => handleRetry(job.id)}
                            className="p-2 rounded-lg hover:bg-green-500/20" title={t('imageService.processingLogs.retry')}>
                            <RotateCcw size={15} className="text-green-500" />
                          </button>
                        )}
                        {job.errorMessage && (
                          <div className={`ml-1 max-w-[200px] truncate text-xs ${themeConfig.text.secondary}`}
                            title={job.errorMessage}>
                            {job.errorMessage}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className={`text-center py-12 ${themeConfig.text.secondary} text-sm`}>
              {t('imageService.processingLogs.noLogs')}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className={`px-3 py-1.5 rounded-lg text-xs border ${themeConfig.inputBorder} ${themeConfig.text.primary} disabled:opacity-30`}>
                {t('common.prev')}
              </button>
              <span className={`text-xs ${themeConfig.text.secondary}`}>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className={`px-3 py-1.5 rounded-lg text-xs border ${themeConfig.inputBorder} ${themeConfig.text.primary} disabled:opacity-30`}>
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
