import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { imageServiceApi } from '@/services/imageServiceApi';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { GripVertical, Settings, RotateCcw, Check, Camera, HardDrive, Activity, Image } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
const LAYOUT_STORAGE_KEY = 'image_service_overview_layout_v1';

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'stats', x: 0, y: 0, w: 12, h: 1.5, minW: 6, minH: 1.5 },
    { i: 'recent', x: 0, y: 1, w: 6, h: 3, minW: 3, minH: 2.5 },
    { i: 'growth', x: 6, y: 1, w: 6, h: 3, minW: 3, minH: 2.5 },
    { i: 'cameraStatus', x: 0, y: 4, w: 4, h: 3, minW: 3, minH: 2.5 },
    { i: 'byCamera', x: 4, y: 4, w: 4, h: 3, minW: 3, minH: 2.5 },
    { i: 'storageDonut', x: 8, y: 4, w: 4, h: 3, minW: 3, minH: 2.5 },
  ],
  md: [
    { i: 'stats', x: 0, y: 0, w: 10, h: 1.5, minW: 6, minH: 1.5 },
    { i: 'recent', x: 0, y: 1, w: 5, h: 3, minW: 3, minH: 2.5 },
    { i: 'growth', x: 5, y: 1, w: 5, h: 3, minW: 3, minH: 2.5 },
    { i: 'cameraStatus', x: 0, y: 4, w: 3, h: 3, minW: 3, minH: 2.5 },
    { i: 'byCamera', x: 3, y: 4, w: 4, h: 3, minW: 3, minH: 2.5 },
    { i: 'storageDonut', x: 7, y: 4, w: 3, h: 3, minW: 3, minH: 2.5 },
  ],
  sm: [
    { i: 'stats', x: 0, y: 0, w: 6, h: 1.5, minW: 4, minH: 1.5 },
    { i: 'recent', x: 0, y: 1, w: 6, h: 3, minW: 3, minH: 2.5 },
    { i: 'growth', x: 0, y: 4, w: 6, h: 3, minW: 3, minH: 2.5 },
    { i: 'cameraStatus', x: 0, y: 7, w: 6, h: 3, minW: 3, minH: 2.5 },
    { i: 'byCamera', x: 0, y: 10, w: 6, h: 3, minW: 3, minH: 2.5 },
    { i: 'storageDonut', x: 0, y: 13, w: 6, h: 3, minW: 3, minH: 2.5 },
  ],
};

const BAR_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];
const PIE_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

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

function DragHandle({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="drag-handle absolute top-2 right-2 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-90 transition-opacity z-10 p-1 rounded-md bg-black/40 backdrop-blur-sm">
      <GripVertical size={13} className="text-white" />
    </div>
  );
}

export default function ImageServiceOverview() {
  const { t, i18n } = useTranslation();
  const { themeConfig } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [layouts, setLayouts] = useState(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUTS;
    } catch { return DEFAULT_LAYOUTS; }
  });

  const { data: overview, isLoading } = useQuery({
    queryKey: ['image-service-overview'],
    queryFn: () => imageServiceApi.getOverview(),
    refetchInterval: 1000 * 30,
  });

  const handleLayoutChange = useCallback((_l: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
  }, []);

  const handleResetLayout = () => {
    setLayouts(DEFAULT_LAYOUTS);
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  };

  const stats = [
    { label: t('imageService.overview.totalImages'), value: overview?.totalImages?.toLocaleString() ?? '—', icon: Image, color: '#06b6d4' },
    { label: t('imageService.overview.activeCameras'), value: overview?.activeCameras ?? '—', icon: Camera, color: '#10b981' },
    { label: t('imageService.overview.storageUsed'), value: overview?.storageUsed ?? '—', icon: HardDrive, color: '#8b5cf6' },
    { label: t('imageService.overview.processingRate'), value: overview?.processingRate ?? '—', icon: Activity, color: '#f59e0b' },
  ];

  const recentActivity = overview?.recentActivity ?? [];
  const storageGrowth = overview?.storageGrowth ?? [];
  const imagesByCamera = overview?.imagesByCamera ?? [];
  const storageByType = overview?.storageByType ?? [];

  const tickFill = themeConfig.name === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
  const gridStroke = themeConfig.name === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
  const trackColor = themeConfig.name === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className={`text-xs font-medium mb-0.5 uppercase tracking-widest ${themeConfig.text.secondary}`}>
            Overview · Image Service
          </p>
          <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>
            {t('imageService.overview.title')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <button onClick={handleResetLayout}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5
                border ${themeConfig.inputBorder} ${themeConfig.text.primary} hover:bg-white/5 transition-colors`}>
              <RotateCcw size={13} /> {t('imageService.overview.resetLayout')}
            </button>
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
            {stats.map((s, i) => (
              <div key={i} className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={18} style={{ color: s.color }} />
                  <span className={`text-xs ${themeConfig.text.secondary}`}>{s.label}</span>
                </div>
                <span className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div key="recent" className={`${themeConfig.card} rounded-lg overflow-hidden relative p-5`}>
          <DragHandle show={isEditing} />
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>
            {t('imageService.overview.recentActivity')}
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={recentActivity} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="recentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} fill="url(#recentGrad)" dot={false} name={t('imageService.overview.imagesToday')} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div key="growth" className={`${themeConfig.card} rounded-lg overflow-hidden relative p-5`}>
          <DragHandle show={isEditing} />
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>
            {t('imageService.overview.storageGrowth')}
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={storageGrowth} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={gridStroke} />
              <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {storageGrowth.map((_: any, i: number) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div key="cameraStatus" className={`${themeConfig.card} rounded-lg overflow-hidden relative p-5`}>
          <DragHandle show={isEditing} />
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>
            {t('imageService.overview.cameraStatus')}
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={[
                { name: t('imageService.cameras.active'), value: overview?.activeCameras ?? 0 },
                { name: t('imageService.cameras.inactive'), value: overview?.inactiveCameras ?? 0 },
                { name: t('imageService.cameras.error'), value: overview?.errorCameras ?? 0 },
              ]} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                paddingAngle={3} dataKey="value" nameKey="name">
                {PIE_COLORS.slice(0, 3).map((c, i) => (
                  <Cell key={i} fill={c} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div key="byCamera" className={`${themeConfig.card} rounded-lg overflow-hidden relative p-5`}>
          <DragHandle show={isEditing} />
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>
            {t('imageService.overview.imagesByCamera')}
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={imagesByCamera} layout="vertical" barCategoryGap="20%">
              <CartesianGrid horizontal={false} stroke={gridStroke} />
              <XAxis type="number" tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: tickFill, fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {imagesByCamera.map((_: any, i: number) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div key="storageDonut" className={`${themeConfig.card} rounded-lg overflow-hidden relative p-5`}>
          <DragHandle show={isEditing} />
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>
            {t('imageService.storage.byFileType')}
          </h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={storageByType} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value" nameKey="name">
                  {storageByType.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-2xl font-bold ${themeConfig.text.primary}`}>
                {storageByType.reduce((s: number, v: any) => s + (v.value ?? 0), 0).toLocaleString()}
              </span>
              <span className={`text-xs ${themeConfig.text.secondary}`}>files</span>
            </div>
          </div>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
