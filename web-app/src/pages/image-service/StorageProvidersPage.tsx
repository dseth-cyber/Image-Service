import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { imageServiceApi } from '@/services/imageServiceApi'
import { Button, Modal, TableSkeleton, SearchableSelect } from '@/components/ui'
import { Plus, HardDrive, CheckCircle, XCircle, TestTube, Star, Trash2, Edit3, Wifi, Clock, Server } from 'lucide-react'

export default function StorageProvidersPage() {
  const { t } = useTranslation()
  const { themeConfig } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  const { data: providers, isLoading } = useQuery({
    queryKey: ['storage-providers'],
    queryFn: () => imageServiceApi.getStorageProviders(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => imageServiceApi.deleteStorageProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-providers'] })
      toast.success(t('imageService.storageProviders.deleteSuccess'))
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('common.error'))
    },
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => imageServiceApi.testStorageProvider(id),
    onSuccess: (data, id) => {
      setTestResults(prev => ({ ...prev, [id]: data }))
      setTestingId(null)
      if (data.ok) toast.success(t('imageService.storageProviders.testSuccess'))
      else toast.error(`${t('imageService.storageProviders.testFailed')}: ${data.error}`)
    },
    onError: (err: any, id) => {
      setTestingId(null)
      toast.error(err?.response?.data?.message || t('imageService.storageProviders.testFailed'))
    },
  })

  const handleTest = async (id: string) => {
    setTestingId(id)
    testMutation.mutate(id)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id)
  }

  const handleEdit = (provider: any) => {
    setEditTarget(provider)
    setShowForm(true)
  }

  const typeIcon = (type: string) => {
    if (type === 's3') return <Server size={16} className="text-blue-400" />
    return <HardDrive size={16} className="text-amber-400" />
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
            Image Service · {t('imageService.storageProviders.title')}
          </p>
          <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.storageProviders.title')}</h1>
          <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.storageProviders.subtitle')}</p>
        </div>
        <Button onClick={() => { setEditTarget(null); setShowForm(true) }}>
          <Plus size={16} className="mr-1" /> {t('imageService.storageProviders.newProvider')}
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} cols={7} />
      ) : !providers?.length ? (
        <div className={`flex flex-col items-center justify-center py-20 ${themeConfig.text.secondary}`}>
          <HardDrive size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">{t('imageService.storageProviders.noProviders')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((p: any) => {
            const testResult = testResults[p.id]
            return (
              <div key={p.id} className={`rounded-lg border ${themeConfig.card} p-5 space-y-3`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {typeIcon(p.type)}
                    <div>
                      <h3 className={`font-semibold ${themeConfig.text.primary}`}>{p.name}</h3>
                      <span className={`text-xs ${themeConfig.text.secondary}`}>
                        {p.type === 's3' ? t('imageService.storageProviders.s3') : t('imageService.storageProviders.local')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.isDefault && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300">
                        <Star size={10} /> {t('imageService.storageProviders.default')}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      p.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {p.isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
                      {p.isActive ? t('imageService.storageProviders.active') : t('imageService.storageProviders.inactive')}
                    </span>
                  </div>
                </div>

                {p.description && (
                  <p className={`text-xs ${themeConfig.text.secondary}`}>{p.description}</p>
                )}

                <div className={`text-xs space-y-1 ${themeConfig.text.secondary}`}>
                  {p.type === 's3' && (
                    <>
                      <div className="flex justify-between"><span>{t('imageService.storageProviders.endpoint')}</span><span className={themeConfig.text.primary}>{p.config.endpoint}:{p.config.port}</span></div>
                      <div className="flex justify-between"><span>{t('imageService.storageProviders.bucket')}</span><span className={themeConfig.text.primary}>{p.config.bucket}</span></div>
                    </>
                  )}
                  {p.type === 'local' && (
                    <div className="flex justify-between"><span>{t('imageService.storageProviders.basePath')}</span><span className={themeConfig.text.primary}>{p.config.basePath}</span></div>
                  )}
                  <div className="flex justify-between"><span>{t('imageService.storageProviders.priority')}</span><span className={themeConfig.text.primary}>{p.priority}</span></div>
                </div>

                {testResult && (
                  <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded ${testResult.ok ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                    <Wifi size={12} />
                    {testResult.ok ? (
                      <>{t('imageService.storageProviders.testSuccess')} ({testResult.latencyMs}ms)</>
                    ) : (
                      <>{t('imageService.storageProviders.testFailed')}: {testResult.error}</>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1 pt-2 border-t border-white/10">
                  <Button variant="secondary" size="sm" onClick={() => handleTest(p.id)} disabled={testingId === p.id}>
                    <TestTube size={14} className="mr-1" />
                    {testingId === p.id ? '...' : t('imageService.storageProviders.testConnection')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(p)}>
                    <Edit3 size={14} />
                  </Button>
                  <Button variant="secondary" size="sm" className="!text-red-400 hover:!bg-red-500/20" onClick={() => setDeleteTarget(p)} disabled={p.isDefault}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <StorageProviderFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null) }}
        editTarget={editTarget}
      />

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        title={t('common.deleteConfirm')}>
        <div className="p-1 space-y-4">
          <p className={`text-sm ${themeConfig.text.secondary}`}>{t('imageService.storageProviders.deleteConfirm')}</p>
          <p className={`text-sm font-medium ${themeConfig.text.primary}`}>{deleteTarget?.name}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button className="!bg-red-600 hover:!bg-red-700 text-white" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function StorageProviderFormModal({ isOpen, onClose, editTarget }: { isOpen: boolean; onClose: () => void; editTarget: any | null }) {
  const { t } = useTranslation()
  const { themeConfig } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEdit = !!editTarget

  const [name, setName] = useState(editTarget?.name || '')
  const [type, setType] = useState(editTarget?.type || 's3')
  const [endpoint, setEndpoint] = useState(editTarget?.config?.endpoint || '')
  const [port, setPort] = useState(editTarget?.config?.port?.toString() || '9000')
  const [accessKey, setAccessKey] = useState(editTarget?.config?.accessKey || '')
  const [secretKey, setSecretKey] = useState(editTarget?.config?.secretKey || '')
  const [bucket, setBucket] = useState(editTarget?.config?.bucket || '')
  const [useSSL, setUseSSL] = useState(editTarget?.config?.useSSL || false)
  const [basePath, setBasePath] = useState(editTarget?.config?.basePath || '')
  const [description, setDescription] = useState(editTarget?.description || '')
  const [isDefault, setIsDefault] = useState(editTarget?.isDefault || false)
  const [priority, setPriority] = useState(editTarget?.priority?.toString() || '0')
  const [submitting, setSubmitting] = useState(false)

  const createMutation = useMutation({
    mutationFn: (data: any) => imageServiceApi.createStorageProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-providers'] })
      toast.success(t('imageService.storageProviders.created'))
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('common.error')),
    onSettled: () => setSubmitting(false),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => imageServiceApi.updateStorageProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-providers'] })
      toast.success(t('imageService.storageProviders.updated'))
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('common.error')),
    onSettled: () => setSubmitting(false),
  })

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Name is required'); return }
    setSubmitting(true)

    const config = type === 's3'
      ? { endpoint, port: parseInt(port, 10), accessKey, secretKey, bucket, useSSL }
      : { basePath }

    const payload = { name: name.trim(), type, config, description: description.trim() || undefined, isDefault, priority: parseInt(priority, 10) || 0 }

    if (isEdit) {
      updateMutation.mutate({ id: editTarget.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const inputClass = `w-full px-3 py-2 rounded-md text-sm border border-white/30 bg-white/10 backdrop-blur-md text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50`
  const labelClass = `block text-sm font-medium text-white mb-1`

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={isEdit ? t('imageService.storageProviders.editProvider') : t('imageService.storageProviders.newProvider')}
      size="2xl">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        <div>
          <label className={labelClass}>{t('imageService.storageProviders.providerName')}</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{t('imageService.storageProviders.providerType')}</label>
          <SearchableSelect
            value={type}
            onChange={setType}
            options={[
              { value: 's3', label: t('imageService.storageProviders.s3') },
              { value: 'local', label: t('imageService.storageProviders.local') },
            ]}
          />
        </div>
        {type === 's3' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('imageService.storageProviders.endpoint')}</label>
                <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)} className={inputClass} placeholder="image-minio" />
              </div>
              <div>
                <label className={labelClass}>{t('imageService.storageProviders.port')}</label>
                <input type="number" value={port} onChange={e => setPort(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('imageService.storageProviders.bucket')}</label>
              <input type="text" value={bucket} onChange={e => setBucket(e.target.value)} className={inputClass} placeholder="images" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('imageService.storageProviders.accessKey')}</label>
                <input type="text" value={accessKey} onChange={e => setAccessKey(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('imageService.storageProviders.secretKey')}</label>
                <input type="password" value={secretKey} onChange={e => setSecretKey(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="useSSL" checked={useSSL} onChange={e => setUseSSL(e.target.checked)}
                className="rounded border-white/30 bg-white/10" />
              <label htmlFor="useSSL" className="text-sm text-white">{t('imageService.storageProviders.useSSL')}</label>
            </div>
          </>
        ) : (
          <div>
            <label className={labelClass}>{t('imageService.storageProviders.basePath')}</label>
            <input type="text" value={basePath} onChange={e => setBasePath(e.target.value)} className={inputClass} placeholder="/data/images" />
          </div>
        )}
        <div>
          <label className={labelClass}>{t('imageService.storageProviders.description')}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t('imageService.storageProviders.priority')}</label>
            <input type="number" value={priority} onChange={e => setPriority(e.target.value)} className={inputClass} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
                className="rounded border-white/30 bg-white/10" />
              <span className="text-sm text-white">{t('imageService.storageProviders.isDefault')}</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
