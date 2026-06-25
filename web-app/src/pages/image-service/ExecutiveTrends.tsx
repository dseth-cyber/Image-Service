import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { imageServiceApi } from '@/services/imageServiceApi';
import { SearchableSelect } from '@/components/ui';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Image, HardDrive, Activity,
} from 'lucide-react';

const PERIODS = [
  { value: '7d', labelKey: 'imageService.trends.period.7d' },
  { value: '14d', labelKey: 'imageService.trends.period.14d' },
  { value: '21d', labelKey: 'imageService.trends.period.21d' },
  { value: '28d', labelKey: 'imageService.trends.period.28d' },
  { value: '4m', labelKey: 'imageService.trends.period.4m' },
  { value: '8m', labelKey: 'imageService.trends.period.8m' },
  { value: '12m', labelKey: 'imageService.trends.period.12m' },
  { value: '5y', labelKey: 'imageService.trends.period.5y' },
];

function ChangeBadge({ value }: { value: number }) {
  const { themeConfig } = useTheme();
  if (value === 0) return <Minus size={14} className={themeConfig.text.secondary} />;
  const isUp = value > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(value)}%
    </span>
  );
}

export default function ExecutiveTrends() {
  const { t, i18n } = useTranslation();
  const { themeConfig } = useTheme();
  const [period, setPeriod] = useState('7d');

  const { data, isLoading } = useQuery({
    queryKey: ['executive-trends', period],
    queryFn: () => imageServiceApi.getTrends(period),
    refetchInterval: 1000 * 60,
  });

  const tickFill = themeConfig.name === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
  const gridStroke = themeConfig.name === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';

  const periodOptions = PERIODS.map(p => ({ value: p.value, label: t(p.labelKey) }));

  const chartData = data?.dailyBreakdown?.map((d: any) => ({
    label: d.date?.slice(5),
    images: d.images,
    storage: Math.round(d.storage / (1024 * 1024 * 1024) * 100) / 100,
  })) ?? [];

  return (
    <div className="flex flex-col p-5 h-full min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>
          {t('imageService.trends.title')}
        </h3>
        <div className="w-32 shrink-0">
          <SearchableSelect value={period} onChange={setPeriod} options={periodOptions} />
        </div>
      </div>

      {isLoading ? (
        <div className={`text-sm py-8 text-center ${themeConfig.text.secondary}`}>{t('common.loading')}</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-4 gap-3 mb-5 shrink-0">
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <Image size={13} className="text-cyan-400" />
                <span className="text-xs text-cyan-300">{t('imageService.trends.todayImages')}</span>
              </div>
              <p className="text-lg font-bold text-cyan-300">{data.today.images.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <HardDrive size={13} className="text-purple-400" />
                <span className="text-xs text-purple-300">{t('imageService.trends.totalImages')}</span>
              </div>
              <p className="text-lg font-bold text-purple-300">{data.total.images.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <Activity size={13} className="text-green-400" />
                <span className="text-xs text-green-300">{t('imageService.trends.currentLabel')}</span>
              </div>
              <p className="text-lg font-bold text-green-300">{data.current.images.toLocaleString()}</p>
              <ChangeBadge value={data.change.images} />
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <Activity size={13} className="text-amber-400" />
                <span className="text-xs text-amber-300">{t('imageService.trends.previousLabel')}</span>
              </div>
              <p className="text-lg font-bold text-amber-300">{data.previous.images.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
            <div className="flex flex-col min-h-0">
              <h4 className={`text-xs font-semibold mb-2 shrink-0 ${themeConfig.text.secondary}`}>
                {t('imageService.trends.dailyImages')}
              </h4>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: tickFill, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="images" fill="#06b6d4" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="images" position="top" style={{ fill: tickFill, fontSize: 9 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col min-h-0">
              <h4 className={`text-xs font-semibold mb-2 shrink-0 ${themeConfig.text.secondary}`}>
                {t('imageService.trends.dailyStorage')}
              </h4>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: tickFill, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="storage" fill="#8b5cf6" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="storage" position="top" style={{ fill: tickFill, fontSize: 9 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={`text-sm py-8 text-center ${themeConfig.text.secondary}`}>{t('common.noData')}</div>
      )}
    </div>
  );
}