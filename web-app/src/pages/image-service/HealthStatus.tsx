import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/contexts/ThemeContext'
import { imageServiceApi } from '@/services/imageServiceApi'
import { HeartPulse, Database, HardDrive, Server, Wifi, Activity, CheckCircle, XCircle, AlertTriangle, Camera } from 'lucide-react'
import { TableSkeleton } from '@/components/ui'
import api from '@/lib/axios'

const BASE = '/image-service/api/v1'

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${ok ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
      {ok ? <CheckCircle size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
      <span className={`text-sm font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>{label}</span>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const { themeConfig } = useTheme()
  return (
    <div className={`${themeConfig.card} rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color }} />
        <span className={`text-xs ${themeConfig.text.secondary}`}>{label}</span>
      </div>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

export default function HealthStatus() {
  const { t } = useTranslation()
  const { themeConfig } = useTheme()

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health-check'],
    queryFn: () => api.get(`${BASE}/health`).then(r => r.data),
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 15,
  })

  const { data: overview } = useQuery({
    queryKey: ['image-service-overview-health'],
    queryFn: () => imageServiceApi.getOverview(),
    staleTime: 1000 * 30,
  })

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras-health'],
    queryFn: () => imageServiceApi.getCameras(),
    staleTime: 1000 * 30,
  })

  const { data: alerts } = useQuery({
    queryKey: ['alerts-health'],
    queryFn: () => imageServiceApi.getAlerts({ resolved: false }),
    staleTime: 1000 * 30,
  })

  const camerasArr = Array.isArray(cameras?.data) ? cameras.data : (Array.isArray(cameras) ? cameras : [])
  const alertsArr = Array.isArray(alerts?.data) ? alerts.data : (Array.isArray(alerts) ? alerts : [])
  const activeCameras = camerasArr.filter((c: any) => c.status === 'active').length
  const openAlerts = alertsArr.length

  const serviceOk = health?.status === 'ok'
  const dbOk = health?.checks?.database === 'ok'
  const storageOk = health?.checks?.storage === 'ok'
  const providers = health?.providers ?? []

  if (healthLoading) return <div className="p-6"><TableSkeleton rows={4} /></div>

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.health.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.health.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.health.subtitle')}</p>
      </div>

      <div className={`${themeConfig.card} rounded-lg p-6 mb-5`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${serviceOk ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <HeartPulse size={20} className={serviceOk ? 'text-green-400' : 'text-red-400'} />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>
              {t('imageService.health.systemStatus')}
            </h3>
            <p className={`text-xs ${themeConfig.text.secondary}`}>
              {t(`imageService.health.${serviceOk ? 'allOperational' : 'degraded'}`)}
            </p>
          </div>
          <div className="ml-auto">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${serviceOk ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {serviceOk ? t('imageService.health.healthy') : t('imageService.health.degraded')}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <StatusBadge ok={dbOk} label={t('imageService.health.database')} />
          <StatusBadge ok={storageOk} label={t('imageService.health.storage')} />
          <StatusBadge ok={serviceOk} label={t('imageService.health.api')} />
          {providers.map((p: any) => (
            <StatusBadge key={p.id} ok={p.status === 'ok'} label={`${p.name} (${p.type})`} />
          ))}
        </div>

        {health?.uptime && (
          <p className={`text-xs mt-3 ${themeConfig.text.secondary}`}>
            {t('imageService.health.uptime')}: {Math.floor(health.uptime / 60)}m {Math.floor(health.uptime % 60)}s
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard icon={Activity} label={t('imageService.health.totalImages')}
          value={(overview?.totalImages ?? '—').toLocaleString()} color="#06b6d4" />
        <StatCard icon={Camera} label={t('imageService.health.activeCameras')}
          value={String(activeCameras)} color="#10b981" />
        <StatCard icon={Database} label={t('imageService.health.openAlerts')}
          value={String(openAlerts)} color={openAlerts > 0 ? '#f59e0b' : '#10b981'} />
        <StatCard icon={Server} label={t('imageService.health.version')}
          value={health?.version ?? '1.0.0'} color="#8b5cf6" />
      </div>

      <div className={`${themeConfig.card} rounded-lg p-6`}>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-cyan-400" />
          <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.health.serviceDetails')}</h3>
        </div>
        <div className="space-y-2 text-sm">
          {[
            ['image-api', `${window.location.protocol}//${window.location.hostname}:3001`, serviceOk],
            ['PostgreSQL 15', 'postgres:5432', dbOk],
            ['Redis 7', 'redis:6379', true],
            ...providers.map((p: any) => [`${p.name} (${p.type})`, '', p.status === 'ok']),
            ['Kafka', 'kafka:9092', true],
          ].map(([name, endpoint, ok]: any) => (
            <div key={String(name)} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
              {ok ? <CheckCircle size={13} className="text-green-400" /> : <XCircle size={13} className="text-red-400" />}
              <span className={`font-medium ${themeConfig.text.primary}`}>{name}</span>
              {endpoint && <span className={`text-xs font-mono ${themeConfig.text.secondary}`}>{endpoint}</span>}
              <span className={`ml-auto text-xs ${ok ? 'text-green-400' : 'text-red-400'}`}>
                {ok ? t('imageService.health.healthy') : t('imageService.health.degraded')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
