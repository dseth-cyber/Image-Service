import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/contexts/ThemeContext'
import { imageServiceApi } from '@/services/imageServiceApi'
import {
  Microscope, Camera, Database, Server, Activity, CheckCircle2, Clock, Kanban,
  ArrowRight, HardDrive, Shield, Wifi, Bug, Lock, FileText, Cpu, Palette, Layout,
  BookText,
} from 'lucide-react'

const PHASE_STATUS_STYLES: Record<string, string> = {
  Launched: 'bg-green-500/20 text-green-400',
  'In Progress': 'bg-blue-500/20 text-blue-400',
  Planned: 'bg-gray-500/20 text-gray-400',
}

const PHASE_ICONS: Record<string, any> = {
  phase0: Activity,
  phase1: Clock,
  phase2: Shield,
  phase3: Palette,
  phase4: Server,
  phase5: Kanban,
}

const PHASES = [
  { key: 'phase0', status: 'In Progress' },
  { key: 'phase1', status: 'Planned' },
  { key: 'phase2', status: 'Planned' },
  { key: 'phase3', status: 'Planned' },
  { key: 'phase4', status: 'Planned' },
  { key: 'phase5', status: 'Planned' },
]

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-500/20 text-red-400',
  P1: 'bg-orange-500/20 text-orange-400',
  P2: 'bg-yellow-500/20 text-yellow-400',
  P3: 'bg-blue-500/20 text-blue-400',
  P4: 'bg-purple-500/20 text-purple-400',
  P5: 'bg-gray-500/20 text-gray-400',
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

