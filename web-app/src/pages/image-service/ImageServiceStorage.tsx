import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { imageServiceApi } from '@/services/imageServiceApi';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from 'recharts';
import { HardDrive, FileImage, Image, Archive, BarChart3, TrendingUp, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { SearchableSelect } from '@/components/ui';

const PIE_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
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

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

export default function ImageServiceStorage() {
  const { t, i18n } = useTranslation();
  const { themeConfig } = useTheme();
  const [days, setDays] = useState(30);

  const { data: summary } = useQuery({
    queryKey: ['storage-summary'],
    queryFn: () => imageServiceApi.getStorageSummary(),
    refetchInterval: 1000 * 60,
  });

  const { data: growth } = useQuery({
    queryKey: ['storage-growth', days],
    queryFn: () => imageServiceApi.getStorageGrowth(days),
    staleTime: 1000 * 60 * 2,
  });

  const { data: forecast } = useQuery({
    queryKey: ['storage-forecast'],
    queryFn: () => imageServiceApi.getStorageForecast(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => imageServiceApi.getCameras(),
    staleTime: 1000 * 60 * 5,
  });

  const tickFill = themeConfig.name === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
  const gridStroke = themeConfig.name === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';

  const byFileType = summary?.byFileType ? Object.entries(summary.byFileType).map(([k, v]: any) => ({
    name: t(`imageService.storage.${k === 'raw' ? 'rawImages' : k === 'processed' ? 'processedImages' : 'thumbnails'}`),
    value: v.bytes,
    files: v.files,
  })) : [];

  const byCamera = summary?.byCamera?.map((c: any) => ({
    name: c.cameraName,
    value: c.bytes || c.files,
  })) ?? [];

  const growthData = growth?.data?.map((d: any) => ({
    label: d.date?.slice(5),
    value: Math.round(d.bytesAdded / (1024 * 1024)),
    images: d.imagesAdded,
  })) ?? [];

  const statsCards = [
    { label: t('imageService.storage.totalFiles'), value: (summary?.totalFiles ?? 0).toLocaleString(), icon: FileImage, color: '#06b6d4' },
    { label: t('imageService.storage.totalSize'), value: `${formatBytes(summary?.totalBytes ?? 0)} / ${formatBytes(summary?.totalCapacity ?? 0)}`, icon: HardDrive, color: '#8b5cf6' },
    { label: t('imageService.storage.byFileType'), value: `${byFileType.length} ${t('imageService.storage.types')}`, icon: Archive, color: '#f59e0b' },
    { label: t('imageService.storage.growthTrend'), value: growthData.length > 1
      ? growthData[growthData.length - 1].value > growthData[0].value ? t('common.increasing') : t('common.stable')
      : '—', icon: TrendingUp, color: '#10b981' },
    {
      label: t('imageService.storage.daysUntilFull'),
      value: forecast?.daysUntilFull != null
        ? `${forecast.daysUntilFull.toLocaleString()} ${t('imageService.storage.days')}`
        : '—',
      icon: Clock,
      color: forecast?.daysUntilFull != null && forecast.daysUntilFull < 120 ? '#ef4444' : '#10b981',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.storage.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.storage.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.storage.subtitle')}</p>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {statsCards.map((s, i) => (
          <div key={i} className={`${themeConfig.card} rounded-lg p-5`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} style={{ color: s.color }} />
              <span className={`text-xs ${themeConfig.text.secondary}`}>{s.label}</span>
            </div>
            <span className="text-xl font-bold" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className={`${themeConfig.card} rounded-lg p-5`}>
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>
            {t('imageService.storage.byFileType')}
          </h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byFileType} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value" nameKey="name">
                  {byFileType.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: tickFill }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className={`text-xs ${themeConfig.text.secondary}`}>{t('imageService.storage.totalSize')}</span>
              <p className={`text-sm font-bold ${themeConfig.text.primary}`}>{formatBytes(summary?.totalBytes ?? 0)}</p>
            </div>
          </div>
          {byFileType.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {byFileType.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className={themeConfig.text.primary}>{item.name}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className={themeConfig.text.secondary}>{formatBytes(item.value)}</span>
                    <span className={themeConfig.text.primary}>{item.files.toLocaleString()} files</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${themeConfig.card} rounded-lg p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>
              {t('imageService.storage.growthTrend')}
            </h3>
            <div className="w-24">
              <SearchableSelect value={String(days)} onChange={v => setDays(parseInt(v))}
                options={[7, 14, 30, 60, 90].map(d => ({ value: String(d), label: `${d} ${t('imageService.storage.days')}` }))} />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2}
                fill="url(#growthGrad)" dot={false} name="MB" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className={`${themeConfig.card} rounded-lg p-5`}>
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>
            {t('imageService.storage.forecast')}
          </h3>
          {forecast ? (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={themeConfig.text.secondary}>{t('imageService.storage.usage')}</span>
                    <span className={themeConfig.text.primary}>{forecast.usagePercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, forecast.usagePercent)}%`, backgroundColor: forecast.usagePercent > 85 ? '#ef4444' : forecast.usagePercent > 70 ? '#f59e0b' : '#06b6d4' }} />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className={themeConfig.text.secondary}>{formatBytes(forecast.totalBytes)}</span>
                    <span className={themeConfig.text.secondary}>{formatBytes(forecast.maxBytes)}</span>
                  </div>
                </div>
              </div>

              <div className={`text-xs ${themeConfig.text.secondary} mb-3`}>
                {t('imageService.storage.dailyGrowth')}: {formatBytes(forecast.dailyGrowthRate)}/day
              </div>

              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={[
                  { label: t('imageService.storage.today'), value: forecast.usagePercent },
                  ...forecast.projections.map((p: any) => ({ label: `${p.days}d`, value: p.usagePercent })),
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2}
                    dot={{ r: 4, fill: '#8b5cf6' }} name="Usage %" />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className={`text-center py-8 ${themeConfig.text.secondary} text-sm`}>
              {t('imageService.storage.noData')}
            </div>
          )}
        </div>

        <div className={`${themeConfig.card} rounded-lg p-5`}>
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>
            {t('imageService.storage.projectionTable')}
          </h3>
          {forecast?.projections ? (
            <div className="space-y-3">
              {forecast.projections.map((p: any) => {
                const isFull = p.usagePercent >= 100;
                return (
                  <div key={p.days} className={`rounded-lg p-3 ${isFull ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-semibold ${themeConfig.text.primary}`}>
                        {t('imageService.storage.inDays', { days: p.days })}
                      </span>
                      <span className={`text-xs font-semibold ${isFull ? 'text-red-400' : themeConfig.text.secondary}`}>
                        {isFull ? t('imageService.storage.full') : `${p.usagePercent.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, p.usagePercent)}%`, backgroundColor: isFull ? '#ef4444' : '#8b5cf6' }} />
                    </div>
                    <div className={`text-xs mt-1 ${themeConfig.text.secondary}`}>
                      {formatBytes(p.projectedBytes)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`text-center py-8 ${themeConfig.text.secondary} text-sm`}>
              {t('imageService.storage.noData')}
            </div>
          )}
        </div>
      </div>

      {byCamera.length > 0 && (
        <div className={`${themeConfig.card} rounded-lg p-5`}>
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>
            {t('imageService.storage.byCamera')}
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCamera} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={gridStroke} />
              <XAxis dataKey="name" tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {byCamera.map((_: any, i: number) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(!summary || byFileType.length === 0) && (
        <div className={`text-center py-12 ${themeConfig.text.secondary} text-sm`}>
          {t('imageService.storage.noData')}
        </div>
      )}
    </div>
  );
}
