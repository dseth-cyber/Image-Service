import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { imageServiceApi } from '@/services/imageServiceApi';
import { formatDateTime } from '@/utils/dateUtils';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  Activity, Clock, CheckCircle, XCircle, AlertTriangle, RotateCcw, RefreshCw,
  Play, Pause,
} from 'lucide-react';
import { SearchableSelect, Button } from '@/components/ui';

const PIE_COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const BAR_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

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

const JOB_STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-500/20 text-green-400',
  running: 'bg-blue-500/20 text-blue-400',
  queued: 'bg-gray-500/20 text-gray-400',
  failed: 'bg-red-500/20 text-red-400',
  retrying: 'bg-yellow-500/20 text-yellow-400',
  dead_letter: 'bg-red-500/20 text-red-400',
};

export default function ImageServiceProcessingMonitor() {
  const { t, i18n } = useTranslation();
  const { themeConfig } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [timeRange, setTimeRange] = useState('30');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: overview } = useQuery({
    queryKey: ['image-service-overview'],
    queryFn: () => imageServiceApi.getOverview(),
    refetchInterval: autoRefresh ? 1000 * 15 : undefined,
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['processing-logs-monitor', timeRange],
    queryFn: () => imageServiceApi.getProcessingLogs({ limit: 50 }),
    refetchInterval: autoRefresh ? 1000 * 15 : undefined,
  });

  const logsArr = Array.isArray(logs?.data) ? logs.data : (Array.isArray(logs) ? logs : []);

  const statusCounts = ['completed', 'running', 'queued', 'failed', 'dead_letter'].map((s) => ({
    name: t(`imageService.processingLogs.${s === 'dead_letter' ? 'failed' : s}`),
    value: logsArr.filter((l: any) => l.status === s).length,
  }));

  const jobsByType = logsArr.reduce((acc: Record<string, number>, l: any) => {
    acc[l.jobType] = (acc[l.jobType] || 0) + 1;
    return acc;
  }, {});

  const jobTypeData = Object.entries(jobsByType).map(([k, v]) => ({ name: k, value: v }));

  const tickFill = themeConfig.name === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
  const gridStroke = themeConfig.name === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';

  const handleRetry = async (jobId: string) => {
    try {
      await imageServiceApi.retryJob(jobId);
      toast.success(t('imageService.processingLogs.retrySuccess'));
      queryClient.invalidateQueries({ queryKey: ['processing-logs'] });
    } catch { toast.error(t('common.error')); }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.processing.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.processing.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.processing.subtitle')}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: t('imageService.processing.totalJobs'), value: logsArr.length, color: '#06b6d4', icon: Activity },
          { label: t('imageService.processing.completed'), value: logsArr.filter((l: any) => l.status === 'completed').length, color: '#10b981', icon: CheckCircle },
          { label: t('imageService.processing.failed'), value: logsArr.filter((l: any) => l.status === 'failed' || l.status === 'dead_letter').length, color: '#ef4444', icon: XCircle },
          { label: t('imageService.processing.inProgress'), value: logsArr.filter((l: any) => l.status === 'running').length, color: '#f59e0b', icon: AlertTriangle },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`${themeConfig.card} rounded-lg p-5`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} style={{ color: s.color }} />
                <span className={`text-xs ${themeConfig.text.secondary}`}>{s.label}</span>
              </div>
              <span className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className={`${themeConfig.card} rounded-lg p-5`}>
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>{t('imageService.processing.jobStatus')}</h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value" nameKey="name">
                  {statusCounts.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-2xl font-bold ${themeConfig.text.primary}`}>{logsArr.length}</span>
              <span className={`text-xs ${themeConfig.text.secondary}`}>total</span>
            </div>
          </div>
        </div>

        <div className={`${themeConfig.card} rounded-lg p-5`}>
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>{t('imageService.processing.byType')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={jobTypeData} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={gridStroke} />
              <XAxis dataKey="name" tick={{ fill: tickFill, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {jobTypeData.map((_: any, i: number) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`${themeConfig.card} rounded-lg p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.processing.recentJobs')}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-colors
                ${autoRefresh ? 'text-cyan-400 bg-cyan-500/10' : `${themeConfig.text.secondary} hover:bg-white/5`}`}
            >
              {autoRefresh ? <Pause size={13} /> : <Play size={13} />}
              Auto
            </button>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['processing-logs'] })}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={14} className={themeConfig.text.secondary} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={themeConfig.tableHeader}>
              <tr>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.processingLogs.imageId')}</th>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.processingLogs.jobType')}</th>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.processingLogs.status')}</th>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.processingLogs.duration')}</th>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.processingLogs.queuedAt')}</th>
                <th className={`px-4 py-3 text-center text-sm font-semibold ${themeConfig.text.primary}`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${themeConfig.tableDivide}`}>
              {logsArr.slice(0, 20).map((log: any) => (
                <tr key={log.id} className={`border-b ${themeConfig.tableBorder} ${themeConfig.tableRow}`}>
                  <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>
                    <span className="font-mono text-xs">{log.imageId?.slice(0, 8) ?? '—'}...</span>
                  </td>
                  <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>
                    <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/10 text-cyan-400">{log.jobType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${JOB_STATUS_STYLES[log.status] ?? ''}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>
                    {log.duration != null ? `${log.duration.toFixed(1)}s` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>
                    {formatDateTime(log.queuedAt, i18n.language)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {(log.status === 'failed' || log.status === 'dead_letter') && (
                        <button onClick={() => handleRetry(log.id)}
                          className="p-2 rounded-lg hover:bg-green-500/20" title={t('imageService.processingLogs.retry')}>
                          <RotateCcw size={14} className="text-green-500" />
                        </button>
                      )}
                      {log.errorMessage && (
                        <span className="group relative">
                          <button className="p-2 rounded-lg hover:bg-yellow-500/20">
                            <AlertTriangle size={14} className="text-yellow-500" />
                          </button>
                          <span className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded-lg bg-slate-800 text-xs text-gray-200 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none transition-opacity">
                            {log.errorMessage}
                          </span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {logsArr.length === 0 && (
                <tr>
                  <td colSpan={6} className={`px-4 py-8 text-center text-sm ${themeConfig.text.secondary}`}>
                    {t('imageService.processingLogs.noLogs')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