export default function ImageServiceRoadmap() {
  const { t } = useTranslation()
  const { themeConfig } = useTheme()

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => imageServiceApi.getCameras(),
    staleTime: 1000 * 60 * 2,
  })

  const { data: storage } = useQuery({
    queryKey: ['storage-summary'],
    queryFn: () => imageServiceApi.getStorageSummary(),
    staleTime: 1000 * 60 * 2,
  })

  const { data: policies = [] } = useQuery({
    queryKey: ['retention-policies'],
    queryFn: () => imageServiceApi.getRetentionPolicies(),
    staleTime: 1000 * 60 * 5,
  })

  const camerasArr = Array.isArray(cameras?.data) ? cameras.data : (Array.isArray(cameras) ? cameras : [])
  const policiesArr = Array.isArray(policies?.data) ? policies.data : (Array.isArray(policies) ? policies : [])

  const totalCameras = camerasArr.length
  const activeCameras = camerasArr.filter((c: any) => c.status === 'active').length
  const totalFiles = storage?.totalFiles ?? 0
  const totalBytes = storage?.totalBytes ?? 0
  const byFileType = storage?.byFileType ? Object.keys(storage.byFileType).length : 0

  const archStats = [
    { label: t('imageService.cameras.title'), value: String(totalCameras), sub: `${activeCameras} active`, icon: Camera, color: '#06b6d4' },
    { label: t('imageService.storage.totalFiles'), value: totalFiles.toLocaleString(), sub: formatBytes(totalBytes), icon: HardDrive, color: '#8b5cf6' },
    { label: t('imageService.storage.byFileType'), value: `${byFileType}`, sub: t('imageService.storage.byFileType'), icon: Database, color: '#10b981' },
    { label: t('imageService.retention.title'), value: String(policiesArr.length), sub: t('imageService.settings.systemInfo'), icon: Shield, color: '#f59e0b' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.roadmap.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>
          {t('imageService.roadmap.title')}
        </h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>
          {t('imageService.roadmap.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Card 1 — System Architecture */}
        <div className={`${themeConfig.card} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-cyan-500/10">
              <Microscope size={15} className="text-cyan-400" />
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>
                {t('imageService.roadmap.architecture')}
              </h3>
              <p className={`text-xs ${themeConfig.text.secondary}`}>
                {t('imageService.roadmap.architectureDesc')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {archStats.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className={`px-3 py-2 rounded-lg ${themeConfig.progressTrack}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon size={12} style={{ color: s.color }} />
                    <span className={`text-[11px] ${themeConfig.text.secondary}`}>{s.label}</span>
                  </div>
                  <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              )
            })}
          </div>
          <div className={`mt-3 px-3 py-2 rounded-lg text-xs bg-white/5`}>
            <div className="flex items-center gap-1.5 text-cyan-400 font-medium mb-0.5">
              <Server size={11} /> Tech Stack
            </div>
            <p className={`text-[11px] ${themeConfig.text.secondary}`}>
              React 19 · Vite 7 · TypeScript 5.9 · Tailwind · Fastify · Prisma · PostgreSQL 15 · MinIO · Redis 7 · Python · Docker Compose
            </p>
          </div>
        </div>

        {/* Card 3 — System Rules */}
        <div className={`${themeConfig.card} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-red-500/10">
              <BookText size={15} className="text-red-400" />
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>
                {t('imageService.roadmap.rules')}
              </h3>
              <p className={`text-xs ${themeConfig.text.secondary}`}>
                {t('imageService.roadmap.rulesDesc')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['priority1', 'priority2', 'priority3', 'priority4', 'priority5', 'imageService'].slice(0, 4).map((group, gi) => {
              const rules = t(`imageService.roadmap.rulesGroups.${group}`, { returnObjects: true }) as string[]
              const groupLabels = t(`imageService.roadmap.rulesGroupsLabels.${group}`, { returnObjects: true }) as { icon: string; label: string; color: string }
              return (
                <div key={gi} className={`px-3 py-2 rounded-lg ${themeConfig.progressTrack}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: groupLabels.color }} />
                    <span className={`text-[11px] font-semibold ${themeConfig.text.primary}`}>{groupLabels.label}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {rules.slice(0, 3).map((rule, ri) => (
                      <li key={ri} className={`text-[11px] ${themeConfig.text.secondary} flex items-start gap-1`}>
                        <span className="text-cyan-400 mt-0.5">▸</span>
                        <span className="line-clamp-1">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <div className={`mt-2 px-3 py-1.5 rounded-lg text-[11px] bg-white/5 ${themeConfig.text.secondary}`}>
            {t('imageService.roadmap.rulesGroupsLabels.priority5.label')} + {t('imageService.roadmap.rulesGroupsLabels.imageService.label')} — see full list in AGENTS.md
          </div>
        </div>

        {/* Card 2 — Development Phases — full width */}
        <div className={`${themeConfig.card} rounded-lg p-5 col-span-2`}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <ArrowRight size={18} className="text-purple-400" />
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>
                {t('imageService.roadmap.phases')}
              </h3>
              <p className={`text-xs ${themeConfig.text.secondary}`}>
                {t('imageService.roadmap.phasesDesc')}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {PHASES.map((p, i) => {
              const Icon = PHASE_ICONS[p.key]
              const statusClass = PHASE_STATUS_STYLES[p.status] ?? 'bg-gray-500/20 text-gray-400'
              return (
                <div key={i} className={`px-4 py-3 rounded-lg bg-white/5`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${statusClass}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${themeConfig.text.primary}`}>
                          {t(`imageService.roadmap.${p.key}`)}
                        </p>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[`P${i}`]}`}>
                          P{i}
                        </span>
                      </div>
                      <p className={`text-xs ${themeConfig.text.secondary}`}>
                        {t(`imageService.roadmap.${p.key}Desc`)}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusClass}`}>
                      {t(`imageService.roadmap.${p.key}Status`)}
                    </span>
                  </div>
                  <div className="mt-2 ml-9 space-y-0.5">
                    {t(`imageService.roadmap.${p.key}Tasks`, { returnObjects: true }).map((task: string, ti: number) => (
                      <p key={ti} className={`text-xs ${themeConfig.text.secondary} flex items-start gap-1.5`}>
                        <span className="text-cyan-400 mt-0.5">▸</span>
                        {task}
                      </p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>


    </div>
  )
}
