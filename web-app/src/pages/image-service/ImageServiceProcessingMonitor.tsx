import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { imageServiceApi } from '@/services/imageServiceApi';
import { formatDateTime } from '@/utils/dateUtils';
import ProcessingVisualizer from './ProcessingVisualizer';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  Activity, CheckCircle, XCircle, AlertTriangle, RotateCcw, RefreshCw,
  Play, Pause, Radio, GripVertical, Settings, Check, Star,
} from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
const LAYOUT_STORAGE_KEY = 'image_service_processing_layout_v2';

const DEFAULT_LAYOUTS: Record<string, any[]> = {
  lg: [
    { i: 'stats', x: 0, y: 0, w: 12, h: 1.5, minW: 6, minH: 1.5 },
    { i: 'visualizer', x: 0, y: 1.5, w: 12, h: 2, minW: 4, minH: 1.5 },
    { i: 'jobStatus', x: 0, y: 3.5, w: 4, h: 3, minW: 3, minH: 2.5 },
    { i: 'byType', x: 4, y: 3.5, w: 4, h: 3, minW: 3, minH: 2.5 },
    { i: 'recentJobs', x: 8, y: 3.5, w: 4, h: 5, minW: 3, minH: 3 },
  ],
  md: [
    { i: 'stats', x: 0, y: 0, w: 10, h: 1.5, minW: 6, minH: 1.5 },
    { i: 'visualizer', x: 0, y: 1.5, w: 10, h: 2, minW: 4, minH: 1.5 },
    { i: 'jobStatus', x: 0, y: 3.5, w: 5, h: 3, minW: 3, minH: 2.5 },
    { i: 'byType', x: 5, y: 3.5, w: 5, h: 3, minW: 3, minH: 2.5 },
    { i: 'recentJobs', x: 0, y: 6.5, w: 10, h: 5, minW: 3, minH: 3 },
  ],
  sm: [
    { i: 'stats', x: 0, y: 0, w: 6, h: 1.5, minW: 4, minH: 1.5 },
    { i: 'visualizer', x: 0, y: 1.5, w: 6, h: 2, minW: 4, minH: 1.5 },
    { i: 'jobStatus', x: 0, y: 3.5, w: 6, h: 3, minW: 3, minH: 2.5 },
    { i: 'byType', x: 0, y: 6.5, w: 6, h: 3, minW: 3, minH: 2.5 },
    { i: 'recentJobs', x: 0, y: 9.5, w: 6, h: 5, minW: 3, minH: 3 },
  ],
};

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

function DragHandle({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="drag-handle absolute top-2 right-2 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-90 transition-opacity z-10 p-1 rounded-md bg-black/40 backdrop-blur-sm">
      <GripVertical size={13} className="text-white" />
    </div>
  );
}

