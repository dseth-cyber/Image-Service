import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission } from '@/App'
import { imageServiceApi } from '@/services/imageServiceApi'
import { TableSkeleton, ExportButton, SearchableSelect, Modal } from '@/components/ui'
import { formatDateTime } from '@/utils/dateUtils'
import { getLocalizedValue } from '@/utils/textUtils'
import {
  ClipboardList, BookOpen, Search, ChevronLeft, ChevronRight, Wrench,
  AlertTriangle, CheckCircle2, Clock, Camera as CameraIcon, X, Trash2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400',
  resolved: 'bg-green-500/20 text-green-400',
}

const WO_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-green-500/20 text-green-400',
}

const BAR_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#22d3ee']

const PERIODS: { key: string; days?: number }[] = [
  { key: '7d', days: 7 },
  { key: '30d', days: 30 },
  { key: '90d', days: 90 },
  { key: 'all', days: undefined },
]

function formatMttr(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`
  return `${(minutes / 1440).toFixed(1)}d`
}

function AttachmentImage({ filename, alt }: { filename: string; alt: string }) {
  const [url, setUrl] = useState<string>('')
  const [zoom, setZoom] = useState(false)
  useEffect(() => {
    let active = true
    let objectUrl = ''
    imageServiceApi.getIncidentAttachmentBlob(filename)
      .then((blob: Blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {})
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [filename])
  if (!url) return <div className="w-24 h-24 rounded-lg bg-white/5 animate-pulse" />
  return (
    <>
      <img src={url} alt={alt} onClick={() => setZoom(true)}
        className="w-24 h-24 rounded-lg object-cover border border-white/10 cursor-zoom-in hover:opacity-80 transition-opacity" />
      {zoom && createPortal(
        <div onClick={() => setZoom(false)}
          className="fixed inset-0 z-[99999] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out">
          <img src={url} alt={alt} className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl" />
          <button onClick={() => setZoom(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
            <X size={20} />
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

export default function IncidentCenter() {
  const { t, i18n } = useTranslation()
  const { themeConfig } = useTheme()
  const toast = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'list' | 'knowledge'>('list')
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [clearPassword, setClearPassword] = useState('')
  const [clearRetentionYears, setClearRetentionYears] = useState(0)
  const [clearing, setClearing] = useState(false)

  // List filters
  const [q, setQ] = useState('')
  const [filterCamera, setFilterCamera] = useState('')
  const [filterReason, setFilterReason] = useState('')
  const [filterRootCause, setFilterRootCause] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [page, setPage] = useState(1)

  // Knowledge period
  const [period, setPeriod] = useState('30d')

  // Detail modal
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras-incident-list'],
    queryFn: () => imageServiceApi.getCameras(),
    staleTime: 60000,
  })
  const camerasArr = Array.isArray(cameras?.data) ? cameras.data : (Array.isArray(cameras) ? cameras : [])

  const { data: options } = useQuery({
    queryKey: ['incident-options'],
    queryFn: () => imageServiceApi.getIncidentOptions(),
    staleTime: 1000 * 60 * 5,
  })
  const reasons = options?.reasons ?? []
  const rootCauses = options?.rootCauses ?? []
  const resolutions = options?.resolutions ?? []

  const labelFor = (list: any[], code: string) => {
    const m = list.find((x: any) => x.code === code)
    return m ? getLocalizedValue(m, i18n.language) : code
  }

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['incidents-search', q, filterCamera, filterReason, filterRootCause, filterStatus, filterPriority, page],
    queryFn: () => imageServiceApi.searchIncidents({
      q: q || undefined, cameraId: filterCamera || undefined, reason: filterReason || undefined,
      rootCause: filterRootCause || undefined, status: filterStatus || undefined,
      priority: filterPriority || undefined, page, limit: 20,
    }),
    enabled: tab === 'list',
    staleTime: 15000,
  })
  const incidents = listData?.data ?? []
  const pagination = listData?.pagination ?? { page: 1, totalPages: 1, total: 0 }

  const days = PERIODS.find((p) => p.key === period)?.days
  const { data: knowledge, isLoading: knowledgeLoading } = useQuery({
    queryKey: ['incident-knowledge', period],
    queryFn: () => imageServiceApi.getIncidentKnowledge({ days }),
    enabled: tab === 'knowledge',
    staleTime: 30000,
  })

  useEffect(() => { setPage(1) }, [q, filterCamera, filterReason, filterRootCause, filterStatus, filterPriority])

  const exportData = useMemo(() => incidents.map((i: any) => ({
    incidentNumber: i.incidentNumber,
    cameraName: i.cameraName,
    reason: labelFor(reasons, i.reason),
    rootCause: i.rootCause ? labelFor(rootCauses, i.rootCause) : '-',
    priority: i.priority,
    status: i.status,
    mttr: formatMttr(i.mttrMinutes),
    openedAt: i.openedAt ? formatDateTime(i.openedAt, i18n.language) : '-',
    creator: i.openedBy || '-',
    owner: i.assignedTo || '-',
  })), [incidents, reasons, rootCauses, i18n.language])

  const handleClearIncidents = async () => {
    if (!clearPassword) {
      toast.warning(t('imageService.incidentCenter.clearIncidentsConfirm', 'กรุณากรอกรหัสผ่านเพื่อยืนยันการลบ'));
      return;
    }
    setClearing(true);
    try {
      await imageServiceApi.clearAllIncidents(clearPassword, clearRetentionYears || undefined);
      toast.success(t('imageService.incidentCenter.clearIncidentsSuccess', 'ล้างประวัติ Incident ทั้งหมดเรียบร้อยแล้ว'));
      setClearDialogOpen(false);
      setClearPassword('');
      setClearRetentionYears(0);
      queryClient.invalidateQueries({ queryKey: ['incidents-search'] });
      queryClient.invalidateQueries({ queryKey: ['incident-knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-open-incidents-count'] });
    } catch (e: any) {
      if (!e?._handled) {
        toast.error(t('imageService.incidentCenter.clearIncidentsError', 'รหัสผ่านไม่ถูกต้อง หรือไม่สามารถดำเนินการได้'));
      }
    } finally {
      setClearing(false);
    }
  };

  const ic = (k: string) => t(`imageService.incidentCenter.${k}`)

  const cameraOptions = [{ value: '', label: ic('filterCamera') }, ...camerasArr.map((c: any) => ({ value: c.id, label: c.name }))]
  const reasonOptions = [{ value: '', label: ic('filterReason') }, ...reasons.map((r: any) => ({ value: r.code, label: getLocalizedValue(r, i18n.language) }))]
  const rootCauseOptions = [{ value: '', label: ic('filterRootCause') }, ...rootCauses.map((r: any) => ({ value: r.code, label: getLocalizedValue(r, i18n.language) }))]
  const statusOptions = [
    { value: '', label: ic('filterStatus') },
    { value: 'open', label: ic('open') },
    { value: 'resolved', label: ic('resolved') },
  ]
  const priorityOptions = [
    { value: '', label: ic('filterPriority') },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <p className={`text-xs font-medium mb-0.5 uppercase tracking-widest ${themeConfig.text.secondary}`}>
            Image Service · {ic('title')}
          </p>
          <h2 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{ic('title')}</h2>
          <p className={`text-sm ${themeConfig.text.secondary}`}>{ic('subtitle')}</p>
        </div>
        {tab === 'list' && (
          <div className="flex items-center gap-2">
            {hasPermission(user, 'cameras:delete') && (
              <button
                onClick={() => setClearDialogOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                {ic('clearIncidents')}
              </button>
            )}
            <ExportButton
              filename="incidents"
              title={ic('title')}
              sections={[{
                title: ic('tabList'),
                columns: [
                  { key: 'incidentNumber', label: ic('colIncident') },
                  { key: 'cameraName', label: ic('filterCamera') },
                  { key: 'reason', label: ic('filterReason') },
                  { key: 'rootCause', label: ic('filterRootCause') },
                  { key: 'priority', label: ic('filterPriority') },
                  { key: 'status', label: ic('filterStatus') },
                  { key: 'mttr', label: ic('colMttr') },
                  { key: 'openedAt', label: ic('colOpened') },
                  { key: 'creator', label: ic('colCreator') },
                  { key: 'owner', label: ic('colOwner') },
                ],
                data: exportData,
              }]}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 mb-5 border-b ${themeConfig.cardBorder}`}>
        <button
          onClick={() => setTab('list')}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            tab === 'list' ? 'border-cyan-400 text-cyan-300' : `border-transparent ${themeConfig.text.secondary} hover:text-white`
          }`}
        >
          <ClipboardList size={15} /> {ic('tabList')}
        </button>
        <button
          onClick={() => setTab('knowledge')}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            tab === 'knowledge' ? 'border-cyan-400 text-cyan-300' : `border-transparent ${themeConfig.text.secondary} hover:text-white`
          }`}
        >
          <BookOpen size={15} /> {ic('tabKnowledge')}
        </button>
      </div>

      {tab === 'list' ? (
        <>
          {/* Filters */}
          <div className={`${themeConfig.card} rounded-xl p-4 mb-4`}>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={ic('searchPlaceholder')}
                  className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} bg-white/5 ${themeConfig.text.primary} placeholder:text-gray-500 focus:outline-none focus:border-cyan-500`}
                />
              </div>
              <div className="w-44"><SearchableSelect value={filterCamera} onChange={setFilterCamera} options={cameraOptions} placeholder={ic('filterCamera')} /></div>
              <div className="w-44"><SearchableSelect value={filterReason} onChange={setFilterReason} options={reasonOptions} placeholder={ic('filterReason')} /></div>
              <div className="w-44"><SearchableSelect value={filterRootCause} onChange={setFilterRootCause} options={rootCauseOptions} placeholder={ic('filterRootCause')} /></div>
              <div className="w-36"><SearchableSelect value={filterStatus} onChange={setFilterStatus} options={statusOptions} placeholder={ic('filterStatus')} /></div>
              <div className="w-40"><SearchableSelect value={filterPriority} onChange={setFilterPriority} options={priorityOptions} placeholder={ic('filterPriority')} /></div>
            </div>
          </div>

          {/* Table */}
          <div className={`${themeConfig.card} rounded-xl p-4`}>
            {listLoading ? (
              <TableSkeleton rows={8} cols={9} />
            ) : incidents.length === 0 ? (
              <p className={`text-sm text-center py-8 ${themeConfig.text.secondary}`}>{ic('noIncidents')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={themeConfig.tableHeader}>
                      {[ic('colIncident'), ic('filterCamera'), ic('filterReason'), ic('filterRootCause'), ic('filterPriority'), ic('filterStatus'), ic('colMttr'), ic('colOpened'), ic('colCreator'), ic('colOwner'), ''].map((h, idx) => (
                        <th key={idx} className={`px-3 py-2 text-left text-xs font-semibold ${themeConfig.text.secondary}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={themeConfig.tableDivide}>
                    {incidents.map((i: any) => (
                      <tr key={i.id} className={`${themeConfig.tableRow} cursor-pointer`} onClick={() => setDetailId(i.id)}>
                        <td className={`px-3 py-2 text-xs font-mono font-medium ${themeConfig.text.primary}`}>{i.incidentNumber}</td>
                        <td className={`px-3 py-2 text-xs ${themeConfig.text.secondary}`}>{i.cameraName}</td>
                        <td className={`px-3 py-2 text-xs ${themeConfig.text.secondary}`}>{labelFor(reasons, i.reason)}</td>
                        <td className={`px-3 py-2 text-xs ${themeConfig.text.secondary}`}>{i.rootCause ? labelFor(rootCauses, i.rootCause) : '—'}</td>
                        <td className="px-3 py-2"><span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium capitalize ${PRIORITY_COLORS[i.priority] || 'bg-gray-500/20 text-gray-400'}`}>{i.priority}</span></td>
                        <td className="px-3 py-2"><span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_COLORS[i.status] || 'bg-gray-500/20 text-gray-400'}`}>{i.status === 'open' ? ic('open') : ic('resolved')}</span></td>
                        <td className={`px-3 py-2 text-xs ${themeConfig.text.secondary}`}>{formatMttr(i.mttrMinutes)}</td>
                        <td className={`px-3 py-2 text-xs ${themeConfig.text.secondary}`}>{i.openedAt ? formatDateTime(i.openedAt, i18n.language) : '—'}</td>
                        <td className={`px-3 py-2 text-xs ${themeConfig.text.secondary}`}>{i.openedBy || '—'}</td>
                        <td className={`px-3 py-2 text-xs ${themeConfig.text.secondary}`}>{i.assignedTo || '—'}</td>
                        <td className="px-3 py-2">
                          <button onClick={(e) => { e.stopPropagation(); setDetailId(i.id) }} className="text-xs text-cyan-400 hover:underline">{t('common.view', 'View')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className={`text-xs ${themeConfig.text.secondary}`}>{pagination.total} {ic('times')}</span>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`p-1.5 rounded-lg border ${themeConfig.cardBorder} ${themeConfig.text.secondary} disabled:opacity-30 hover:bg-white/5`}><ChevronLeft size={14} /></button>
                  <span className={`text-xs ${themeConfig.text.secondary}`}>{page}/{pagination.totalPages}</span>
                  <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className={`p-1.5 rounded-lg border ${themeConfig.cardBorder} ${themeConfig.text.secondary} disabled:opacity-30 hover:bg-white/5`}><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <KnowledgeTab
            knowledge={knowledge}
            loading={knowledgeLoading}
            period={period}
            setPeriod={setPeriod}
            labelReason={(c: string) => labelFor(reasons, c)}
            labelRootCause={(c: string) => labelFor(rootCauses, c)}
            labelResolution={(c: string) => labelFor(resolutions, c)}
            onSelectCamera={(id: string) => { setTab('list'); setFilterCamera(id) }}
            themeConfig={themeConfig}
            ic={ic}
          />
          <div className="mt-4">
            <ArticlesSection
              reasons={reasons}
              rootCauses={rootCauses}
              labelReason={(c: string) => labelFor(reasons, c)}
              labelRootCause={(c: string) => labelFor(rootCauses, c)}
              themeConfig={themeConfig}
              t={t}
              user={user}
              toast={toast}
            />
          </div>
          <div className="mt-4">
            <SopChecklistsSection
              reasons={reasons}
              labelReason={(c: string) => labelFor(reasons, c)}
              themeConfig={themeConfig}
              t={t}
              user={user}
              toast={toast}
            />
          </div>
        </>
      )}

      {detailId && (
        <IncidentDetailModal
          incidentId={detailId}
          onClose={() => setDetailId(null)}
          onSwitch={(id: string) => setDetailId(id)}
          labelReason={(c: string) => labelFor(reasons, c)}
          labelRootCause={(c: string) => labelFor(rootCauses, c)}
          labelResolution={(c: string) => labelFor(resolutions, c)}
          ic={ic}
        />
      )}

      {clearDialogOpen && (
        <Modal isOpen={clearDialogOpen} onClose={() => { setClearDialogOpen(false); setClearPassword('') }} title={t('imageService.incidentCenter.clearIncidentsTitle', 'ยืนยันล้างประวัติ Incident ทั้งหมด')}>
          <div className="space-y-4 p-1 max-w-md">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-400 mb-1">
                  {t('imageService.incidentCenter.clearIncidentsWarningTitle', 'คำเตือน (ระดับวิกฤต)')}
                </p>
                <p className={`text-xs ${themeConfig.text.secondary}`}>
                  {t('imageService.incidentCenter.clearIncidentsWarning', 'การดำเนินการนี้จะลบรายการ Incident ทั้งหมดออกจากระบบ และลบไฟล์รูปภาพที่แนบประกอบการเปลี่ยนสถานะกล้องทั้งหมดออกจากดิสก์อย่างถาวร ข้อมูลนี้จะไม่สามารถกู้คืนกลับมาได้อีก')}
                </p>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${themeConfig.text.primary}`}>
                {t('imageService.incidentCenter.clearRetentionPeriod', 'ขอบเขตช่วงเวลาที่ต้องการลบ')}
              </label>
              <SearchableSelect
                value={String(clearRetentionYears)}
                onChange={v => setClearRetentionYears(Number(v))}
                placeholder={t('imageService.incidentCenter.clearRetentionPeriod', 'ขอบเขตช่วงเวลาที่ต้องการลบ')}
                options={[
                  { value: '0', label: t('imageService.incidentCenter.clearAll', 'ลบทั้งหมดทุกช่วงเวลา') },
                  ...[1, 2, 3, 5, 6, 7, 8, 9, 10].map(y => ({
                    value: String(y),
                    label: `${t('imageService.incidentCenter.clearOlderThan', 'ลบประวัติที่เก่ากว่า')} ${y} ${t('imageService.incidentCenter.years', 'ปี')}`
                  }))
                ]}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${themeConfig.text.primary}`}>
                {t('imageService.incidentCenter.clearIncidentsConfirm', 'กรุณากรอกรหัสผ่านเพื่อยืนยันการลบ')}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={clearPassword}
                onChange={e => setClearPassword(e.target.value)}
                placeholder={t('imageService.incidentCenter.clearIncidentsPasswordPlaceholder', 'รหัสผ่านของคุณ')}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-red-500/50`}
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => { setClearDialogOpen(false); setClearPassword('') }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${themeConfig.cardBorder} ${themeConfig.text.secondary} hover:bg-white/5`}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={clearing || !clearPassword}
                onClick={handleClearIncidents}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 flex items-center gap-1.5"
              >
                {clearing ? (
                  <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Trash2 size={13} />
                )}
                {t('imageService.incidentCenter.clearIncidentsButton', 'ล้างประวัติ Incident')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ---------------- Knowledge Tab ---------------- */
function KnowledgeTab({ knowledge, loading, period, setPeriod, labelReason, labelRootCause, labelResolution, onSelectCamera, themeConfig, ic }: any) {
  if (loading) return <TableSkeleton rows={6} cols={4} />
  const k = knowledge || {}

  const summaryCards = [
    { label: ic('totalIncidents'), value: k.total ?? 0, icon: ClipboardList, color: '#06b6d4' },
    { label: ic('open'), value: k.open ?? 0, icon: AlertTriangle, color: '#ef4444' },
    { label: ic('resolved'), value: k.resolved ?? 0, icon: CheckCircle2, color: '#22c55e' },
    { label: ic('avgMttr'), value: k.avgMttrMinutes != null ? formatMttr(k.avgMttrMinutes) : '—', icon: Clock, color: '#f59e0b' },
  ]

  const barData = (arr: any[], labelFn: (c: string) => string) =>
    (arr || []).map((x: any) => ({ name: labelFn(x.key), count: x.count }))

  const HBar = ({ title, data }: { title: string; data: any[] }) => (
    <div className={`${themeConfig.card} rounded-xl p-4 flex flex-col`}>
      <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>{title}</h3>
      {data.length === 0 ? (
        <p className={`text-sm text-center py-8 ${themeConfig.text.secondary}`}>{ic('noIncidents')}</p>
      ) : (
        <div style={{ height: Math.max(160, data.length * 36) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#e2e8f0' }}
                formatter={(v: number) => [`${v} ${ic('times')}`, ic('totalIncidents')]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((_: any, idx: number) => <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className={`flex rounded-lg overflow-hidden border w-fit ${themeConfig.cardBorder}`}>
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === p.key ? 'bg-cyan-500/20 text-cyan-300' : `${themeConfig.text.secondary} hover:bg-white/5`}`}>
            {p.key === 'all' ? ic('periodAll') : p.key}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((c, i) => {
          const Icon = c.icon
          return (
            <div key={i} className={`${themeConfig.card} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${c.color}1a` }}><Icon size={15} style={{ color: c.color }} /></div>
                <span className={`text-xs ${themeConfig.text.secondary}`}>{c.label}</span>
              </div>
              <div className={`text-2xl font-bold ${themeConfig.text.primary}`}>{c.value}</div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HBar title={ic('topProblems')} data={barData(k.topProblems, labelReason)} />
        <HBar title={ic('topRootCauses')} data={barData(k.topRootCauses, labelRootCause)} />
        <HBar title={ic('topResolutions')} data={barData(k.topResolutions, labelResolution)} />

        {/* Frequent cameras */}
        <div className={`${themeConfig.card} rounded-xl p-4`}>
          <h3 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>{ic('frequentCameras')}</h3>
          {(k.frequentCameras || []).length === 0 ? (
            <p className={`text-sm text-center py-8 ${themeConfig.text.secondary}`}>{ic('noIncidents')}</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className={themeConfig.tableDivide}>
                {(k.frequentCameras || []).map((c: any) => (
                  <tr key={c.cameraId} className={`${themeConfig.tableRow} cursor-pointer`} onClick={() => onSelectCamera(c.cameraId)}>
                    <td className={`px-3 py-2 text-xs flex items-center gap-2 ${themeConfig.text.primary}`}><CameraIcon size={13} className="text-cyan-400" />{c.name || c.cameraId}</td>
                    <td className={`px-3 py-2 text-xs text-right ${themeConfig.text.secondary}`}>{c.count} {ic('times')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Articles Section (P23 — Knowledge Base articles) ---------------- */
function ArticlesSection({ reasons, rootCauses, labelReason, labelRootCause, themeConfig, t, user, toast }: any) {
  const queryClient = useQueryClient()
  const kc = (k: string) => t(`imageService.knowledgeArticles.${k}`)
  const canCreate = hasPermission(user, 'knowledge:create')
  const canUpdate = hasPermission(user, 'knowledge:update')
  const canDelete = hasPermission(user, 'knowledge:delete')

  const [q, setQ] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formModal, setFormModal] = useState<{ open: boolean; item?: any }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({ title: '', symptoms: '', cause: '', resolution: '', verification: '', tags: '', reasonCode: '', rootCauseCode: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-articles', q],
    queryFn: () => imageServiceApi.getKnowledgeArticles({ q: q || undefined, limit: 50 }),
    staleTime: 15000,
  })
  const articles = data?.data ?? []

  const reasonOptions = (reasons || []).map((r: any) => ({ value: r.code, label: labelReason(r.code) }))
  const rootCauseOptions = (rootCauses || []).map((r: any) => ({ value: r.code, label: labelRootCause(r.code) }))

  const openCreate = () => {
    setForm({ title: '', symptoms: '', cause: '', resolution: '', verification: '', tags: '', reasonCode: '', rootCauseCode: '' })
    setFormModal({ open: true })
  }
  const openEdit = (item: any) => {
    setForm({
      title: item.title, symptoms: item.symptoms, cause: item.cause || '', resolution: item.resolution,
      verification: item.verification || '', tags: (item.tags || []).join(', '),
      reasonCode: item.reasonCode || '', rootCauseCode: item.rootCauseCode || '',
    })
    setFormModal({ open: true, item })
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.symptoms.trim() || !form.resolution.trim()) {
      toast.warning(kc('validationRequired'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        symptoms: form.symptoms.trim(),
        cause: form.cause.trim() || undefined,
        resolution: form.resolution.trim(),
        verification: form.verification.trim() || undefined,
        tags: form.tags.split(',').map((s: string) => s.trim()).filter(Boolean),
        reasonCode: form.reasonCode || undefined,
        rootCauseCode: form.rootCauseCode || undefined,
      }
      if (formModal.item) {
        await imageServiceApi.updateKnowledgeArticle(formModal.item.id, payload)
        toast.success(kc('updateSuccess'))
      } else {
        await imageServiceApi.createKnowledgeArticle(payload)
        toast.success(kc('createSuccess'))
      }
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] })
      setFormModal({ open: false })
    } catch (e: any) {
      if (!e?._handled) toast.error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await imageServiceApi.deleteKnowledgeArticle(deleteTarget.id)
      toast.success(kc('deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] })
    } catch (e: any) {
      if (!e?._handled) toast.error(t('common.error'))
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className={`${themeConfig.card} rounded-xl p-4`}>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${themeConfig.text.primary}`}>
          <BookOpen size={15} className="text-cyan-400" /> {kc('title')}
        </h3>
        {canCreate && (
          <button onClick={openCreate} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors">
            + {kc('addArticle')}
          </button>
        )}
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={kc('searchPlaceholder')}
          className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} bg-white/5 ${themeConfig.text.primary} placeholder:text-gray-500 focus:outline-none focus:border-cyan-500`}
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : articles.length === 0 ? (
        <p className={`text-sm text-center py-8 ${themeConfig.text.secondary}`}>{kc('noArticles')}</p>
      ) : (
        <div className="space-y-2">
          {articles.map((a: any) => {
            const isExpanded = expandedId === a.id
            return (
              <div key={a.id} className={`rounded-lg border ${themeConfig.cardBorder} overflow-hidden`}>
                <button onClick={() => setExpandedId(isExpanded ? null : a.id)} className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-white/5 transition-colors">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${themeConfig.text.primary}`}>{a.title}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(a.tags || []).map((tag: string) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canUpdate && (
                      <span onClick={(e) => { e.stopPropagation(); openEdit(a) }} className="px-2 py-1 rounded text-[11px] text-cyan-400 hover:bg-cyan-500/10 cursor-pointer">{t('common.edit', 'Edit')}</span>
                    )}
                    {canDelete && (
                      <span onClick={(e) => { e.stopPropagation(); setDeleteTarget(a) }} className="p-1.5 rounded text-red-400 hover:bg-red-500/10 cursor-pointer"><Trash2 size={13} /></span>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className={`px-3 pb-3 space-y-2 text-xs ${themeConfig.text.secondary} border-t ${themeConfig.cardBorder} pt-2`}>
                    <p><strong className={themeConfig.text.primary}>{kc('fieldSymptoms')}:</strong> {a.symptoms}</p>
                    {a.cause && <p><strong className={themeConfig.text.primary}>{kc('fieldCause')}:</strong> {a.cause}</p>}
                    <p><strong className={themeConfig.text.primary}>{kc('fieldResolution')}:</strong> {a.resolution}</p>
                    {a.verification && <p><strong className={themeConfig.text.primary}>{kc('fieldVerification')}:</strong> {a.verification}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      {formModal.open && (
        <Modal isOpen={formModal.open} onClose={() => setFormModal({ open: false })} title={formModal.item ? kc('editArticle') : kc('addArticle')} size="lg">
          <div className="space-y-3 p-1">
            <div>
              <label className={`text-xs font-medium mb-1 block ${themeConfig.text.secondary}`}>{kc('fieldTitle')} *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} bg-white/5 ${themeConfig.text.primary} focus:outline-none focus:border-cyan-500`} />
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${themeConfig.text.secondary}`}>{kc('fieldSymptoms')} *</label>
              <textarea value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} rows={2}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} bg-white/5 ${themeConfig.text.primary} focus:outline-none focus:border-cyan-500`} />
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${themeConfig.text.secondary}`}>{kc('fieldCause')}</label>
              <textarea value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} rows={2}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} bg-white/5 ${themeConfig.text.primary} focus:outline-none focus:border-cyan-500`} />
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${themeConfig.text.secondary}`}>{kc('fieldResolution')} *</label>
              <textarea value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} rows={3}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} bg-white/5 ${themeConfig.text.primary} focus:outline-none focus:border-cyan-500`} />
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${themeConfig.text.secondary}`}>{kc('fieldVerification')}</label>
              <textarea value={form.verification} onChange={(e) => setForm({ ...form, verification: e.target.value })} rows={2}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} bg-white/5 ${themeConfig.text.primary} focus:outline-none focus:border-cyan-500`} />
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${themeConfig.text.secondary}`}>{kc('fieldTags')}</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder={kc('fieldTagsHint')}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} bg-white/5 ${themeConfig.text.primary} placeholder:text-gray-500 focus:outline-none focus:border-cyan-500`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium mb-1 block ${themeConfig.text.secondary}`}>{kc('fieldReasonLink')}</label>
                <SearchableSelect value={form.reasonCode} onChange={(v: string) => setForm({ ...form, reasonCode: v })} options={reasonOptions} placeholder={kc('fieldReasonLink')} />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block ${themeConfig.text.secondary}`}>{kc('fieldRootCauseLink')}</label>
                <SearchableSelect value={form.rootCauseCode} onChange={(v: string) => setForm({ ...form, rootCauseCode: v })} options={rootCauseOptions} placeholder={kc('fieldRootCauseLink')} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setFormModal({ open: false })} className={`px-4 py-2 rounded-lg text-sm font-medium ${themeConfig.text.secondary} hover:bg-white/5`}>{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-50">
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={kc('deleteConfirmTitle')} size="sm">
          <div className="p-1 space-y-4">
            <p className={`text-sm ${themeConfig.text.secondary}`}>{kc('deleteConfirmBody')} <strong className={themeConfig.text.primary}>{deleteTarget.title}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className={`px-4 py-2 rounded-lg text-sm font-medium ${themeConfig.text.secondary} hover:bg-white/5`}>{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-400">{t('common.delete', 'Delete')}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ---------------- SOP Checklists Section (P24 — Standard Operating Procedures) ---------------- */
function SopChecklistsSection({ reasons, labelReason, themeConfig, t, user, toast }: any) {
  const queryClient = useQueryClient()
  const sc = (k: string) => t(`imageService.sopChecklists.${k}`)
  const canCreate = hasPermission(user, 'sop:create')
  const canUpdate = hasPermission(user, 'sop:update')
  const canDelete = hasPermission(user, 'sop:delete')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formModal, setFormModal] = useState<{ open: boolean; item?: any }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({ reasonCode: '', title: '', stepsText: '' })

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['sop-checklists'],
    queryFn: () => imageServiceApi.getSopChecklists(),
    staleTime: 15000,
  })

  const reasonOptions = (reasons || []).map((r: any) => ({ value: r.code, label: labelReason(r.code) }))

  const openCreate = () => { setForm({ reasonCode: '', title: '', stepsText: '' }); setFormModal({ open: true }) }
  const openEdit = (item: any) => {
    setForm({ reasonCode: item.reasonCode, title: item.title, stepsText: (item.steps || []).map((s: any) => s.text).join('\n') })
    setFormModal({ open: true, item })
  }

  const handleSave = async () => {
    const stepLines = form.stepsText.split('\n').map((s: string) => s.trim()).filter(Boolean)
    if (!form.reasonCode || !form.title.trim() || stepLines.length === 0) {
      toast.warning(sc('validationRequired'))
      return
    }
    setSaving(true)
    try {
      if (formModal.item) {
        await imageServiceApi.updateSopChecklist(formModal.item.id, {
          title: form.title.trim(),
          steps: (formModal.item.steps || []).length === stepLines.length
            ? formModal.item.steps.map((s: any, i: number) => ({ id: s.id, text: stepLines[i] }))
            : stepLines.map((text: string) => ({ id: crypto.randomUUID(), text })),
        })
        toast.success(sc('updateSuccess'))
      } else {
        await imageServiceApi.createSopChecklist({
          reasonCode: form.reasonCode,
          title: form.title.trim(),
          steps: stepLines.map((text: string) => ({ text })),
        })
        toast.success(sc('createSuccess'))
      }
      queryClient.invalidateQueries({ queryKey: ['sop-checklists'] })
      setFormModal({ open: false })
    } catch (e: any) {
      if (!e?._handled) toast.error(e?.response?.data?.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await imageServiceApi.deleteSopChecklist(deleteTarget.id)
      toast.success(sc('deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['sop-checklists'] })
    } catch (e: any) {
      if (!e?._handled) toast.error(t('common.error'))
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className={`${themeConfig.card} rounded-xl p-4`}>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${themeConfig.text.primary}`}>
          <ClipboardList size={15} className="text-cyan-400" /> {sc('title')}
        </h3>
        {canCreate && (
          <button onClick={openCreate} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors">
            + {sc('addChecklist')}
          </button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={3} cols={3} />
      ) : checklists.length === 0 ? (
        <p className={`text-sm text-center py-8 ${themeConfig.text.secondary}`}>{sc('noChecklists')}</p>
      ) : (
        <div className="space-y-2">
          {checklists.map((c: any) => {
            const isExpanded = expandedId === c.id
            return (
              <div key={c.id} className={`rounded-lg border ${themeConfig.cardBorder} overflow-hidden`}>
                <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-white/5 transition-colors">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${themeConfig.text.primary}`}>{c.title}</p>
                    <p className={`text-xs ${themeConfig.text.secondary}`}>{labelReason(c.reasonCode)} · {(c.steps || []).length} {sc('steps')}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canUpdate && (
                      <span onClick={(e) => { e.stopPropagation(); openEdit(c) }} className="px-2 py-1 rounded text-[11px] text-cyan-400 hover:bg-cyan-500/10 cursor-pointer">{t('common.edit', 'Edit')}</span>
                    )}
                    {canDelete && (
                      <span onClick={(e) => { e.stopPropagation(); setDeleteTarget(c) }} className="p-1.5 rounded text-red-400 hover:bg-red-500/10 cursor-pointer"><Trash2 size={13} /></span>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <ol className={`px-3 pb-3 space-y-1 text-xs ${themeConfig.text.secondary} border-t ${themeConfig.cardBorder} pt-2 list-decimal list-inside`}>
                    {(c.steps || []).map((s: any) => <li key={s.id}>{s.text}</li>)}
                  </ol>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      {formModal.open && (
        <Modal isOpen={formModal.open} onClose={() => setFormModal({ open: false })} title={formModal.item ? sc('editChecklist') : sc('addChecklist')} size="lg">
          <div className="space-y-3 p-1">
            <div>
              <label className={`text-xs font-medium mb-1 block ${themeConfig.text.secondary}`}>{sc('fieldReason')} *</label>
              {formModal.item ? (
                <p className={`px-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} bg-white/5 ${themeConfig.text.secondary}`}>{labelReason(form.reasonCode)}</p>
              ) : (
                <SearchableSelect value={form.reasonCode} onChange={(v: string) => setForm({ ...form, reasonCode: v })} options={reasonOptions} placeholder={sc('fieldReason')} />
              )}
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${themeConfig.text.secondary}`}>{sc('fieldTitle')} *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} bg-white/5 ${themeConfig.text.primary} focus:outline-none focus:border-cyan-500`} />
            </div>
            <div>
              <label className={`text-xs font-medium mb-1 block ${themeConfig.text.secondary}`}>{sc('fieldSteps')} *</label>
              <textarea value={form.stepsText} onChange={(e) => setForm({ ...form, stepsText: e.target.value })} rows={6} placeholder={sc('fieldStepsHint')}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} bg-white/5 ${themeConfig.text.primary} placeholder:text-gray-500 focus:outline-none focus:border-cyan-500`} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setFormModal({ open: false })} className={`px-4 py-2 rounded-lg text-sm font-medium ${themeConfig.text.secondary} hover:bg-white/5`}>{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-50">
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={sc('deleteConfirmTitle')} size="sm">
          <div className="p-1 space-y-4">
            <p className={`text-sm ${themeConfig.text.secondary}`}>{sc('deleteConfirmBody')} <strong className={themeConfig.text.primary}>{deleteTarget.title}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className={`px-4 py-2 rounded-lg text-sm font-medium ${themeConfig.text.secondary} hover:bg-white/5`}>{t('common.cancel', 'Cancel')}</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-400">{t('common.delete', 'Delete')}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ---------------- Detail Modal ---------------- */
function IncidentDetailModal({ incidentId, onClose, onSwitch, labelReason, labelRootCause, labelResolution, ic }: any) {
  const { i18n, t } = useTranslation()
  const { themeConfig } = useTheme()
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const sc = (k: string) => t(`imageService.sopChecklists.${k}`)
  const canToggleSop = hasPermission(user, 'cameras:update')
  const [woBusy, setWoBusy] = useState(false)
  const [localWo, setLocalWo] = useState<{ number: string | null; status: string | null } | null>(null)

  const { data: incident, isLoading, refetch } = useQuery({
    queryKey: ['incident-detail', incidentId],
    queryFn: () => imageServiceApi.getIncidentDetail(incidentId),
    staleTime: 0,
  })

  const { data: related = [] } = useQuery({
    queryKey: ['incident-related', incidentId],
    queryFn: () => imageServiceApi.getRelatedIncidents(incidentId),
    staleTime: 30000,
  })

  const { data: relatedArticles = [] } = useQuery({
    queryKey: ['related-articles', incident?.reason, incident?.rootCause],
    queryFn: () => imageServiceApi.getRelatedArticles({ reasonCode: incident?.reason, rootCauseCode: incident?.rootCause }),
    enabled: !!incident && (!!incident.reason || !!incident.rootCause),
    staleTime: 30000,
  })

  const { data: sopState } = useQuery({
    queryKey: ['sop-incident-state', incidentId],
    queryFn: () => imageServiceApi.getSopIncidentState(incidentId),
    staleTime: 10000,
  })

  const handleToggleStep = async (stepId: string, stepText: string, checked: boolean) => {
    try {
      await imageServiceApi.toggleSopStep(incidentId, { stepId, stepText, checked })
      queryClient.invalidateQueries({ queryKey: ['sop-incident-state', incidentId] })
    } catch (e: any) {
      if (!e?._handled) toast.error(t('common.error'))
    }
  }

  useEffect(() => { setLocalWo(null) }, [incidentId])

  const woNumber = localWo?.number ?? incident?.workOrderNumber ?? null
  const woStatus = localWo?.status ?? incident?.workOrderStatus ?? null

  const handleCreateWo = async () => {
    setWoBusy(true)
    try {
      const updated = await imageServiceApi.createWorkOrder(incidentId)
      setLocalWo({ number: updated.workOrderNumber, status: updated.workOrderStatus })
      refetch()
    } finally { setWoBusy(false) }
  }

  const handleWoStatus = async (status: string) => {
    setWoBusy(true)
    try {
      const updated = await imageServiceApi.updateWorkOrderStatus(incidentId, status)
      setLocalWo({ number: updated.workOrderNumber, status: updated.workOrderStatus })
    } finally { setWoBusy(false) }
  }

  const attachments: any[] = Array.isArray(incident?.attachments) ? incident.attachments : []

  const Field = ({ label, value }: { label: string; value: any }) => (
    value ? (
      <div>
        <p className={`text-[11px] uppercase tracking-wide ${themeConfig.text.secondary}`}>{label}</p>
        <p className={`text-sm ${themeConfig.text.primary} whitespace-pre-wrap`}>{value}</p>
      </div>
    ) : null
  )

  return (
    <Modal isOpen onClose={onClose} size="4xl" title={incident?.incidentNumber || ic('colIncident')}>
      {isLoading || !incident ? (
        <TableSkeleton rows={6} cols={2} />
      ) : (
        <div className="space-y-5">
          {/* Header badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-lg font-mono font-bold ${themeConfig.text.primary}`}>{incident.incidentNumber}</span>
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[incident.status] || 'bg-gray-500/20 text-gray-400'}`}>{incident.status === 'open' ? ic('open') : ic('resolved')}</span>
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_COLORS[incident.priority] || 'bg-gray-500/20 text-gray-400'}`}>{incident.priority}</span>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <Field label={ic('filterCamera')} value={incident.camera?.name} />
            <Field label={ic('filterReason')} value={labelReason(incident.reason)} />
            <Field label={ic('filterRootCause')} value={incident.rootCause ? labelRootCause(incident.rootCause) : null} />
            <Field label={ic('colMttr')} value={incident.closedAt ? formatMttr(Math.round((new Date(incident.closedAt).getTime() - new Date(incident.openedAt).getTime()) / 60000)) : null} />
            <Field label={ic('problemDesc')} value={incident.problemDesc} />
            <Field label={ic('resolution')} value={incident.resolution ? labelResolution(incident.resolution) : null} />
            <Field label={ic('resolutionDesc')} value={incident.resolutionDesc} />
            <Field label={ic('description')} value={incident.description} />
            <Field label={ic('correctiveAction')} value={incident.correctiveAction} />
            <Field label={ic('preventiveAction')} value={incident.preventiveAction} />
            <Field label={ic('colOpened')} value={incident.openedAt ? `${formatDateTime(incident.openedAt, i18n.language)} (${incident.openedBy || '—'})` : null} />
            <Field label="Closed" value={incident.closedAt ? `${formatDateTime(incident.closedAt, i18n.language)} (${incident.closedBy || '—'})` : null} />
            <Field label={ic('colOwner')} value={incident.assignedTo || '—'} />
            <Field label={ic('observers')} value={Array.isArray(incident.observers) && incident.observers.length > 0 ? incident.observers.join(', ') : null} />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <p className={`text-[11px] uppercase tracking-wide mb-2 ${themeConfig.text.secondary}`}>Attachments</p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((a: any, idx: number) => {
                  const filename = a.filename || (typeof a === 'string' ? a.split('/').pop() : null)
                  if (!filename) return null
                  return <AttachmentImage key={idx} filename={filename} alt={a.originalName || filename} />
                })}
              </div>
            </div>
          )}

          {/* Maintenance / Work Order */}
          <div className={`rounded-lg p-4 bg-white/5`}>
            <p className={`text-sm font-semibold mb-2 flex items-center gap-2 ${themeConfig.text.primary}`}><Wrench size={15} className="text-cyan-400" /> {ic('maintenance')}</p>
            {woNumber ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-sm font-mono ${themeConfig.text.primary}`}>{ic('workOrder')}: {woNumber}</span>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${WO_STATUS_COLORS[woStatus || 'open'] || 'bg-gray-500/20 text-gray-400'}`}>
                  {woStatus === 'completed' ? ic('woCompleted') : woStatus === 'in_progress' ? ic('woInProgress') : ic('woOpen')}
                </span>
                <select
                  value={woStatus || 'open'} disabled={woBusy}
                  onChange={(e) => handleWoStatus(e.target.value)}
                  className={`px-2 py-1 rounded-lg text-xs border ${themeConfig.inputBorder} bg-slate-800 ${themeConfig.text.primary} focus:outline-none`}
                >
                  <option className="bg-slate-800 text-slate-100" value="open">{ic('woOpen')}</option>
                  <option className="bg-slate-800 text-slate-100" value="in_progress">{ic('woInProgress')}</option>
                  <option className="bg-slate-800 text-slate-100" value="completed">{ic('woCompleted')}</option>
                </select>
              </div>
            ) : (
              <button onClick={handleCreateWo} disabled={woBusy}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5">
                <Wrench size={13} /> {ic('createWorkOrder')}
              </button>
            )}
          </div>

          {/* SOP Checklist (P24) */}
          {sopState?.checklist && (
            <div>
              <p className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${themeConfig.text.primary}`}>
                <ClipboardList size={14} className="text-cyan-400" /> {sc('title')}: {sopState.checklist.title}
              </p>
              <div className="space-y-1">
                {sopState.steps.map((s: any) => (
                  <label key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 ${canToggleSop ? 'cursor-pointer hover:bg-white/10' : 'cursor-not-allowed opacity-70'} transition-colors`}>
                    <input
                      type="checkbox"
                      checked={s.checked}
                      disabled={!canToggleSop}
                      onChange={(e) => handleToggleStep(s.id, s.text, e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-500 flex-shrink-0"
                    />
                    <span className={`text-xs ${s.checked ? 'line-through text-gray-500' : themeConfig.text.primary}`}>{s.text}</span>
                  </label>
                ))}
              </div>
              {sopState.logs.length > 0 && (
                <details className="mt-2">
                  <summary className={`text-xs cursor-pointer ${themeConfig.text.secondary}`}>{sc('history')}</summary>
                  <div className="mt-1.5 space-y-1 pl-3">
                    {sopState.logs.map((l: any) => (
                      <p key={l.id} className={`text-[11px] ${themeConfig.text.secondary}`}>
                        {l.actedBy || '—'} {l.checked ? sc('logChecked') : sc('logUnchecked')} "{l.stepText}" — {formatDateTime(l.actedAt, i18n.language)}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Related incidents */}
          {related.length > 0 && (
            <div>
              <p className={`text-sm font-semibold mb-2 ${themeConfig.text.primary}`}>{ic('relatedIncidents')}</p>
              <div className="space-y-1">
                {related.map((r: any) => (
                  <button key={r.id} onClick={() => onSwitch(r.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between gap-2`}>
                    <span className={`text-xs font-mono ${themeConfig.text.primary}`}>{r.incidentNumber}</span>
                    <span className={`text-xs ${themeConfig.text.secondary}`}>{r.cameraName} · {labelReason(r.reason)}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[r.status] || 'bg-gray-500/20 text-gray-400'}`}>{r.status === 'open' ? ic('open') : ic('resolved')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related knowledge articles (P23) */}
          {relatedArticles.length > 0 && (
            <div>
              <p className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${themeConfig.text.primary}`}>
                <BookOpen size={14} className="text-cyan-400" /> {ic('relatedArticles')}
              </p>
              <div className="space-y-1">
                {relatedArticles.map((a: any) => (
                  <details key={a.id} className="rounded-lg bg-white/5 px-3 py-2">
                    <summary className={`text-xs font-medium cursor-pointer ${themeConfig.text.primary}`}>{a.title}</summary>
                    <div className={`mt-2 space-y-1 text-xs ${themeConfig.text.secondary}`}>
                      <p><strong className={themeConfig.text.primary}>{ic('relatedArticleResolution')}:</strong> {a.resolution}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
