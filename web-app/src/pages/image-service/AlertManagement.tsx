import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { imageServiceApi } from '@/services/imageServiceApi'
import { formatDateTime } from '@/utils/dateUtils'
import { Modal, Button, SearchableSelect, TableSkeleton } from '@/components/ui'
import { Search, Bell, Eye, CheckCircle, XCircle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  emergency: 'bg-red-600/20 text-red-500',
  warning: 'bg-yellow-500/20 text-yellow-400',
  info: 'bg-blue-500/20 text-blue-400',
}

export default function AlertManagement() {
  const { t, i18n } = useTranslation()
  const { themeConfig } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [severity, setSeverity] = useState('')
  const [resolved, setResolved] = useState('')
  const [sortCol, setSortCol] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', page, severity, resolved],
    queryFn: async () => {
      const res = await imageServiceApi.getAlerts({
        severity: severity || undefined,
        resolved: resolved === 'all' ? undefined : resolved === 'resolved' ? true : false,
        page,
        limit: 20,
      })
      return { items: res.data ?? [], total: res.pagination?.total ?? 0, totalPages: res.pagination?.totalPages ?? 0 }
    },
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  })

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 0

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  const handleAcknowledge = async (id: string) => {
    try {
      await imageServiceApi.acknowledgeAlert(id)
      toast.success(t('imageService.alerts.acknowledged'))
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')) }
  }

  const handleResolve = async (id: string) => {
    try {
      await imageServiceApi.resolveAlert(id)
      toast.success(t('imageService.alerts.resolved'))
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')) }
  }

  const thCls = (col: string) =>
    `px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none hover:text-cyan-300 ${themeConfig.text.primary}`

  const severityOptions = [
    { value: 'critical', label: t('imageService.alerts.critical') },
    { value: 'warning', label: t('imageService.alerts.warning') },
    { value: 'info', label: t('imageService.alerts.info') },
  ]
  const resolvedOptions = [
    { value: 'open', label: t('imageService.alerts.open') },
    { value: 'resolved', label: t('imageService.alerts.resolved') },
    { value: 'all', label: t('imageService.alerts.all') },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.alerts.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.alerts.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.alerts.subtitle')}</p>
      </div>

      <div className={`${themeConfig.card} rounded-lg p-4 mb-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <SearchableSelect value={severity} onChange={v => { setSeverity(v); setPage(1) }}
              placeholder={t('imageService.alerts.allSeverity')} options={severityOptions} />
          </div>
          <div className="w-40">
            <SearchableSelect value={resolved} onChange={v => { setResolved(v); setPage(1) }}
              placeholder={t('imageService.alerts.status')} options={resolvedOptions} />
          </div>
        </div>
      </div>

      {isLoading ? <TableSkeleton rows={8} /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={themeConfig.tableHeader}>
                <tr>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>#</th>
                  <th onClick={() => handleSort('severity')} className={thCls('severity')}>
                    <div className="flex items-center gap-1">{t('imageService.alerts.severity')}
                      {sortCol === 'severity' ? sortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" /> : <ChevronsUpDown size={11} className="opacity-25" />}</div>
                  </th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.alerts.alert')}</th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.alerts.source')}</th>
                  <th onClick={() => handleSort('createdAt')} className={thCls('createdAt')}>
                    <div className="flex items-center gap-1">{t('imageService.alerts.createdAt')}
                      {sortCol === 'createdAt' ? sortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" /> : <ChevronsUpDown size={11} className="opacity-25" />}</div>
                  </th>
                  <th className={`px-4 py-3 text-center text-sm font-semibold ${themeConfig.text.primary}`}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${themeConfig.tableDivide}`}>
                {items.map((item: any, idx: number) => (
                  <tr key={item.id} className={`border-b ${themeConfig.tableBorder} ${themeConfig.tableRow}`}>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>{(page - 1) * 20 + idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[item.severity] ?? 'bg-gray-500/20 text-gray-400'}`}>
                        {t(`imageService.alerts.${item.severity}`)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.primary} max-w-[250px] truncate`}>{item.title}</td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>{item.source ?? '—'}</td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>
                      {formatDateTime(item.createdAt, i18n.language)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setDetailId(item.id); setViewing(item) }}
                          className="p-2 rounded-lg hover:bg-cyan-500/20"><Eye size={15} className="text-cyan-400" /></button>
                        {!item.acknowledgedAt && (
                          <button onClick={() => handleAcknowledge(item.id)}
                            className="p-2 rounded-lg hover:bg-blue-500/20"><CheckCircle size={15} className="text-blue-400" /></button>
                        )}
                        {!item.resolvedAt && (
                          <button onClick={() => handleResolve(item.id)}
                            className="p-2 rounded-lg hover:bg-green-500/20"><XCircle size={15} className="text-green-400" /></button>
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
              {t('imageService.alerts.noAlerts')}
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

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={t('imageService.alerts.detail')}>
        {viewing && (
          <div className="space-y-4 p-1 max-w-xl">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-cyan-400" />
              <h3 className={`text-base font-semibold ${themeConfig.text.primary}`}>{viewing.title}</h3>
            </div>
            <p className={`text-sm ${themeConfig.text.secondary}`}>{viewing.message}</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                [t('imageService.alerts.severity'), viewing.severity],
                [t('imageService.alerts.source'), viewing.source ?? '—'],
                [t('imageService.alerts.type'), viewing.alertType],
                [t('imageService.alerts.createdAt'), formatDateTime(viewing.createdAt, i18n.language)],
                [t('imageService.alerts.acknowledgedAt'), viewing.acknowledgedAt ? formatDateTime(viewing.acknowledgedAt, i18n.language) : '—'],
                [t('imageService.alerts.resolvedAt'), viewing.resolvedAt ? formatDateTime(viewing.resolvedAt, i18n.language) : '—'],
              ].map(([k, v], i) => (
                <div key={i} className={`px-3 py-2 rounded-lg ${themeConfig.card}`}>
                  <span className={themeConfig.text.secondary}>{k}</span>
                  <p className={`font-medium mt-0.5 ${themeConfig.text.primary}`}>{v}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              {!viewing.acknowledgedAt && (
                <Button onClick={() => { handleAcknowledge(viewing.id); setViewing(null) }}>{t('imageService.alerts.acknowledge')}</Button>
              )}
              {!viewing.resolvedAt && (
                <Button onClick={() => { handleResolve(viewing.id); setViewing(null) }} className="!bg-green-600 hover:!bg-green-700 text-white">
                  {t('imageService.alerts.resolve')}
                </Button>
              )}
              <Button variant="secondary" onClick={() => setViewing(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