export default function ImageServiceProcessingMonitor() {
  const { t, i18n } = useTranslation();
  const { themeConfig } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [layouts, setLayouts] = useState(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUTS;
    } catch { return DEFAULT_LAYOUTS; }
  });

  const [logs, setLogs] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [vizStyle, setVizStyle] = useState(() => localStorage.getItem('processing_viz_style') ?? 'ring');

  const { data: initialData } = useQuery({
    queryKey: ['processing-stats-initial'],
    queryFn: () => imageServiceApi.getOverview(),
    staleTime: 1000 * 10,
  });

  const { data: initialLogs } = useQuery({
    queryKey: ['processing-logs-initial'],
    queryFn: () => imageServiceApi.getProcessingLogs({ page: 1, limit: 20, sort: 'queuedAt', order: 'desc' }),
    staleTime: 1000 * 10,
  });

  useEffect(() => {
    if (initialLogs?.data && logs.length === 0) {
      setLogs(initialLogs.data);
    }
  }, [initialLogs]);
  const esRef = useRef<EventSource | null>(null);

  const handleLayoutChange = useCallback((_l: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
  }, []);

  const { data: systemConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => imageServiceApi.getSystemConfigs(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (systemConfig?.dashboard_layout_processing?.value) {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!saved) setLayouts(systemConfig.dashboard_layout_processing.value);
    }
  }, [systemConfig]);

  const handleResetLayout = () => {
    setLayouts(DEFAULT_LAYOUTS);
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  };

  const handleSaveDefaultLayout = async () => {
    try {
      await imageServiceApi.updateSystemConfigs({ dashboard_layout_processing: JSON.stringify(layouts) });
      toast.success(t('imageService.overview.defaultLayoutSaved'));
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
  };

  const connect = useCallback(() => {
    esRef.current?.close();
    const es = new EventSource('/image-service/api/v1/processing-logs/stream');
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.addEventListener('stats', (e) => {
      try {
        const data = JSON.parse(e.data);
        const el = document.getElementById('stats-total');
        if (el) el.textContent = String(data.total ?? 0);
        const elC = document.getElementById('stats-completed');
        if (elC) elC.textContent = String(data.completed ?? 0);
        const elF = document.getElementById('stats-failed');
        if (elF) elF.textContent = String(data.failed ?? 0);
        const elR = document.getElementById('stats-running');
        if (elR) elR.textContent = String(data.running ?? 0);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener('logs', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (Array.isArray(data)) setLogs(data);
      } catch { /* ignore parse errors */ }
    });

    es.onerror = () => {
      setConnected(false);
    };
  }, []);

  useEffect(() => {
    if (autoRefresh) connect();
    else { esRef.current?.close(); setConnected(false); }
    return () => esRef.current?.close();
  }, [autoRefresh, connect]);

  const statusCounts = ['completed', 'running', 'queued', 'failed', 'dead_letter'].map((s) => ({
    name: t(STATUS_LABEL_KEY[s] ?? s),
    value: logs.filter((l) => l.status === s).length,
  }));

  const jobsByType = logs.reduce((acc: Record<string, number>, l: any) => {
    acc[l.jobType] = (acc[l.jobType] || 0) + 1;
    return acc;
  }, {});

  const jobTypeData = Object.entries(jobsByType).map(([k, v]) => ({ name: t(TYPE_LABEL_KEY[k] ?? k), value: v }));

  const tickFill = themeConfig.name === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
  const gridStroke = themeConfig.name === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';

  const handleRetry = async (jobId: string) => {
    try {
      await imageServiceApi.retryJob(jobId);
      toast.success(t('imageService.processingLogs.retrySuccess'));
      queryClient.invalidateQueries({ queryKey: ['processing-logs'] });
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
  };

  const bs = initialData?.byStatus ?? {};
  const totalJobs = Object.values(bs as Record<string, number>).reduce((a: number, b: number) => a + b, 0) || logs.length;
  const completedJobs = (bs as any)?.completed ?? logs.filter((l: any) => l.status === 'completed').length;
  const failedJobs = ((bs as any)?.failed ?? 0) + ((bs as any)?.dead_letter ?? 0) || logs.filter((l: any) => l.status === 'failed' || l.status === 'dead_letter').length;
  const runningJobs = (bs as any)?.running ?? logs.filter((l: any) => l.status === 'running').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
            Image Service · {t('imageService.processing.title')}
          </p>
          <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.processing.title')}</h1>
          <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.processing.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <>
              <button onClick={handleResetLayout}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5
                  border ${themeConfig.inputBorder} ${themeConfig.text.primary} hover:bg-white/5 transition-colors`}>
                <RotateCcw size={13} /> {t('imageService.overview.resetLayout')}
              </button>
              {isAdmin && (
                <button onClick={handleSaveDefaultLayout}
                  className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5
                    bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:brightness-110 transition-all">
                  <Star size={13} /> {t('imageService.overview.setDefaultLayout')}
                </button>
              )}
            </>
          )}
          <button onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5
              ${isEditing
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                : `border ${themeConfig.inputBorder} ${themeConfig.text.primary} hover:bg-white/5`} transition-all`}>
            {isEditing ? <Check size={14} /> : <Settings size={14} />}
            {isEditing ? t('imageService.overview.finishEditing') : t('imageService.overview.editLayout')}
          </button>
        </div>
      </div>

      {isEditing && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-xs ${themeConfig.card}`}>
          {t('imageService.overview.dragHint')}
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={100}
        isDraggable={isEditing}
        isResizable={isEditing}
        draggableHandle=".drag-handle"
        onLayoutChange={handleLayoutChange}
        compactType="vertical"
      >
        <div key="stats" className={`${themeConfig.card} rounded-lg overflow-hidden relative`}>
          <DragHandle show={isEditing} />
          <div className="grid grid-cols-4 gap-4 p-5 h-full">
            {[
              { id: 'stats-total', label: t('imageService.processing.totalJobs'), value: totalJobs, color: '#06b6d4', icon: Activity },
              { id: 'stats-completed', label: t('imageService.processing.completed'), value: completedJobs, color: '#10b981', icon: CheckCircle },
              { id: 'stats-failed', label: t('imageService.processing.failed'), value: failedJobs, color: '#ef4444', icon: XCircle },
              { id: 'stats-running', label: t('imageService.processing.inProgress'), value: runningJobs, color: '#f59e0b', icon: AlertTriangle },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} style={{ color: s.color }} />
                    <span className={`text-xs ${themeConfig.text.secondary}`}>{s.label}</span>
                  </div>
                  <span id={s.id} className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div key="visualizer" className={`${themeConfig.card} rounded-lg overflow-hidden relative h-full`}>
          <DragHandle show={isEditing} />
          <ProcessingVisualizer
            active={runningJobs > 0}
            style={vizStyle}
            onStyleChange={(s) => { setVizStyle(s); localStorage.setItem('processing_viz_style', s); }}
          />
        </div>

        <div key="jobStatus" className={`${themeConfig.card} rounded-lg overflow-hidden relative p-5 flex flex-col h-full`}>
          <DragHandle show={isEditing} />
          <h3 className={`text-sm font-semibold mb-3 flex-shrink-0 ${themeConfig.text.primary}`}>{t('imageService.processing.jobStatus')}</h3>
          <div className="relative flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value" nameKey="name"
                  label={({ name, value }) => `${name} ${value}`}>
                  {statusCounts.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-2xl font-bold ${themeConfig.text.primary}`}>{logs.length}</span>
              <span className={`text-xs ${themeConfig.text.secondary}`}>{t('imageService.processing.totalJobs').toLowerCase()}</span>
            </div>
          </div>
        </div>

        <div key="byType" className={`${themeConfig.card} rounded-lg overflow-hidden relative p-5 flex flex-col h-full`}>
          <DragHandle show={isEditing} />
          <h3 className={`text-sm font-semibold mb-3 flex-shrink-0 ${themeConfig.text.primary}`}>{t('imageService.processing.byType')}</h3>
          <ResponsiveContainer width="100%" height="100%" className="flex-1 min-h-0">
            <BarChart data={jobTypeData} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={gridStroke} />
              <XAxis dataKey="name" tick={{ fill: tickFill, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {jobTypeData.map((_: any, i: number) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
                <LabelList dataKey="value" position="top" style={{ fill: tickFill, fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div key="recentJobs" className={`${themeConfig.card} rounded-lg overflow-hidden relative p-5 flex flex-col h-full`}>
          <DragHandle show={isEditing} />
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.processing.recentJobs')}</h3>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
                <Radio size={10} className={connected ? 'animate-pulse' : ''} />
                {connected ? 'Live' : 'Disconnected'}
              </span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-colors
                  ${autoRefresh ? 'text-cyan-400 bg-cyan-500/10' : `${themeConfig.text.secondary} hover:bg-white/5`}`}
              >
                {autoRefresh ? <Pause size={13} /> : <Play size={13} />}
                Auto
              </button>
              <button
                onClick={() => { esRef.current?.close(); connect(); }}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <RefreshCw size={14} className={themeConfig.text.secondary} />
              </button>
            </div>
          </div>

          <div className="overflow-auto flex-1 min-h-0">
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
                {logs.slice(0, 20).map((log: any) => (
                  <tr key={log.id} className={`border-b ${themeConfig.tableBorder} ${themeConfig.tableRow}`}>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>
                      <span className="font-mono text-xs">{log.imageId?.slice(0, 8) ?? '—'}...</span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>
                      <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/10 text-cyan-400">{t(TYPE_LABEL_KEY[log.jobType] ?? log.jobType)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${JOB_STATUS_STYLES[log.status] ?? ''}`}>
                        {t(STATUS_LABEL_KEY[log.status] ?? log.status)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>
                      {log.durationMs != null ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}
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
                {logs.length === 0 && (
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
      </ResponsiveGridLayout>
    </div>
  );
}
